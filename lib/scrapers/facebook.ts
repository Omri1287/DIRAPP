import { prisma } from "@/lib/db";
import { TEL_AVIV_NEIGHBORHOODS } from "@/lib/geocode";

const NEIGHBORHOODS_HE: Record<string, string> = {
  "פלורנטין": "Florentin",
  "נווה צדק": "Neve Tzedek",
  "רוטשילד": "Rothschild",
  "מרכז העיר": "City Center",
  "צפון ישן": "Old North",
  "דרום ישן": "Old South",
  "נווה שאנן": "Neve Sha'anan",
  "שפירא": "Shapira",
  "רמת אביב": "Ramat Aviv",
  "נמל תל אביב": "Tel Aviv Port",
  "לב תל אביב": "Lev Tel Aviv",
  "בבלי": "Bavli",
  "שרונה": "Sarona",
  "כרם התימנים": "Kerem HaTeimanim",
  "יפו": "Jaffa",
};

function extractPrice(text: string): number | null {
  const patterns = [
    /(\d{3,6})\s*[₪]/,
    /(\d{3,6})\s*ש["]?ח/,
    /(\d{3,6})\s*שקל/,
    /שכירות[^0-9]*(\d{3,6})/i,
    /מחיר[^0-9]*(\d{3,6})/i,
  ];
  for (const re of patterns) {
    const m = text.match(re);
    if (m) { const v = parseInt(m[1]); if (v >= 1000 && v <= 50000) return v; }
  }
  return null;
}

function extractRooms(text: string): number | null {
  const m = text.match(/(\d(?:[.,]\d)?)\s*חד(?:רים|ר)?/) ?? text.match(/(\d(?:[.,]\d)?)\s*rooms?/i);
  return m ? parseFloat(m[1].replace(",", ".")) : null;
}

function extractSize(text: string): number | null {
  const m = text.match(/(\d{2,4})\s*מ(?:ר|"ר|טר)/);
  if (m) { const v = parseInt(m[1]); return v >= 20 && v <= 500 ? v : null; }
  return null;
}

function extractNeighborhood(text: string): string | null {
  for (const [he, en] of Object.entries(NEIGHBORHOODS_HE)) {
    if (text.includes(he)) return en;
  }
  for (const en of Object.keys(TEL_AVIV_NEIGHBORHOODS)) {
    if (text.toLowerCase().includes(en.toLowerCase())) return en;
  }
  return null;
}

function extractPhone(text: string): string | null {
  const m = text.match(/0[5-9]\d[-\s]?\d{3}[-\s]?\d{4}/);
  return m ? m[0].replace(/[\s-]/g, "") : null;
}

interface ScrapedPost {
  text: string;
  postId: string;
  url: string;
}

async function scrapeGroupPage(
  groupUrl: string,
  maxPosts = 50,
  log: (msg: string) => void = () => {},
  cookieStr?: string,
): Promise<ScrapedPost[]> {
  const { chromium } = await import("playwright");

  const mbasicUrl = groupUrl
    .replace("www.facebook.com", "mbasic.facebook.com")
    .replace("m.facebook.com", "mbasic.facebook.com");

  const browser = await chromium.launch({ headless: true });
  const posts: ScrapedPost[] = [];

  try {
    const ctx = await browser.newContext({
      locale: "he-IL",
      userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
    });

    // Inject browser cookies before the first navigation so Facebook sees us as logged in
    if (cookieStr) {
      const cookies = cookieStr
        .split(";")
        .map((p) => p.trim())
        .filter(Boolean)
        .map((p) => {
          const eq = p.indexOf("=");
          return { name: p.slice(0, eq).trim(), value: p.slice(eq + 1).trim(), domain: ".facebook.com", path: "/" };
        })
        .filter((c) => c.name && c.value);
      await ctx.addCookies(cookies);
      log(`Injected ${cookies.length} session cookies`);
    }

    const page = await ctx.newPage();
    await page.goto(mbasicUrl, { waitUntil: "domcontentloaded", timeout: 30000 });

    const redirectedUrl = page.url();
    if (redirectedUrl.includes("/login") || redirectedUrl.includes("/checkpoint")) {
      if (cookieStr) {
        throw new Error("Cookies are expired or invalid — paste fresh ones from your browser.");
      } else {
        throw new Error("Facebook requires login. Paste your browser cookies in the Admin panel (no password needed).");
      }
    }

    log(`Page: "${await page.title()}"`);

    let currentUrl = mbasicUrl;
    let pageNum = 0;

    while (posts.length < maxPosts && pageNum < 5) {
      const pagePosts = await page.evaluate(() => {
        const results: { text: string; id: string; url: string }[] = [];

        // Try selectors from most to least specific for mbasic Facebook
        const candidates = [
          ...Array.from(document.querySelectorAll("[data-ft]")),
          ...Array.from(document.querySelectorAll(".story_body_container")),
          ...Array.from(document.querySelectorAll("article")),
        ];
        // Deduplicate by element reference
        const seen = new Set<Element>();
        const articles = candidates.filter((el) => {
          if (seen.has(el)) return false;
          seen.add(el);
          return true;
        });

        articles.forEach((el) => {
          const text = el.textContent?.trim() ?? "";
          if (text.length > 30) {
            const link =
              el.querySelector("a[href*='/groups/']") ??
              el.querySelector("a[href*='/permalink/']") ??
              el.querySelector("a[href*='story_fbid']");
            const href = link?.getAttribute("href") ?? "";
            const idMatch =
              href.match(/story_fbid=(\d+)/) ??
              href.match(/permalink\/(\d+)/) ??
              href.match(/posts\/(\d+)/) ??
              href.match(/\/(\d{10,})/);
            results.push({
              text,
              id: idMatch?.[1] ?? Math.random().toString(36).slice(2),
              url: href
                ? href.startsWith("http")
                  ? href
                  : `https://mbasic.facebook.com${href}`
                : "",
            });
          }
        });
        return results;
      });

      log(`Page ${pageNum + 1}: found ${pagePosts.length} raw elements`);

      for (const p of pagePosts) {
        if (!posts.find((x) => x.postId === p.id)) {
          posts.push({ text: p.text, postId: p.id, url: p.url });
        }
      }

      const nextLink = await page.$(
        "a[href*='?cursor='], a:has-text('הבא'), a:has-text('More'), a:has-text('See More Posts')",
      );
      if (!nextLink) break;

      const href = await nextLink.getAttribute("href");
      if (!href || href === currentUrl) break;

      currentUrl = href.startsWith("http") ? href : `https://mbasic.facebook.com${href}`;
      await page.goto(currentUrl, { waitUntil: "domcontentloaded", timeout: 30000 });
      pageNum++;
    }
  } finally {
    await browser.close();
  }

  return posts;
}

export async function scrapeFacebook(
  groupUrls: string[],
  log: (msg: string) => void = () => {},
  cookieStr?: string,
): Promise<number> {
  let saved = 0;

  for (const groupUrl of groupUrls) {
    const posts = await scrapeGroupPage(groupUrl, 50, log, cookieStr);
    log(`${posts.length} posts found, checking for rental listings…`);

    for (const post of posts) {
      const price = extractPrice(post.text);
      if (!price) continue;

      const rooms = extractRooms(post.text);
      const size = extractSize(post.text);
      const neighborhood = extractNeighborhood(post.text);
      const phone = extractPhone(post.text);
      const coords = neighborhood ? TEL_AVIV_NEIGHBORHOODS[neighborhood] ?? null : null;

      const externalId = `fb-${post.postId}`;
      const title = [
        rooms ? `${rooms} חדרים` : null,
        neighborhood ? `ב${neighborhood}` : "בתל אביב",
        `- ₪${price.toLocaleString()}`,
      ].filter(Boolean).join(" ");

      await prisma.apartment.upsert({
        where: { externalId },
        create: {
          externalId,
          title,
          description: post.text.slice(0, 2000),
          price,
          rooms,
          size,
          neighborhood,
          lat: coords?.lat ?? null,
          lng: coords?.lng ?? null,
          source: "facebook",
          sourceUrl: post.url || null,
          contactPhone: phone,
          images: "[]",
        },
        update: { price, description: post.text.slice(0, 2000) },
      });
      saved++;
    }
  }

  return saved;
}

/**
 * Returns Apify proxy config for Playwright when APIFY_PROXY_PASSWORD is set.
 * Find your proxy password at https://console.apify.com/proxy
 * (you can also try your API key as the password — it works on most plans).
 *
 * With no env var set, returns undefined and Playwright runs without a proxy.
 */
export function apifyProxy(): { server: string; username: string; password: string } | undefined {
  const password = process.env.APIFY_PROXY_PASSWORD ?? process.env.APIFY_API_KEY;
  if (!password) return undefined;
  return {
    server: "http://proxy.apify.com:8000",
    username: "auto", // lets Apify choose the best available proxy group
    password,
  };
}

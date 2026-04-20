import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { SourceBadge } from "@/components/SourceBadge";

export default async function ApartmentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const apt = await prisma.apartment.findUnique({ where: { id } });
  if (!apt) notFound();

  const images: string[] = JSON.parse(apt.images || "[]");

  const amenities = [
    { label: "Furnished", value: apt.furnished },
    { label: "Parking", value: apt.parking },
    { label: "Elevator", value: apt.elevator },
    { label: "Balcony", value: apt.balcony },
    { label: "Pets allowed", value: apt.petsAllowed },
  ];

  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-8">
      <Link href="/" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-900 mb-6 transition">
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Back to listings
      </Link>

      {/* Image gallery */}
      {images.length > 0 ? (
        <div className="grid grid-cols-3 gap-2 rounded-2xl overflow-hidden mb-6 h-72">
          <div className="col-span-2 row-span-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={images[0]} alt="main" className="h-full w-full object-cover" />
          </div>
          {images.slice(1, 3).map((src, i) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={i} src={src} alt={`photo ${i + 2}`} className="h-full w-full object-cover" />
          ))}
        </div>
      ) : (
        <div className="h-64 bg-gray-100 rounded-2xl flex items-center justify-center text-gray-400 mb-6">
          <svg className="h-20 w-20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
          </svg>
        </div>
      )}

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Main info */}
        <div className="flex-1">
          <div className="flex items-start justify-between gap-4 mb-2">
            <h1 className="text-2xl font-bold text-gray-900">{apt.title}</h1>
            <SourceBadge source={apt.source} />
          </div>

          {(apt.neighborhood || apt.address) && (
            <p className="text-gray-500 mb-4">
              {[apt.address, apt.neighborhood, "Tel Aviv"].filter(Boolean).join(", ")}
            </p>
          )}

          {/* Key stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            <Stat label="Price" value={`₪${apt.price.toLocaleString()}/mo`} highlight />
            {apt.rooms != null && <Stat label="Rooms" value={String(apt.rooms)} />}
            {apt.size != null && <Stat label="Size" value={`${apt.size} m²`} />}
            {apt.floor != null && (
              <Stat
                label="Floor"
                value={apt.totalFloors ? `${apt.floor}/${apt.totalFloors}` : String(apt.floor)}
              />
            )}
          </div>

          {/* Amenities */}
          <div className="mb-6">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">Amenities</h2>
            <div className="flex flex-wrap gap-2">
              {amenities.map(({ label, value }) =>
                value !== null ? (
                  <span
                    key={label}
                    className={`rounded-full px-3 py-1 text-sm font-medium ${
                      value
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-gray-100 text-gray-400 line-through"
                    }`}
                  >
                    {label}
                  </span>
                ) : null
              )}
            </div>
          </div>

          {/* Description */}
          {apt.description && (
            <div className="mb-6">
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">Description</h2>
              <p className="text-gray-700 text-sm whitespace-pre-line leading-relaxed">{apt.description}</p>
            </div>
          )}

          {apt.postedAt && (
            <p className="text-xs text-gray-400">
              Posted {new Date(apt.postedAt).toLocaleDateString()}
            </p>
          )}
        </div>

        {/* Contact card */}
        <div className="lg:w-72 shrink-0">
          <div className="sticky top-20 rounded-2xl border border-gray-200 p-5 flex flex-col gap-4">
            <h2 className="font-semibold text-gray-900">Contact</h2>
            {apt.contactName && (
              <div>
                <p className="text-xs text-gray-500">Name</p>
                <p className="font-medium text-gray-900">{apt.contactName}</p>
              </div>
            )}
            {apt.contactPhone && (
              <a
                href={`tel:${apt.contactPhone}`}
                className="flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-medium text-white hover:bg-emerald-700 transition"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
                {apt.contactPhone}
              </a>
            )}
            {apt.sourceUrl && (
              <a
                href={apt.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 rounded-xl border border-gray-300 px-4 py-2.5 text-sm hover:bg-gray-50 transition text-gray-700"
              >
                View original listing
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
            )}
            {!apt.contactPhone && !apt.sourceUrl && (
              <p className="text-sm text-gray-400">No contact info available.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="rounded-xl border border-gray-200 p-3 text-center">
      <p className="text-xs text-gray-500 mb-0.5">{label}</p>
      <p className={`font-bold text-sm ${highlight ? "text-emerald-600 text-base" : "text-gray-900"}`}>{value}</p>
    </div>
  );
}

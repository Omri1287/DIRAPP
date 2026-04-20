import { ScraperPanel } from "@/components/ScraperPanel";

export default function AdminPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Admin Panel</h1>
        <p className="text-sm text-gray-500 mt-1">
          Manage scraper sources and trigger data collection.
        </p>
      </div>
      <ScraperPanel />
    </div>
  );
}

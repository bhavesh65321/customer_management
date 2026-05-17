/**
 * Skeleton.jsx — Loading skeleton components (FE-01)
 *
 * Used to show placeholder UI while data is loading from the API.
 * Prevents white-flash / blank screen on slow connections.
 *
 * Usage:
 *   import { SkeletonRow, SkeletonCard, SkeletonText, SkeletonTable } from '../ui/Skeleton';
 *
 *   {isLoading ? <SkeletonTable rows={8} cols={5} /> : <MyTable data={data} />}
 */

/**
 * A single animated placeholder row for a table.
 * @param {number} cols - Number of columns to render
 */
export function SkeletonRow({ cols = 4 }) {
  return (
    <tr className="animate-pulse">
      {Array(cols)
        .fill(0)
        .map((_, i) => (
          <td key={i} className="px-4 py-3">
            <div
              className={`h-4 bg-gray-200 rounded ${
                i === 0 ? "w-1/2" : i === cols - 1 ? "w-1/4" : "w-3/4"
              }`}
            />
          </td>
        ))}
    </tr>
  );
}

/**
 * A complete skeleton table with header + rows.
 * Drop-in replacement for a real data table while loading.
 */
export function SkeletonTable({ rows = 6, cols = 4, headers = [] }) {
  return (
    <table className="min-w-full divide-y divide-gray-200">
      <thead className="bg-gray-50">
        <tr>
          {(headers.length ? headers : Array(cols).fill("")).map((h, i) => (
            <th
              key={i}
              className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
            >
              {h || (
                <div className="h-3 bg-gray-200 rounded w-16 animate-pulse" />
              )}
            </th>
          ))}
        </tr>
      </thead>
      <tbody className="bg-white divide-y divide-gray-100">
        {Array(rows)
          .fill(0)
          .map((_, i) => (
            <SkeletonRow key={i} cols={cols} />
          ))}
      </tbody>
    </table>
  );
}

/**
 * A placeholder card (for dashboard summary cards).
 */
export function SkeletonCard({ className = "" }) {
  return (
    <div
      className={`bg-white rounded-xl shadow-sm border border-gray-100 p-5 animate-pulse ${className}`}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="h-3 bg-gray-200 rounded w-24" />
        <div className="h-8 w-8 bg-gray-200 rounded-full" />
      </div>
      <div className="h-7 bg-gray-200 rounded w-20 mb-2" />
      <div className="h-3 bg-gray-100 rounded w-32" />
    </div>
  );
}

/**
 * Skeleton for a row of summary/stat cards.
 * @param {number} count - Number of cards to show
 */
export function SkeletonCardRow({ count = 4 }) {
  return (
    <div className={`grid grid-cols-2 md:grid-cols-${count} gap-4`}>
      {Array(count)
        .fill(0)
        .map((_, i) => (
          <SkeletonCard key={i} />
        ))}
    </div>
  );
}

/**
 * Inline text skeleton — for loading a single value (e.g. customer name in a header).
 */
export function SkeletonText({ width = "w-32", height = "h-4" }) {
  return (
    <div className={`${height} ${width} bg-gray-200 rounded animate-pulse`} />
  );
}

/**
 * Full-page loading skeleton for the customer dashboard list.
 */
export function SkeletonCustomerList() {
  return (
    <div className="animate-pulse space-y-2">
      {/* Search bar placeholder */}
      <div className="h-10 bg-gray-200 rounded-lg w-full mb-4" />
      <SkeletonTable
        rows={8}
        cols={5}
        headers={["Name", "Phone", "City", "Total Spent", "Actions"]}
      />
    </div>
  );
}

/**
 * Full-page loading skeleton for the dashboard summary view.
 */
export function SkeletonDashboard() {
  return (
    <div className="space-y-6 animate-pulse">
      <SkeletonCardRow count={4} />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <div className="h-4 bg-gray-200 rounded w-32 mb-4" />
          <div className="h-48 bg-gray-100 rounded" />
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <div className="h-4 bg-gray-200 rounded w-32 mb-4" />
          <SkeletonTable rows={5} cols={3} />
        </div>
      </div>
    </div>
  );
}

/**
 * Skeleton for a detail page (customer detail, girvi detail, order detail).
 */
export function SkeletonDetailPage() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="h-12 w-12 bg-gray-200 rounded-full" />
        <div className="space-y-2">
          <div className="h-5 bg-gray-200 rounded w-40" />
          <div className="h-3 bg-gray-100 rounded w-28" />
        </div>
      </div>
      {/* Info cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {Array(6).fill(0).map((_, i) => (
          <div key={i} className="bg-white rounded-lg border border-gray-100 p-4">
            <div className="h-3 bg-gray-200 rounded w-20 mb-2" />
            <div className="h-5 bg-gray-100 rounded w-28" />
          </div>
        ))}
      </div>
      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
        <div className="h-4 bg-gray-200 rounded w-36 mb-4" />
        <SkeletonTable rows={4} cols={4} />
      </div>
    </div>
  );
}

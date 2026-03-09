import React from "react";

export function Table({ children, className = "" }) {
  return (
    <div className="overflow-x-auto">
      <table className={`w-full text-sm ${className}`.trim()}>
        {children}
      </table>
    </div>
  );
}

export function TableHead({ children, className = "" }) {
  return (
    <thead className={`bg-gray-50 border-b border-gray-200 ${className}`.trim()}>
      {children}
    </thead>
  );
}

export function TableBody({ children }) {
  return <tbody className="divide-y divide-gray-100">{children}</tbody>;
}

export function TableRow({ children, className = "", onClick }) {
  const base = "hover:bg-gray-50";
  return (
    <tr
      className={[base, className].filter(Boolean).join(" ")}
      onClick={onClick}
      role={onClick ? "button" : undefined}
    >
      {children}
    </tr>
  );
}

export function TableCell({ children, className = "", align = "left", colSpan }) {
  const alignClass = align === "right" ? "text-right" : align === "center" ? "text-center" : "text-left";
  return (
    <td
      className={`px-6 py-3 ${alignClass} ${className}`.trim()}
      colSpan={colSpan}
    >
      {children}
    </td>
  );
}

export function TableHeaderCell({ children, className = "", align = "left" }) {
  const alignClass = align === "right" ? "text-right" : align === "center" ? "text-center" : "text-left";
  return (
    <th
      className={`px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider ${alignClass} ${className}`.trim()}
    >
      {children}
    </th>
  );
}

/**
 * DataTable – table with optional empty state and loading.
 * columns: [{ key, label, align?, render?(value, row)? }]
 * data: array of row objects
 */
export default function DataTable({ columns, data, loading, emptyMessage = "No data.", keyExtractor = (row) => row.id }) {
  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-500" aria-hidden />
      </div>
    );
  }
  if (!data?.length) {
    return <p className="px-6 py-8 text-gray-500 text-center">{emptyMessage}</p>;
  }
  return (
    <Table>
      <TableHead>
        <TableRow>
          {columns.map((col) => (
            <TableHeaderCell key={col.key} align={col.align}>
              {col.label}
            </TableHeaderCell>
          ))}
        </TableRow>
      </TableHead>
      <TableBody>
        {data.map((row) => (
          <TableRow key={keyExtractor(row)}>
            {columns.map((col) => (
              <TableCell key={col.key} align={col.align}>
                {col.render ? col.render(row[col.key], row) : row[col.key]}
              </TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

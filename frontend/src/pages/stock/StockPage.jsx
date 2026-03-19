import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import ShopLayout from "../../components/layout/ShopLayout";
import { API_BASE, authHeaders } from "../../api";

export default function StockPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API_BASE}/api/stock/items`, { headers: authHeaders() })
      .then((r) => (r.ok ? r.json() : []))
      .then((d) => setItems(Array.isArray(d) ? d : []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <ShopLayout>
      <div className="max-w-5xl mx-auto">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <h1 className="text-2xl font-bold text-gray-800">Stock Items</h1>
          <div className="flex gap-2">
            <Link
              to="/stock/low-stock"
              className="px-4 py-2 border border-amber-500 text-amber-700 rounded-lg hover:bg-amber-50"
            >
              Low Stock
            </Link>
            <Link
              to="/stock/items/new"
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
            >
              Add Item
            </Link>
            <Link
              to="/stock/movements"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Stock In / Out
            </Link>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500" />
            </div>
          ) : items.length === 0 ? (
            <div className="p-8 text-center text-gray-500">No items. Add items to manage stock.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-100">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Metal</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Quantity</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Min</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {items.map((item) => (
                    <tr key={item.id}>
                      <td className="px-4 py-3 font-medium text-gray-900">{item.name}</td>
                      <td className="px-4 py-3 text-gray-600">{item.category || "—"}</td>
                      <td className="px-4 py-3 text-gray-600">{item.metal_type || "—"}</td>
                      <td className="px-4 py-3 text-right font-medium">{item.quantity} {item.unit}</td>
                      <td className="px-4 py-3 text-right">{item.min_quantity != null ? item.min_quantity : "—"}</td>
                      <td className="px-4 py-3">
                        {item.is_low_stock ? (
                          <span className="inline-flex px-2 py-0.5 text-xs font-medium rounded bg-amber-100 text-amber-800">
                            Low stock
                          </span>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </ShopLayout>
  );
}

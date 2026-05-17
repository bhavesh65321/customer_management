import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import ShopLayout from "../../components/layout/ShopLayout";
import { API_BASE, authHeaders } from "../../api";
import { Spinner } from "../../components/ui/Spinner";

export default function StockLowStockPage() {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API_BASE}/api/stock/low-stock`, { headers: authHeaders() })
      .then(r => r.ok ? r.json() : [])
      .then(d => setItems(Array.isArray(d) ? d : []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <ShopLayout>
      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">⚠️ Low Stock Alert</h1>
            <p className="text-sm text-gray-500 mt-0.5">Items below minimum quantity threshold</p>
          </div>
          <div className="flex gap-2">
            <Link to="/stock/movements" className="px-4 py-2 text-sm font-semibold bg-amber-600 hover:bg-amber-700 text-white rounded-lg">
              + Stock In
            </Link>
            <Link to="/stock" className="px-4 py-2 text-sm font-semibold border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50">
              Back to Stock
            </Link>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <Spinner size="lg" color="amber" center />
          </div>
        ) : items.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
            <p className="text-4xl mb-3">✅</p>
            <p className="font-semibold text-gray-700 text-lg">All stocked up!</p>
            <p className="text-sm text-gray-400 mt-1">No items are currently below their minimum quantity.</p>
            <Link to="/stock" className="mt-4 inline-block text-amber-600 font-semibold text-sm hover:underline">
              View all items →
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {items.map(item => {
              const shortage = item.min_quantity != null ? item.min_quantity - item.quantity : null;
              return (
                <div key={item.id} className="bg-white rounded-xl border border-red-200 p-4 flex items-center gap-4">
                  <div className="h-10 w-10 rounded-full bg-red-100 flex items-center justify-center text-red-600 font-bold text-sm shrink-0">
                    ⚠
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900">{item.name}</p>
                    <div className="flex flex-wrap gap-3 mt-0.5 text-xs text-gray-500">
                      {item.metal_type && <span className="capitalize">{item.metal_type}</span>}
                      {item.purity_percent && <span>{item.purity_percent}%</span>}
                      {item.net_weight_g && <span>{item.net_weight_g}g/piece</span>}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-lg font-bold text-red-600">{item.quantity} <span className="text-sm font-normal text-gray-500">{item.unit}</span></p>
                    <p className="text-xs text-gray-400">Min: {item.min_quantity} · Short by {shortage?.toFixed(2)}</p>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button
                      onClick={() => navigate(`/stock/movements`, { state: { itemId: item.id } })}
                      className="px-3 py-1.5 text-xs font-semibold bg-amber-600 hover:bg-amber-700 text-white rounded-lg"
                    >
                      Stock In
                    </button>
                    <button
                      onClick={() => navigate(`/stock/items/${item.id}/edit`)}
                      className="px-3 py-1.5 text-xs font-medium border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                    >
                      Edit
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </ShopLayout>
  );
}

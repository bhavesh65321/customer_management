import React, { useState, useEffect } from "react";
import ShopLayout from "../../components/layout/ShopLayout";
import { apiGet } from "../../api";
import { Spinner } from "../../components/ui/Spinner";

export default function InsightsPage() {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiGet("/api/insights")
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <ShopLayout>
      <div className="max-w-3xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-800 mb-2">Jeweller insights</h1>
        <p className="text-sm text-gray-600 mb-6">
          Rule-based alerts from your shop data (sales, stock age, orders). Use this for daily review.
        </p>
        {loading && (
          <div className="flex justify-center py-12">
            <Spinner size="lg" center />
          </div>
        )}
        {error && !loading && (
          <div className="p-4 rounded-lg bg-red-50 text-red-700 text-sm">{error}</div>
        )}
        {!loading && data && (
          <div className="space-y-4">
            {data.generatedAt && (
              <p className="text-xs text-gray-500">
                Generated: {new Date(data.generatedAt).toLocaleString()}
              </p>
            )}
            {(data.insights || []).length === 0 ? (
              <p className="text-gray-600">No alerts right now.</p>
            ) : (
              (data.insights || []).map((ins, i) => (
                <div
                  key={i}
                  className={`rounded-lg border p-4 ${
                    ins.severity === "warning"
                      ? "border-amber-200 bg-amber-50"
                      : "border-gray-200 bg-white"
                  }`}
                >
                  <h3 className="font-semibold text-gray-900">{ins.title}</h3>
                  <p className="text-sm text-gray-700 mt-1">{ins.detail}</p>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </ShopLayout>
  );
}

import React, { useState, useEffect, useCallback } from "react";
import ShopLayout from "../components/layout/ShopLayout";
import { apiGet } from "../api";
import { useLanguage } from "../context/LanguageContext";
import { Spinner } from "../components/ui/Spinner";

const PAGE_SIZE = 40;

export default function ActivityHistoryPage() {
  const { t } = useLanguage();
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const load = useCallback(
    async (start, append) => {
      const q = new URLSearchParams({ limit: String(PAGE_SIZE), offset: String(start) });
      const data = await apiGet(`/api/history?${q}`);
      setTotal(data.total ?? 0);
      if (append) {
        setItems((prev) => [...prev, ...(data.items || [])]);
      } else {
        setItems(data.items || []);
      }
      setOffset(start + (data.items || []).length);
    },
    []
  );

  useEffect(() => {
    setLoading(true);
    setError("");
    load(0, false)
      .catch((e) => setError(e.message || t("activityPage.errorLoad")))
      .finally(() => setLoading(false));
  }, [load, t]);

  const onLoadMore = () => {
    if (loadingMore || items.length >= total) return;
    setLoadingMore(true);
    load(offset, true)
      .catch((e) => setError(e.message || t("activityPage.errorLoad")))
      .finally(() => setLoadingMore(false));
  };

  const hasMore = items.length < total;

  return (
    <ShopLayout>
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-800 mb-1">{t("activityPage.title")}</h1>
        <p className="text-sm text-gray-600 mb-6">{t("activityPage.subtitle")}</p>

        {loading && (
          <div className="flex justify-center py-12">
            <Spinner size="lg" center />
          </div>
        )}

        {error && !loading && (
          <div className="p-4 rounded-lg bg-red-50 text-red-700 text-sm mb-4">{error}</div>
        )}

        {!loading && !error && items.length === 0 && (
          <p className="text-gray-600">{t("activityPage.empty")}</p>
        )}

        {!loading && items.length > 0 && (
          <div className="rounded-lg border border-gray-200 overflow-hidden bg-white shadow-sm">
            <div className="hidden sm:grid sm:grid-cols-12 gap-2 px-4 py-2 bg-gray-50 text-xs font-semibold text-gray-600 border-b border-gray-200">
              <div className="sm:col-span-3">{t("activityPage.when")}</div>
              <div className="sm:col-span-2">{t("activityPage.who")}</div>
              <div className="sm:col-span-2">{t("activityPage.area")}</div>
              <div className="sm:col-span-5">{t("activityPage.what")}</div>
            </div>
            <ul className="divide-y divide-gray-100">
              {items.map((row) => (
                <li key={row.id} className="px-4 py-3 sm:grid sm:grid-cols-12 sm:gap-2 sm:items-start text-sm">
                  <div className="sm:col-span-3 text-gray-500 text-xs sm:text-sm mb-1 sm:mb-0">
                    {row.at ? new Date(row.at).toLocaleString() : "—"}
                  </div>
                  <div className="sm:col-span-2 font-medium text-gray-900 mb-1 sm:mb-0">{row.who}</div>
                  <div className="sm:col-span-2 text-gray-600 mb-1 sm:mb-0">{row.area}</div>
                  <div className="sm:col-span-5 text-gray-800">{row.what}</div>
                </li>
              ))}
            </ul>
          </div>
        )}

        {!loading && hasMore && (
          <div className="mt-6 flex justify-center">
            <button
              type="button"
              onClick={onLoadMore}
              disabled={loadingMore}
              className="px-4 py-2 rounded-lg border border-gray-300 bg-white text-gray-800 text-sm font-medium hover:bg-gray-50 disabled:opacity-50"
            >
              {loadingMore ? "…" : t("activityPage.loadMore")}
            </button>
          </div>
        )}
      </div>
    </ShopLayout>
  );
}

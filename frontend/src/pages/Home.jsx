import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import ShopLayout from "../components/layout/ShopLayout";
import { SHOP_MENU_SECTIONS } from "../constants/shopMenu";
import { API_BASE, authHeaders, getToken, parseJwt } from "../api";
import { useLanguage } from "../context/LanguageContext";

function daysUntil(dateStr) {
  if (!dateStr) return null;
  return Math.ceil((new Date(dateStr) - new Date()) / 86400000);
}

export default function Home() {
  const { t } = useLanguage();
  const [company, setCompany] = useState(null);

  const token = getToken();
  const payload = token ? parseJwt(token) : null;
  const userName = payload?.name || payload?.sub?.split("@")[0] || "there";
  const userRole = payload?.role || "staff";
  const storeId = payload?.store_id;

  useEffect(() => {
    if (!storeId) return;
    fetch(`${API_BASE}/api/stores/me`, { headers: authHeaders() })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d && setCompany(d))
      .catch(() => {});
  }, [storeId]);

  const days = company ? daysUntil(company.license_expiry) : null;
  const expiryBadge =
    days == null ? null
    : days < 0   ? { label: `Expired ${Math.abs(days)}d ago`, cls: "bg-red-50 text-red-600 border-red-200" }
    : days <= 30 ? { label: `Expires in ${days}d`, cls: "bg-amber-50 text-amber-700 border-amber-200" }
    : { label: `License valid`, cls: "bg-green-50 text-green-700 border-green-200" };

  return (
    <ShopLayout>

      {/* ── Top bar: greeting + store name ─────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-8">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">
            Good {new Date().getHours() < 12 ? "morning" : new Date().getHours() < 17 ? "afternoon" : "evening"},{" "}
            <span className="text-indigo-600">{userName !== "there" ? userName : "there"}</span>
          </h1>
          <p className="text-sm text-gray-400 mt-0.5 capitalize">
            {userRole}
            {company?.name ? ` · ${company.name}` : ""}
          </p>
        </div>

        {expiryBadge && (
          <span className={`text-xs font-medium px-2.5 py-1 rounded border ${expiryBadge.cls}`}>
            {expiryBadge.label}
          </span>
        )}
      </div>

      {/* ── Store info strip (only when loaded) ────────────────────────── */}
      {company && (
        <div className="flex flex-wrap gap-6 text-sm text-gray-500 mb-8 pb-6 border-b border-gray-100">
          {company.location && (
            <span>📍 {company.location}</span>
          )}
          {company.contact_phone && (
            <span>📞 {company.contact_phone}</span>
          )}
          {company.gstin && (
            <span className="font-mono">GST: {company.gstin}</span>
          )}
          {company.license_type && (
            <span className="capitalize">Plan: {company.license_type}</span>
          )}
        </div>
      )}

      {/* ── Module grid ────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {SHOP_MENU_SECTIONS.map((section) => {
          const firstLink = section.items[0]?.to;
          const Icon = section.icon;
          return (
            <Link
              key={section.labelKey || section.label}
              to={firstLink || "#"}
              className="group flex flex-col items-center gap-2.5 p-5 rounded-xl border border-gray-100 bg-white hover:border-indigo-200 hover:bg-indigo-50/40 transition-colors"
            >
              <div className="w-10 h-10 rounded-lg bg-gray-50 group-hover:bg-indigo-100 flex items-center justify-center transition-colors">
                <Icon className="h-5 w-5 text-gray-500 group-hover:text-indigo-600 transition-colors" />
              </div>
              <span className="text-[13px] font-medium text-gray-700 group-hover:text-indigo-700 text-center leading-tight transition-colors">
                {t(`menu.${section.labelKey}`)}
              </span>
            </Link>
          );
        })}
      </div>

    </ShopLayout>
  );
}

import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import ShopLayout from "../components/layout/ShopLayout";
import { SHOP_MENU_SECTIONS } from "../constants/shopMenu";
import { API_BASE, authHeaders, getToken, parseJwt } from "../api";
import { formatDate } from "../utils/format";
import { useLanguage } from "../context/LanguageContext";

export default function Home() {
  const { t } = useLanguage();
  const [company, setCompany] = useState(null);

  useEffect(() => {
    const token = getToken();
    const payload = token ? parseJwt(token) : null;
    const storeId = payload?.store_id;
    if (!storeId) return;
    fetch(`${API_BASE}/api/stores/me`, { headers: authHeaders() })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => data && setCompany(data))
      .catch(() => setCompany(null));
  }, []);

  return (
    <ShopLayout>
      {company && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">{t("common.yourCompany")}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            <div>
              <span className="text-gray-500">{t("common.name")}</span>
              <p className="font-medium text-gray-900">{company.name}</p>
            </div>
            {company.customer_code && (
              <div>
                <span className="text-gray-500">{t("common.customerId")}</span>
                <p className="font-medium text-gray-900">{company.customer_code}</p>
              </div>
            )}
            {company.location && (
              <div>
                <span className="text-gray-500">{t("common.location")}</span>
                <p className="font-medium text-gray-900">{company.location}</p>
              </div>
            )}
            {company.license_type && (
              <div>
                <span className="text-gray-500">{t("common.license")}</span>
                <p className="font-medium text-gray-900 capitalize">{company.license_type}</p>
              </div>
            )}
            {formatDate(company.join_date, null) && (
              <div>
                <span className="text-gray-500">{t("common.joiningDate")}</span>
                <p className="font-medium text-gray-900">{formatDate(company.join_date)}</p>
              </div>
            )}
            {company.address && (
              <div className="sm:col-span-2">
                <span className="text-gray-500">{t("common.address")}</span>
                <p className="font-medium text-gray-900">{company.address}</p>
              </div>
            )}
          </div>
        </div>
      )}

      <h1 className="text-2xl font-bold mb-6">{t("common.welcomeBack")}</h1>
      <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        {SHOP_MENU_SECTIONS.map((section) => {
          const firstLink = section.items[0]?.to;
          return (
            <Link
              key={section.labelKey || section.label}
              to={firstLink || "#"}
              className="bg-white rounded-lg shadow p-6 flex flex-col items-center hover:shadow-md transition"
            >
              <section.icon className="h-10 w-10 text-blue-600 mb-4" />
              <span className="text-lg font-medium text-center">
                {t(`menu.${section.labelKey}`)}
              </span>
            </Link>
          );
        })}
      </div>
    </ShopLayout>
  );
}

import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import BackButton from "../ui/BackButton";
import LanguageSwitcher from "../ui/LanguageSwitcher";
import {
  ChartBarIcon,
  UsersIcon,
  ShoppingCartIcon,
  CalendarIcon,
  Bars3Icon,
  XMarkIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ShieldCheckIcon,
} from "@heroicons/react/24/outline";
import { SHOP_MENU_SECTIONS } from "../../constants/shopMenu";
import { getToken, parseJwt, API_BASE, authHeaders } from "../../api";
import { useLanguage } from "../../context/LanguageContext";

export default function ShopLayout({ children }) {
  const { t } = useLanguage();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [companyName, setCompanyName] = useState(null);
  const [shopName, setShopName] = useState(() =>
    typeof window !== "undefined" ? (localStorage.getItem("shopName") || "My Shop") : "My Shop"
  );
  const [shopLogo, setShopLogo] = useState(() =>
    typeof window !== "undefined" ? localStorage.getItem("shopLogo") : null
  );

  const token = getToken();
  const payload = token ? parseJwt(token) : null;
  const isAdmin = payload?.role === "admin";
  const storeId = payload?.store_id;

  useEffect(() => {
    if (!storeId) return;
    fetch(`${API_BASE}/api/stores/me`, { headers: authHeaders() })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => data && setCompanyName(data.name))
      .catch(() => setCompanyName(null));
  }, [storeId]);

  useEffect(() => {
    const sync = () => {
      setShopName(localStorage.getItem("shopName") || "My Shop");
      setShopLogo(localStorage.getItem("shopLogo"));
    };
    sync();
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, []);

  const displayName = companyName ?? (isAdmin ? "Admin" : shopName);
  const isCompanyUser = companyName != null;

  const SidebarContent = ({ onClickLink, collapsed }) => (
    <div className="h-full flex flex-col bg-white flex-1 min-h-0">
      <div className={`p-4 shrink-0 border-b border-gray-100 ${collapsed ? "flex justify-center" : ""}`}>
        {collapsed ? (
          <div className="w-10 h-10 rounded-lg bg-gray-50 border border-gray-100 flex items-center justify-center overflow-hidden shrink-0">
            {shopLogo ? (
              <img src={shopLogo} alt="" className="w-full h-full object-contain" />
            ) : (
              <span className="text-gray-400 text-xs">{t("common.logo")}</span>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-12 h-12 rounded-lg bg-gray-50 border border-gray-100 flex items-center justify-center overflow-hidden shrink-0">
                {shopLogo ? (
                  <img src={shopLogo} alt="" className="w-full h-full object-contain" />
                ) : (
                  <span className="text-gray-400 text-xs">{t("common.logo")}</span>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <span className="font-semibold text-gray-900 truncate block">{displayName}</span>
                {!isCompanyUser && (
                  <label className="text-xs text-blue-600 hover:text-blue-700 cursor-pointer">
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target?.files?.[0];
                        if (file) {
                          const r = new FileReader();
                          r.onload = () => {
                            const result = r.result;
                            localStorage.setItem("shopLogo", result);
                            setShopLogo(result);
                          };
                          r.readAsDataURL(file);
                        }
                      }}
                    />
                    {t("common.uploadLogo")}
                  </label>
                )}
              </div>
            </div>
            {!isCompanyUser && (
              <input
                type="text"
                placeholder="Shop name"
                value={shopName}
                onChange={(e) => setShopName(e.target.value)}
                onBlur={(e) => {
                  const v = e.target.value.trim() || "My Shop";
                  localStorage.setItem("shopName", v);
                  setShopName(v);
                }}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-md bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            )}
          </div>
        )}
      </div>
      <nav className="flex-1 overflow-y-auto p-3 space-y-4">
        {SHOP_MENU_SECTIONS.map((section) => (
          <div key={section.labelKey || section.label}>
            {!collapsed && (
              <p className="px-3 py-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                {t(`menu.${section.labelKey}`)}
              </p>
            )}
            <div className="space-y-0.5">
              {section.items.map((item) => (
                <Link
                  key={item.to + (item.nameKey || item.name)}
                  to={item.to}
                  onClick={onClickLink}
                  className={`flex items-center rounded-lg hover:bg-gray-50 transition ${
                    collapsed ? "justify-center p-2.5" : "space-x-3 px-3 py-2.5"
                  }`}
                  title={collapsed ? t(`menu.${item.nameKey}`) : undefined}
                >
                  <item.icon className="h-6 w-6 text-blue-600 shrink-0" />
                  {!collapsed && <span className="font-medium text-gray-700">{t(`menu.${item.nameKey}`)}</span>}
                </Link>
              ))}
            </div>
          </div>
        ))}
        {isAdmin && (
          <>
            {!collapsed && (
              <p className="px-3 py-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                {t("menu.admin")}
              </p>
            )}
            <Link
              to="/admin"
              onClick={onClickLink}
              className={`flex items-center rounded-lg hover:bg-gray-50 transition ${
                collapsed ? "justify-center p-2.5" : "space-x-3 px-3 py-2.5"
              }`}
              title={collapsed ? t("menu.admin") : undefined}
            >
              <ShieldCheckIcon className="h-6 w-6 text-blue-600 shrink-0" />
              {!collapsed && <span className="font-medium text-gray-700">{t("menu.admin")}</span>}
            </Link>
          </>
        )}
      </nav>
    </div>
  );

  return (
    <div className="flex min-h-screen min-h-[100dvh] bg-gray-50">
      {/* Desktop Sidebar */}
      <div
        className={`hidden md:flex flex-col bg-white border-r border-gray-200 transition-all duration-200 shrink-0 ${
          sidebarCollapsed ? "w-16" : "w-64"
        }`}
      >
        <SidebarContent collapsed={sidebarCollapsed} />
        <button
          type="button"
          onClick={() => setSidebarCollapsed((c) => !c)}
          className="hidden md:flex items-center justify-center p-2.5 border-t border-gray-100 text-gray-500 hover:bg-gray-50 hover:text-gray-700"
          aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {sidebarCollapsed ? (
            <ChevronRightIcon className="h-5 w-5" />
          ) : (
            <ChevronLeftIcon className="h-5 w-5" />
          )}
        </button>
      </div>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 flex md:hidden" role="dialog" aria-modal="true" aria-label="Menu">
          <div
            className="fixed inset-0 bg-black/40"
            onClick={() => setMobileOpen(false)}
            aria-hidden
          />
          <div className="relative w-[min(280px,85vw)] max-w-full bg-white shadow-xl z-50 flex flex-col h-full">
            <div className="flex items-center justify-between p-4 border-b shrink-0">
              <span className="font-semibold text-gray-900">{t("common.menu")}</span>
              <button
                type="button"
                className="p-2 -m-2 rounded-lg hover:bg-gray-100"
                onClick={() => setMobileOpen(false)}
                aria-label="Close menu"
              >
                <XMarkIcon className="h-6 w-6 text-gray-700" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              <SidebarContent onClickLink={() => setMobileOpen(false)} collapsed={false} />
            </div>
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 min-h-0">
        <header className="md:hidden flex items-center gap-3 bg-white px-3 py-3 border-b shrink-0">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            className="p-2 -m-2 rounded-lg hover:bg-gray-100 shrink-0"
            aria-label="Open menu"
          >
            <Bars3Icon className="h-6 w-6 text-gray-700" />
          </button>
          <span className="font-bold text-gray-900 truncate flex-1 min-w-0 text-center">{displayName}</span>
          <div className="shrink-0 flex items-center gap-2">
            <LanguageSwitcher />
            <BackButton className="text-gray-600" label={t("common.back")} />
          </div>
        </header>

        <main className="flex-1 min-h-0 overflow-auto p-4 md:p-6 bg-gray-50">
          <div className="hidden md:flex md:items-center md:justify-between md:mb-4">
            <BackButton label={t("common.back")} />
            <LanguageSwitcher />
          </div>
          {children}
        </main>
      </div>
    </div>
  );
}

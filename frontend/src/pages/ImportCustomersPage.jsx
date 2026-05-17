import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import ShopLayout from "../components/layout/ShopLayout";
import { API_BASE, authHeaders } from "../api";
import { useLanguage } from "../context/LanguageContext";

export default function ImportCustomersPage() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState(null);
  const [templateLoading, setTemplateLoading] = useState(false);

  const handleDownloadTemplate = async () => {
    setTemplateLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/customer/import-template`, { headers: authHeaders() });
      if (res.status === 401) {
        navigate("/login");
        return;
      }
      if (!res.ok) return;
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "customers-import-template.xlsx";
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setTemplateLoading(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!file) return;
    setUploading(true);
    setResult(null);
    const formData = new FormData();
    formData.append("file", file);
    fetch(`${API_BASE}/api/customer/import`, {
      method: "POST",
      headers: { ...authHeaders(), Accept: "application/json" },
      body: formData,
    })
      .then((r) => {
        if (r.status === 401) {
          navigate("/login");
          return null;
        }
        return r.json().catch(() => ({}));
      })
      .then((data) => {
        if (!data) return;
        setResult(data);
        if (data.imported > 0) setFile(null);
      })
      .catch(() => setResult({ imported: 0, errors: [t("importCustomers.uploadFailed")] }))
      .finally(() => setUploading(false));
  };

  const moreCount = result?.errors?.length > 15 ? result.errors.length - 15 : 0;

  return (
    <ShopLayout>
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-800 mb-4">{t("importCustomers.title")}</h1>
        <p className="text-gray-600 mb-4">{t("importCustomers.intro")}</p>
        <button
          type="button"
          onClick={handleDownloadTemplate}
          disabled={templateLoading}
          className="mb-6 text-sm font-medium text-blue-700 hover:text-blue-900 disabled:opacity-50"
        >
          {templateLoading ? "…" : t("importCustomers.downloadTemplate")}
        </button>
        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-sm border border-gray-100 p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t("importCustomers.excelFile")}</label>
            <input
              type="file"
              accept=".xlsx,.xls"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="w-full text-sm text-gray-600 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:bg-blue-50 file:text-blue-700"
            />
          </div>
          <button
            type="submit"
            disabled={!file || uploading}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {uploading ? t("importCustomers.importing") : t("importCustomers.importBtn")}
          </button>
        </form>
        {result && (
          <div className="mt-6 bg-white rounded-lg shadow-sm border border-gray-100 p-6">
            <p className="font-medium text-gray-800">
              {t("importCustomers.importedLabel")} {result.imported ?? 0} {t("importCustomers.customersSuffix")}
            </p>
            {result.errors?.length > 0 && (
              <ul className="mt-2 text-sm text-amber-700 list-disc list-inside">
                {(result.errors || []).slice(0, 15).map((err, i) => (
                  <li key={i}>{typeof err === "string" ? err : JSON.stringify(err)}</li>
                ))}
                {moreCount > 0 && (
                  <li>{t("importCustomers.moreErrors").replace("{n}", String(moreCount))}</li>
                )}
              </ul>
            )}
          </div>
        )}
      </div>
    </ShopLayout>
  );
}

import React, { useState } from "react";
import ShopLayout from "../components/layout/ShopLayout";
import { API_BASE, authHeaders } from "../api";

export default function ImportCustomersPage() {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState(null);

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
      .then((r) => r.json().catch(() => ({})))
      .then((data) => {
        setResult(data);
        if (data.imported > 0) setFile(null);
      })
      .catch(() => setResult({ imported: 0, errors: ["Upload failed."] }))
      .finally(() => setUploading(false));
  };

  return (
    <ShopLayout>
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-800 mb-4">Import Customers</h1>
        <p className="text-gray-600 mb-6">
          Upload an Excel file (.xlsx) with columns: <strong>Name</strong>, <strong>Phone</strong>. Optional: Email, Address.
        </p>
        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-sm border border-gray-100 p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Excel file</label>
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
            {uploading ? "Importing…" : "Import"}
          </button>
        </form>
        {result && (
          <div className="mt-6 bg-white rounded-lg shadow-sm border border-gray-100 p-6">
            <p className="font-medium text-gray-800">
              Imported: {result.imported ?? 0} customer(s).
            </p>
            {result.errors?.length > 0 && (
              <ul className="mt-2 text-sm text-amber-700 list-disc list-inside">
                {(result.errors || []).slice(0, 15).map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
                {result.errors?.length > 15 && (
                  <li>… and {result.errors.length - 15} more errors</li>
                )}
              </ul>
            )}
          </div>
        )}
      </div>
    </ShopLayout>
  );
}

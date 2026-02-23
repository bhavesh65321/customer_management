import React, { useState, useEffect } from "react";
import { apiGet, apiPut } from "../../api";

export default function CustomerProfile() {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    name: "",
    secondary_phone: "",
    address: "",
    city: "",
    pincode: "",
    preferences: "",
  });

  useEffect(() => {
    apiGet("/api/customer-portal/profile")
      .then((data) => {
        setProfile(data);
        setForm({
          name: data.name || "",
          secondary_phone: data.secondary_phone || "",
          address: data.address || "",
          city: data.city || "",
          pincode: data.pincode || "",
          preferences:
            typeof data.preferences === "string"
              ? data.preferences
              : JSON.stringify(data.preferences || {}, null, 2),
        });
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const handleChange = (e) => {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSaving(true);
    const payload = { ...form };
    try {
      const prefs = payload.preferences.trim();
      payload.preferences = prefs ? JSON.parse(prefs) : null;
    } catch {
      setError("Preferences must be valid JSON");
      setSaving(false);
      return;
    }
    apiPut("/api/customer-portal/profile", payload)
      .then((data) => {
        setProfile(data);
      })
      .catch((err) => setError(err.message))
      .finally(() => setSaving(false));
  };

  if (loading) return <p className="text-gray-500">Loading profile…</p>;
  if (!profile) return <p className="text-red-600">{error || "Failed to load profile"}</p>;

  return (
    <div>
      <h1 className="text-lg font-semibold text-gray-900 mb-4">Profile</h1>
      <form onSubmit={handleSubmit} className="space-y-4 max-w-md">
        {error && (
          <div className="p-3 rounded-md bg-red-50 text-red-700 text-sm">{error}</div>
        )}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
          <input
            name="name"
            value={form.name}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Primary phone (read-only)
          </label>
          <input
            value={profile.primary_phone}
            readOnly
            className="w-full px-3 py-2 border border-gray-200 rounded-md bg-gray-50 text-gray-600"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Secondary phone</label>
          <input
            name="secondary_phone"
            value={form.secondary_phone}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
          <input
            name="address"
            value={form.address}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
          <input
            name="city"
            value={form.city}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Pincode</label>
          <input
            name="pincode"
            value={form.pincode}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Preferences (JSON, e.g. occasions)
          </label>
          <textarea
            name="preferences"
            value={form.preferences}
            onChange={handleChange}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
          />
        </div>
        <button
          type="submit"
          disabled={saving}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-medium disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save"}
        </button>
      </form>
    </div>
  );
}

import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api";
import { parseApiError } from "../utils/apiError";
import { Button } from "../components/ui/Button";

const STEPS = [
  { id: "store", title: "Store Details", desc: "Tell us about your shop" },
  { id: "plan",  title: "Choose Plan",   desc: "Pick the right plan for you" },
  { id: "done",  title: "You're all set!", desc: "Start managing your store" },
];

export default function OnboardingWizard() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [storeForm, setStoreForm] = useState({ name: "", phone: "", address: "", city: "", gstin: "" });
  const sf = (k) => (e) => setStoreForm(p => ({ ...p, [k]: e.target.value }));

  const saveStore = async () => {
    if (!storeForm.name.trim()) { setError("Store name is required"); return; }
    setSaving(true); setError("");
    try {
      await api.patch("/stores/my", storeForm);
      setStep(1);
    } catch (err) {
      const raw = err?.response?.data;
      setError(raw ? parseApiError(raw, "Failed to save store details. Please try again.") : "Failed to save store details. Please try again.");
    } finally { setSaving(false); }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden">

        {/* Progress header */}
        <div className="bg-indigo-600 p-6 text-white">
          <div className="flex items-center justify-between mb-4">
            {STEPS.map((s, i) => (
              <div key={s.id} className="flex items-center">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                  i <= step ? "bg-white text-indigo-700" : "bg-indigo-400 text-indigo-100"
                }`}>
                  {i < step ? "✓" : i + 1}
                </div>
                {i < STEPS.length - 1 && (
                  <div className={`h-0.5 w-16 md:w-24 ${i < step ? "bg-white" : "bg-indigo-400"}`} />
                )}
              </div>
            ))}
          </div>
          <h2 className="text-xl font-bold">{STEPS[step].title}</h2>
          <p className="text-indigo-200 text-sm">{STEPS[step].desc}</p>
        </div>

        <div className="p-6">
          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-600">{error}</div>
          )}

          {/* Step 0 — Store details */}
          {step === 0 && (
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Store Name *</label>
                <input value={storeForm.name} onChange={sf("name")} placeholder="e.g. Shree Jewellers"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Phone</label>
                <input value={storeForm.phone} onChange={sf("phone")} placeholder="9876543210"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Address</label>
                <input value={storeForm.address} onChange={sf("address")} placeholder="Shop address"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">City</label>
                  <input value={storeForm.city} onChange={sf("city")} placeholder="Mumbai"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">GSTIN</label>
                  <input value={storeForm.gstin} onChange={sf("gstin")} placeholder="22AAAAA0000A1Z5"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
                </div>
              </div>
              <Button onClick={saveStore} size="full" loading={saving} loadingText="Saving…">
                Save & Continue →
              </Button>
              <button onClick={() => setStep(1)} className="w-full text-gray-400 hover:text-gray-600 text-sm py-1">
                Skip for now
              </button>
            </div>
          )}

          {/* Step 1 — Plan (trial info) */}
          {step === 1 && (
            <div className="space-y-3">
              <p className="text-sm text-gray-500">Your 14-day free trial gives you full access to all features. No credit card needed.</p>
              <div className="bg-indigo-50 border-2 border-indigo-300 rounded-xl p-4 text-center">
                <div className="text-3xl mb-1">🆓</div>
                <p className="font-bold text-indigo-800">14-Day Free Trial — Active</p>
                <p className="text-indigo-600 text-sm mt-1">Full access to all Pro features. Upgrade anytime from Billing settings.</p>
              </div>
              <div className="flex gap-2 mt-2">
                <button onClick={() => setStep(0)}
                  className="flex-1 border border-gray-200 text-gray-600 font-medium py-2.5 rounded-xl text-sm hover:bg-gray-50">
                  ← Back
                </button>
                <button onClick={() => setStep(2)}
                  className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2.5 rounded-xl text-sm transition-colors">
                  Continue →
                </button>
              </div>
            </div>
          )}

          {/* Step 2 — Done */}
          {step === 2 && (
            <div className="text-center space-y-4">
              <div className="text-6xl">🎉</div>
              <h3 className="text-xl font-bold text-gray-800">Welcome to Jewellery Manager!</h3>
              <p className="text-gray-500 text-sm">Your shop is ready. Start by adding your first customer or exploring the dashboard.</p>
              <div className="grid grid-cols-2 gap-3 mt-4">
                <button onClick={() => navigate("/addCustomer")}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 rounded-xl text-sm transition-colors">
                  ➕ Add First Customer
                </button>
                <button onClick={() => navigate("/home")}
                  className="border-2 border-indigo-300 text-indigo-700 font-semibold py-3 rounded-xl text-sm hover:bg-indigo-50 transition-colors">
                  🏠 Go to Dashboard
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

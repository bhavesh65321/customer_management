import React, { useState, useEffect } from "react";
import ShopLayout from "../components/layout/ShopLayout";
import api from "../api";

export default function BillingPage() {
  const [plans, setPlans] = useState([]);
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get("/billing/plans").catch(() => ({ data: [] })),
      api.get("/billing/status").catch(() => ({ data: null })),
    ]).then(([p, s]) => {
      setPlans(p.data || []);
      setStatus(s.data);
    }).finally(() => setLoading(false));
  }, []);

  const PLAN_ICONS = { trial: "🆓", starter: "⭐", pro: "💎", enterprise: "🏆" };
  const PLAN_COLORS = {
    trial: "border-gray-200 bg-gray-50",
    starter: "border-blue-200 bg-blue-50",
    pro: "border-purple-200 bg-purple-50",
    enterprise: "border-amber-200 bg-amber-50",
  };

  const STATUS_COLORS = {
    trial: "bg-blue-100 text-blue-700",
    active: "bg-green-100 text-green-700",
    past_due: "bg-amber-100 text-amber-700",
    suspended: "bg-red-100 text-red-700",
    cancelled: "bg-gray-100 text-gray-600",
  };

  if (loading) {
    return (
      <ShopLayout>
        <div className="p-6 flex items-center justify-center min-h-64">
          <div className="animate-spin w-8 h-8 border-4 border-indigo-400 border-t-transparent rounded-full" />
        </div>
      </ShopLayout>
    );
  }

  return (
    <ShopLayout>
      <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Billing & Subscription</h1>
          <p className="text-gray-500 text-sm mt-1">Manage your plan and subscription status.</p>
        </div>

        {/* Current status */}
        {status && (
          <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
            <h2 className="font-semibold text-gray-700 mb-3">Current Status</h2>
            <div className="flex flex-wrap gap-4 items-center">
              <div>
                <p className="text-xs text-gray-400">Plan</p>
                <p className="font-bold text-gray-800 text-lg capitalize">
                  {PLAN_ICONS[status.plan?.name] || "📋"} {status.plan?.display_name || status.plan?.name || "No Plan"}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-400">Status</p>
                <span className={`inline-block px-3 py-1 rounded-full text-sm font-semibold capitalize ${STATUS_COLORS[status.subscription_status] || "bg-gray-100 text-gray-600"}`}>
                  {status.subscription_status || "unknown"}
                </span>
              </div>
              {status.trial_ends_at && (
                <div>
                  <p className="text-xs text-gray-400">Trial Ends</p>
                  <p className="font-medium text-gray-700">{new Date(status.trial_ends_at).toLocaleDateString("en-IN")}</p>
                </div>
              )}
              {status.subscribed_at && (
                <div>
                  <p className="text-xs text-gray-400">Subscribed</p>
                  <p className="font-medium text-gray-700">{new Date(status.subscribed_at).toLocaleDateString("en-IN")}</p>
                </div>
              )}
            </div>
            {status.is_trial_expired && (
              <div className="mt-3 bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
                ⚠️ Your trial has expired. Please subscribe to continue using the platform.
              </div>
            )}
          </div>
        )}

        {/* Plans */}
        <div>
          <h2 className="font-semibold text-gray-700 mb-3">Available Plans</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {plans.map(plan => (
              <div key={plan.id || plan.name} className={`rounded-xl border-2 p-5 ${PLAN_COLORS[plan.name] || "border-gray-200 bg-white"} relative`}>
                {status?.plan?.name === plan.name && (
                  <span className="absolute top-3 right-3 bg-green-500 text-white text-xs px-2 py-0.5 rounded-full font-semibold">Current</span>
                )}
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-2xl">{PLAN_ICONS[plan.name] || "📋"}</span>
                  <div>
                    <h3 className="font-bold text-gray-800 capitalize">{plan.display_name || plan.name}</h3>
                    <p className="text-sm text-gray-500">
                      {plan.price_monthly === 0 ? "Free" : `₹${Number(plan.price_monthly).toLocaleString("en-IN")}/mo`}
                    </p>
                  </div>
                </div>
                <ul className="space-y-1.5 mt-3">
                  <li className="text-sm text-gray-600">
                    👥 {plan.max_customers ? `Up to ${plan.max_customers} customers` : "Unlimited customers"}
                  </li>
                  <li className="text-sm text-gray-600">
                    👤 {plan.max_users ? `Up to ${plan.max_users} staff` : "Unlimited staff"}
                  </li>
                  {plan.has_girvi && <li className="text-sm text-green-600">✓ Girvi (Pledge Loans)</li>}
                  {plan.has_analytics && <li className="text-sm text-green-600">✓ Analytics & Reports</li>}
                  {plan.has_inventory && <li className="text-sm text-green-600">✓ Inventory Management</li>}
                  {plan.has_whatsapp && <li className="text-sm text-green-600">✓ WhatsApp Notifications</li>}
                  {plan.has_bulk_import && <li className="text-sm text-green-600">✓ Bulk CSV Import</li>}
                  {plan.has_reports_export && <li className="text-sm text-green-600">✓ Export Reports</li>}
                  {plan.has_api_access && <li className="text-sm text-green-600">✓ API Access</li>}
                </ul>
                {plan.name !== "trial" && status?.plan?.name !== plan.name && (
                  <button className="mt-4 w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 rounded-lg text-sm transition-colors">
                    Upgrade to {plan.display_name || plan.name}
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-sm text-blue-700">
          <p className="font-semibold">💳 Payment Integration</p>
          <p className="mt-1 text-blue-600">Razorpay payment links will appear here once your plan expires. Contact support to manage your subscription.</p>
        </div>
      </div>
    </ShopLayout>
  );
}

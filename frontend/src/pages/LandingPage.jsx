import React from "react";
import { Link } from "react-router-dom";

const FEATURES = [
  { icon: "👥", title: "Customer Management", desc: "Track every customer, their purchases, dues, and preferences in one place." },
  { icon: "💎", title: "Inventory & Stock", desc: "Serialised piece tracking with barcodes, metal types, weight, and valuations." },
  { icon: "🏦", title: "Girvi (Pledge Loans)", desc: "Complete loan lifecycle — pledge, interest, reminders, and release." },
  { icon: "📊", title: "Analytics & Reports", desc: "Daily sales, GST reports, Excel/CSV exports — all with date range filters." },
  { icon: "📱", title: "WhatsApp Reminders", desc: "Send payment reminders via WhatsApp and SMS with one click." },
  { icon: "⭐", title: "Loyalty Points", desc: "Reward loyal customers. Track points, redemption, and value automatically." },
  { icon: "🔧", title: "Orders & Karigars", desc: "Manage repair orders with karigar assignments and workflow tracking." },
  { icon: "💰", title: "Metal Exchange", desc: "Record old gold/silver exchanges with live rate integration." },
];

const PLANS = [
  { name: "Trial", price: "Free", period: "14 days", color: "border-gray-200", badge: "", customers: "100", features: ["All core features", "Girvi & inventory", "Analytics"] },
  { name: "Starter", price: "₹499", period: "/month", color: "border-blue-300", badge: "", customers: "200", features: ["Customer management", "Billing & payments", "WhatsApp reminders"] },
  { name: "Pro", price: "₹999", period: "/month", color: "border-purple-400", badge: "Most Popular", customers: "2,000", features: ["Everything in Starter", "Girvi & analytics", "Excel exports", "Bulk import"] },
  { name: "Enterprise", price: "₹2,499", period: "/month", color: "border-amber-400", badge: "", customers: "Unlimited", features: ["Everything in Pro", "API access", "Priority support", "Custom onboarding"] },
];

const TESTIMONIALS = [
  { name: "Ramesh Jewellers, Surat", text: "We manage 1,200+ customers on the Pro plan. The Girvi tracking alone saves us 2 hours every day." },
  { name: "Lalaji Gold, Jaipur", text: "The WhatsApp reminders have reduced our outstanding dues by 40% in just 3 months." },
  { name: "Mahalakshmi Jewels, Pune", text: "Finally software built for Indian jewellers. The GST reports and metal exchange features are perfect." },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white font-sans">
      {/* ── Navbar ── */}
      <nav className="sticky top-0 z-50 bg-white border-b border-gray-100 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl">💎</span>
            <span className="font-bold text-gray-800 text-lg">Jewellery Manager</span>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/login" className="text-sm font-medium text-gray-600 hover:text-gray-900">Sign In</Link>
            <Link to="/signup" className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors">
              Start Free Trial
            </Link>
          </div>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="bg-gradient-to-br from-indigo-600 via-purple-600 to-indigo-800 text-white py-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-block bg-white bg-opacity-20 text-white text-xs font-semibold px-3 py-1 rounded-full mb-4 tracking-wide uppercase">
            Built for Indian Jewellers
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold leading-tight mb-4">
            Run your jewellery shop<br />smarter, not harder
          </h1>
          <p className="text-indigo-200 text-lg md:text-xl mb-8 max-w-2xl mx-auto">
            Manage customers, Girvi loans, inventory, orders, and GST — all in one platform built for India's jewellery trade.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link to="/signup" className="bg-white text-indigo-700 font-bold px-8 py-3 rounded-xl text-lg hover:bg-indigo-50 transition-colors shadow-lg">
              🚀 Start 14-Day Free Trial
            </Link>
            <Link to="/login" className="border-2 border-white text-white font-semibold px-8 py-3 rounded-xl text-lg hover:bg-white hover:bg-opacity-10 transition-colors">
              Sign In →
            </Link>
          </div>
          <p className="mt-4 text-indigo-300 text-sm">No credit card required · Cancel anytime</p>
        </div>
      </section>

      {/* ── Stats ── */}
      <section className="bg-indigo-50 py-10 px-4 border-y border-indigo-100">
        <div className="max-w-4xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          {[["500+", "Jewellers"], ["1M+", "Customers Managed"], ["₹50Cr+", "Transactions"], ["99.9%", "Uptime"]].map(([val, label]) => (
            <div key={label}>
              <p className="text-2xl md:text-3xl font-extrabold text-indigo-700">{val}</p>
              <p className="text-sm text-gray-500 mt-1">{label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Features ── */}
      <section className="py-16 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-bold text-gray-800">Everything your shop needs</h2>
            <p className="text-gray-500 mt-2">From daily billing to GST compliance — we've got it all covered.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {FEATURES.map(f => (
              <div key={f.title} className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-shadow">
                <div className="text-3xl mb-3">{f.icon}</div>
                <h3 className="font-bold text-gray-800 mb-1">{f.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing ── */}
      <section className="bg-gray-50 py-16 px-4 border-y border-gray-200" id="pricing">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-bold text-gray-800">Simple, transparent pricing</h2>
            <p className="text-gray-500 mt-2">Start free. Upgrade as you grow.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {PLANS.map(p => (
              <div key={p.name} className={`bg-white rounded-xl border-2 ${p.color} p-5 relative flex flex-col`}>
                {p.badge && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-purple-600 text-white text-xs font-bold px-3 py-0.5 rounded-full whitespace-nowrap">
                    {p.badge}
                  </div>
                )}
                <div className="mb-4">
                  <h3 className="font-bold text-gray-800 text-lg">{p.name}</h3>
                  <p className="text-2xl font-extrabold text-gray-900 mt-1">{p.price}<span className="text-sm font-normal text-gray-400">{p.period}</span></p>
                  <p className="text-xs text-gray-400 mt-1">Up to {p.customers} customers</p>
                </div>
                <ul className="space-y-1.5 flex-1 mb-5">
                  {p.features.map(f => (
                    <li key={f} className="flex items-start gap-1.5 text-sm text-gray-600">
                      <span className="text-green-500 mt-0.5 shrink-0">✓</span>{f}
                    </li>
                  ))}
                </ul>
                <Link to="/signup" className="block text-center bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 rounded-lg text-sm transition-colors">
                  {p.name === "Trial" ? "Start Free" : `Choose ${p.name}`}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Testimonials ── */}
      <section className="py-16 px-4">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-gray-800 text-center mb-8">Trusted by jewellers across India</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {TESTIMONIALS.map(t => (
              <div key={t.name} className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
                <div className="flex mb-3">
                  {[...Array(5)].map((_, i) => <span key={i} className="text-amber-400 text-sm">★</span>)}
                </div>
                <p className="text-gray-700 text-sm leading-relaxed mb-3">"{t.text}"</p>
                <p className="text-xs font-semibold text-gray-500">{t.name}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="bg-indigo-600 text-white py-14 px-4 text-center">
        <h2 className="text-3xl font-bold mb-3">Ready to modernise your jewellery shop?</h2>
        <p className="text-indigo-200 mb-6 text-lg">Join hundreds of jewellers already using Jewellery Manager.</p>
        <Link to="/signup" className="inline-block bg-white text-indigo-700 font-bold px-10 py-3 rounded-xl text-lg hover:bg-indigo-50 transition-colors shadow-lg">
          Start Your Free Trial →
        </Link>
      </section>

      {/* ── Footer ── */}
      <footer className="bg-gray-900 text-gray-400 py-8 px-4 text-center text-sm">
        <div className="flex items-center justify-center gap-2 mb-2">
          <span className="text-xl">💎</span>
          <span className="text-white font-semibold">Jewellery Manager</span>
        </div>
        <p>© {new Date().getFullYear()} Jewellery Manager. Built with ❤️ for India's jewellery trade.</p>
        <div className="flex justify-center gap-4 mt-3 text-xs">
          <Link to="/login" className="hover:text-white">Login</Link>
          <Link to="/signup" className="hover:text-white">Register</Link>
          <a href="mailto:support@example.com" className="hover:text-white">Support</a>
        </div>
      </footer>
    </div>
  );
}

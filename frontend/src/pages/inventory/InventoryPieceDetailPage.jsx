import React, { useState, useEffect } from "react";
import { Link, useParams } from "react-router-dom";
import ShopLayout from "../../components/layout/ShopLayout";
import { API_BASE, authHeaders } from "../../api";
import { parseApiError } from "../../utils/apiError";
import PageLoader from "../../components/ui/PageLoader";

const EVENT_TYPES = [
  { value: "sent_to_karigar", label: "Sent to karigar" },
  { value: "returned_from_karigar", label: "Returned from karigar" },
  { value: "qc_passed", label: "QC passed" },
  { value: "listed", label: "Listed" },
  { value: "adjusted", label: "Weight / adjustment" },
  { value: "note", label: "Note" },
];

export default function InventoryPieceDetailPage() {
  const { id } = useParams();
  const [piece, setPiece] = useState(null);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ event_type: "note", notes: "" });

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([
      fetch(`${API_BASE}/api/inventory/${id}`, { headers: authHeaders() }).then((r) =>
        r.ok ? r.json() : Promise.reject()
      ),
      fetch(`${API_BASE}/api/inventory/${id}/events`, { headers: authHeaders() }).then((r) =>
        r.ok ? r.json() : []
      ),
    ])
      .then(([p, ev]) => {
        if (!cancelled) {
          setPiece(p);
          setEvents(Array.isArray(ev) ? ev : []);
        }
      })
      .catch(() => {
        if (!cancelled) setError("Could not load piece.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  const addEvent = async (e) => {
    e.preventDefault();
    setError("");
    try {
      const res = await fetch(`${API_BASE}/api/inventory/${id}/events`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({
          event_type: form.event_type,
          notes: form.notes.trim() || null,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(parseApiError(data, "Failed to save event. Please try again."));
      }
      setForm({ event_type: "note", notes: "" });
      const rPiece = await fetch(`${API_BASE}/api/inventory/${id}`, { headers: authHeaders() });
      const rEv = await fetch(`${API_BASE}/api/inventory/${id}/events`, { headers: authHeaders() });
      if (rPiece.ok) setPiece(await rPiece.json());
      if (rEv.ok) setEvents(await rEv.json());
    } catch (err) {
      setError(err.message);
    }
  };

  if (loading && !piece) return <PageLoader />;

  if (!piece) {
    return (
      <ShopLayout>
        <p className="text-gray-600">Piece not found.</p>
        <Link to="/inventory/pieces" className="text-blue-600 mt-2 inline-block">
          Back to list
        </Link>
      </ShopLayout>
    );
  }

  return (
    <ShopLayout>
      <div className="max-w-3xl mx-auto">
        <div className="mb-6">
          <Link to="/inventory/pieces" className="text-sm text-blue-600 hover:text-blue-800">
            ← Serialized inventory
          </Link>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6 mb-6">
          <h1 className="text-2xl font-bold text-gray-800 mb-2">{piece.serial}</h1>
          <p className="text-gray-600 text-sm">
            {piece.metal_type} · Net {piece.net_weight} g
            {piece.purity != null ? ` · Purity ${piece.purity}` : ""}
            {piece.huid ? ` · HUID ${piece.huid}` : ""}
          </p>
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-gray-700">
            {piece.stone_weight_carat != null && (
              <div>Stone: {piece.stone_weight_carat} ct {piece.stone_type || ""}</div>
            )}
            {piece.wastage_pct != null && <div>Wastage: {piece.wastage_pct}%</div>}
            {piece.location_bin && <div>Location: {piece.location_bin}</div>}
            {piece.design_sku && <div>SKU: {piece.design_sku}</div>}
            <div>
              Status:{" "}
              <span className="font-medium">{piece.status || "in_stock"}</span>
            </div>
          </div>
          {piece.notes && <p className="mt-3 text-sm text-gray-600">{piece.notes}</p>}
        </div>

        <h2 className="text-lg font-semibold text-gray-800 mb-3">Lifecycle timeline</h2>
        {error && (
          <div className="mb-3 p-3 rounded-lg bg-red-50 text-red-700 text-sm">{error}</div>
        )}
        <form onSubmit={addEvent} className="bg-gray-50 rounded-lg p-4 mb-6 space-y-3">
          <div className="flex flex-wrap gap-3">
            <select
              value={form.event_type}
              onChange={(e) => setForm((f) => ({ ...f, event_type: e.target.value }))}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm"
            >
              {EVENT_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
            <input
              type="text"
              placeholder="Notes"
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              className="flex-1 min-w-[200px] px-3 py-2 border border-gray-300 rounded-md text-sm"
            />
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
            >
              Add event
            </button>
          </div>
        </form>

        <div className="space-y-3">
          {events.length === 0 ? (
            <p className="text-gray-500 text-sm">No events yet.</p>
          ) : (
            events.map((ev) => (
              <div
                key={ev.id}
                className="border border-gray-100 rounded-lg p-4 bg-white shadow-sm"
              >
                <div className="flex justify-between gap-2">
                  <span className="font-medium text-gray-900">{ev.event_type}</span>
                  <span className="text-xs text-gray-500">
                    {ev.created_at ? new Date(ev.created_at).toLocaleString() : ""}
                  </span>
                </div>
                {ev.notes && <p className="text-sm text-gray-600 mt-1">{ev.notes}</p>}
              </div>
            ))
          )}
        </div>
      </div>
    </ShopLayout>
  );
}

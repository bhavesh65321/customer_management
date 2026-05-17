import React, { useEffect, useRef, useState } from "react";
import api from "../../api";

/**
 * BarcodeScanner — FEAT-07
 *
 * Uses the browser's BarcodeDetector API (Chrome 88+, Edge 88+) with a
 * camera stream. Falls back to a manual text input on unsupported browsers.
 *
 * Props:
 *   onResult(barcode: string)  — called when a barcode is successfully scanned
 *   onClose()                  — called when user dismisses the scanner
 *   autoLookup                 — if true, auto-query /api/stock/items?barcode= on scan
 */
export default function BarcodeScanner({ onResult, onClose, autoLookup = true }) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const animRef = useRef(null);

  const [supported, setSupported] = useState(null); // null=checking, true/false
  const [scanning, setScanning] = useState(false);
  const [manualCode, setManualCode] = useState("");
  const [found, setFound] = useState(null);   // stock item found
  const [error, setError] = useState("");
  const [looking, setLooking] = useState(false);

  // ── Check BarcodeDetector support ─────────────────────────────────────────
  useEffect(() => {
    setSupported("BarcodeDetector" in window);
  }, []);

  // ── Start camera ──────────────────────────────────────────────────────────
  const startCamera = async () => {
    setError("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" } }, // back camera preferred
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      setScanning(true);
      scanLoop();
    } catch (e) {
      setError("Camera access denied. Allow camera permissions or use manual entry below.");
    }
  };

  // ── Stop camera ───────────────────────────────────────────────────────────
  const stopCamera = () => {
    cancelAnimationFrame(animRef.current);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    setScanning(false);
  };

  // ── Scan loop using BarcodeDetector ──────────────────────────────────────
  const scanLoop = () => {
    if (!videoRef.current) return;
    const detector = new window.BarcodeDetector({
      formats: ["ean_13", "ean_8", "qr_code", "code_128", "code_39", "upc_a", "upc_e"],
    });

    const detect = async () => {
      if (videoRef.current && videoRef.current.readyState === 4) {
        try {
          const barcodes = await detector.detect(videoRef.current);
          if (barcodes.length > 0) {
            const code = barcodes[0].rawValue;
            stopCamera();
            handleBarcode(code);
            return;
          }
        } catch (_) {}
      }
      animRef.current = requestAnimationFrame(detect);
    };
    detect();
  };

  // ── Handle detected barcode ───────────────────────────────────────────────
  const handleBarcode = async (code) => {
    onResult?.(code);
    if (!autoLookup) return;

    setLooking(true);
    setFound(null);
    setError("");
    try {
      const res = await api.get(`/stock/items`, { params: { barcode: code, page_size: 1 } });
      const items = res.data?.items || res.data || [];
      const item = Array.isArray(items) ? items.find(i => i.barcode === code || i.sku === code) : null;
      if (item) {
        setFound(item);
      } else {
        setError(`No stock item found for barcode: ${code}`);
      }
    } catch (e) {
      setError("Lookup failed. Check connection.");
    } finally {
      setLooking(false);
    }
  };

  // ── Cleanup on unmount ────────────────────────────────────────────────────
  useEffect(() => () => stopCamera(), []);

  const handleManual = (e) => {
    e.preventDefault();
    if (manualCode.trim()) {
      handleBarcode(manualCode.trim());
      setManualCode("");
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-70 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="bg-indigo-600 text-white px-5 py-4 flex items-center justify-between">
          <div>
            <h2 className="font-bold text-lg">📷 Barcode Scanner</h2>
            <p className="text-indigo-200 text-xs">Point camera at a barcode or enter manually</p>
          </div>
          <button onClick={() => { stopCamera(); onClose?.(); }} className="text-indigo-200 hover:text-white text-2xl leading-none">×</button>
        </div>

        <div className="p-5 space-y-4">
          {/* Camera view */}
          {supported === true && (
            <div className="relative bg-black rounded-xl overflow-hidden aspect-video">
              <video ref={videoRef} className="w-full h-full object-cover" muted playsInline />
              {scanning && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="border-2 border-green-400 rounded-lg w-48 h-24 relative">
                    <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-green-400 rounded-tl" />
                    <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-green-400 rounded-tr" />
                    <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-green-400 rounded-bl" />
                    <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-green-400 rounded-br" />
                    {/* Scanning line */}
                    <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-green-400 opacity-80 animate-pulse" />
                  </div>
                </div>
              )}
              {!scanning && (
                <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-60">
                  <button
                    onClick={startCamera}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-5 py-2.5 rounded-xl text-sm transition-colors"
                  >
                    📷 Start Camera
                  </button>
                </div>
              )}
            </div>
          )}

          {supported === false && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-sm text-amber-700">
              ⚠️ Your browser doesn't support BarcodeDetector. Use manual entry below, or switch to Chrome/Edge.
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-600">{error}</div>
          )}

          {/* Looking up */}
          {looking && (
            <div className="flex items-center gap-2 text-sm text-indigo-600 animate-pulse">
              <span className="w-4 h-4 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
              Looking up item…
            </div>
          )}

          {/* Found item */}
          {found && (
            <div className="bg-green-50 border border-green-200 rounded-xl p-4">
              <p className="text-green-700 font-semibold text-sm mb-2">✅ Item Found</p>
              <div className="grid grid-cols-2 gap-2 text-sm text-gray-700">
                <div><span className="text-gray-400 text-xs">Name</span><br />{found.name || "—"}</div>
                <div><span className="text-gray-400 text-xs">SKU</span><br />{found.sku || "—"}</div>
                <div><span className="text-gray-400 text-xs">Category</span><br />{found.category || "—"}</div>
                <div><span className="text-gray-400 text-xs">Stock</span><br />{found.quantity ?? "—"}</div>
                {found.selling_price && (
                  <div><span className="text-gray-400 text-xs">Price</span><br />₹{Number(found.selling_price).toLocaleString("en-IN")}</div>
                )}
              </div>
            </div>
          )}

          {/* Manual entry */}
          <div>
            <p className="text-xs text-gray-500 mb-1.5">Manual barcode entry</p>
            <form onSubmit={handleManual} className="flex gap-2">
              <input
                type="text"
                value={manualCode}
                onChange={e => setManualCode(e.target.value)}
                placeholder="Type or paste barcode / SKU…"
                className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
              <button
                type="submit"
                disabled={!manualCode.trim()}
                className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold px-4 py-2 rounded-lg text-sm transition-colors"
              >
                Look Up
              </button>
            </form>
          </div>

          {/* Scan again */}
          {(found || error) && supported === true && (
            <button
              onClick={() => { setFound(null); setError(""); startCamera(); }}
              className="w-full border border-indigo-200 text-indigo-600 hover:bg-indigo-50 font-medium py-2 rounded-lg text-sm transition-colors"
            >
              🔄 Scan Another
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

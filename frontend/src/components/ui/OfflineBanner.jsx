/**
 * OfflineBanner.jsx — Offline detection banner (FE-03)
 *
 * Renders a full-width sticky banner at the top of the page whenever
 * the device loses its network connection, and shows a transient
 * "Back online" confirmation when connectivity is restored.
 *
 * Behaviour:
 *   - Offline  → amber warning banner (persists until reconnected)
 *   - Reconnected → green "Back online" bar that auto-dismisses after 3s
 *   - Was always online → renders nothing (null)
 *
 * Usage: Place once inside <App>, outside <Router> routes, so it is
 * visible on every page.
 *
 *   <OfflineBanner />
 *   <Router>...</Router>
 */
import { useState, useEffect } from "react";
import { useOnlineStatus } from "../../hooks/useOnlineStatus";

export default function OfflineBanner() {
  const { isOnline, wasOffline } = useOnlineStatus();
  const [showRestored, setShowRestored] = useState(false);

  // When connection comes back after being offline, briefly show
  // a "restored" confirmation then dismiss automatically
  useEffect(() => {
    if (isOnline && wasOffline) {
      setShowRestored(true);
      const timer = setTimeout(() => setShowRestored(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [isOnline, wasOffline]);

  // Device is online and the "restored" banner has already dismissed
  if (isOnline && !showRestored) return null;

  if (!isOnline) {
    return (
      <div
        role="alert"
        aria-live="assertive"
        className="fixed top-0 left-0 right-0 z-[9999] flex items-center justify-center gap-2 bg-amber-500 py-2 px-4 text-white text-sm font-medium shadow-md"
      >
        {/* Animated pulsing dot */}
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-white" />
        </span>
        You're offline — changes won't be saved until you reconnect.
      </div>
    );
  }

  // isOnline && showRestored
  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed top-0 left-0 right-0 z-[9999] flex items-center justify-center gap-2 bg-emerald-600 py-2 px-4 text-white text-sm font-medium shadow-md transition-all"
    >
      <svg
        className="w-4 h-4"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2.5}
          d="M5 13l4 4L19 7"
        />
      </svg>
      Back online — you're all set.
    </div>
  );
}

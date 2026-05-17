/**
 * serviceWorkerRegistration.js — PWA service worker registration (FE-10)
 *
 * Registers /sw.js with the browser after the page has fully loaded to
 * avoid competing with first-paint resources.
 *
 * The service worker is only registered in production builds to keep
 * the development experience fast (no caching of stale assets).
 *
 * Usage (in index.js):
 *   import { registerSW } from './serviceWorkerRegistration';
 *   registerSW();
 */

export function registerSW() {
  // Only in production and if the browser supports service workers
  if (process.env.NODE_ENV !== "production") return;
  if (!("serviceWorker" in navigator)) return;

  window.addEventListener("load", () => {
    const swUrl = `${process.env.PUBLIC_URL}/sw.js`;

    navigator.serviceWorker
      .register(swUrl)
      .then((registration) => {
        console.log("[SW] Registered:", registration.scope);

        // Notify the user when a new version is available
        registration.onupdatefound = () => {
          const installing = registration.installing;
          if (!installing) return;

          installing.onstatechange = () => {
            if (installing.state === "installed" && navigator.serviceWorker.controller) {
              // New content available — user can reload
              console.log("[SW] New version available. Refresh to update.");
              // Optionally show a toast here:
              // window.dispatchEvent(new CustomEvent('sw-update-available'));
            }
          };
        };
      })
      .catch((error) => {
        console.error("[SW] Registration failed:", error);
      });
  });
}

export function unregisterSW() {
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.ready
      .then((registration) => registration.unregister())
      .catch(console.error);
  }
}

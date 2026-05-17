/**
 * useOnlineStatus — custom hook (FE-03)
 *
 * Subscribes to the browser's online/offline events and returns the
 * current connectivity state. Initialises from navigator.onLine so it
 * is correct even on first render (e.g., page loaded while already offline).
 *
 * Returns: { isOnline: boolean, wasOffline: boolean }
 *   isOnline   — true if the device currently has a network connection
 *   wasOffline — true if the connection was lost at least once this session
 *               (lets us show a "you're back online" toast)
 */
import { useState, useEffect } from "react";

export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(() => navigator.onLine);
  const [wasOffline, setWasOffline] = useState(false);

  useEffect(() => {
    function handleOnline() {
      setIsOnline(true);
    }

    function handleOffline() {
      setIsOnline(false);
      setWasOffline(true);
    }

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  return { isOnline, wasOffline };
}

import { lazy } from "react";

// A fresh deploy replaces every hashed chunk name. A visitor who still has the
// previous index.html open asks for chunk files that no longer exist, and the
// dynamic import rejects with a "Failed to fetch dynamically imported module"
// TypeError. Reloading once pulls the new index.html and the new bundle, so the
// visitor recovers without seeing React Router's raw error screen.

const RELOAD_FLAG = "agri:chunk-reload-at";
const RELOAD_COOLDOWN_MS = 10000;

function isChunkLoadError(error) {
  const message = String(error?.message ?? error);
  return (
    message.includes("Failed to fetch dynamically imported module") ||
    message.includes("error loading dynamically imported module") ||
    message.includes("Importing a module script failed")
  );
}

function readStamp() {
  try {
    return Number(sessionStorage.getItem(RELOAD_FLAG)) || 0;
  } catch {
    return 0;
  }
}

function writeStamp(value) {
  try {
    sessionStorage.setItem(RELOAD_FLAG, String(value));
  } catch {
    // Storage can be unavailable (private mode / blocked cookies) — the cooldown
    // simply does not apply then, which is harmless.
  }
}

/**
 * Drop-in replacement for React's `lazy` that self-heals stale-chunk failures.
 * @param {() => Promise<{ default: any }>} importer the dynamic import thunk
 */
export function lazyWithRetry(importer) {
  return lazy(async () => {
    try {
      return await importer();
    } catch (error) {
      const now = Date.now();
      // Cooldown guard: if the chunk is genuinely missing (not just stale), an
      // unconditional reload would loop forever.
      if (isChunkLoadError(error) && now - readStamp() > RELOAD_COOLDOWN_MS) {
        writeStamp(now);
        window.location.reload();
        // Keep Suspense pending while the browser navigates away; the reloaded
        // document mounts a fresh bundle.
        return new Promise(() => {});
      }
      throw error;
    }
  });
}

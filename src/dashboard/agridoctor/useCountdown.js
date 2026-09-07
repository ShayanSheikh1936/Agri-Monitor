import { useEffect, useState } from "react";

// Ticks once per second toward a target epoch-ms so the consultation window
// countdown stays live. Stops itself the moment the target passes (no runaway
// timer), and re-arms whenever a different session (new targetMs) is opened.
export default function useCountdown(targetMs) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (typeof targetMs !== "number" || !targetMs) return undefined;

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setNow(Date.now());
    if (Date.now() >= targetMs) return undefined; // already elapsed

    const id = setInterval(() => {
      const t = Date.now();
      setNow(t);
      if (t >= targetMs) clearInterval(id);
    }, 1000);
    return () => clearInterval(id);
  }, [targetMs]);

  const remaining = typeof targetMs === "number" ? targetMs - now : 0;
  return { now, remaining, expired: remaining <= 0 };
}

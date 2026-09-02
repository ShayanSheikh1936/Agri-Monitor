import { useEffect, useState } from "react";
import { localDateISO } from "./cropUtils.js";

// Re-renders the calling component once when the local calendar day flips
// (tab left open over midnight) so every "Day N" label stays in sync with
// the current date. Purely local: the 60s check never touches the network or
// Firestore, and an unchanged day key bails out of re-rendering.
export default function useDayTick() {
  const [dayKey, setDayKey] = useState(() => localDateISO());
  useEffect(() => {
    const id = setInterval(() => {
      setDayKey((prev) => {
        const now = localDateISO();
        return now === prev ? prev : now;
      });
    }, 60_000);
    return () => clearInterval(id);
  }, []);
  return dayKey;
}

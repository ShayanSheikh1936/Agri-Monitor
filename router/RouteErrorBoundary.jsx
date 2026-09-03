import { Link, useLocation, useRouteError } from "react-router-dom";
import { RefreshCw, TriangleAlert } from "lucide-react";

// Route-level error boundary. Without it React Router renders its own
// "Unexpected Application Error!" screen, which leaks internals to the visitor.
// Used as `errorElement` on the lazy dashboard routes (so the sidebar layout
// stays mounted) and once on the root route as a catch-all.

const CHUNK_ERROR_RE =
  /Failed to fetch dynamically imported module|error loading dynamically imported module|Importing a module script failed/i;

export default function RouteErrorBoundary() {
  const error = useRouteError();
  const location = useLocation();

  const raw = String(error?.message ?? error ?? "Unknown error");
  const isStaleChunk = CHUNK_ERROR_RE.test(raw);

  const title = isStaleChunk ? "Page Update Ho Gaya Hai" : "Kuch Ghalat Ho Gaya";
  const body = isStaleChunk
    ? "Nayi deploy ki wajah se purana bundle cache me reh gaya tha. Reload dabayein — page fresh bundle se load ho jayega."
    : "Is page ko load karte waqt ek unexpected error aaya. Dobara koshish karein.";

  return (
    <div className="flex-6 min-h-screen w-full grid place-items-center bg-[var(--bg)] p-6">
      <div className="max-w-[430px] w-full rounded-2xl border-2 border-[var(--text1)] bg-[#D7E8C0] p-6 flex flex-col gap-4 shadow-xl">
        <span className="w-12 h-12 rounded-full bg-[var(--text1)]/20 grid place-items-center text-[var(--text1)]">
          <TriangleAlert size={26} />
        </span>
        <h1 className="text-3xl font-bold text-[var(--text1)] [-webkit-text-stroke:0.4px_black] bebas-neue-regular">
          {title}
        </h1>
        <p className="text-[14px] text-black/80 leading-6">{body}</p>
        <p className="text-[11px] text-black/50 break-all">{location.pathname}</p>
        <div className="flex gap-2 mt-1">
          <button
            onClick={() => window.location.reload()}
            className="flex-1 px-4 py-2 rounded-xl bg-[var(--text1)] text-white text-[15px] font-semibold hover:bg-[#4a7028] transition-colors cursor-pointer flex items-center justify-center gap-2"
          >
            <RefreshCw size={16} />
            Reload
          </button>
          <Link
            to="/dashboard"
            className="flex-1 px-4 py-2 rounded-xl bg-[rgba(0,0,0,0.1)] text-black text-[15px] font-semibold text-center hover:bg-[rgba(0,0,0,0.2)] transition-colors"
          >
            Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}

import { useState } from "react";
import { Stethoscope, Lock, User, Eye, EyeOff, ShieldAlert } from "lucide-react";
import { attemptDoctorLogin } from "./doctorAuth";

// Private sign-in gate for the Agri Doctor console. Username `agrimonitor` /
// password `admindoctor` (DOCTOR_CREDENTIALS). Self-contained: no shared state
// with the farmer dashboard, and styled with the same green/beige palette the
// rest of the app uses so it never collides with the app's own /login page.
export default function DoctorLogin({ onGranted }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    // Verifies the gate, then establishes the doctor's Firebase session (see
    // doctorAuth.js). Errors are surfaced inline; the form stays put on failure.
    const res = await attemptDoctorLogin(username, password);
    if (res.ok) {
      onGranted?.();
    } else {
      setError(res.error ?? "Sign-in failed. Please try again.");
      setBusy(false);
    }
  };

  return (
    <div className="grid min-h-screen place-items-center bg-[var(--bg)] p-4">
      <div className="w-full max-w-[400px]">
        <form
          onSubmit={handleSubmit}
          className="grid gap-4 rounded-3xl border-2 border-[#679936]/30 bg-white p-6 shadow-2xl"
        >
          <div className="grid justify-items-center gap-2 text-center">
            <span className="grid h-14 w-14 place-items-center rounded-2xl bg-[#679936]/15">
              <Stethoscope size={28} className="text-[#4a7028]" aria-hidden="true" />
            </span>
            <h1 className="text-xl font-bold text-black">Agri Doctor Console</h1>
            <p className="text-[13px] leading-5 text-black/55">
              Private portal for reviewing farmer consultations. Restricted access.
            </p>
          </div>

          {error && (
            <p className="flex items-center gap-2 rounded-xl bg-red-50 px-3 py-2 text-[12px] font-semibold text-red-600">
              <ShieldAlert size={15} aria-hidden="true" /> {error}
            </p>
          )}

          <label className="grid gap-1.5">
            <span className="text-[12px] font-semibold text-black/70">Username</span>
            <span className="flex items-center gap-2 rounded-xl border border-[var(--border)] bg-white px-3 focus-within:border-[#679936]">
              <User size={16} className="text-black/40" aria-hidden="true" />
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
                placeholder="agrimonitor"
                className="w-full bg-transparent py-2.5 text-[14px] text-black outline-none placeholder:text-black/35"
              />
            </span>
          </label>

          <label className="grid gap-1.5">
            <span className="text-[12px] font-semibold text-black/70">Password</span>
            <span className="flex items-center gap-2 rounded-xl border border-[var(--border)] bg-white px-3 focus-within:border-[#679936]">
              <Lock size={16} className="text-black/40" aria-hidden="true" />
              <input
                type={showPw ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                placeholder="••••••••"
                className="w-full bg-transparent py-2.5 text-[14px] text-black outline-none placeholder:text-black/35"
              />
              <button
                type="button"
                onClick={() => setShowPw((v) => !v)}
                aria-label={showPw ? "Hide password" : "Show password"}
                className="shrink-0 text-black/40 transition-colors hover:text-black/70 cursor-pointer"
              >
                {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </span>
          </label>

          <button
            type="submit"
            disabled={busy}
            className="mt-1 rounded-xl bg-[#679936] px-4 py-2.5 text-[14px] font-bold text-white transition-colors hover:bg-[#4a7028] disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer"
          >
            {busy ? "Signing in…" : "Sign in to console"}
          </button>

          <p className="text-center text-[11px] text-black/40">
            Authorized Agri Doctor staff only.
          </p>
        </form>
      </div>
    </div>
  );
}

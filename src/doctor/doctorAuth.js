// =============================================================================
// Agri Doctor — doctor portal access gate.
//
// The doctor portal is a private, protected screen (username `agrimonitor` /
// password `admindoctor`, see DOCTOR_CREDENTIALS in agriDoctorService). Passing
// the gate does TWO things:
//   1. Remembers access for this browser tab (sessionStorage) so a refresh
//      keeps the doctor signed in but closing the tab signs them out.
//   2. Establishes a dedicated Firebase Auth session (DOCTOR_EMAIL) so the
//      Firestore rules' isDoctor() check matches and the console can read every
//      farmer's consultation. The account is auto-provisioned on first sign-in.
//
// WHY FIREBASE AUTH TOO: a client-side gate alone cannot authorise Firestore —
// rules only see request.auth. Without this session the console would be denied
// cross-user reads. The dedicated doctor account is separate from any farmer
// account, so farmer auth code is never modified.
//
// SECURITY NOTE: the portal credentials ship in the bundle, so this gate stops
// casual visitors but is not a substitute for real access control. For hardened
// production use, provision the doctor account manually, rotate its password,
// and restrict it further in firestore.rules (see the "Agri Doctor" section).
// =============================================================================

import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
} from "firebase/auth";
import { auth } from "@/features/auth/firebase";
import {
  verifyDoctorCredentials,
  DOCTOR_EMAIL,
  DOCTOR_CREDENTIALS,
} from "@/services/agriDoctorService";

const STORAGE_KEY = "agriDoctorPortalAccess";
const GRANTED = "granted";

// Credentials the client gate accepts (kept in one place for the error copy).
const SIGN_IN_CODES = new Set([
  "auth/user-not-found",
  "auth/invalid-credential",
  "auth/invalid-login-credentials",
  "auth/wrong-password",
]);

function safeGet(key) {
  try {
    return sessionStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeSet(key, value) {
  try {
    sessionStorage.setItem(key, value);
  } catch {
    /* private mode / storage disabled — gate simply won't persist */
  }
}

function safeRemove(key) {
  try {
    sessionStorage.removeItem(key);
  } catch {
    /* no-op */
  }
}

/** True once the doctor has passed the credential gate this tab session. */
export function isDoctorGranted() {
  return safeGet(STORAGE_KEY) === GRANTED;
}

/** Marks the current tab as an authenticated doctor session. */
export function grantDoctor() {
  safeSet(STORAGE_KEY, GRANTED);
}

function friendlyAuthError(err) {
  const code = err?.code ?? "";
  if (code === "auth/configuration-not-found" || code === "auth/operation-not-allowed") {
    return "Email/Password sign-in is disabled in Firebase Auth. Enable it, then retry.";
  }
  if (code === "auth/network-request-failed") {
    return "Network error while signing in. Check the connection and retry.";
  }
  return `Doctor sign-in failed (${code || "unknown error"}).`;
}

/**
 * Ensures a Firebase session for the dedicated doctor account, creating it once
 * on first use. Returns { ok:true } or { ok:false, error }.
 */
async function ensureDoctorFirebaseSession() {
  // Already signed in as the doctor (e.g. page refresh mid-session).
  if (auth.currentUser && auth.currentUser.email === DOCTOR_EMAIL) {
    return { ok: true };
  }

  // 1) Try a normal sign-in first.
  try {
    await signInWithEmailAndPassword(auth, DOCTOR_EMAIL, DOCTOR_CREDENTIALS.password);
    return { ok: true };
  } catch (err) {
    if (!SIGN_IN_CODES.has(err?.code ?? "")) {
      return { ok: false, error: friendlyAuthError(err) };
    }
  }

  // 2) First run — the account doesn't exist yet, so provision it once.
  try {
    await createUserWithEmailAndPassword(auth, DOCTOR_EMAIL, DOCTOR_CREDENTIALS.password);
    return { ok: true };
  } catch (createErr) {
    // Lost a race with another tab that just created it — sign in instead.
    if ((createErr?.code ?? "") === "auth/email-already-in-use") {
      try {
        await signInWithEmailAndPassword(auth, DOCTOR_EMAIL, DOCTOR_CREDENTIALS.password);
        return { ok: true };
      } catch (retryErr) {
        return { ok: false, error: friendlyAuthError(retryErr) };
      }
    }
    return { ok: false, error: friendlyAuthError(createErr) };
  }
}

/**
 * Verifies the portal credentials and, on success, establishes the doctor's
 * Firebase session + grants tab access.
 * @returns {Promise<{ok:boolean, error?:string}>}
 */
export async function attemptDoctorLogin(username, password) {
  if (!verifyDoctorCredentials(username, password)) {
    return { ok: false, error: "Incorrect username or password." };
  }
  const session = await ensureDoctorFirebaseSession();
  if (!session.ok) {
    return { ok: false, error: session.error };
  }
  grantDoctor();
  return { ok: true };
}

/**
 * Ends the doctor session: clears the tab gate and signs the dedicated doctor
 * account out of Firebase (only when the doctor is the current user, so a
 * farmer session in the same browser is never touched).
 */
export async function signOutDoctor() {
  safeRemove(STORAGE_KEY);
  try {
    if (auth.currentUser && auth.currentUser.email === DOCTOR_EMAIL) {
      await signOut(auth);
    }
  } catch {
    /* best-effort — the tab gate is already cleared */
  }
}

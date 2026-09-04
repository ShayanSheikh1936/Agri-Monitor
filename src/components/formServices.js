import { auth, fdb, Googleprovider } from "../features/auth/firebase";
import {
  signInWithPopup,
  signInWithRedirect,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
} from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";

// Create the users/{uid} profile document if it doesn't exist yet.
// Shared by the Google popup + redirect sign-in flows so a first-time
// Google user always gets a profile row.
export const ensureUserDoc = async (user) => {
  try {
    const userRef = doc(fdb, "users", user.uid);
    const docsnap = await getDoc(userRef);
    if (!docsnap.exists()) {
      const fullName = user.displayName || "";
      const [first, ...rest] = fullName.split(" ");
      await setDoc(userRef, {
        fullname: fullName,
        EmailAddress: user.email,
        displayphoto: user.photoURL,
        firstName: first || "",
        lastName: rest.join(" ") || "",
        uid: user.uid,
      });
    }
  } catch (error) {
    console.warn("ensureUserDoc failed:", error?.code || error?.message);
  }
};

// The OAuth popup flow is unreliable on Safari / iOS — the popup's storage
// session gets torn down mid-flow, producing "database is closing/hidden"
// style errors. Those environments must use the redirect flow instead.
const needsRedirectFlow = () => {
  const ua = navigator.userAgent || "";
  const isIOS =
    /iP(hone|ad|od)/.test(ua) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const isSafariStandalone =
    /Safari/.test(ua) &&
    !/Chrome|Chromium|CriOS|FxiOS|Edg|OPiOS|OPR|Android/.test(ua);
  return isIOS || isSafariStandalone;
};

// 1. Handle Google Sign-In
export const executeGoogleSignIn = async () => {
  try {
    // Safari / iOS: use the redirect flow from the start.
    if (needsRedirectFlow()) {
      await signInWithRedirect(auth, Googleprovider);
      // Page navigates to Google and back; the result is completed by
      // getRedirectResult() inside AuthProvider on reload.
      return { user: null, error: null, redirected: true };
    }

    const googleUser = await signInWithPopup(auth, Googleprovider);
    const user = googleUser.user;
    await ensureUserDoc(user);
    return { user, error: null };
  } catch (error) {
    // If the popup failed for an environment reason, retry via redirect so
    // the user can still finish sign-in instead of hitting a dead error.
    const redirectFallbackCodes = new Set([
      "auth/operation-not-supported-in-environment",
      "auth/web-storage-unsupported",
      "auth/internal-error",
      "auth/invalid-origin",
    ]);
    if (redirectFallbackCodes.has(error.code)) {
      try {
        await signInWithRedirect(auth, Googleprovider);
        return { user: null, error: null, redirected: true };
      } catch (redirectError) {
        return { user: null, error: redirectError.code || redirectError.message };
      }
    }
    return { user: null, error: error.code || error.message };
  }
};

// 2. Handle Form Sign-Up (Email/Password)
export const executeFormSignUp = async (data) => {
  const { firstname, lastname, EmailAddress, passwords } = data;
  try {
    const userCredentials = await createUserWithEmailAndPassword(
      auth,
      EmailAddress,
      passwords
    );
    const user = userCredentials.user;

    // Firestore Document Reference
    const userRef = doc(fdb, "users", user.uid);
    const docsnapsignup = await getDoc(userRef);
    // Check if the user document already exists
    if (!docsnapsignup.exists()) {
      // If the document doesn't exist, create it
      await setDoc(userRef, {
        fullname: `${firstname} ${lastname}`,
        EmailAddress: user.email,
        displayphoto: user.photoURL,
        firstName: firstname,
        lastName: lastname,
        uid: user.uid,
      });
    }
    // const docsnap = await getDoc(userRef);
    return { user, error: null };

    // Option to get created document data

    // const docsnapdata = docsnap.data();
  } catch (error) {
    // console.error("Error in sign up:", error.code);
    let customErrorMessage = "Something went wrong";
    if (error.code === "auth/email-already-in-use") {
      customErrorMessage = "Email already in use";
    } else if (error.code === "auth/invalid-email") {
      customErrorMessage = "Invalid Email";
    } else if (error.code === "auth/weak-password") {
      customErrorMessage = "Weak Password";
    }

    return { user: null, error: customErrorMessage };
  }
};




export const executeFormLogin = async (data) => {
  const { EmailAddress, passwords } = data;
  try {
    const userCredentials = await signInWithEmailAndPassword(auth, EmailAddress, passwords)
    const user = userCredentials.user

    // Read user doc from Firestore. If this fails (e.g. auth token hasn't
    // propagated to Firestore yet, or rules not deployed), login still
    // succeeds — AuthProvider's onAuthStateChanged will retry the read.
    let docData = null;
    try {
      const userdata = doc(fdb, "users", user.uid);
      const docsnap = await getDoc(userdata);
      if (docsnap.exists()) {
        docData = docsnap.data();
      }
    } catch (fsErr) {
      console.warn("Post-login Firestore read deferred to AuthProvider:", fsErr?.code);
    }

    return { user: user, error: null, docData: docData };

  } catch (error) {
    // console.error("Error in google sign in:", error);
    return { user: null, error: error.code || error.message };
  }
}


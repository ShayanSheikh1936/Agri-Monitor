import { auth, fdb } from "./firebase";
import { onAuthStateChanged, getRedirectResult } from "firebase/auth";
import { createContext, useEffect, useState, useContext } from "react";
import { doc, getDoc } from "firebase/firestore";
import { ensureUserDoc } from "../../components/formServices";

const AuthContext = createContext();

export default function AuthProvider({ children }) {
    const [currentUser, setCurrentUser] = useState(null);
    const [personalinfo, setPersonalinfo] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Complete a Google redirect sign-in (Safari/iOS use the redirect
        // flow because the OAuth popup is unreliable there). Runs once when
        // the app reloads after Google returns; resolves to null on normal
        // loads, so it never interferes with popup/email sign-in.
        getRedirectResult(auth)
            .then((result) => {
                if (result?.user) ensureUserDoc(result.user);
            })
            .catch((error) => {
                console.error("Google redirect sign-in failed:", error?.code || error?.message);
            });

        // 1. Firebase auth state change listener ko direct useEffect mein attach karein
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            setCurrentUser(user);

            if (user) {
                // Retry with increasing delay — handles the case where the
                // Firestore SDK hasn't finished processing the auth token
                // propagation yet (common right after signIn resolves).
                const maxRetries = 3;
                for (let attempt = 0; attempt < maxRetries; attempt++) {
                    try {
                        // 2. User log in hai toh firestore se info fetch karein
                        const docRef = doc(fdb, "users", user.uid);
                        const docSnap = await getDoc(docRef);

                        if (docSnap.exists()) {
                            const data = docSnap.data();
                            setPersonalinfo(!!data?.personaluser);
                        } else {
                            setPersonalinfo(false);
                        }
                        break; // success — exit retry loop
                    } catch (error) {
                        if (attempt < maxRetries - 1) {
                            // Wait before retrying (1s, 2s, 3s…)
                            await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
                        } else {
                            console.error("Error fetching user personal info:", error);
                            setPersonalinfo(false);
                        }
                    }
                }
            } else {
                // User logged out hai
                setPersonalinfo(false);
            }

            // 3. Data fetch hone ke baad loading ko false karein
            setLoading(false);
        });

        // Cleanup function
        return () => unsubscribe();
    }, []);

    return (
        <AuthContext.Provider value={{ currentUser, personalinfo, loading }}>
            {/* 4. Jab loading FALSE ho jaye tab children components dikhao */}
            {!loading ? (
                children
            ) : (
                <div className="bg-[var(--bg)] w-full h-screen grid place-items-center overflow-y-auto">
                    <span className="w-40 h-40 rounded-full "><img src="logo1.svg" alt="" /></span>
                </div>
            )}
        </AuthContext.Provider>
    );
}

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
};
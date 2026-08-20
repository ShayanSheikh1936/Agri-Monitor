import { auth, fdb } from "./firebase";
import { onAuthStateChanged } from "firebase/auth";
import { createContext, useEffect, useState, useContext } from "react";
import { doc, getDoc } from "firebase/firestore";

const AuthContext = createContext();

export default function AuthProvider({ children }) {
    const [currentUser, setCurrentUser] = useState(null);
    const [personalinfo, setPersonalinfo] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // 1. Firebase auth state change listener ko direct useEffect mein attach karein
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            setCurrentUser(user);

            if (user) {
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
                } catch (error) {
                    console.error("Error fetching user personal info:", error);
                    setPersonalinfo(false);
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
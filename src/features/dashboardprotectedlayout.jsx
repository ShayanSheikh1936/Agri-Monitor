import { Navigate } from "react-router-dom";
import { useAuth } from "./auth/authContext";
import { doc, getDoc } from "firebase/firestore";
import { fdb } from "./auth/firebase";
import { useEffect, useState } from "react";

export default function DashboardProtectedLayout({ children }) {
  const [personalInfo, setPersonalInfo] = useState(null);
  const [loading, setLoading] = useState(true); 
  const { currentUser } = useAuth();

  useEffect(() => {
    async function checkPersonalInfo() {
      if (currentUser?.uid) {
        try {
          const syncDoc = doc(fdb, "users", currentUser.uid);
          const checkInfo = await getDoc(syncDoc);

          if (checkInfo.exists()) {
            const info = checkInfo.data();
            // Boolean value set karein (true/false)
            setPersonalInfo(!!info?.personaluser);
          } else {
            setPersonalInfo(false);
          }
        } catch (error) {
          console.error("Error fetching personal info:", error);
          setPersonalInfo(false);
        } finally {
          setLoading(false); // Data fetch hone ke baad loading stop karein
        }
      } else if (currentUser === null) {
        setLoading(false);
      }
    }

    checkPersonalInfo();
  }, [currentUser]);

  // 1. Jab tak Firebase se data check ho raha hai, loading dikhain
  if (loading) {
    return <div className="bg-[var(--bg)] w-full h-screen grid place-items-center">
      <span className="w-10 h-10 rounded-full border-7 border-[var(--text1)]"></span>
    </div>;
  }

  // 2. Agar personalInfo exist nahi karti, toh redirect karein
  if (!personalInfo) {
    return <Navigate to="/personalinfo" replace />;
  }

  // 3. Agar info exist karti hai, toh protected page render karein
  return children;
}
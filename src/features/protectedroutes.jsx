// src/components/ProtectedRoute.jsx
import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "./auth/authContext";


const ProtectedRoute = ({ children }) => {
  const { currentUser, personalinfo} = useAuth();

  // 1. Jab tak Firebase auth check kar raha hai, tab tak loading dikhaiye
  

  // 2. Agar user logged in hi nahi hai -> Login page par bhejen
  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  // 3. Agar user logged in hai LEKIN personal info fill nahi ki -> Personal Info page par bhejen
  if (personalinfo) {
    return <Navigate to="/dashboard" replace />;
  }
  console.log(personalinfo);
  // 4. Agar user logged in hai aur personal info bhi hai -> Allowed Route (children) Render karein
  return children;
};

export default ProtectedRoute;
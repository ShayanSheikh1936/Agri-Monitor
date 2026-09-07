import { useCallback, useState } from "react";
import { ToastProvider } from "@/components/ui/toast";
import DoctorLogin from "./DoctorLogin";
import DoctorConsole from "./DoctorConsole";
import { isDoctorGranted, signOutDoctor } from "./doctorAuth";

// Agri Doctor portal entry (route: /doctor). Renders the private login gate
// until the doctor signs in, then the console. Access lives in sessionStorage,
// so the initial render reflects whether this tab is already authenticated.
// Mounted inside ToastProvider so the shared chat components can toast.
function DoctorPortalInner() {
  const [granted, setGranted] = useState(() => isDoctorGranted());

  const handleSignOut = useCallback(async () => {
    await signOutDoctor();
    setGranted(false);
  }, []);

  if (!granted) {
    return <DoctorLogin onGranted={() => setGranted(true)} />;
  }
  return <DoctorConsole onSignOut={handleSignOut} />;
}

export default function DoctorPortal() {
  return (
    <ToastProvider>
      <DoctorPortalInner />
    </ToastProvider>
  );
}

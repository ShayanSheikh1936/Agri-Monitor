import { useMemo, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { Stethoscope, History, Inbox } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ToastProvider } from "@/components/ui/toast";
import { useToast } from "@/components/ui/useToast";
import { useAuth } from "@/features/auth/authContext";
import { SLOT_COST } from "@/services/agriDoctorService";
import { formatClock } from "./agridoctor/agriDoctorSlots";
import { buildCropOptions } from "./agridoctor/agriDoctorCrop";
import useAgriDoctor from "./agridoctor/useAgriDoctor";
import CreditBalanceCard from "./agridoctor/CreditBalanceCard";
import DoctorProfileCard from "./agridoctor/DoctorProfileCard";
import SlotPicker from "./agridoctor/SlotPicker";
import SessionCard from "./agridoctor/SessionCard";
import ConsultationChat from "./agridoctor/ConsultationChat";

// Agri Doctor — farmer side. Book a 2-hour consultation slot (5 credits),
// optionally tie it to ONE crop profile, then chat with the doctor (text /
// image / voice) while the window is open. All state flows through
// useAgriDoctor -> agriDoctorService; this file only lays it out. The crop list
// is the one the dashboard layout already fetched (outlet context), so nothing
// here adds a Firestore read or touches another feature.
function AgriDoctorInner() {
  const { currentUser } = useAuth();
  const { userData, userCropData } = useOutletContext();
  const { toast } = useToast();
  const page = useAgriDoctor(currentUser?.uid, userData);
  const [selectedId, setSelectedId] = useState(null);

  // Picker options for the ONE crop a consultation may carry.
  const cropOptions = useMemo(
    () => buildCropOptions(userCropData?.crops),
    [userCropData?.crops]
  );

  const selectedSession = page.sessions.find((s) => s.id === selectedId) ?? null;
  const canAfford = page.balance >= SLOT_COST;
  // Upcoming (slot not started yet) AND currently-open consultations, so a
  // farmer who books a later slot still sees that booking straight away.
  const consultations = page.activeSessions;

  const handleBook = async (slot, date, cropOption) => {
    const res = await page.book(slot, date, cropOption);
    if (res.ok) {
      const startsNow = typeof res.startMs !== "number" || res.startMs <= Date.now();
      const cropNote = cropOption ? ` Crop: ${cropOption.label}.` : "";
      toast({
        title: "Slot booked",
        description: startsNow
          ? `Your 2-hour consultation is open now.${cropNote} ${SLOT_COST} credits deducted.`
          : `Your consultation opens at ${formatClock(res.startMs)}.${cropNote} ${SLOT_COST} credits deducted.`,
        variant: "success",
      });
      // Jump straight into the thread only when it is already open; a future
      // slot is better left as an "Upcoming" card in the list below.
      if (startsNow) setSelectedId(res.sessionId);
    } else {
      toast({
        title: res.title ?? "Booking failed",
        description: res.description ?? "Please try again.",
        variant: "error",
      });
    }
  };

  // Attaching the one crop inside a session — permanent, so confirm what was
  // locked and surface the reason when Firestore/rules refuse the write.
  const handleAttachCrop = async (session, cropOption) => {
    const res = await page.attachCrop(session.id, cropOption);
    if (res.ok) {
      toast({
        title: "Crop attached",
        description: `${cropOption.label} is now locked to this consultation and cannot be changed.`,
        variant: "success",
      });
    } else {
      toast({
        title: res.title ?? "Could not attach crop",
        description: res.description ?? "Please try again.",
        variant: "error",
      });
    }
    return res;
  };

  // ---- Focused consultation view (fills the pane) --------------------------
  if (selectedSession) {
    return (
      <div className="flex-6 h-screen min-w-0 p-3 sm:p-4">
        <div className="mx-auto h-full w-full max-w-[900px]">
          <ConsultationChat
            session={selectedSession}
            role="user"
            onBack={() => setSelectedId(null)}
            doctorProfile={page.doctorProfile}
            cropOptions={cropOptions}
            attachingCrop={page.attachingCrop}
            onAttachCrop={handleAttachCrop}
          />
        </div>
      </div>
    );
  }

  // ---- Overview: credits + booking + consultations -------------------------
  return (
    <div className="scrollbar-thin scrollbar-thumb-[#679936] scrollbar-track-[#F2DEC4] flex-6 h-screen overflow-y-auto overflow-x-hidden p-3 sm:p-4">
      <div className="mx-auto grid w-full max-w-[1280px] content-start gap-3 min-w-0">
        {/* Header */}
        <Card className="min-w-0">
          <CardContent className="grid gap-3">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex min-w-0 items-start gap-3">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-[#679936]/15">
                  <Stethoscope size={24} className="text-[#4a7028]" aria-hidden="true" />
                </span>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h1 className="text-xl font-bold leading-6 text-black">Agri Doctor</h1>
                    <Badge className="bg-[#679936] text-white">Expert consultation</Badge>
                  </div>
                  <p className="mt-1 text-[13px] leading-5 text-black/60">
                    Book a slot, then share photos, messages or voice notes with a real Agri Doctor
                    and get an opinion. Each consultation opens a private 2-hour chat window and
                    can be tied to one crop profile.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Credits */}
        <CreditBalanceCard balance={page.balance} loading={page.loading} error={page.creditError} />

        {/* Who answers — the doctor's own profile, edited from their console */}
        <DoctorProfileCard profile={page.doctorProfile} loading={page.loading} />

        {/* Booked consultations — upcoming plus open now */}
        {consultations.length > 0 && (
          <section aria-label="Your consultations" className="grid gap-2 min-w-0">
            <h2 className="flex items-center gap-2 text-[15px] font-bold text-black">
              <Inbox size={16} className="text-[#3b6d1f]" aria-hidden="true" /> Your consultations
              <Badge className="bg-[#679936] text-white">{consultations.length}</Badge>
            </h2>
            {consultations.map((s) => (
              <SessionCard
                key={s.id}
                session={s}
                cropOptions={cropOptions}
                onOpen={(sess) => setSelectedId(sess.id)}
              />
            ))}
          </section>
        )}

        {/* Booking */}
        <SlotPicker
          slotGrid={page.slotGrid}
          onBook={handleBook}
          bookingKey={page.bookingKey}
          canAfford={canAfford}
          cropOptions={cropOptions}
        />

        {/* History */}
        <section aria-label="Consultation history" className="grid gap-2 min-w-0 pb-3">
          <h2 className="flex items-center gap-2 text-[15px] font-bold text-black">
            <History size={16} className="text-[#3b6d1f]" aria-hidden="true" /> Past consultations
          </h2>
          {page.historySessions.length === 0 ? (
            <Card>
              <CardContent>
                <p className="text-[12px] text-black/55">
                  Your closed consultations will appear here so you can re-read the doctor&apos;s
                  advice anytime.
                </p>
              </CardContent>
            </Card>
          ) : (
            page.historySessions.map((s) => (
              <SessionCard
                key={s.id}
                session={s}
                cropOptions={cropOptions}
                onOpen={(sess) => setSelectedId(sess.id)}
              />
            ))
          )}
        </section>
      </div>
    </div>
  );
}

export default function AgriDoctorPage() {
  return (
    <ToastProvider>
      <AgriDoctorInner />
    </ToastProvider>
  );
}

import { useState } from "react";
import { CalendarClock, Users } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { SLOT_CAPACITY, SLOT_COST } from "@/services/agriDoctorService";
import { cn } from "@/lib/utils";

// Day-tabbed slot grid. Each fixed 2-hour slot shows live occupancy (x/3) and
// disables when full, when its own window has already finished, or when the
// farmer cannot afford a booking. Only the clicked card shows "Booking…" — the
// others simply wait out the in-flight request. Booking itself is handled by the
// parent (useAgriDoctor.book) inside a Firestore transaction, so two farmers can
// never take the same last seat.
export default function SlotPicker({ slotGrid, onBook, bookingKey = null, canAfford = true }) {
  const [day, setDay] = useState(slotGrid[0]?.date ?? "");
  const activeDay = slotGrid.some((d) => d.date === day) ? day : slotGrid[0]?.date ?? "";

  return (
    <Card className="min-w-0">
      <CardContent className="grid gap-3">
        <div className="flex items-center gap-2">
          <CalendarClock size={18} className="text-[#3b6d1f]" aria-hidden="true" />
          <h2 className="text-[15px] font-bold text-black">Book a consultation slot</h2>
        </div>
        <p className="text-[12px] leading-5 text-black/55">
          Each slot is a 2-hour window shared by up to {SLOT_CAPACITY} farmers. Your private chat
          opens when the slot&apos;s own start time arrives — booking an 11:00 slot at 08:00 waits
          until 11:00 — and closes 2 hours later. Booking deducts {SLOT_COST} credits. If you never
          send a message, the booking is cleared automatically when the window ends.
        </p>

        {!canAfford && (
          <p className="rounded-xl bg-red-50 px-3 py-2 text-[12px] font-semibold text-red-600">
            You don&apos;t have enough credits to book a slot ({SLOT_COST} needed).
          </p>
        )}

        <Tabs value={activeDay} onValueChange={setDay}>
          <TabsList>
            {slotGrid.map((d) => (
              <TabsTrigger key={d.date} value={d.date}>
                {d.dayLabel}
              </TabsTrigger>
            ))}
          </TabsList>

          {slotGrid.map((d) => (
            <TabsContent key={d.date} value={d.date}>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {d.slots.map((slot) => {
                  const busy = bookingKey === slot.key;
                  // Another card is mid-booking: block clicks without showing a
                  // spinner on every card.
                  const locked = bookingKey !== null && !busy;
                  const unavailable = slot.full || slot.past;
                  const disabled = unavailable || busy || locked || !canAfford;
                  return (
                    <div
                      key={slot.key}
                      className={cn(
                        "grid gap-2 rounded-2xl border p-3",
                        unavailable
                          ? "border-black/10 bg-black/5"
                          : "border-[var(--border)] bg-white"
                      )}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-[14px] font-bold text-black">{slot.label}</p>
                        <span
                          className={cn(
                            "flex items-center gap-1 text-[11px] font-semibold",
                            slot.full ? "text-red-600" : "text-[#4a7028]"
                          )}
                        >
                          <Users size={12} aria-hidden="true" /> {slot.booked}/{SLOT_CAPACITY}
                        </span>
                      </div>
                      <button
                        type="button"
                        disabled={disabled}
                        onClick={() => onBook(slot, d.date)}
                        className={cn(
                          "rounded-xl px-3 py-2 text-[13px] font-semibold transition-colors",
                          unavailable
                            ? "cursor-not-allowed bg-gray-200 text-gray-500"
                            : busy
                              ? "cursor-wait bg-[#4a7028] text-white"
                              : "cursor-pointer bg-[#679936] text-white hover:bg-[#4a7028] disabled:cursor-not-allowed"
                        )}
                      >
                        {slot.full
                          ? "Full"
                          : slot.past
                            ? "Time passed"
                            : busy
                              ? "Booking…"
                              : `Book · ${SLOT_COST} credits`}
                      </button>
                    </div>
                  );
                })}
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </CardContent>
    </Card>
  );
}

// Shared styling/label metadata for Agri Doctor. Kept separate from the
// components so fast-refresh stays happy (components-only files), mirroring
// the alertMeta.js / disasterMeta.js convention.

import {
  Stethoscope,
  Clock,
  CheckCircle2,
  XCircle,
  MessageSquare,
  Image as ImageIcon,
  Mic,
  User,
  ShieldCheck,
  AlertTriangle,
} from "lucide-react";
import { SESSION_STATUS, MESSAGE_TYPES, ROLES, BOOKING_ERRORS } from "@/services/agriDoctorService";
import { isUpcoming } from "./agriDoctorSlots";

export const FEATURE_ICON = Stethoscope;

export const SESSION_STATUS_META = {
  [SESSION_STATUS.ACTIVE]: {
    label: "Open now",
    className: "bg-green-600 text-white",
    Icon: Clock,
  },
  [SESSION_STATUS.CLOSED]: {
    label: "Closed",
    className: "bg-gray-200 text-gray-600",
    Icon: CheckCircle2,
  },
  [SESSION_STATUS.REMOVED]: {
    label: "No-show",
    className: "bg-red-100 text-red-700",
    Icon: XCircle,
  },
};

export const MESSAGE_TYPE_META = {
  [MESSAGE_TYPES.TEXT]: { label: "Message", Icon: MessageSquare },
  [MESSAGE_TYPES.IMAGE]: { label: "Image", Icon: ImageIcon },
  [MESSAGE_TYPES.VOICE]: { label: "Voice note", Icon: Mic },
};

export const ROLE_META = {
  [ROLES.USER]: { label: "Farmer", Icon: User, shortName: "You" },
  [ROLES.DOCTOR]: { label: "Agri Doctor", Icon: ShieldCheck, shortName: "Doctor" },
};

export function sessionStatusMeta(status) {
  return SESSION_STATUS_META[status] ?? SESSION_STATUS_META[SESSION_STATUS.CLOSED];
}

// A booked slot that has not reached its own start time yet. This is NOT a
// Firestore status (the doc stays ACTIVE) — it is derived from the clock.
export const UPCOMING_META = {
  label: "Upcoming",
  className: "bg-amber-100 text-amber-700",
  Icon: Clock,
};

/** Badge meta for a session's LIVE state: upcoming -> open -> closed/removed. */
export function sessionStateMeta(session) {
  if (session?.status === SESSION_STATUS.ACTIVE && isUpcoming(session)) {
    return UPCOMING_META;
  }
  return sessionStatusMeta(session?.status);
}

export function messageTypeMeta(type) {
  return MESSAGE_TYPE_META[type] ?? MESSAGE_TYPE_META[MESSAGE_TYPES.TEXT];
}

// Friendly copy for the typed booking failures thrown by agriDoctorService.
const BOOKING_ERROR_COPY = {
  [BOOKING_ERRORS.SLOT_FULL]: {
    title: "Slot is full",
    description: "All 3 places for this slot are taken. Please pick another time.",
  },
  [BOOKING_ERRORS.INSUFFICIENT_CREDITS]: {
    title: "Not enough credits",
    description: "A consultation costs 5 credits and your balance is too low.",
  },
  [BOOKING_ERRORS.WINDOW_PASSED]: {
    title: "Slot unavailable",
    description:
      "That slot's 2-hour window has already finished. Please pick a later time.",
  },
  [BOOKING_ERRORS.UNKNOWN]: {
    title: "Booking failed",
    description: "Something went wrong while booking. Please try again.",
  },
};

export function describeBookingError(err) {
  const code = err?.code ?? BOOKING_ERRORS.UNKNOWN;
  return (
    BOOKING_ERROR_COPY[code] ?? {
      title: "Booking failed",
      description: err?.message ?? "Please try again.",
    }
  );
}

export const CREDIT_RULES = {
  freeGrant: 100,
  slotCost: 5,
  windowHours: 2,
  slotCapacity: 3,
};

export { AlertTriangle };

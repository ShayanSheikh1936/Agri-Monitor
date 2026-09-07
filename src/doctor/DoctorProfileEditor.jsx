import { useState } from "react";
import { Loader2, UserRound } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogBody,
  DialogFooter,
} from "@/components/ui/dialog";
import { DEFAULT_DOCTOR_PROFILE } from "@/services/agriDoctorService";

// Editor for the doctor's PUBLIC profile — the card farmers see on the Agri
// Doctor page and in their consultation header. Saved to
// agriDoctor/main -> doctorProfile (doctor-only write in firestore.rules), so an
// edit here reaches every farmer live without a redeploy.
//
// Empty fields are saved as empty strings (never undefined — Firestore rejects
// it), which lets the doctor clear a line they no longer want to show.

const inputClass =
  "w-full rounded-xl border border-[var(--border)] bg-card px-3 py-2 text-[13px] font-semibold text-black outline-none transition-colors hover:border-[#679936]/60 focus:border-[#679936] focus:ring-2 focus:ring-[#679936]/25";

// Stored profile -> controlled input values (experienceYears is a number|null
// in Firestore but must be a string for the number input).
function toForm(profile) {
  const p = profile ?? DEFAULT_DOCTOR_PROFILE;
  return {
    displayName: p.displayName ?? "",
    qualification: p.qualification ?? "",
    specialization: p.specialization ?? "",
    experienceYears: p.experienceYears ?? "",
    languages: p.languages ?? "",
    bio: p.bio ?? "",
  };
}

function Field({ label, hint, htmlFor, children }) {
  return (
    <div className="grid gap-1">
      <label htmlFor={htmlFor} className="text-[12px] font-bold text-black/70">
        {label}
      </label>
      {children}
      {hint ? <p className="text-[11px] text-black/45">{hint}</p> : null}
    </div>
  );
}

// The actual form. It lives INSIDE DialogContent, which the Dialog primitive
// does not render while closed — so opening the dialog remounts this component
// and `useState` seeds it from the stored profile every time. No effect needed,
// and a live profile snapshot arriving mid-edit can never wipe the doctor's
// typing (the seed only runs on mount).
function ProfileForm({ profile, onSave, onDone, saving, error }) {
  const [form, setForm] = useState(() => toForm(profile));

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (saving) return;
    const res = await onSave?.({
      ...form,
      displayName: form.displayName.trim(),
      // Stored as a number or null; normalizeDoctorProfile coerces "" -> null.
      experienceYears:
        form.experienceYears === "" || form.experienceYears == null
          ? null
          : Number(form.experienceYears),
    });
    if (res?.ok) onDone?.();
  };

  return (
    <form onSubmit={handleSubmit}>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <UserRound size={18} className="text-[#4a7028]" aria-hidden="true" />
          Your public profile
        </DialogTitle>
        <DialogDescription>
          Farmers see this on the Agri Doctor page before they book, so they know who will answer
          their consultation. Changes appear live — no refresh needed on their side.
        </DialogDescription>
      </DialogHeader>

      <DialogBody>
        <Field label="Display name" htmlFor="dp-name">
          <input
            id="dp-name"
            className={inputClass}
            value={form.displayName}
            onChange={set("displayName")}
            placeholder="Dr. Ahmad Khan"
            maxLength={60}
            required
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Qualification" htmlFor="dp-qual">
            <input
              id="dp-qual"
              className={inputClass}
              value={form.qualification}
              onChange={set("qualification")}
              placeholder="MSc Agronomy, University of Agriculture"
              maxLength={120}
            />
          </Field>
          <Field label="Specialization" htmlFor="dp-spec">
            <input
              id="dp-spec"
              className={inputClass}
              value={form.specialization}
              onChange={set("specialization")}
              placeholder="Crop diseases and pest management"
              maxLength={120}
            />
          </Field>
          <Field label="Experience (years)" htmlFor="dp-exp">
            <input
              id="dp-exp"
              className={inputClass}
              type="number"
              min="0"
              max="70"
              step="1"
              value={form.experienceYears}
              onChange={set("experienceYears")}
              placeholder="12"
            />
          </Field>
          <Field label="Languages" htmlFor="dp-lang">
            <input
              id="dp-lang"
              className={inputClass}
              value={form.languages}
              onChange={set("languages")}
              placeholder="Urdu, Punjabi, English"
              maxLength={120}
            />
          </Field>
        </div>

        <Field
          label="Short bio"
          htmlFor="dp-bio"
          hint="Two or three sentences about the advice you give. Optional."
        >
          <textarea
            id="dp-bio"
            className={`${inputClass} min-h-[84px] resize-y`}
            value={form.bio}
            onChange={set("bio")}
            placeholder="I help farmers identify crop disease early and choose safe, affordable treatments."
            maxLength={400}
          />
        </Field>

        {error && (
          <p role="alert" className="text-[12px] font-semibold text-red-600">
            {error}
          </p>
        )}
      </DialogBody>

      <DialogFooter>
        <button
          type="button"
          onClick={onDone}
          disabled={saving}
          className="rounded-xl border border-[var(--border)] px-3 py-2 text-[13px] font-semibold text-black/70 transition-colors hover:bg-black/5 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={saving || !form.displayName.trim()}
          className="flex items-center gap-1.5 rounded-xl bg-[#679936] px-4 py-2 text-[13px] font-semibold text-white transition-colors hover:bg-[#4a7028] cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
        >
          {saving && <Loader2 size={14} className="animate-spin" aria-hidden="true" />}
          {saving ? "Saving…" : "Save profile"}
        </button>
      </DialogFooter>
    </form>
  );
}

export default function DoctorProfileEditor({
  open,
  onOpenChange,
  profile = null,
  onSave,
  saving = false,
  error = "",
}) {
  const close = () => onOpenChange?.(false);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent onClose={close} className="max-w-[560px]">
        <ProfileForm
          profile={profile}
          onSave={onSave}
          onDone={close}
          saving={saving}
          error={error}
        />
      </DialogContent>
    </Dialog>
  );
}

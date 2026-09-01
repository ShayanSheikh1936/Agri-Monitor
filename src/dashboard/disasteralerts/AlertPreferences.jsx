import { useState } from "react";
import { SlidersHorizontal, Globe, Mail, Smartphone, BellRing, Save } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectItem } from "@/components/ui/select";
import { Tooltip } from "@/components/ui/tooltip";
import { useToast } from "@/components/ui/useToast";
import { cn } from "@/lib/utils";
import {
  DISASTER_TYPE_META,
  DISASTER_TYPE_KEYS,
  SEVERITY_META,
} from "./disasterMeta";

// Accessible ON/OFF switch (same pattern as the Weather Alerts page).
function PrefSwitch({ label, enabled, onChange }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-[13px] font-semibold text-black/75">{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={enabled}
        aria-label={label}
        onClick={onChange}
        className={`w-[45px] h-[22px] rounded-full relative transition-colors duration-300 shrink-0 cursor-pointer ${
          enabled ? "bg-[#22c55e]" : "bg-[#d1d5db]"
        }`}
      >
        <span
          className={`absolute top-[3px] ${enabled ? "left-[26px]" : "left-[3px]"} w-[15px] h-[15px] bg-white rounded-full transition-[left] duration-300 ease-in-out shadow-[0_2px_4px_rgba(0,0,0,0.2)] pointer-events-none`}
        />
      </button>
    </div>
  );
}

// Alert Preferences — region, disaster categories, minimum severity and
// notification channels. Saved through the service layer (persisted).
export default function AlertPreferences({ prefs, regions, regionId, onRegionChange, onSave }) {
  const { toast } = useToast();
  const [draft, setDraft] = useState(() => ({ ...prefs }));

  const toggleType = (type) => {
    setDraft((prev) => {
      const has = prev.disasterTypes.includes(type);
      const next = has
        ? prev.disasterTypes.filter((t) => t !== type)
        : [...prev.disasterTypes, type];
      return { ...prev, disasterTypes: next };
    });
  };

  const toggleChannel = (channel) => {
    setDraft((prev) => ({
      ...prev,
      notifications: { ...prev.notifications, [channel]: !prev.notifications[channel] },
    }));
  };

  const handleSave = () => {
    if (draft.disasterTypes.length === 0) {
      toast({
        title: "Select at least one disaster category",
        description: "Preferences need one or more categories to monitor.",
        variant: "error",
      });
      return;
    }
    const next = onSave(draft);
    // savePrefs merges the draft with the current region — adopt the merged
    // object so the draft never drifts from what was actually persisted.
    setDraft(next);
    toast({
      title: "Alert preferences saved",
      description: "Your disaster monitoring settings are now active.",
      variant: "success",
    });
  };

  return (
    <Card className="min-w-0">
      <CardContent className="grid gap-4">
        <div>
          <h2 className="flex items-center gap-2 text-[15px] font-bold text-black">
            <SlidersHorizontal size={17} className="text-[#3b6d1f]" aria-hidden="true" />
            Alert Preferences
          </h2>
          <p className="text-[12px] text-black/55 leading-4 mt-0.5">
            Choose what you get alerted about. Category and severity filters apply immediately to the alerts shown above.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {/* Country / region */}
          <label className="grid gap-1.5 text-[12px] font-semibold text-black/70">
            <span className="flex items-center gap-1.5">
              <Globe size={13} aria-hidden="true" /> Country / Region
            </span>
            <Select
              value={regionId}
              onChange={(e) => onRegionChange(e.target.value)}
              aria-label="Monitoring region"
            >
              {regions.map((r) => (
                <SelectItem key={r.id} value={r.id}>
                  {r.name} ({r.country})
                </SelectItem>
              ))}
            </Select>
          </label>

          {/* Minimum severity */}
          <label className="grid gap-1.5 text-[12px] font-semibold text-black/70">
            <span>Minimum severity</span>
            <Select
              value={draft.minSeverity}
              onChange={(e) => setDraft((prev) => ({ ...prev, minSeverity: e.target.value }))}
              aria-label="Minimum severity"
            >
              {["low", "medium", "high", "critical"].map((s) => (
                <SelectItem key={s} value={s}>
                  {SEVERITY_META[s].label} and above
                </SelectItem>
              ))}
            </Select>
          </label>
        </div>

        {/* Disaster categories */}
        <div className="grid gap-1.5">
          <span className="text-[12px] font-semibold text-black/70">Disaster categories</span>
          <div className="flex flex-wrap gap-1.5">
            {DISASTER_TYPE_KEYS.map((key) => {
              const meta = DISASTER_TYPE_META[key];
              const active = draft.disasterTypes.includes(key);
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => toggleType(key)}
                  aria-pressed={active}
                  className={cn(
                    "flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[12px] font-semibold transition-colors cursor-pointer",
                    active
                      ? "border-[#679936] bg-[#679936] text-white"
                      : "border-black/15 bg-white text-black/60 hover:border-[#679936]/50"
                  )}
                >
                  <meta.Icon size={13} aria-hidden="true" />
                  {meta.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Notification channels */}
        <div className="grid gap-2 rounded-xl bg-[#D7E8C0]/40 p-3 sm:grid-cols-3">
          <PrefSwitch
            label="In-app alerts"
            enabled={draft.notifications.inApp}
            onChange={() => toggleChannel("inApp")}
          />
          <div className="flex items-center gap-1.5">
            <Mail size={13} className="text-black/40" aria-hidden="true" />
            <PrefSwitch
              label="Email"
              enabled={draft.notifications.email}
              onChange={() => toggleChannel("email")}
            />
          </div>
          <div className="flex items-center gap-1.5">
            <Smartphone size={13} className="text-black/40" aria-hidden="true" />
            <PrefSwitch
              label="SMS"
              enabled={draft.notifications.sms}
              onChange={() => toggleChannel("sms")}
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="flex items-center gap-1.5 text-[11px] text-black/45">
            <BellRing size={12} aria-hidden="true" />
            Email and SMS delivery activate once a notification provider is connected.
          </p>
          <Tooltip content="Applies filters and saves your settings" side="top">
            <button
              type="button"
              onClick={handleSave}
              className="flex items-center gap-1.5 rounded-xl bg-[#679936] px-3.5 py-2 text-[13px] font-bold text-white transition-colors hover:bg-[#4a7028] cursor-pointer"
            >
              <Save size={14} aria-hidden="true" /> Save preferences
            </button>
          </Tooltip>
        </div>
      </CardContent>
    </Card>
  );
}

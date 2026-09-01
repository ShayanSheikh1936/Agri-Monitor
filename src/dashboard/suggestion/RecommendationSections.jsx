import { useState } from "react";
import {
  ChevronDown,
  Sparkles,
  Lightbulb,
  Droplets,
  Sprout,
  Leaf,
  Bug,
  Biohazard,
  CloudSun,
  TrendingUp,
  Wheat,
  ClipboardList,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/cropUtils";

// Display metadata for the recommendation categories. Only categories that
// actually contain recommendations are ever rendered. Kept non-exported so
// this file only exports a component (react-refresh friendly).
const CATEGORY_META = {
  irrigation: { label: "Irrigation", icon: Droplets },
  soil_nutrition: { label: "Soil & Nutrition", icon: Sprout },
  crop_care: { label: "Crop Care", icon: Leaf },
  pest_monitoring: { label: "Pest Monitoring", icon: Bug },
  disease_monitoring: { label: "Disease Monitoring", icon: Biohazard },
  weather_actions: { label: "Weather-based Actions", icon: CloudSun },
  stage_actions: { label: "Growth-stage Actions", icon: TrendingUp },
  harvest_preparation: { label: "Harvest Preparation", icon: Wheat },
  farm_management: { label: "General Farm Management", icon: ClipboardList },
};

const PRIORITY_STYLES = {
  high: "bg-red-100 text-red-700 border-red-200",
  medium: "bg-amber-100 text-amber-700 border-amber-200",
  low: "bg-[#D7E8C0] text-emerald-800 border-emerald-200",
};

// One recommendation card — hedged language, clear priority, expandable
// "Why?" showing the reason plus the REAL data signals it was built from
// (never internal prompts or API details).
function RecommendationCard({ item, contextSignals }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-xl bg-[#D7E8C0]/40 px-3 py-2.5">
      <div className="flex flex-wrap items-center gap-1.5">
        <p className="text-[14px] font-semibold text-black">{item.title}</p>
        <span
          className={`text-[10px] px-1.5 py-0 rounded-full border ${PRIORITY_STYLES[item.priority] ?? PRIORITY_STYLES.medium}`}
        >
          {item.priority}
        </span>
        {item.stage && (
          <Badge variant="outline" className="text-[10px] px-1.5 py-0">
            {item.stage}
          </Badge>
        )}
        {item.timing && (
          <span className="text-[11px] italic text-black/50">{item.timing}</span>
        )}
        {item.aiGenerated && (
          <span className="ml-auto flex items-center gap-1 text-[10px] text-black/45">
            <Sparkles size={11} className="text-[var(--text1)]" /> AI-generated
          </span>
        )}
      </div>
      <p className="mt-1 text-[13px] leading-5 text-black/75">
        {item.recommendation}
      </p>

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="mt-1.5 flex items-center gap-1 text-[12px] font-semibold text-[var(--text1)] hover:underline cursor-pointer"
      >
        <ChevronDown
          size={13}
          className={`transition-transform ${open ? "rotate-180" : ""}`}
        />
        Why this recommendation?
      </button>

      {open && (
        <div className="mt-2 grid gap-2 rounded-lg bg-white/60 px-3 py-2">
          {item.reason ? (
            <p className="text-[12px] leading-4 text-black/70">
              <span className="font-semibold text-black">Reason: </span>
              {item.reason}
            </p>
          ) : (
            <p className="text-[12px] text-black/45">No reason recorded.</p>
          )}
          {contextSignals.length > 0 && (
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-black/45">
                Data used
              </p>
              <ul className="mt-0.5 grid gap-0.5">
                {contextSignals.map((signal) => (
                  <li key={signal} className="text-[12px] leading-4 text-black/65">
                    • {signal}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Groups the most recent saved recommendation batch by category. Purely
// presentational — the page supplies the persisted document.
export default function RecommendationSections({
  crop,
  recommendation = null,
  contextSignals = [],
  loading = false,
}) {
  const items = Array.isArray(recommendation?.items) ? recommendation.items : [];
  const byCategory = new Map();
  for (const item of items) {
    const key = CATEGORY_META[item.category] ? item.category : "farm_management";
    if (!byCategory.has(key)) byCategory.set(key, []);
    byCategory.get(key).push(item);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-[16px]">
          <Lightbulb size={17} className="text-[var(--text1)]" />
          What to do next for {crop?.CropName || "this crop"}
          {recommendation?.createdAt && (
            <Badge variant="secondary" className="ml-auto">
              {formatDate(recommendation.createdAt)}
            </Badge>
          )}
        </CardTitle>
        <CardDescription>
          Recommendations use cautious language — treat them as guidance to
          review, not certainty.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        {loading && !items.length ? (
          <p className="text-[13px] text-black/50">Loading recommendations…</p>
        ) : items.length === 0 ? (
          <p className="rounded-xl bg-[#D7E8C0]/40 px-3 py-3 text-[13px] leading-5 text-black/65">
            No recommendations yet for this crop. Press{" "}
            <strong>Refresh recommendations</strong> above to generate them
            from your recorded crop data — nothing is invented.
          </p>
        ) : (
          <>
            {recommendation?.summary && (
              <p className="rounded-xl bg-[#D7E8C0]/30 px-3 py-2 text-[13px] leading-5 text-black/70">
                {recommendation.summary}
              </p>
            )}
            {Array.from(byCategory.entries()).map(([key, catItems]) => {
              const { label, icon: Icon } = CATEGORY_META[key];
              return (
                <section key={key}>
                  <p className="mb-1.5 flex items-center gap-1.5 text-[13px] font-bold text-[#3f5f22]">
                    <Icon size={14} className="text-[var(--text1)]" />
                    {label}
                    <span className="font-normal text-black/40">
                      · {catItems.length}
                    </span>
                  </p>
                  <div className="grid gap-2">
                    {catItems.map((item, i) => (
                      <RecommendationCard
                        key={`${item.title}-${i}`}
                        item={item}
                        contextSignals={contextSignals}
                      />
                    ))}
                  </div>
                </section>
              );
            })}
          </>
        )}
      </CardContent>
    </Card>
  );
}

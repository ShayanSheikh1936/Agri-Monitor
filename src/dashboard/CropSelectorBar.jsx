import { cropKey, getPlantAgeDays } from "@/lib/cropUtils";

// Shared crop selector strip — the exact selector previously inlined on the
// Crop Timeline page, extracted so Crop Timeline, Daily Crop Progress and
// Crop Suggestion always select crops the same way (cross-page consistency).
export default function CropSelectorBar({ crops, selectedIndex, onSelect }) {
  return (
    <div className="mb-4 flex gap-2 overflow-x-auto pb-1 scrollbar-none">
      {crops.map((c, index) => {
        const active = index === selectedIndex;
        const ageDays = getPlantAgeDays(c);
        return (
          <button
            key={cropKey(c, index)}
            onClick={() => onSelect(index)}
            className={`flex shrink-0 items-center gap-2 rounded-2xl border-2 px-2 py-1.5 transition-colors cursor-pointer ${
              active
                ? "border-[var(--text1)] bg-[#D7E8C0]"
                : "border-transparent bg-[rgba(0,0,0,0.06)] hover:bg-[#D7E8C0]/50"
            }`}
          >
            <span className="w-9 h-9 rounded-full overflow-hidden border border-[var(--text1)] bg-[#D7E8C0]">
              {c.cropImage ? (
                <img
                  src={c.cropImage}
                  alt={c.CropName || "Crop"}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="flex items-center justify-center w-full h-full text-sm font-bold text-[var(--text1)]">
                  {(c.CropName || "C").charAt(0).toUpperCase()}
                </span>
              )}
            </span>
            <span className="flex flex-col items-start leading-tight">
              <span className="text-[14px] font-semibold text-black max-w-[140px] truncate">
                {c.CropName || `Crop ${index + 1}`}
              </span>
              <span className="text-[11px] text-black/50">
                {ageDays != null ? `Day ${ageDays}` : "Age unknown"}
              </span>
            </span>
          </button>
        );
      })}
    </div>
  );
}

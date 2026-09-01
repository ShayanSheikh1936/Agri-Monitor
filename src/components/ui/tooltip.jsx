import { cn } from "@/lib/utils";

// Lightweight hover/focus tooltip — pure CSS visibility, no dependency.
// Wraps any trigger element; the tooltip shows on hover and keyboard focus.

function Tooltip({ content, side = "top", className, children }) {
  const position =
    side === "bottom"
      ? "top-full mt-1.5"
      : side === "left"
        ? "right-full top-1/2 -translate-y-1/2 mr-1.5"
        : side === "right"
          ? "left-full top-1/2 -translate-y-1/2 ml-1.5"
          : "bottom-full mb-1.5";

  return (
    <span className="relative inline-flex" data-slot="tooltip">
      <span tabIndex={0} className="inline-flex outline-none group/tt">
        {children}
      </span>
      <span
        role="tooltip"
        className={cn(
          "pointer-events-none absolute left-1/2 z-[9999] -translate-x-1/2 whitespace-nowrap rounded-md bg-[#26352a] px-2 py-1 text-[11px] font-semibold text-white opacity-0 shadow-md transition-opacity duration-150 group-hover/tt:opacity-100 group-focus-within/tt:opacity-100",
          position,
          className
        )}
      >
        {content}
      </span>
    </span>
  );
}

export { Tooltip };

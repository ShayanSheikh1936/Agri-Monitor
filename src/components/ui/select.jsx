import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

// Lightweight styled native <select> — keeps native keyboard/screen-reader
// behavior while matching the Agri Monitor look. No extra dependency.

function Select({ className, children, ...props }) {
  return (
    <div className={cn("relative inline-flex w-full min-w-0", className)}>
      <select
        data-slot="select"
        className="w-full appearance-none rounded-xl border border-[var(--border)] bg-card px-3 py-2 pr-8 text-[13px] font-semibold text-black outline-none transition-colors hover:border-[#679936]/60 focus:border-[#679936] focus:ring-2 focus:ring-[#679936]/25 cursor-pointer"
        {...props}
      >
        {children}
      </select>
      <ChevronDown
        size={14}
        className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-black/50"
        aria-hidden="true"
      />
    </div>
  );
}

function SelectItem({ children, ...props }) {
  return (
    <option data-slot="select-item" {...props}>
      {children}
    </option>
  );
}

export { Select, SelectItem };

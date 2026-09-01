import { createContext, useContext } from "react";
import { cn } from "@/lib/utils";

// Minimal shadcn-style Tabs primitive — dependency free (no radix needed),
// matches the existing components/ui conventions (data-slot + cn()).

const TabsContext = createContext(null);

function Tabs({ value, onValueChange, className, children, ...props }) {
  return (
    <TabsContext.Provider value={{ value, onValueChange }}>
      <div data-slot="tabs" className={cn("grid gap-3", className)} {...props}>
        {children}
      </div>
    </TabsContext.Provider>
  );
}

function TabsList({ className, children, ...props }) {
  return (
    <div
      data-slot="tabs-list"
      role="tablist"
      className={cn(
        "inline-flex w-fit max-w-full flex-wrap gap-1 rounded-xl bg-[#D7E8C0]/70 p-1",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

function TabsTrigger({ value, className, children, ...props }) {
  const ctx = useContext(TabsContext);
  const active = ctx?.value === value;
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      data-state={active ? "active" : "inactive"}
      onClick={() => ctx?.onValueChange?.(value)}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[13px] font-semibold transition-colors cursor-pointer",
        active
          ? "bg-[#679936] text-white shadow-sm"
          : "text-black/65 hover:bg-black/5 hover:text-black",
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}

function TabsContent({ value, className, children, ...props }) {
  const ctx = useContext(TabsContext);
  if (ctx?.value !== value) return null;
  return (
    <div data-slot="tabs-content" role="tabpanel" className={cn(className)} {...props}>
      {children}
    </div>
  );
}

export { Tabs, TabsList, TabsTrigger, TabsContent };

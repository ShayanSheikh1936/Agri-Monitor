import { Wallet } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { FREE_CREDITS, SLOT_COST } from "@/services/agriDoctorService";

// Credit wallet header for the Agri Doctor page. Read-only — the balance is a
// live subscription from useAgriDoctor, and every booking deducts SLOT_COST.
export default function CreditBalanceCard({ balance = 0, loading = false, error = "" }) {
  const consultsLeft = Math.floor(Math.max(0, balance) / SLOT_COST);

  return (
    <Card className="min-w-0">
      <CardContent className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-[#679936]/15">
            <Wallet size={22} className="text-[#4a7028]" aria-hidden="true" />
          </span>
          <div>
            <p className="text-[13px] font-semibold text-black/60">Consultation credits</p>
            {loading ? (
              <Skeleton className="mt-1 h-7 w-28" />
            ) : (
              <p className="text-2xl font-extrabold leading-7 text-black">
                {balance} <span className="text-sm font-semibold text-black/50">credits</span>
              </p>
            )}
          </div>
        </div>

        <div className="text-right">
          <p className="text-[13px] font-semibold text-[#4a7028]">
            {consultsLeft} consultation{consultsLeft === 1 ? "" : "s"} left
          </p>
          <p className="text-[11px] text-black/50">
            {SLOT_COST} credits per slot · {FREE_CREDITS} free on first use
          </p>
        </div>

        {error && (
          <p role="alert" className="w-full text-[12px] font-semibold text-red-600">
            {error}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

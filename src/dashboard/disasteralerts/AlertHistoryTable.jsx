import { History } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  disasterTypeMeta,
  severityMeta,
  statusMeta,
  formatDisasterDate,
} from "./disasterMeta";

// Alert History — responsive table on md+ screens, stacked rows on mobile.
export default function AlertHistoryTable({ history }) {
  return (
    <Card className="min-w-0">
      <CardContent className="grid gap-3">
        <h2 className="flex items-center gap-2 text-[15px] font-bold text-black">
          <History size={17} className="text-[#3b6d1f]" aria-hidden="true" />
          Alert History
        </h2>

        {history.length === 0 ? (
          <p className="text-[12px] text-black/55">
            No past disaster events recorded for this region yet.
          </p>
        ) : (
          <>
            {/* Desktop / tablet table */}
            <div className="hidden md:block overflow-x-auto rounded-xl border border-black/8">
              <table className="w-full border-collapse text-left text-[12px]">
                <thead>
                  <tr className="bg-[#D7E8C0]/60 text-black/70">
                    <th className="px-3 py-2 font-bold">Disaster</th>
                    <th className="px-3 py-2 font-bold">Location</th>
                    <th className="px-3 py-2 font-bold">Severity</th>
                    <th className="px-3 py-2 font-bold">Date</th>
                    <th className="px-3 py-2 font-bold">Status</th>
                    <th className="px-3 py-2 font-bold">Impact</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((item) => {
                    const type = disasterTypeMeta(item.type);
                    const severity = severityMeta(item.severity);
                    const status = statusMeta(item.status);
                    return (
                      <tr key={item.id} className="border-t border-black/5 align-top hover:bg-black/[0.025]">
                        <td className="px-3 py-2.5">
                          <span className="flex items-center gap-1.5 font-semibold text-black">
                            <type.Icon size={14} className="text-[#3b6d1f] shrink-0" aria-hidden="true" />
                            {item.name}
                          </span>
                          <span className="text-[11px] text-black/45">{type.label}</span>
                        </td>
                        <td className="px-3 py-2.5 text-black/70">{item.location}</td>
                        <td className="px-3 py-2.5">
                          <Badge className={severity.className}>{severity.label}</Badge>
                        </td>
                        <td className="px-3 py-2.5 whitespace-nowrap text-black/70">
                          {formatDisasterDate(item.startedAt)}
                        </td>
                        <td className="px-3 py-2.5">
                          <Badge className={status.className}>{status.label}</Badge>
                        </td>
                        <td className="px-3 py-2.5 text-black/60 max-w-[300px]">{item.impactSummary}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile stacked rows */}
            <div className="grid gap-2 md:hidden">
              {history.map((item) => {
                const type = disasterTypeMeta(item.type);
                const severity = severityMeta(item.severity);
                const status = statusMeta(item.status);
                return (
                  <div key={item.id} className="rounded-xl border border-black/8 p-2.5 grid gap-1.5">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="flex items-center gap-1.5 text-[13px] font-bold text-black">
                        <type.Icon size={14} className="text-[#3b6d1f]" aria-hidden="true" />
                        {item.name}
                      </span>
                      <Badge className={`ml-auto ${severity.className}`}>{severity.label}</Badge>
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-black/55">
                      <span>{item.location}</span>
                      <span aria-hidden="true">·</span>
                      <span>{formatDisasterDate(item.startedAt)}</span>
                      <Badge className={status.className}>{status.label}</Badge>
                    </div>
                    <p className="text-[12px] text-black/60 leading-4">{item.impactSummary}</p>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

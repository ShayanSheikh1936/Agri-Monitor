import { useState } from "react";
import { CheckCircle2, Info } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  disasterTypeMeta,
  preparationRecommendations,
  PREPAREDNESS_DISCLAIMER,
} from "./disasterMeta";

// Preparation Recommendations — disaster-specific agricultural preparedness,
// clearly labeled as guidance (never official emergency instructions).
export default function Recommendations({ alerts }) {
  const types = [...new Set(alerts.map((a) => a.type))];
  const [tab, setTab] = useState(null);
  const activeTab = types.includes(tab) ? tab : types[0] ?? null;

  return (
    <Card className="min-w-0">
      <CardContent className="grid gap-3">
        <div>
          <h2 className="text-[15px] font-bold text-black">Preparation Recommendations</h2>
          <p className="text-[12px] text-black/55 leading-4 mt-0.5">
            Agricultural preparedness for the threats active in this region.
          </p>
        </div>

        {types.length === 0 ? (
          <div className="flex items-center gap-2 rounded-xl bg-green-50 p-3">
            <CheckCircle2 size={18} className="text-green-600 shrink-0" aria-hidden="true" />
            <p className="text-[12px] text-black/65">
              No active threats — nothing to prepare for right now.
            </p>
          </div>
        ) : (
          <Tabs value={activeTab} onValueChange={setTab}>
            <TabsList>
              {types.map((type) => {
                const meta = disasterTypeMeta(type);
                return (
                  <TabsTrigger key={type} value={type}>
                    <meta.Icon size={13} aria-hidden="true" />
                    {meta.label}
                  </TabsTrigger>
                );
              })}
            </TabsList>
            {types.map((type) => (
              <TabsContent key={type} value={type}>
                <ul className="grid gap-2">
                  {preparationRecommendations(type).map((rec) => (
                    <li
                      key={rec.title}
                      className="flex items-start gap-2.5 rounded-xl bg-[#D7E8C0]/40 p-2.5"
                    >
                      <CheckCircle2
                        size={16}
                        className="mt-0.5 shrink-0 text-[#3b6d1f]"
                        aria-hidden="true"
                      />
                      <div className="min-w-0">
                        <p className="text-[13px] font-bold text-black leading-4">{rec.title}</p>
                        <p className="text-[12px] text-black/60 leading-4 mt-0.5">{rec.detail}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              </TabsContent>
            ))}
          </Tabs>
        )}

        <p className="flex items-start gap-1.5 text-[11px] text-black/40 leading-4">
          <Info size={12} className="mt-0.5 shrink-0" aria-hidden="true" />
          {PREPAREDNESS_DISCLAIMER}
        </p>
      </CardContent>
    </Card>
  );
}

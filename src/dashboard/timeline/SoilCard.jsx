import { Leaf } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function SoilCard({ crop }) {
  return (
    <Card className="gap-3">
      <CardHeader className="pb-0">
        <CardTitle className="flex items-center gap-2 text-[15px]">
          <Leaf size={16} className="text-[var(--text1)]" />
          Soil &amp; Seed
        </CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-2 gap-2">
        <div className="rounded-xl bg-[#D7E8C0]/50 px-3 py-2">
          <p className="text-[11px] font-bold uppercase text-[#526b55]">
            Soil Type
          </p>
          <p className="text-[14px] font-semibold text-black">
            {crop.SoilType || (
              <span className="font-normal text-black/40">Unknown</span>
            )}
          </p>
        </div>
        <div className="rounded-xl bg-[#D7E8C0]/50 px-3 py-2">
          <p className="text-[11px] font-bold uppercase text-[#526b55]">
            Seed Type
          </p>
          <p className="text-[14px] font-semibold text-black">
            {crop.SeedType || (
              <span className="font-normal text-black/40">Unknown</span>
            )}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

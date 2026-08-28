import { ImagePlus } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

// Shows the crop photo already stored on the crop entry (cropImage).
// AI image analysis is intentionally NOT implemented at this stage.
export default function CropImageAnalysis({ crop }) {
  return (
    <Card className="gap-3">
      <CardHeader className="pb-0">
        <CardTitle className="flex items-center gap-2 text-[15px]">
          <ImagePlus size={16} className="text-[var(--text1)]" />
          Crop Image Analysis
          <Badge variant="secondary" className="ml-auto">
            AI coming soon
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="grid gap-2">
        {crop.cropImage ? (
          <img
            src={crop.cropImage}
            alt={crop.CropName || "Crop"}
            className="w-full max-h-44 object-cover rounded-xl border border-[var(--text1)]/30"
          />
        ) : (
          <div className="grid place-items-center gap-1 rounded-xl bg-[#D7E8C0]/30 px-3 py-6 text-center">
            <p className="text-[13px] font-semibold text-black/60">
              No crop image uploaded
            </p>
            <p className="text-[12px] text-black/45">
              Add one from the Add New Crop page.
            </p>
          </div>
        )}
        <p className="rounded-xl border border-dashed border-[var(--text1)]/40 px-3 py-2 text-[12px] leading-5 text-black/60">
          AI health analysis of crop photos will be available here in a later
          phase.
        </p>
      </CardContent>
    </Card>
  );
}

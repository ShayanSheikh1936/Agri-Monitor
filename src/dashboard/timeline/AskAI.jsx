import { Send } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";

// The AI assistant already exists as the global floating Chatbot component
// (rendered by dashboardLayout.jsx). This card points the user to it with
// suggestions relevant to the selected crop — no duplicate AI service is
// created at this stage.
export default function AskAI({ crop }) {
  const cropName = crop.CropName || "my crop";
  const suggestions = [
    `How do I improve the growth of ${cropName}?`,
    `What nutrients does ${cropName} need at this stage?`,
    `How often should I irrigate ${cropName}?`,
  ];

  return (
    <Card className="gap-3">
      <CardHeader className="pb-0">
        <CardTitle className="flex items-center gap-2 text-[15px]">
          <Send size={16} className="text-[var(--text1)]" />
          Ask Agri Assistant
        </CardTitle>
        <CardDescription>
          The AI assistant is available through the floating button at the
          bottom-right of your screen.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-2">
        {suggestions.map((suggestion) => (
          <p
            key={suggestion}
            className="rounded-xl bg-[#D7E8C0]/40 px-3 py-2 text-[13px] text-black/70"
          >
            “{suggestion}”
          </p>
        ))}
        <p className="text-[12px] text-black/40">
          Direct crop-specific AI answers will be embedded here in a later
          phase.
        </p>
      </CardContent>
    </Card>
  );
}

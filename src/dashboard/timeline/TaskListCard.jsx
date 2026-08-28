import { Clock } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

// Shared presentational base for TodayTasks / TomorrowTasks / UpcomingTasks.
// At the foundation stage there is no generated timeline yet, so every list
// renders an honest empty state — no fake tasks are invented.
export default function TaskListCard({ title, description }) {
  return (
    <Card className="gap-3">
      <CardHeader className="pb-0">
        <CardTitle className="flex items-center gap-2 text-[15px]">
          <Clock size={16} className="text-[var(--text1)]" />
          {title}
          <Badge variant="secondary" className="ml-auto">
            AI coming soon
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="rounded-xl bg-[#D7E8C0]/40 px-3 py-3 text-[13px] leading-5 text-black/65">
          {description}
        </div>
      </CardContent>
    </Card>
  );
}

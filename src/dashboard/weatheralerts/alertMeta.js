// Shared styling/label metadata for weather alerts. Kept separate from the
// AlertCard component file so fast-refresh stays happy (components only).

import {
  CloudRain,
  CloudDrizzle,
  Thermometer,
  Snowflake,
  Wind,
  Droplets,
  Wheat,
  Activity,
  Sun,
  Zap,
  AlertTriangle,
} from "lucide-react";

export const ALERT_TYPE_META = {
  heavy_rain: { label: "Heavy Rain", Icon: CloudRain },
  high_rain_probability: { label: "High Rain Probability", Icon: CloudDrizzle },
  extreme_heat: { label: "Extreme Heat", Icon: Thermometer },
  cold_frost: { label: "Cold / Frost Risk", Icon: Snowflake },
  strong_wind: { label: "Strong Wind", Icon: Wind },
  high_humidity: { label: "High Humidity", Icon: Droplets },
  dry_water_stress: { label: "Dry / Water Stress", Icon: Wheat },
  rapid_change: { label: "Rapid Weather Change", Icon: Activity },
  uv_risk: { label: "UV Risk", Icon: Sun },
  severe_weather: { label: "Severe Weather", Icon: Zap },
};

export const SEVERITY_META = {
  critical: { label: "Critical", className: "bg-red-600 text-white" },
  high: { label: "High", className: "bg-orange-500 text-white" },
  medium: { label: "Medium", className: "bg-amber-400 text-black" },
  low: { label: "Low", className: "bg-green-600 text-white" },
};

export const STATUS_META = {
  active: { label: "Active", className: "bg-red-100 text-red-700" },
  acknowledged: { label: "Acknowledged", className: "bg-blue-100 text-blue-700" },
  resolved: { label: "Resolved", className: "bg-green-100 text-green-700" },
  expired: { label: "Expired", className: "bg-gray-200 text-gray-600" },
};

export const NOTIFICATION_STATUS_LABELS = {
  sent: "Notification sent",
  failed: "Notification failed",
  skipped_disabled: "Notification skipped (alerts disabled)",
  skipped_duplicate: "Notification skipped (duplicate)",
};

export function alertTypeMeta(type) {
  return ALERT_TYPE_META[type] ?? { label: type ?? "Weather", Icon: AlertTriangle };
}

export function formatAlertTime(ms) {
  if (typeof ms !== "number" || Number.isNaN(ms)) return "—";
  return new Date(ms).toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

import * as React from "react";
import { Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface TimeInputProps {
  value: string; // HH:MM format (24hr for storage, or 12hr display value)
  onChange: (value: string) => void;
  timeFormat: "12hr" | "24hr";
  period?: "AM" | "PM";
  onPeriodChange?: (period: "AM" | "PM") => void;
  className?: string;
  placeholder?: string;
}

export function TimeInput({
  value,
  onChange,
  timeFormat,
  period = "AM",
  onPeriodChange,
  className,
  placeholder = "--:--",
}: TimeInputProps) {
  // Parse current value
  const [hours, minutes] = React.useMemo(() => {
    if (!value) return ["", ""];
    const parts = value.split(":");
    return [parts[0] || "", parts[1] || ""];
  }, [value]);

  // Generate hours based on format
  const hourOptions = React.useMemo(() => {
    if (timeFormat === "12hr") {
      // 12-hour format: 12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11
      return Array.from({ length: 12 }, (_, i) => {
        const hour = i === 0 ? 12 : i;
        return { value: hour.toString().padStart(2, "0"), label: hour.toString() };
      });
    } else {
      // 24-hour format: 00-23
      return Array.from({ length: 24 }, (_, i) => ({
        value: i.toString().padStart(2, "0"),
        label: i.toString().padStart(2, "0"),
      }));
    }
  }, [timeFormat]);

  // Generate all 60 minutes (00-59)
  const minuteOptions = React.useMemo(() => {
    return Array.from({ length: 60 }, (_, i) => ({
      value: i.toString().padStart(2, "0"),
      label: i.toString().padStart(2, "0"),
    }));
  }, []);

  const handleHourChange = (newHour: string) => {
    const mins = minutes || "00";
    onChange(`${newHour}:${mins}`);
  };

  const handleMinuteChange = (newMinute: string) => {
    const hrs = hours || (timeFormat === "12hr" ? "12" : "00");
    onChange(`${hrs}:${newMinute}`);
  };

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className="flex items-center gap-1 flex-1">
        <Clock className="w-4 h-4 text-muted-foreground shrink-0" />
        
        {/* Hour Select */}
        <Select value={hours} onValueChange={handleHourChange}>
          <SelectTrigger className="w-[60px] px-2 h-9">
            <SelectValue placeholder="--" />
          </SelectTrigger>
          <SelectContent className="max-h-[200px]">
            {hourOptions.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <span className="text-muted-foreground font-medium">:</span>

        {/* Minute Select */}
        <Select value={minutes} onValueChange={handleMinuteChange}>
          <SelectTrigger className="w-[60px] px-2 h-9">
            <SelectValue placeholder="--" />
          </SelectTrigger>
          <SelectContent className="max-h-[200px]">
            {minuteOptions.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* AM/PM Select for 12hr format */}
      {timeFormat === "12hr" && onPeriodChange && (
        <Select value={period} onValueChange={(val) => onPeriodChange(val as "AM" | "PM")}>
          <SelectTrigger className="w-[65px] px-2 h-9">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="AM">AM</SelectItem>
            <SelectItem value="PM">PM</SelectItem>
          </SelectContent>
        </Select>
      )}
    </div>
  );
}

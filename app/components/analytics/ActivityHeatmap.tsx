"use client";

import { useMemo } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/app/components/ui/card";
import { cn } from "@/app/lib/utils";

interface DayOfWeekData {
  grid: number[][]; // 7 days x 24 hours
  dailyTotals: {
    day: string;
    dayIndex: number;
    total: number;
  }[];
}

interface ActivityHeatmapProps {
  data: DayOfWeekData;
}

const HOUR_LABELS = [
  "12a",
  "",
  "",
  "3a",
  "",
  "",
  "6a",
  "",
  "",
  "9a",
  "",
  "",
  "12p",
  "",
  "",
  "3p",
  "",
  "",
  "6p",
  "",
  "",
  "9p",
  "",
  "",
];

export function ActivityHeatmap({ data }: ActivityHeatmapProps) {
  const { cells, busiestDay, busiestHour } = useMemo(() => {
    const max = Math.max(...data.grid.flat(), 1);

    const flatCells = data.grid.flatMap((dayHours, dayIdx) =>
      dayHours.map((count, hour) => ({
        day: dayIdx,
        hour,
        count,
        intensity: count / max,
      }))
    );

    // Find busiest day
    const busyDay = data.dailyTotals.reduce(
      (a, b) => (b.total > a.total ? b : a),
      data.dailyTotals[0]
    );

    // Find busiest hour across all days
    let busyHour = 0;
    let busyHourCount = 0;
    for (let h = 0; h < 24; h++) {
      const total = data.grid.reduce((sum, dayHours) => sum + dayHours[h], 0);
      if (total > busyHourCount) {
        busyHourCount = total;
        busyHour = h;
      }
    }

    return {
      cells: flatCells,
      busiestDay: busyDay,
      busiestHour: busyHour,
    };
  }, [data]);

  const getIntensityClass = (intensity: number) => {
    if (intensity === 0) return "bg-muted";
    if (intensity < 0.25) return "bg-green-200 dark:bg-green-900";
    if (intensity < 0.5) return "bg-green-400 dark:bg-green-700";
    if (intensity < 0.75) return "bg-green-500 dark:bg-green-500";
    return "bg-green-600 dark:bg-green-400";
  };

  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const hasData = data.grid.flat().some((v) => v > 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Activity Heatmap</CardTitle>
        <CardDescription>
          When you&apos;re most active (last 90 days)
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!hasData ? (
          <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">
            No activity data yet — schedule some events to see your patterns.
          </div>
        ) : (
          <>
            {/* Heatmap grid */}
            <div className="overflow-x-auto">
              <div className="min-w-[600px]">
                {/* Hour labels */}
                <div className="flex ml-10 mb-1">
                  {HOUR_LABELS.map((label, i) => (
                    <div
                      key={i}
                      className="flex-1 text-[9px] text-muted-foreground text-center"
                    >
                      {label}
                    </div>
                  ))}
                </div>

                {/* Day rows */}
                {days.map((day, dayIdx) => (
                  <div key={day} className="flex items-center gap-1 mb-1">
                    <span className="w-9 text-xs text-muted-foreground text-right pr-1">
                      {day}
                    </span>
                    <div className="flex flex-1 gap-[2px]">
                      {Array.from({ length: 24 }, (_, hour) => {
                        const cell = cells.find(
                          (c) => c.day === dayIdx && c.hour === hour
                        );
                        return (
                          <div
                            key={hour}
                            className={cn(
                              "flex-1 aspect-square rounded-sm transition-colors group relative",
                              getIntensityClass(cell?.intensity || 0)
                            )}
                          >
                            {/* Tooltip */}
                            {cell && cell.count > 0 && (
                              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 bg-popover border rounded px-1.5 py-0.5 text-[10px] shadow-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
                                {cell.count} event{cell.count !== 1 ? "s" : ""}{" "}
                                · {day} {hour.toString().padStart(2, "0")}:00
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Legend + insights */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mt-4 pt-4 border-t gap-3">
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-muted-foreground">Less</span>
                <div className="w-3 h-3 rounded-sm bg-muted" />
                <div className="w-3 h-3 rounded-sm bg-green-200 dark:bg-green-900" />
                <div className="w-3 h-3 rounded-sm bg-green-400 dark:bg-green-700" />
                <div className="w-3 h-3 rounded-sm bg-green-500 dark:bg-green-500" />
                <div className="w-3 h-3 rounded-sm bg-green-600 dark:bg-green-400" />
                <span className="text-xs text-muted-foreground">More</span>
              </div>

              <div className="flex gap-4 text-xs text-muted-foreground">
                <span>
                  Busiest day:{" "}
                  <span className="font-medium text-foreground">
                    {busiestDay?.day}
                  </span>
                </span>
                <span>
                  Peak hour:{" "}
                  <span className="font-medium text-foreground">
                    {busiestHour.toString().padStart(2, "0")}:00
                  </span>
                </span>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

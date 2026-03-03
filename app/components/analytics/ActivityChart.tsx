"use client";

import { useMemo } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/app/components/ui/card";

interface WeekData {
  label: string;
  weekStart: string;
  events: number;
  tasks: number;
}

interface ActivityChartProps {
  data: WeekData[];
}

export function ActivityChart({ data }: ActivityChartProps) {
  const { maxValue, bars } = useMemo(() => {
    const max = Math.max(...data.map((d) => d.events + d.tasks), 1);
    return {
      maxValue: max,
      bars: data.map((d) => ({
        ...d,
        eventHeight: (d.events / max) * 100,
        taskHeight: (d.tasks / max) * 100,
        total: d.events + d.tasks,
      })),
    };
  }, [data]);

  const totalEvents = data.reduce((s, d) => s + d.events, 0);
  const totalTasks = data.reduce((s, d) => s + d.tasks, 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Activity Over Time</CardTitle>
        <CardDescription>
          Events & tasks created per week (last 12 weeks)
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Legend */}
        <div className="flex items-center gap-4 mb-4 text-sm">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm bg-blue-500" />
            <span className="text-muted-foreground">
              Events ({totalEvents})
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm bg-amber-500" />
            <span className="text-muted-foreground">Tasks ({totalTasks})</span>
          </div>
        </div>

        {/* Chart */}
        <div className="flex items-end gap-1 sm:gap-2 h-48">
          {bars.map((bar, i) => (
            <div
              key={i}
              className="flex-1 flex flex-col items-center gap-1 group relative"
            >
              {/* Tooltip */}
              <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-popover border rounded-md px-2 py-1 text-xs shadow-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
                {bar.events} events, {bar.tasks} tasks
              </div>

              {/* Y-axis value */}
              <span className="text-[10px] text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
                {bar.total}
              </span>

              {/* Stacked bar */}
              <div className="w-full flex flex-col-reverse items-stretch h-36">
                <div
                  className="bg-blue-500 rounded-t-sm transition-all duration-300 min-h-[2px]"
                  style={{
                    height: `${bar.eventHeight}%`,
                    opacity: bar.events > 0 ? 1 : 0.15,
                  }}
                />
                <div
                  className="bg-amber-500 rounded-t-sm transition-all duration-300"
                  style={{
                    height: `${bar.taskHeight}%`,
                    opacity: bar.tasks > 0 ? 1 : 0.15,
                  }}
                />
              </div>

              {/* X-axis label */}
              <span className="text-[9px] sm:text-[10px] text-muted-foreground text-center leading-tight">
                {bar.label}
              </span>
            </div>
          ))}
        </div>

        {/* Y-axis context */}
        <div className="flex justify-between mt-2 text-[10px] text-muted-foreground">
          <span>0</span>
          <span>Max: {maxValue}</span>
        </div>
      </CardContent>
    </Card>
  );
}

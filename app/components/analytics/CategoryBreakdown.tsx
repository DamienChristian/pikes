"use client";

import { useMemo } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/app/components/ui/card";

interface CategoryData {
  category: string;
  count: number;
  events: number;
  tasks: number;
}

interface CategoryBreakdownProps {
  data: CategoryData[];
}

const COLORS = [
  "bg-blue-500",
  "bg-amber-500",
  "bg-green-500",
  "bg-purple-500",
  "bg-red-500",
  "bg-cyan-500",
  "bg-orange-500",
  "bg-pink-500",
  "bg-teal-500",
  "bg-indigo-500",
];

const RING_COLORS = [
  "#3b82f6",
  "#f59e0b",
  "#22c55e",
  "#a855f7",
  "#ef4444",
  "#06b6d4",
  "#f97316",
  "#ec4899",
  "#14b8a6",
  "#6366f1",
];

export function CategoryBreakdown({ data }: CategoryBreakdownProps) {
  const { totalCount, segments } = useMemo(() => {
    const total = data.reduce((s, d) => s + d.count, 0);

    const segs = data.reduce(
      (
        acc: Array<
          (typeof data)[0] & {
            percentage: number;
            color: string;
            ringColor: string;
            startAngle: number;
            endAngle: number;
          }
        >,
        d,
        i
      ) => {
        const startAngle = acc.length > 0 ? acc[acc.length - 1].endAngle : 0;
        const angle = total > 0 ? (d.count / total) * 360 : 0;
        acc.push({
          ...d,
          percentage: total > 0 ? Math.round((d.count / total) * 100) : 0,
          color: COLORS[i % COLORS.length],
          ringColor: RING_COLORS[i % RING_COLORS.length],
          startAngle,
          endAngle: startAngle + angle,
        });
        return acc;
      },
      []
    );

    return { totalCount: total, segments: segs };
  }, [data]);

  // Donut chart arc helper
  const getArcPath = (
    startAngle: number,
    endAngle: number,
    radius: number,
    innerRadius: number
  ) => {
    const toRad = (deg: number) => ((deg - 90) * Math.PI) / 180;
    const largeArc = endAngle - startAngle > 180 ? 1 : 0;

    const x1 = 50 + radius * Math.cos(toRad(startAngle));
    const y1 = 50 + radius * Math.sin(toRad(startAngle));
    const x2 = 50 + radius * Math.cos(toRad(endAngle));
    const y2 = 50 + radius * Math.sin(toRad(endAngle));

    const x3 = 50 + innerRadius * Math.cos(toRad(endAngle));
    const y3 = 50 + innerRadius * Math.sin(toRad(endAngle));
    const x4 = 50 + innerRadius * Math.cos(toRad(startAngle));
    const y4 = 50 + innerRadius * Math.sin(toRad(startAngle));

    return [
      `M ${x1} ${y1}`,
      `A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2}`,
      `L ${x3} ${y3}`,
      `A ${innerRadius} ${innerRadius} 0 ${largeArc} 0 ${x4} ${y4}`,
      "Z",
    ].join(" ");
  };

  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Category Breakdown</CardTitle>
          <CardDescription>
            Distribution of events and tasks by category
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">
            No data yet — create events with categories to see breakdown.
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Category Breakdown</CardTitle>
        <CardDescription>
          Distribution of events and tasks by category
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col sm:flex-row gap-6 items-center">
          {/* Donut chart */}
          <div className="relative w-44 h-44 flex-shrink-0">
            <svg viewBox="0 0 100 100" className="w-full h-full">
              {segments.map((seg, i) =>
                seg.count > 0 ? (
                  <path
                    key={i}
                    d={getArcPath(
                      seg.startAngle,
                      // If it's the only segment, render almost-full circle
                      seg.endAngle === 360 && seg.startAngle === 0
                        ? 359.99
                        : seg.endAngle,
                      42,
                      28
                    )}
                    fill={seg.ringColor}
                    className="transition-opacity hover:opacity-80 cursor-default"
                  />
                ) : null
              )}
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-2xl font-bold">{totalCount}</span>
              <span className="text-[10px] text-muted-foreground">Total</span>
            </div>
          </div>

          {/* Legend */}
          <div className="flex-1 space-y-2 w-full">
            {segments.map((seg, i) => (
              <div
                key={i}
                className="flex items-center justify-between gap-2 text-sm"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <div
                    className={`w-3 h-3 rounded-sm flex-shrink-0 ${seg.color}`}
                  />
                  <span className="truncate">{seg.category}</span>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <span className="text-muted-foreground text-xs">
                    {seg.events}e / {seg.tasks}t
                  </span>
                  <span className="font-medium w-8 text-right">
                    {seg.percentage}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

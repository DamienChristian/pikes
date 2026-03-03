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
  total: number;
  completed: number;
  rate: number;
}

interface TaskCompletionChartProps {
  data: WeekData[];
}

export function TaskCompletionChart({ data }: TaskCompletionChartProps) {
  const { points } = useMemo(() => {
    const max = Math.max(...data.map((d) => d.total), 1);
    const chartWidth = 100;
    const chartHeight = 100;

    const pts = data.map((d, i) => ({
      x: (i / (data.length - 1)) * chartWidth,
      yRate: chartHeight - (d.rate / 100) * chartHeight,
      yTotal: chartHeight - (d.total / max) * chartHeight,
      yCompleted: chartHeight - (d.completed / max) * chartHeight,
      ...d,
    }));

    return { points: pts, maxTotal: max };
  }, [data]);

  const rateLine = points.map((p) => `${p.x},${p.yRate}`).join(" ");
  const rateArea = `0,100 ${points.map((p) => `${p.x},${p.yRate}`).join(" ")} 100,100`;

  const avgRate =
    data.length > 0
      ? Math.round(
          data.reduce((s, d) => s + d.rate, 0) /
            data.filter((d) => d.total > 0).length || 0
        )
      : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Task Completion Rate</CardTitle>
        <CardDescription>
          Weekly completion rate over last 12 weeks
          {avgRate > 0 && (
            <span className="ml-2 text-green-500 font-medium">
              (avg: {avgRate}%)
            </span>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="relative h-48">
          <svg
            viewBox="-5 -5 110 115"
            className="w-full h-full"
            preserveAspectRatio="none"
          >
            {/* Grid lines */}
            {[0, 25, 50, 75, 100].map((pct) => (
              <line
                key={pct}
                x1="0"
                y1={100 - pct}
                x2="100"
                y2={100 - pct}
                className="stroke-border"
                strokeWidth="0.3"
                strokeDasharray={pct === 0 ? "none" : "2,2"}
              />
            ))}

            {/* Area fill */}
            <polygon points={rateArea} className="fill-green-500/10" />

            {/* Rate line */}
            <polyline
              points={rateLine}
              fill="none"
              className="stroke-green-500"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* Data points */}
            {points.map((p, i) => (
              <g key={i}>
                <circle
                  cx={p.x}
                  cy={p.yRate}
                  r="1.8"
                  className="fill-green-500 stroke-background"
                  strokeWidth="0.5"
                />
              </g>
            ))}
          </svg>

          {/* Y-axis labels */}
          <div className="absolute left-0 top-0 h-full flex flex-col justify-between text-[10px] text-muted-foreground -translate-x-1">
            <span>100%</span>
            <span>75%</span>
            <span>50%</span>
            <span>25%</span>
            <span>0%</span>
          </div>
        </div>

        {/* X-axis labels */}
        <div className="flex justify-between mt-1 text-[9px] sm:text-[10px] text-muted-foreground px-1">
          {data
            .filter((_, i) => i % 3 === 0 || i === data.length - 1)
            .map((d, i) => (
              <span key={i}>{d.label}</span>
            ))}
        </div>

        {/* Summary */}
        <div className="grid grid-cols-3 gap-2 mt-4 pt-4 border-t">
          {data
            .filter((d) => d.total > 0)
            .slice(-3)
            .map((d, i) => (
              <div key={i} className="text-center">
                <p className="text-xs text-muted-foreground">{d.label}</p>
                <p className="text-sm font-medium">
                  {d.completed}/{d.total}{" "}
                  <span className="text-green-500">({d.rate}%)</span>
                </p>
              </div>
            ))}
        </div>
      </CardContent>
    </Card>
  );
}

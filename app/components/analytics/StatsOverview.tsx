"use client";

import {
  CalendarDays,
  CheckSquare,
  FileText,
  Calendar,
  TrendingUp,
  Percent,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/app/components/ui/card";

interface StatsOverviewProps {
  totalCounts: {
    events: number;
    tasks: number;
    completedTasks: number;
    notes: number;
    calendars: number;
    taskCompletionRate: number;
  };
}

export function StatsOverview({ totalCounts }: StatsOverviewProps) {
  const stats = [
    {
      title: "Total Events",
      value: totalCounts.events,
      icon: CalendarDays,
      color: "text-blue-500",
      bg: "bg-blue-500/10",
    },
    {
      title: "Total Tasks",
      value: totalCounts.tasks,
      icon: CheckSquare,
      color: "text-amber-500",
      bg: "bg-amber-500/10",
    },
    {
      title: "Tasks Completed",
      value: totalCounts.completedTasks,
      icon: TrendingUp,
      color: "text-green-500",
      bg: "bg-green-500/10",
    },
    {
      title: "Completion Rate",
      value: `${totalCounts.taskCompletionRate}%`,
      icon: Percent,
      color: "text-purple-500",
      bg: "bg-purple-500/10",
    },
    {
      title: "Total Notes",
      value: totalCounts.notes,
      icon: FileText,
      color: "text-orange-500",
      bg: "bg-orange-500/10",
    },
    {
      title: "Calendars",
      value: totalCounts.calendars,
      icon: Calendar,
      color: "text-indigo-500",
      bg: "bg-indigo-500/10",
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
      {stats.map((stat) => (
        <Card key={stat.title}>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              {stat.title}
            </CardTitle>
            <div className={`p-2 rounded-md ${stat.bg}`}>
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stat.value}</div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

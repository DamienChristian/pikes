"use client";

import { useState, useEffect } from "react";
import { BarChart3, RefreshCw } from "lucide-react";
import { Button } from "@/app/components/ui/button";
import { Skeleton } from "@/app/components/ui/skeleton";
import { StatsOverview } from "@/app/components/analytics/StatsOverview";
import { ActivityChart } from "@/app/components/analytics/ActivityChart";
import { TaskCompletionChart } from "@/app/components/analytics/TaskCompletionChart";
import { CategoryBreakdown } from "@/app/components/analytics/CategoryBreakdown";
import { ActivityHeatmap } from "@/app/components/analytics/ActivityHeatmap";
import { SharedCalendarsSummary } from "@/app/components/analytics/SharedCalendarsSummary";
import { toast } from "sonner";

interface AnalyticsData {
  totalCounts: {
    events: number;
    tasks: number;
    completedTasks: number;
    notes: number;
    calendars: number;
    taskCompletionRate: number;
  };
  eventsOverTime: {
    label: string;
    weekStart: string;
    events: number;
    tasks: number;
  }[];
  taskCompletionOverTime: {
    label: string;
    total: number;
    completed: number;
    rate: number;
  }[];
  categoryBreakdown: {
    category: string;
    count: number;
    events: number;
    tasks: number;
  }[];
  dayOfWeekActivity: {
    grid: number[][];
    dailyTotals: {
      day: string;
      dayIndex: number;
      total: number;
    }[];
  };
  priorityBreakdown: {
    priority: string;
    count: number;
  }[];
  sharedCalendarsSummary: {
    owned: {
      id: string;
      name: string;
      color: string;
      memberCount: number;
      totalEvents: number;
      upcomingEvents: number;
    }[];
    memberOf: {
      id: string;
      name: string;
      color: string;
      memberCount: number;
      totalEvents: number;
      upcomingEvents: number;
    }[];
  };
}

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchAnalytics = async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);

      const response = await fetch("/api/analytics");
      if (!response.ok) {
        if (response.status === 401) {
          window.location.href = "/auth/login";
          return;
        }
        throw new Error("Failed to fetch analytics");
      }

      const json = await response.json();
      if (json.success) {
        setData(json.data);
      } else {
        throw new Error(json.error || "Failed to fetch analytics");
      }
    } catch {
      toast.error("Failed to load analytics data");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  if (loading) {
    return (
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <Skeleton className="h-8 w-48 mb-2" />
            <Skeleton className="h-4 w-72" />
          </div>
        </div>

        {/* Stats cards skeleton */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="rounded-xl border bg-card p-6">
              <div className="flex items-center justify-between mb-3">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-8 w-8 rounded-md" />
              </div>
              <Skeleton className="h-7 w-12" />
            </div>
          ))}
        </div>

        {/* Chart skeletons */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <div className="rounded-xl border bg-card p-6">
            <Skeleton className="h-5 w-40 mb-2" />
            <Skeleton className="h-4 w-64 mb-6" />
            <Skeleton className="h-48 w-full" />
          </div>
          <div className="rounded-xl border bg-card p-6">
            <Skeleton className="h-5 w-40 mb-2" />
            <Skeleton className="h-4 w-64 mb-6" />
            <Skeleton className="h-48 w-full" />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <div className="rounded-xl border bg-card p-6">
            <Skeleton className="h-5 w-40 mb-2" />
            <Skeleton className="h-4 w-64 mb-6" />
            <Skeleton className="h-48 w-full" />
          </div>
          <div className="rounded-xl border bg-card p-6">
            <Skeleton className="h-5 w-40 mb-2" />
            <Skeleton className="h-4 w-64 mb-6" />
            <Skeleton className="h-48 w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
          <BarChart3 className="h-12 w-12 mb-4 opacity-50" />
          <p className="text-lg font-medium">Unable to load analytics</p>
          <p className="text-sm mb-4">Please try again later.</p>
          <Button onClick={() => fetchAnalytics()} variant="outline">
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2">
            <BarChart3 className="h-7 w-7 text-primary" />
            Analytics
          </h1>
          <p className="text-muted-foreground mt-1">
            Insights into your calendar, events, tasks, and notes
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => fetchAnalytics(true)}
          disabled={refreshing}
        >
          <RefreshCw
            className={`h-4 w-4 mr-2 ${refreshing ? "animate-spin" : ""}`}
          />
          Refresh
        </Button>
      </div>

      {/* Stats overview */}
      <div className="mb-8">
        <StatsOverview totalCounts={data.totalCounts} />
      </div>

      {/* Activity chart + Task completion */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <ActivityChart data={data.eventsOverTime} />
        <TaskCompletionChart data={data.taskCompletionOverTime} />
      </div>

      {/* Category breakdown + Heatmap */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <CategoryBreakdown data={data.categoryBreakdown} />
        <ActivityHeatmap data={data.dayOfWeekActivity} />
      </div>

      {/* Shared calendars */}
      <div className="mb-6">
        <SharedCalendarsSummary data={data.sharedCalendarsSummary} />
      </div>
    </div>
  );
}

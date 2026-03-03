import { NextResponse } from "next/server";
import connectDB from "@/app/lib/db/mongodb";
import Event from "@/app/lib/db/models/Event";
import Note from "@/app/lib/db/models/Note";
import Calendar from "@/app/lib/db/models/Calendar";
import { getSession } from "@/app/lib/utils/session";

/**
 * GET /api/analytics
 * Returns aggregated analytics data for the authenticated user
 */
export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    await connectDB();

    const userId = session.userId;

    // Run all aggregations in parallel
    const [
      totalCounts,
      eventsOverTime,
      taskCompletionOverTime,
      categoryBreakdown,
      dayOfWeekActivity,
      priorityBreakdown,
      sharedCalendarsSummary,
    ] = await Promise.all([
      // 1. Total counts
      getTotalCounts(userId),
      // 2. Events created per week (last 12 weeks)
      getEventsOverTime(userId),
      // 3. Task completion rate over time (last 12 weeks)
      getTaskCompletionOverTime(userId),
      // 4. Category breakdown
      getCategoryBreakdown(userId),
      // 5. Day-of-week activity (heatmap-style data)
      getDayOfWeekActivity(userId),
      // 6. Priority breakdown
      getPriorityBreakdown(userId),
      // 7. Shared calendars summary
      getSharedCalendarsSummary(userId),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        totalCounts,
        eventsOverTime,
        taskCompletionOverTime,
        categoryBreakdown,
        dayOfWeekActivity,
        priorityBreakdown,
        sharedCalendarsSummary,
      },
    });
  } catch (error) {
    console.error("Analytics error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch analytics" },
      { status: 500 }
    );
  }
}

/** Total events, tasks, notes, calendars counts */
async function getTotalCounts(userId: string) {
  const [events, tasks, completedTasks, notes, calendars] = await Promise.all([
    Event.countDocuments({ userId, type: { $ne: "task" } }),
    Event.countDocuments({ userId, type: "task" }),
    Event.countDocuments({ userId, type: "task", completed: true }),
    Note.countDocuments({
      $or: [{ userId }, { "members.userId": userId }],
    }),
    Calendar.countDocuments({ userId }),
  ]);

  return {
    events,
    tasks,
    completedTasks,
    notes,
    calendars,
    taskCompletionRate:
      tasks > 0 ? Math.round((completedTasks / tasks) * 100) : 0,
  };
}

/** Events created per week for the last 12 weeks */
async function getEventsOverTime(userId: string) {
  const twelveWeeksAgo = new Date();
  twelveWeeksAgo.setDate(twelveWeeksAgo.getDate() - 84); // 12 * 7

  const result = await Event.aggregate([
    {
      $match: {
        userId,
        createdAt: { $gte: twelveWeeksAgo },
      },
    },
    {
      $group: {
        _id: {
          year: { $isoWeekYear: "$createdAt" },
          week: { $isoWeek: "$createdAt" },
          type: "$type",
        },
        count: { $sum: 1 },
      },
    },
    {
      $sort: { "_id.year": 1, "_id.week": 1 },
    },
  ]);

  // Build a map of week labels to counts
  const weeks: {
    label: string;
    weekStart: string;
    events: number;
    tasks: number;
  }[] = [];

  for (let i = 11; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i * 7);
    // Get ISO week
    const tempDate = new Date(d.getTime());
    tempDate.setHours(0, 0, 0, 0);
    tempDate.setDate(tempDate.getDate() + 3 - ((tempDate.getDay() + 6) % 7));
    const week1 = new Date(tempDate.getFullYear(), 0, 4);
    const isoWeek =
      1 +
      Math.round(
        ((tempDate.getTime() - week1.getTime()) / 86400000 -
          3 +
          ((week1.getDay() + 6) % 7)) /
          7
      );

    // Week start (Monday)
    const monday = new Date(d);
    monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
    const label = `${monday.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;

    const eventsInWeek = result
      .filter(
        (r) =>
          r._id.week === isoWeek &&
          r._id.year === tempDate.getFullYear() &&
          (r._id.type === "event" || !r._id.type)
      )
      .reduce((sum: number, r: { count: number }) => sum + r.count, 0);
    const tasksInWeek = result
      .filter(
        (r) =>
          r._id.week === isoWeek &&
          r._id.year === tempDate.getFullYear() &&
          r._id.type === "task"
      )
      .reduce((sum: number, r: { count: number }) => sum + r.count, 0);

    weeks.push({
      label,
      weekStart: monday.toISOString(),
      events: eventsInWeek,
      tasks: tasksInWeek,
    });
  }

  return weeks;
}

/** Task completion rate over the last 12 weeks */
async function getTaskCompletionOverTime(userId: string) {
  const twelveWeeksAgo = new Date();
  twelveWeeksAgo.setDate(twelveWeeksAgo.getDate() - 84);

  const result = await Event.aggregate([
    {
      $match: {
        userId,
        type: "task",
        createdAt: { $gte: twelveWeeksAgo },
      },
    },
    {
      $group: {
        _id: {
          year: { $isoWeekYear: "$createdAt" },
          week: { $isoWeek: "$createdAt" },
        },
        total: { $sum: 1 },
        completed: {
          $sum: { $cond: [{ $eq: ["$completed", true] }, 1, 0] },
        },
      },
    },
    {
      $sort: { "_id.year": 1, "_id.week": 1 },
    },
  ]);

  const weeks: {
    label: string;
    total: number;
    completed: number;
    rate: number;
  }[] = [];

  for (let i = 11; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i * 7);
    const tempDate = new Date(d.getTime());
    tempDate.setHours(0, 0, 0, 0);
    tempDate.setDate(tempDate.getDate() + 3 - ((tempDate.getDay() + 6) % 7));
    const week1 = new Date(tempDate.getFullYear(), 0, 4);
    const isoWeek =
      1 +
      Math.round(
        ((tempDate.getTime() - week1.getTime()) / 86400000 -
          3 +
          ((week1.getDay() + 6) % 7)) /
          7
      );

    const monday = new Date(d);
    monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
    const label = `${monday.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;

    const match = result.find(
      (r) => r._id.week === isoWeek && r._id.year === tempDate.getFullYear()
    );
    const total = match?.total || 0;
    const completed = match?.completed || 0;

    weeks.push({
      label,
      total,
      completed,
      rate: total > 0 ? Math.round((completed / total) * 100) : 0,
    });
  }

  return weeks;
}

/** Category breakdown for all events/tasks */
async function getCategoryBreakdown(userId: string) {
  const result = await Event.aggregate([
    { $match: { userId } },
    {
      $group: {
        _id: { $ifNull: ["$category", "Uncategorized"] },
        count: { $sum: 1 },
        events: {
          $sum: {
            $cond: [
              { $or: [{ $eq: ["$type", "event"] }, { $eq: ["$type", null] }] },
              1,
              0,
            ],
          },
        },
        tasks: {
          $sum: { $cond: [{ $eq: ["$type", "task"] }, 1, 0] },
        },
      },
    },
    { $sort: { count: -1 } },
    { $limit: 10 },
  ]);

  return result.map((r) => ({
    category: r._id,
    count: r.count,
    events: r.events,
    tasks: r.tasks,
  }));
}

/** Events per day of week (and hour) for heatmap — last 90 days */
async function getDayOfWeekActivity(userId: string) {
  const ninetyDaysAgo = new Date();
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

  const result = await Event.aggregate([
    {
      $match: {
        userId,
        startDate: { $gte: ninetyDaysAgo },
      },
    },
    {
      $group: {
        _id: {
          dayOfWeek: { $dayOfWeek: "$startDate" }, // 1=Sun ... 7=Sat
          hour: { $hour: "$startDate" },
        },
        count: { $sum: 1 },
      },
    },
    { $sort: { "_id.dayOfWeek": 1, "_id.hour": 1 } },
  ]);

  // Build a 7x24 grid
  const grid: number[][] = Array.from({ length: 7 }, () =>
    Array.from({ length: 24 }, () => 0)
  );

  for (const r of result) {
    const dayIndex = r._id.dayOfWeek - 1; // 0=Sun ... 6=Sat
    const hour = r._id.hour;
    grid[dayIndex][hour] = r.count;
  }

  // Also aggregate just by day-of-week for simpler display
  const dailyTotals = grid.map((hours, i) => ({
    day: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][i],
    dayIndex: i,
    total: hours.reduce((a, b) => a + b, 0),
  }));

  return { grid, dailyTotals };
}

/** Priority breakdown */
async function getPriorityBreakdown(userId: string) {
  const result = await Event.aggregate([
    { $match: { userId } },
    {
      $group: {
        _id: { $ifNull: ["$priority", "none"] },
        count: { $sum: 1 },
      },
    },
    { $sort: { count: -1 } },
  ]);

  return result.map((r) => ({
    priority: r._id,
    count: r.count,
  }));
}

/** Shared calendars activity summary */
async function getSharedCalendarsSummary(userId: string) {
  // Calendars owned by user that have members
  const ownedShared = await Calendar.aggregate([
    {
      $match: {
        userId,
        "members.0": { $exists: true },
      },
    },
    {
      $project: {
        name: 1,
        color: 1,
        memberCount: { $size: "$members" },
      },
    },
  ]);

  // Calendars shared with user
  const memberOf = await Calendar.aggregate([
    {
      $match: {
        "members.userId": userId,
        userId: { $ne: userId },
      },
    },
    {
      $project: {
        name: 1,
        color: 1,
        userId: 1,
        memberCount: { $size: "$members" },
      },
    },
  ]);

  // For each calendar, count events
  const calendarIds = [
    ...ownedShared.map((c) => c._id.toString()),
    ...memberOf.map((c) => c._id.toString()),
  ];

  const eventCounts =
    calendarIds.length > 0
      ? await Event.aggregate([
          {
            $match: { calendarId: { $in: calendarIds } },
          },
          {
            $group: {
              _id: "$calendarId",
              totalEvents: { $sum: 1 },
              upcomingEvents: {
                $sum: {
                  $cond: [{ $gte: ["$startDate", new Date()] }, 1, 0],
                },
              },
            },
          },
        ])
      : [];

  const eventCountMap = new Map(
    eventCounts.map((e) => [
      e._id,
      { total: e.totalEvents, upcoming: e.upcomingEvents },
    ])
  );

  return {
    owned: ownedShared.map((c) => ({
      id: c._id.toString(),
      name: c.name,
      color: c.color,
      memberCount: c.memberCount,
      totalEvents: eventCountMap.get(c._id.toString())?.total || 0,
      upcomingEvents: eventCountMap.get(c._id.toString())?.upcoming || 0,
    })),
    memberOf: memberOf.map((c) => ({
      id: c._id.toString(),
      name: c.name,
      color: c.color,
      memberCount: c.memberCount + 1, // +1 for owner
      totalEvents: eventCountMap.get(c._id.toString())?.total || 0,
      upcomingEvents: eventCountMap.get(c._id.toString())?.upcoming || 0,
    })),
  };
}

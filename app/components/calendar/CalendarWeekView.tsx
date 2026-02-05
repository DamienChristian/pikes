"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronLeft, ChevronRight, Plus, CheckSquare } from "lucide-react";
import { Button } from "@/app/components/ui/button";
import { cn } from "@/app/lib/utils";
import { CalendarEvent } from "@/app/types";
import {
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  format,
  isSameDay,
  isToday,
  addWeeks,
  subWeeks,
  parseISO,
  startOfDay,
  differenceInMinutes,
  addMinutes,
} from "date-fns";

type DisplayEvent = CalendarEvent & {
  eventStart: Date;
  eventEnd: Date;
  column?: number;
  totalColumns?: number;
};

interface CalendarWeekViewProps {
  events: CalendarEvent[];
  selectedDate?: Date;
  onDateSelect?: (date: Date) => void;
  onEventClick?: (event: CalendarEvent) => void;
  onCreateEvent?: (startDate: Date, endDate: Date) => void;
  loading?: boolean;
}

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const HOUR_HEIGHT = 60; // pixels per hour
const MIN_EVENT_HEIGHT = 20; // minimum height in pixels

export function CalendarWeekView({
  events,
  selectedDate,
  onDateSelect,
  onEventClick,
  onCreateEvent,
  loading = false,
}: CalendarWeekViewProps) {
  const [currentWeek, setCurrentWeek] = useState(selectedDate || new Date());
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<{
    day: Date;
    time: number;
  } | null>(null);
  const [dragEnd, setDragEnd] = useState<{ day: Date; time: number } | null>(
    null
  );
  const gridRef = useRef<HTMLDivElement>(null);

  const weekStart = startOfWeek(currentWeek);
  const weekEnd = endOfWeek(currentWeek);
  const days = eachDayOfInterval({ start: weekStart, end: weekEnd });

  const previousWeek = () => setCurrentWeek(subWeeks(currentWeek, 1));
  const nextWeek = () => setCurrentWeek(addWeeks(currentWeek, 1));
  const goToToday = () => setCurrentWeek(new Date());

  // Get events for a specific day
  const getEventsForDay = (day: Date) => {
    return events
      .filter((event) => {
        const eventStart =
          typeof event.startDate === "string"
            ? parseISO(event.startDate)
            : event.startDate;
        const eventEnd =
          typeof event.endDate === "string"
            ? parseISO(event.endDate)
            : event.endDate;

        const dayStart = startOfDay(day);
        const dayEnd = new Date(day);
        dayEnd.setHours(23, 59, 59, 999);

        return eventStart <= dayEnd && eventEnd >= dayStart;
      })
      .map((event) => {
        const eventStart =
          typeof event.startDate === "string"
            ? parseISO(event.startDate)
            : event.startDate;
        const eventEnd =
          typeof event.endDate === "string"
            ? parseISO(event.endDate)
            : event.endDate;

        return { ...event, eventStart, eventEnd };
      });
  };

  // Calculate event position and height
  const getEventStyle = (event: DisplayEvent, day: Date) => {
    const dayStart = startOfDay(day);
    const dayEnd = new Date(day);
    dayEnd.setHours(23, 59, 59, 999);

    // Clamp event times to the current day
    const displayStart =
      event.eventStart < dayStart ? dayStart : event.eventStart;
    const displayEnd = event.eventEnd > dayEnd ? dayEnd : event.eventEnd;

    const startMinutes = differenceInMinutes(displayStart, dayStart);
    const durationMinutes = differenceInMinutes(displayEnd, displayStart);

    const top = (startMinutes / 60) * HOUR_HEIGHT;
    const height = Math.max(
      (durationMinutes / 60) * HOUR_HEIGHT,
      MIN_EVENT_HEIGHT
    );

    return { top, height };
  };

  // Calculate overlapping events and their positions
  const getEventLayout = (dayEvents: DisplayEvent[]) => {
    const sorted = [...dayEvents].sort((a, b) => {
      const aStart = a.eventStart.getTime();
      const bStart = b.eventStart.getTime();
      if (aStart !== bStart) return aStart - bStart;
      return b.eventEnd.getTime() - a.eventEnd.getTime();
    });

    const columns: DisplayEvent[][] = [];

    sorted.forEach((event) => {
      let placed = false;
      for (let col = 0; col < columns.length; col++) {
        const column = columns[col];
        const lastEvent = column[column.length - 1];

        if (event.eventStart >= lastEvent.eventEnd) {
          column.push(event);
          event.column = col;
          placed = true;
          break;
        }
      }

      if (!placed) {
        event.column = columns.length;
        columns.push([event]);
      }
    });

    sorted.forEach((event) => {
      let maxOverlap = 1;
      sorted.forEach((other) => {
        if (
          event.id !== other.id &&
          event.eventStart < other.eventEnd &&
          event.eventEnd > other.eventStart
        ) {
          maxOverlap = Math.max(maxOverlap, (other.column ?? 0) + 1);
        }
      });
      event.totalColumns = Math.max(maxOverlap, columns.length);
    });

    return sorted;
  };

  const handleMouseDown = (day: Date, hour: number, e: React.MouseEvent) => {
    if (e.button !== 0) return; // Only left click

    const rect = e.currentTarget.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const minutes = Math.floor((y / HOUR_HEIGHT) * 60);
    const time = hour + minutes / 60;

    setIsDragging(true);
    setDragStart({ day, time });
    setDragEnd({ day, time });
  };

  const handleClick = (day: Date, hour: number, e: React.MouseEvent) => {
    // Only trigger on single click without drag
    const rect = e.currentTarget.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const minutes = Math.floor((y / HOUR_HEIGHT) * 60);
    const time = hour + minutes / 60;

    const startDate = addMinutes(startOfDay(day), time * 60);
    const endDate = addMinutes(startDate, 60); // 1 hour later
    onCreateEvent?.(startDate, endDate);
  };

  const handleMouseMove = (day: Date, hour: number, e: React.MouseEvent) => {
    if (!isDragging || !dragStart) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const minutes = Math.floor((y / HOUR_HEIGHT) * 60);
    const time = hour + minutes / 60;

    // Allow dragging across different days
    setDragEnd({ day, time });
  };

  useEffect(() => {
    const handleGlobalMouseUp = () => {
      if (isDragging) {
        if (!dragStart || !dragEnd) {
          setIsDragging(false);
          setDragStart(null);
          setDragEnd(null);
          return;
        }

        // Calculate start and end dates/times
        const startDateTime = addMinutes(
          startOfDay(dragStart.day),
          dragStart.time * 60
        );
        const endDateTime = addMinutes(
          startOfDay(dragEnd.day),
          dragEnd.time * 60
        );

        // Ensure start is before end
        const actualStart =
          startDateTime < endDateTime ? startDateTime : endDateTime;
        const actualEnd =
          startDateTime < endDateTime ? endDateTime : startDateTime;

        const timeDiff = differenceInMinutes(actualEnd, actualStart) / 60;

        // If very small movement, treat as click (1 hour event)
        if (timeDiff < 0.1) {
          const endDate = addMinutes(actualStart, 60);
          onCreateEvent?.(actualStart, endDate);
        } else if (timeDiff >= 0.5) {
          // Minimum 30 minutes for drag
          onCreateEvent?.(actualStart, actualEnd);
        }

        setIsDragging(false);
        setDragStart(null);
        setDragEnd(null);
      }
    };

    window.addEventListener("mouseup", handleGlobalMouseUp);
    return () => window.removeEventListener("mouseup", handleGlobalMouseUp);
  }, [isDragging, dragStart, dragEnd, onCreateEvent]);

  // Get drag selection style
  const getDragSelectionStyle = (day: Date) => {
    if (!isDragging || !dragStart || !dragEnd) return null;

    // Check if this day is involved in the drag selection
    const dayTime = day.getTime();
    const startDayTime = dragStart.day.getTime();
    const endDayTime = dragEnd.day.getTime();

    // Determine if the day is within the drag range
    const minDay = Math.min(startDayTime, endDayTime);
    const maxDay = Math.max(startDayTime, endDayTime);

    if (dayTime < minDay || dayTime > maxDay) return null;

    // Calculate top and height based on whether it's the start, end, or middle day
    let top = 0;
    let height = 24 * HOUR_HEIGHT; // Full day by default

    if (dayTime === minDay && dayTime === maxDay) {
      // Same day selection
      const startTime = Math.min(dragStart.time, dragEnd.time);
      const endTime = Math.max(dragStart.time, dragEnd.time);
      top = startTime * HOUR_HEIGHT;
      height = (endTime - startTime) * HOUR_HEIGHT;
    } else if (dayTime === minDay) {
      // First day of multi-day selection
      const startTime = startDayTime === minDay ? dragStart.time : dragEnd.time;
      top = startTime * HOUR_HEIGHT;
      height = (24 - startTime) * HOUR_HEIGHT;
    } else if (dayTime === maxDay) {
      // Last day of multi-day selection
      const endTime = endDayTime === maxDay ? dragEnd.time : dragStart.time;
      top = 0;
      height = endTime * HOUR_HEIGHT;
    }
    // else: middle day, use full day (already set)

    return { top, height };
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 px-2">
        <h2 className="text-2xl font-bold">
          {format(weekStart, "MMM d")} - {format(weekEnd, "MMM d, yyyy")}
        </h2>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={goToToday}
            aria-label="Go to this week"
          >
            Today
          </Button>

          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={previousWeek}
              aria-label="Previous week"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={nextWeek}
              aria-label="Next week"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          {onCreateEvent && (
            <Button
              size="sm"
              onClick={() => {
                const now = new Date();
                const roundedMinutes = Math.ceil(now.getMinutes() / 30) * 30;
                const start = new Date(now);
                start.setMinutes(roundedMinutes, 0, 0);
                const end = addMinutes(start, 60);
                onCreateEvent(start, end);
              }}
              className="ml-2"
              aria-label="Create new event"
            >
              <Plus className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">New Event</span>
            </Button>
          )}
        </div>
      </div>

      {/* Week Grid */}
      <div
        className="flex-1 border rounded-lg overflow-auto bg-card relative select-none"
        ref={gridRef}
      >
        <div className="flex min-w-max">
          {/* Time column */}
          <div className="w-16 flex-shrink-0 bg-muted/20 sticky left-0 z-30">
            <div className="h-12 border-b-0 sticky top-0 bg-muted/20 z-40" />{" "}
            {/* Header spacer */}
            {HOURS.map((hour) => (
              <div
                key={hour}
                className="relative border-b-0"
                style={{ height: `${HOUR_HEIGHT}px` }}
              >
                <span className="absolute -top-2 right-2 text-xs text-muted-foreground bg-muted/20 px-1">
                  {format(new Date().setHours(hour, 0, 0, 0), "h a")}
                </span>
              </div>
            ))}
          </div>

          {/* Days columns */}
          {days.map((day) => {
            const dayEvents = getEventsForDay(day);
            const layoutEvents = getEventLayout(dayEvents);
            const isTodayDate = isToday(day);
            const isSelected = selectedDate && isSameDay(day, selectedDate);
            const dragStyle = getDragSelectionStyle(day);

            return (
              <div
                key={day.toISOString()}
                className="flex-1 min-w-[120px] border-r last:border-r-0"
              >
                {/* Day header */}
                <div
                  className={cn(
                    "h-12 border-b flex flex-col items-center justify-center cursor-pointer hover:bg-accent/50 transition-colors sticky top-0 z-20 bg-card",
                    isTodayDate && "bg-primary/10",
                    isSelected && "bg-primary/20"
                  )}
                  onClick={() => onDateSelect?.(day)}
                >
                  <div className="text-xs text-muted-foreground">
                    {format(day, "EEE")}
                  </div>
                  <div
                    className={cn(
                      "text-lg font-medium w-8 h-8 flex items-center justify-center rounded-full",
                      isTodayDate && "bg-primary text-primary-foreground"
                    )}
                  >
                    {format(day, "d")}
                  </div>
                </div>

                {/* Hours grid */}
                <div className="relative select-none">
                  {HOURS.map((hour) => (
                    <div
                      key={hour}
                      className="border-b hover:bg-accent/20 cursor-crosshair"
                      style={{ height: `${HOUR_HEIGHT}px` }}
                      onMouseDown={(e) => handleMouseDown(day, hour, e)}
                      onMouseMove={(e) => handleMouseMove(day, hour, e)}
                    />
                  ))}

                  {/* Events */}
                  {!loading &&
                    layoutEvents.map((event) => {
                      const isTask = event.type === "task";
                      const { top, height: calculatedHeight } = getEventStyle(
                        event,
                        day
                      );
                      // For tasks, use a fixed minimum height
                      const height = isTask
                        ? Math.max(calculatedHeight, 40)
                        : calculatedHeight;
                      const widthPercent = 100 / (event.totalColumns || 1);
                      const leftPercent = (event.column || 0) * widthPercent;

                      return (
                        <button
                          key={event.id}
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            onEventClick?.(event);
                          }}
                          onMouseDown={(e) => {
                            e.stopPropagation();
                          }}
                          className={cn(
                            "absolute rounded px-1 py-0.5 text-xs text-left overflow-hidden hover:opacity-90 hover:z-30 transition-all focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-0 z-10 select-none",
                            isTask && "border border-white/30"
                          )}
                          style={{
                            top: `${top}px`,
                            height: `${height}px`,
                            left: `calc(${leftPercent}% + 2px)`,
                            width: `calc(${widthPercent}% - 4px)`,
                            backgroundColor:
                              event.color || (isTask ? "#10B981" : "#3B82F6"),
                            color: "white",
                          }}
                        >
                          <div className="flex items-center gap-1">
                            {isTask && (
                              <CheckSquare className="h-3 w-3 flex-shrink-0" />
                            )}
                            <div className="font-medium truncate">
                              {event.title}
                            </div>
                          </div>
                          {height > 30 && widthPercent > 30 && (
                            <div className="text-[10px] opacity-90">
                              {isTask && event.deadline
                                ? `Due: ${format(typeof event.deadline === "string" ? new Date(event.deadline) : event.deadline, "h:mm a")}`
                                : format(event.eventStart, "h:mm a")}
                            </div>
                          )}
                        </button>
                      );
                    })}

                  {/* Drag selection */}
                  {dragStyle && (
                    <div
                      className="absolute left-1 right-1 bg-primary/30 border-2 border-primary rounded pointer-events-none z-20"
                      style={{
                        top: `${dragStyle.top}px`,
                        height: `${dragStyle.height}px`,
                      }}
                    />
                  )}

                  {/* Loading skeleton */}
                  {loading && (
                    <div className="absolute inset-0 flex flex-col gap-2 p-2">
                      {[0, 1, 2].map((i) => (
                        <div
                          key={i}
                          className="h-16 bg-muted rounded animate-pulse"
                        />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Instructions */}
      <div className="mt-4 text-xs text-muted-foreground text-center">
        <p>Drag on the calendar to select a time range and create an event</p>
      </div>
    </div>
  );
}

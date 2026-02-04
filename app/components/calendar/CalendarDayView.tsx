"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronLeft, ChevronRight, Plus, CheckSquare } from "lucide-react";
import { Button } from "@/app/components/ui/button";
import { cn } from "@/app/lib/utils";
import { CalendarEvent } from "@/app/types";
import {
  format,
  isToday,
  addDays,
  subDays,
  parseISO,
  startOfDay,
  differenceInMinutes,
  addMinutes,
} from "date-fns";

type DisplayEvent = CalendarEvent & {
  displayStart: Date;
  displayEnd: Date;
  column?: number;
  totalColumns?: number;
};

interface CalendarDayViewProps {
  events: CalendarEvent[];
  selectedDate?: Date;
  onDateSelect?: (date: Date) => void;
  onEventClick?: (event: CalendarEvent) => void;
  onCreateEvent?: (startDate: Date, endDate: Date) => void;
  loading?: boolean;
}

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const HOUR_HEIGHT = 60;
const MIN_EVENT_HEIGHT = 20;

export function CalendarDayView({
  events,
  selectedDate,
  onDateSelect,
  onEventClick,
  onCreateEvent,
  loading = false,
}: CalendarDayViewProps) {
  const [currentDay, setCurrentDay] = useState(selectedDate || new Date());
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<number | null>(null);
  const [dragEnd, setDragEnd] = useState<number | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  const previousDay = () => setCurrentDay(subDays(currentDay, 1));
  const nextDay = () => setCurrentDay(addDays(currentDay, 1));
  const goToToday = () => setCurrentDay(new Date());

  // Get events for the current day
  const getEventsForDay = (): DisplayEvent[] => {
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

        const dayStart = startOfDay(currentDay);
        const dayEnd = new Date(currentDay);
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

        const dayStart = startOfDay(currentDay);
        const dayEnd = new Date(currentDay);
        dayEnd.setHours(23, 59, 59, 999);

        const clampedStart = eventStart < dayStart ? dayStart : eventStart;
        const clampedEnd = eventEnd > dayEnd ? dayEnd : eventEnd;

        return {
          ...event,
          displayStart: clampedStart,
          displayEnd: clampedEnd,
        };
      });
  };

  // Calculate event layout with overlaps
  const getEventLayout = (dayEvents: DisplayEvent[]) => {
    const sortedEvents = [...dayEvents].sort(
      (a, b) => a.displayStart.getTime() - b.displayStart.getTime()
    );

    const columns: DisplayEvent[][] = [];
    const eventLayouts: { event: DisplayEvent; column: number }[] = [];

    sortedEvents.forEach((event) => {
      let placed = false;
      for (let i = 0; i < columns.length; i++) {
        const column = columns[i];
        const lastEvent = column[column.length - 1];
        if (lastEvent.displayEnd <= event.displayStart) {
          column.push(event);
          eventLayouts.push({ event, column: i });
          placed = true;
          break;
        }
      }
      if (!placed) {
        columns.push([event]);
        eventLayouts.push({ event, column: columns.length - 1 });
      }
    });

    return eventLayouts.map(({ event, column }) => {
      const overlappingEvents = sortedEvents.filter(
        (e) =>
          e.displayStart < event.displayEnd && e.displayEnd > event.displayStart
      );
      const totalColumns = Math.max(
        ...overlappingEvents.map((e) => {
          const layout = eventLayouts.find((l) => l.event === e);
          return layout ? layout.column + 1 : 1;
        })
      );

      // For tasks, use full width if alone, otherwise use calculated width
      const isTask = event.type === "task";
      const widthPercent =
        isTask && totalColumns === 1 ? 100 : 100 / totalColumns;
      const leftPercent =
        isTask && totalColumns === 1 ? 0 : column * (100 / totalColumns);

      return { event, widthPercent, leftPercent };
    });
  };

  const dayEvents = getEventsForDay();
  const eventLayout = getEventLayout(dayEvents);

  // Handle drag selection
  const getTimeFromMouseEvent = (e: React.MouseEvent) => {
    if (!gridRef.current) return null;
    const rect = gridRef.current.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const hours = Math.floor(y / HOUR_HEIGHT);
    const minutes = Math.floor((y % HOUR_HEIGHT) / (HOUR_HEIGHT / 4)) * 15;
    return hours * 60 + minutes;
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    const time = getTimeFromMouseEvent(e);
    if (time === null) return;
    setIsDragging(true);
    setDragStart(time);
    setDragEnd(time);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || dragStart === null) return;
    const time = getTimeFromMouseEvent(e);
    if (time !== null) {
      setDragEnd(time);
    }
  };

  useEffect(() => {
    const handleMouseUp = () => {
      if (isDragging && dragStart !== null && dragEnd !== null) {
        const startTime = Math.min(dragStart, dragEnd);
        const endTime = Math.max(dragStart, dragEnd);
        const timeDiff = Math.abs(endTime - startTime);

        const startDate = addMinutes(startOfDay(currentDay), startTime);

        // If very small movement (< 5 minutes), treat as click (1 hour event)
        if (timeDiff < 5) {
          const endDate = addMinutes(startDate, 60);
          onCreateEvent?.(startDate, endDate);
        } else if (timeDiff > 0) {
          // Otherwise use the dragged range
          const endDate = addMinutes(startOfDay(currentDay), endTime);
          onCreateEvent?.(startDate, endDate);
        }
      }
      setIsDragging(false);
      setDragStart(null);
      setDragEnd(null);
    };

    if (isDragging) {
      window.addEventListener("mouseup", handleMouseUp);
      return () => window.removeEventListener("mouseup", handleMouseUp);
    }
  }, [isDragging, dragStart, dragEnd, currentDay, onCreateEvent]);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 px-2">
        <h2 className="text-2xl font-bold">
          {format(currentDay, "EEEE, MMMM d, yyyy")}
        </h2>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={goToToday}
            aria-label="Go to today"
          >
            Today
          </Button>

          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={previousDay}
              aria-label="Previous day"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={nextDay}
              aria-label="Next day"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          {onCreateEvent && (
            <Button
              size="sm"
              onClick={() => {
                const startDate = new Date(currentDay);
                startDate.setHours(9, 0, 0, 0);
                const endDate = new Date(currentDay);
                endDate.setHours(10, 0, 0, 0);
                onCreateEvent(startDate, endDate);
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

      {/* Calendar Grid */}
      <div className="flex-1 border rounded-lg overflow-auto bg-card">
        <div className="relative min-w-[300px]">
          {/* Time column + Day column */}
          <div className="flex">
            {/* Time labels */}
            <div className="sticky left-0 z-30 bg-card border-r w-16 flex-shrink-0">
              <div className="h-[76px] border-b sticky top-0 bg-card z-40" />{" "}
              {/* Header spacer */}
              {HOURS.map((hour) => (
                <div
                  key={hour}
                  className="relative"
                  style={{ height: `${HOUR_HEIGHT}px` }}
                >
                  <span className="absolute -top-2 right-2 text-xs text-muted-foreground bg-muted/20 px-1">
                    {format(new Date().setHours(hour, 0), "h a")}
                  </span>
                </div>
              ))}
            </div>

            {/* Day column */}
            <div className="flex-1 relative">
              {/* Header */}
              <div className="sticky top-0 z-20 bg-card border-b h-[76px] flex items-center justify-center">
                <div className="text-center">
                  <div className="text-sm font-medium">
                    {format(currentDay, "EEE")}
                  </div>
                  <div
                    className={cn(
                      "text-2xl font-bold mt-1 w-10 h-10 mx-auto flex items-center justify-center rounded-full",
                      isToday(currentDay) &&
                        "bg-primary text-primary-foreground"
                    )}
                  >
                    {format(currentDay, "d")}
                  </div>
                </div>
              </div>

              {/* Time grid */}
              <div
                ref={gridRef}
                className="relative select-none"
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                style={{ cursor: isDragging ? "row-resize" : "default" }}
              >
                {/* Hour lines */}
                {HOURS.map((hour) => (
                  <div
                    key={hour}
                    className="border-b border-border/50"
                    style={{ height: `${HOUR_HEIGHT}px` }}
                  />
                ))}

                {/* Drag selection overlay */}
                {isDragging && dragStart !== null && dragEnd !== null && (
                  <div
                    className="absolute left-0 right-0 bg-primary/20 border-2 border-primary pointer-events-none z-10"
                    style={{
                      top: `${(Math.min(dragStart, dragEnd) / 60) * HOUR_HEIGHT}px`,
                      height: `${(Math.abs(dragEnd - dragStart) / 60) * HOUR_HEIGHT}px`,
                    }}
                  />
                )}

                {/* Events */}
                {eventLayout.map(({ event, widthPercent, leftPercent }) => {
                  const displayEvent = event as DisplayEvent;
                  const isTask = displayEvent.type === "task";
                  const startMinutes =
                    displayEvent.displayStart.getHours() * 60 +
                    displayEvent.displayStart.getMinutes();
                  const durationMinutes = differenceInMinutes(
                    displayEvent.displayEnd,
                    displayEvent.displayStart
                  );
                  const top = (startMinutes / 60) * HOUR_HEIGHT;
                  // For tasks, use a fixed minimum height
                  const height = isTask
                    ? 40
                    : Math.max(
                        (durationMinutes / 60) * HOUR_HEIGHT,
                        MIN_EVENT_HEIGHT
                      );

                  return (
                    <button
                      key={displayEvent.id}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        onEventClick?.(displayEvent);
                      }}
                      onMouseDown={(e) => {
                        e.stopPropagation();
                      }}
                      className={cn(
                        "absolute px-2 py-1 text-left text-sm rounded transition-all z-10",
                        "hover:z-30 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-offset-1",
                        isTask && "border-2 border-white/30"
                      )}
                      style={{
                        top: `${top}px`,
                        height: `${height}px`,
                        left: isTask ? "2px" : `calc(${leftPercent}% + 2px)`,
                        width: isTask
                          ? "calc(100% - 4px)"
                          : `calc(${widthPercent}% - 4px)`,
                        backgroundColor:
                          displayEvent.color ||
                          (isTask ? "#10B981" : "#3B82F6"),
                        color: "white",
                      }}
                    >
                      <div className="flex items-center gap-1">
                        {isTask && (
                          <CheckSquare className="h-3 w-3 flex-shrink-0" />
                        )}
                        <div className="font-medium truncate">
                          {displayEvent.title}
                        </div>
                      </div>
                      {height > 30 && (
                        <div className="text-xs opacity-90">
                          {isTask && displayEvent.deadline
                            ? `Due: ${format(typeof displayEvent.deadline === "string" ? new Date(displayEvent.deadline) : displayEvent.deadline, "h:mm a")}`
                            : format(displayEvent.displayStart, "h:mm a")}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Keyboard shortcuts help */}
      <div className="mt-4 text-xs text-muted-foreground text-center">
        <p>Drag to select time range • Click event to view details</p>
      </div>
    </div>
  );
}

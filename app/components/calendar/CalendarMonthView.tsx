"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { Button } from "@/app/components/ui/button";
import { cn } from "@/app/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/app/components/ui/dialog";
import { CalendarEvent } from "@/app/types";
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  format,
  isSameMonth,
  isSameDay,
  isToday,
  addMonths,
  subMonths,
  parseISO,
} from "date-fns";

interface CalendarMonthViewProps {
  events: CalendarEvent[];
  selectedDate?: Date;
  onDateSelect?: (date: Date) => void;
  onEventClick?: (event: CalendarEvent) => void;
  onCreateEvent?: (date: Date) => void;
  loading?: boolean;
}

export function CalendarMonthView({
  events,
  selectedDate,
  onDateSelect,
  onEventClick,
  onCreateEvent,
  loading = false,
}: CalendarMonthViewProps) {
  const [currentMonth, setCurrentMonth] = useState(selectedDate || new Date());
  const [showMoreDialog, setShowMoreDialog] = useState(false);
  const [moreDialogDate, setMoreDialogDate] = useState<Date | null>(null);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarStart = startOfWeek(monthStart);
  const calendarEnd = endOfWeek(monthEnd);

  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });
  const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  const previousMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
  const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
  const goToToday = () => setCurrentMonth(new Date());

  // Get events for a specific day
  const getEventsForDay = (day: Date) => {
    return events.filter((event) => {
      const eventStart =
        typeof event.startDate === "string"
          ? parseISO(event.startDate)
          : event.startDate;
      const eventEnd =
        typeof event.endDate === "string"
          ? parseISO(event.endDate)
          : event.endDate;

      // Check if event overlaps with this day
      const dayStart = new Date(day);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(day);
      dayEnd.setHours(23, 59, 59, 999);

      return eventStart <= dayEnd && eventEnd >= dayStart;
    });
  };

  const handleDateClick = (day: Date) => {
    onDateSelect?.(day);
  };

  const handleDateDoubleClick = (day: Date) => {
    onCreateEvent?.(day);
  };

  const handleKeyDown = (e: React.KeyboardEvent, day: Date) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onDateSelect?.(day);
    } else if (e.key === "n" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      onCreateEvent?.(day);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 px-2">
        <h2 className="text-2xl font-bold">
          {format(currentMonth, "MMMM yyyy")}
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
              onClick={previousMonth}
              aria-label="Previous month"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={nextMonth}
              aria-label="Next month"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          {onCreateEvent && (
            <Button
              size="sm"
              onClick={() => onCreateEvent(new Date())}
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
      <div className="flex-1 border rounded-lg overflow-hidden bg-card">
        {/* Week day headers */}
        <div className="grid grid-cols-7 border-b bg-muted/50">
          {weekDays.map((day) => (
            <div
              key={day}
              className="p-2 text-center text-sm font-medium text-muted-foreground"
            >
              <span className="hidden sm:inline">{day}</span>
              <span className="sm:hidden">{day.slice(0, 1)}</span>
            </div>
          ))}
        </div>

        {/* Calendar days */}
        <div className="grid grid-cols-7" style={{ gridAutoRows: "1fr" }}>
          {days.map((day) => {
            const dayEvents = getEventsForDay(day);
            const isCurrentMonth = isSameMonth(day, currentMonth);
            const isSelected = selectedDate && isSameDay(day, selectedDate);
            const isTodayDate = isToday(day);

            return (
              <div
                key={day.toISOString()}
                className={cn(
                  "min-h-[80px] sm:min-h-[120px] border-r border-b p-1 sm:p-2 transition-colors",
                  !isCurrentMonth && "bg-muted/20",
                  isSelected && "bg-primary/5 ring-2 ring-primary ring-inset",
                  "hover:bg-accent/50 cursor-pointer focus-within:ring-2 focus-within:ring-primary"
                )}
                onClick={() => handleDateClick(day)}
                onDoubleClick={() => handleDateDoubleClick(day)}
                onKeyDown={(e) => handleKeyDown(e, day)}
                tabIndex={0}
                role="gridcell"
                aria-label={`${format(day, "MMMM d, yyyy")}, ${dayEvents.length} events`}
                aria-selected={isSelected}
              >
                {/* Day number */}
                <div
                  className={cn(
                    "text-sm font-medium mb-1 flex items-center justify-center w-7 h-7 rounded-full",
                    !isCurrentMonth && "text-muted-foreground",
                    isTodayDate && "bg-primary text-primary-foreground"
                  )}
                >
                  {format(day, "d")}
                </div>

                {/* Events */}
                <div className="space-y-1">
                  {loading ? (
                    <div className="h-4 bg-muted rounded animate-pulse" />
                  ) : (
                    dayEvents.slice(0, 3).map((event) => (
                      <button
                        key={event.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          onEventClick?.(event);
                        }}
                        className={cn(
                          "w-full text-left px-1.5 py-0.5 rounded text-xs truncate transition-colors",
                          "hover:opacity-80 focus:outline-none focus:ring-2 focus:ring-offset-1"
                        )}
                        style={{
                          backgroundColor: event.color || "#3B82F6",
                          color: "white",
                        }}
                        aria-label={`Event: ${event.title}, ${format(
                          typeof event.startDate === "string"
                            ? parseISO(event.startDate)
                            : event.startDate,
                          event.allDay ? "MMMM d" : "h:mm a"
                        )}`}
                      >
                        <span className="font-medium">{event.title}</span>
                      </button>
                    ))
                  )}

                  {dayEvents.length > 3 && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setMoreDialogDate(day);
                        setShowMoreDialog(true);
                      }}
                      className="text-xs text-primary hover:underline pl-1.5 font-medium"
                    >
                      +{dayEvents.length - 3} more
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* More Events Dialog */}
      <Dialog open={showMoreDialog} onOpenChange={setShowMoreDialog}>
        <DialogContent className="max-w-md max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>
              {moreDialogDate && format(moreDialogDate, "MMMM d, yyyy")}
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto space-y-2 pr-2">
            {moreDialogDate &&
              getEventsForDay(moreDialogDate).map((event) => (
                <button
                  key={event.id}
                  onClick={() => {
                    onEventClick?.(event);
                    setShowMoreDialog(false);
                  }}
                  className={cn(
                    "w-full text-left p-3 rounded-lg border transition-all",
                    "hover:shadow-md focus:outline-none focus:ring-2 focus:ring-primary"
                  )}
                  style={{
                    borderLeftWidth: "4px",
                    borderLeftColor: event.color || "#3B82F6",
                  }}
                >
                  <div className="font-medium mb-1">{event.title}</div>
                  <div className="text-sm text-muted-foreground">
                    {format(
                      typeof event.startDate === "string"
                        ? parseISO(event.startDate)
                        : event.startDate,
                      event.allDay ? "MMM d, yyyy" : "h:mm a"
                    )}
                    {" - "}
                    {format(
                      typeof event.endDate === "string"
                        ? parseISO(event.endDate)
                        : event.endDate,
                      event.allDay ? "MMM d, yyyy" : "h:mm a"
                    )}
                  </div>
                  {event.location && (
                    <div className="text-sm text-muted-foreground mt-1">
                      📍 {event.location}
                    </div>
                  )}
                </button>
              ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Keyboard shortcuts help */}
      <div className="mt-4 text-xs text-muted-foreground text-center">
        <p>
          Click a date to select • Double-click to create event • Cmd/Ctrl+N for
          new event
        </p>
      </div>
    </div>
  );
}

"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Calendar,
  CalendarDays,
  CalendarClock,
  Download,
  Plus,
  Trash2,
  Eye,
  EyeOff,
} from "lucide-react";
import { Button } from "@/app/components/ui/button";
import { CalendarMonthView } from "@/app/components/calendar/CalendarMonthView";
import { CalendarWeekView } from "@/app/components/calendar/CalendarWeekView";
import { CalendarDayView } from "@/app/components/calendar/CalendarDayView";
import { EventDialog } from "@/app/components/calendar/EventDialog";
import { EventDetailDialog } from "@/app/components/calendar/EventDetailDialog";
import { MiniCalendar } from "@/app/components/calendar/MiniCalendar";
import { ImportExportDialog } from "@/app/components/calendar/ImportExportDialog";
import { CalendarEvent, UserCalendar } from "@/app/types";
import { toast } from "sonner";
import { startOfDay } from "date-fns";

type ViewMode = "month" | "week" | "day";

export default function CalendarPage() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [calendars, setCalendars] = useState<UserCalendar[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>("month");

  // Dialog states
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [importExportDialogOpen, setImportExportDialogOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(
    null
  );
  const [createDate, setCreateDate] = useState<Date | undefined>();

  // Fetch calendars
  const fetchCalendars = useCallback(async () => {
    try {
      const response = await fetch("/api/calendars");
      if (response.ok) {
        const data = await response.json();
        setCalendars(data.data.calendars);
      }
    } catch (error) {
      console.error("Failed to fetch calendars:", error);
    }
  }, []);

  // Fetch events
  const fetchEvents = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/events?limit=100");

      if (!response.ok) {
        if (response.status === 401) {
          window.location.href = "/auth/login";
          return;
        }
        throw new Error("Failed to fetch events");
      }

      const data = await response.json();
      setEvents(data.data.events);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to load events"
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
    fetchCalendars();
  }, [fetchCalendars]);

  const handleCreateEvent = (date: Date, endDate?: Date) => {
    setCreateDate(date);
    if (endDate) {
      // Store end date for week view drag selection
      setSelectedEvent({
        id: "",
        title: "",
        startDate: date,
        endDate: endDate,
        allDay: false,
      } as CalendarEvent);
    }
    setCreateDialogOpen(true);
  };

  const handleEventClick = (event: CalendarEvent) => {
    setSelectedEvent(event);
    setDetailDialogOpen(true);
  };

  const handleEditEvent = () => {
    setDetailDialogOpen(false);
    setEditDialogOpen(true);
  };

  const handleDialogClose = () => {
    setCreateDialogOpen(false);
    setEditDialogOpen(false);
    setDetailDialogOpen(false);
    setSelectedEvent(null);
    setCreateDate(undefined);
  };

  const handleSuccess = () => {
    fetchEvents();
    fetchCalendars();
    handleDialogClose();
  };

  // Toggle calendar visibility
  const handleToggleCalendar = async (calendarId: string) => {
    const cal = calendars.find((c) => c.id === calendarId);
    if (!cal) return;

    // Optimistic update
    setCalendars((prev) =>
      prev.map((c) =>
        c.id === calendarId ? { ...c, isVisible: !c.isVisible } : c
      )
    );

    try {
      const response = await fetch(`/api/calendars/${calendarId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isVisible: !cal.isVisible }),
      });
      if (!response.ok) throw new Error("Failed to update");
    } catch {
      // Revert on error
      setCalendars((prev) =>
        prev.map((c) =>
          c.id === calendarId ? { ...c, isVisible: cal.isVisible } : c
        )
      );
      toast.error("Failed to update calendar visibility");
    }
  };

  // Delete a calendar
  const handleDeleteCalendar = async (calendarId: string) => {
    const cal = calendars.find((c) => c.id === calendarId);
    if (!cal) return;

    if (cal.isDefault) {
      toast.error("Cannot delete the default calendar");
      return;
    }

    if (!confirm(`Delete "${cal.name}" and all its events?`)) return;

    try {
      const response = await fetch(`/api/calendars/${calendarId}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Failed to delete");
      toast.success(`Calendar "${cal.name}" deleted`);
      fetchCalendars();
      fetchEvents();
    } catch {
      toast.error("Failed to delete calendar");
    }
  };

  // Filter events by visible calendars
  const visibleCalendarIds = new Set(
    calendars.filter((c) => c.isVisible).map((c) => c.id)
  );
  const defaultCalendar = calendars.find((c) => c.isDefault);
  const filteredEvents = events.filter((event) => {
    if (!event.calendarId) {
      // Events without a calendarId belong to the default calendar
      return defaultCalendar ? defaultCalendar.isVisible : true;
    }
    return visibleCalendarIds.has(event.calendarId);
  });

  // Get unique event dates for Mini Calendar highlighting
  const eventDates = filteredEvents.map((event) =>
    startOfDay(new Date(event.startDate))
  );

  return (
    <div className="container mx-auto px-4 py-8 min-h-[calc(100vh-12rem)]">
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Sidebar with Mini Calendar */}
        <div className="lg:w-80 w-full flex-shrink-0 space-y-6">
          <div className="bg-card border rounded-lg p-4 lg:block">
            <MiniCalendar
              selectedDate={selectedDate}
              onDateSelect={setSelectedDate}
              eventDates={eventDates}
            />
          </div>

          {/* Quick Stats */}
          <div className="lg:block bg-card border rounded-lg p-4 space-y-3">
            <h3 className="font-semibold text-sm">Quick Stats</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total Events:</span>
                <span className="font-medium">
                  {filteredEvents.filter((e) => e.type === "event").length}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total Tasks:</span>
                <span className="font-medium">
                  {filteredEvents.filter((e) => e.type === "task").length}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Completed:</span>
                <span className="font-medium">
                  {filteredEvents.filter((e) => e.completed).length}
                </span>
              </div>
            </div>
          </div>

          {/* My Calendars */}
          <div className="lg:block bg-card border rounded-lg p-4 space-y-3">
            <h3 className="font-semibold text-sm">My Calendars</h3>
            <div className="space-y-1">
              {calendars.map((cal) => (
                <div
                  key={cal.id}
                  className="flex items-center gap-2 group rounded-md px-2 py-1.5 hover:bg-muted/50 transition-colors"
                >
                  <button
                    onClick={() => handleToggleCalendar(cal.id)}
                    className="flex items-center gap-2 flex-1 min-w-0 text-left"
                  >
                    <span
                      className="w-3 h-3 rounded-sm flex-shrink-0 border"
                      style={{
                        backgroundColor: cal.isVisible
                          ? cal.color
                          : "transparent",
                        borderColor: cal.color,
                      }}
                    />
                    <span className="text-sm truncate">{cal.name}</span>
                  </button>
                  <button onClick={() => handleToggleCalendar(cal.id)}>
                    {cal.isVisible ? (
                      <Eye className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                    ) : (
                      <EyeOff className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                    )}
                  </button>
                  {!cal.isDefault && (
                    <button
                      onClick={() => handleDeleteCalendar(cal.id)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                    >
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Main Calendar Area */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* View Toggle and Actions */}
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-0 sm:justify-between sm:items-center mb-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setImportExportDialogOpen(true)}
              className="gap-2 w-full sm:w-auto"
            >
              <Download className="h-4 w-4" />
              <span className="sm:inline">Import / Export</span>
            </Button>

            <div className="inline-flex rounded-lg border bg-muted p-1 w-full sm:w-auto">
              <Button
                variant={viewMode === "month" ? "default" : "ghost"}
                size="sm"
                onClick={() => setViewMode("month")}
                className="gap-2 flex-1 sm:flex-initial"
              >
                <Calendar className="h-4 w-4" />
                <span className="hidden sm:inline">Month</span>
              </Button>
              <Button
                variant={viewMode === "week" ? "default" : "ghost"}
                size="sm"
                onClick={() => setViewMode("week")}
                className="gap-2 flex-1 sm:flex-initial"
              >
                <CalendarDays className="h-4 w-4" />
                <span className="hidden sm:inline">Week</span>
              </Button>
              <Button
                variant={viewMode === "day" ? "default" : "ghost"}
                size="sm"
                onClick={() => setViewMode("day")}
                className="gap-2 flex-1 sm:flex-initial"
              >
                <CalendarClock className="h-4 w-4" />
                <span className="hidden sm:inline">Day</span>
              </Button>
            </div>
          </div>

          {/* Calendar Views */}
          {viewMode === "month" ? (
            <CalendarMonthView
              events={filteredEvents}
              selectedDate={selectedDate}
              onDateSelect={setSelectedDate}
              onEventClick={handleEventClick}
              onCreateEvent={handleCreateEvent}
              loading={loading}
            />
          ) : viewMode === "week" ? (
            <CalendarWeekView
              events={filteredEvents}
              selectedDate={selectedDate}
              onDateSelect={setSelectedDate}
              onEventClick={handleEventClick}
              onCreateEvent={handleCreateEvent}
              loading={loading}
            />
          ) : (
            <CalendarDayView
              events={filteredEvents}
              selectedDate={selectedDate}
              onDateSelect={setSelectedDate}
              onEventClick={handleEventClick}
              onCreateEvent={handleCreateEvent}
              loading={loading}
            />
          )}
        </div>
      </div>

      {/* Create Event Dialog */}
      <EventDialog
        open={createDialogOpen}
        onOpenChange={() => {
          setCreateDialogOpen(false);
          setSelectedEvent(null);
        }}
        defaultDate={createDate}
        event={
          createDialogOpen && selectedEvent?.id === ""
            ? selectedEvent
            : undefined
        }
        calendars={calendars}
        onSuccess={handleSuccess}
      />

      {/* Edit Event Dialog */}
      <EventDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        event={selectedEvent || undefined}
        calendars={calendars}
        onSuccess={handleSuccess}
      />

      {/* Event Detail Dialog */}
      <EventDetailDialog
        open={detailDialogOpen}
        onOpenChange={setDetailDialogOpen}
        event={selectedEvent}
        calendars={calendars}
        onEdit={handleEditEvent}
        onDelete={handleSuccess}
      />

      {/* Import/Export Dialog */}
      <ImportExportDialog
        isOpen={importExportDialogOpen}
        onClose={() => setImportExportDialogOpen(false)}
        onImportSuccess={() => {
          fetchEvents();
          fetchCalendars();
        }}
      />
    </div>
  );
}

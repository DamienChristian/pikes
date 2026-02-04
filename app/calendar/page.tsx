"use client";

import { useState, useEffect } from "react";
import { Calendar, CalendarDays, CalendarClock, Download } from "lucide-react";
import { Button } from "@/app/components/ui/button";
import { CalendarMonthView } from "@/app/components/calendar/CalendarMonthView";
import { CalendarWeekView } from "@/app/components/calendar/CalendarWeekView";
import { CalendarDayView } from "@/app/components/calendar/CalendarDayView";
import { EventDialog } from "@/app/components/calendar/EventDialog";
import { EventDetailDialog } from "@/app/components/calendar/EventDetailDialog";
import { MiniCalendar } from "@/app/components/calendar/MiniCalendar";
import { ImportExportDialog } from "@/app/components/calendar/ImportExportDialog";
import { CalendarEvent } from "@/app/types";
import { toast } from "sonner";
import { startOfDay } from "date-fns";

type ViewMode = "month" | "week" | "day";

export default function CalendarPage() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
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
  }, []);

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
    handleDialogClose();
  };

  // Get unique event dates for Mini Calendar highlighting
  const eventDates = events.map((event) =>
    startOfDay(new Date(event.startDate))
  );

  return (
    <div className="container mx-auto px-4 py-8 h-[calc(100vh-8rem)]">
      <div className="flex gap-6 h-full">
        {/* Sidebar with Mini Calendar */}
        <div className="w-80 flex-shrink-0 space-y-6">
          <div className="bg-card border rounded-lg p-4">
            <MiniCalendar
              selectedDate={selectedDate}
              onDateSelect={setSelectedDate}
              eventDates={eventDates}
            />
          </div>

          {/* Quick Stats */}
          <div className="bg-card border rounded-lg p-4 space-y-3">
            <h3 className="font-semibold text-sm">Quick Stats</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total Events:</span>
                <span className="font-medium">
                  {events.filter((e) => e.type === "event").length}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total Tasks:</span>
                <span className="font-medium">
                  {events.filter((e) => e.type === "task").length}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Completed:</span>
                <span className="font-medium">
                  {events.filter((e) => e.completed).length}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Main Calendar Area */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* View Toggle and Actions */}
          <div className="flex justify-between items-center mb-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setImportExportDialogOpen(true)}
              className="gap-2"
            >
              <Download className="h-4 w-4" />
              Import / Export
            </Button>

            <div className="inline-flex rounded-lg border bg-muted p-1">
              <Button
                variant={viewMode === "month" ? "default" : "ghost"}
                size="sm"
                onClick={() => setViewMode("month")}
                className="gap-2"
              >
                <Calendar className="h-4 w-4" />
                Month
              </Button>
              <Button
                variant={viewMode === "week" ? "default" : "ghost"}
                size="sm"
                onClick={() => setViewMode("week")}
                className="gap-2"
              >
                <CalendarDays className="h-4 w-4" />
                Week
              </Button>
              <Button
                variant={viewMode === "day" ? "default" : "ghost"}
                size="sm"
                onClick={() => setViewMode("day")}
                className="gap-2"
              >
                <CalendarClock className="h-4 w-4" />
                Day
              </Button>
            </div>
          </div>

          {/* Calendar Views */}
          {viewMode === "month" ? (
            <CalendarMonthView
              events={events}
              selectedDate={selectedDate}
              onDateSelect={setSelectedDate}
              onEventClick={handleEventClick}
              onCreateEvent={handleCreateEvent}
              loading={loading}
            />
          ) : viewMode === "week" ? (
            <CalendarWeekView
              events={events}
              selectedDate={selectedDate}
              onDateSelect={setSelectedDate}
              onEventClick={handleEventClick}
              onCreateEvent={handleCreateEvent}
              loading={loading}
            />
          ) : (
            <CalendarDayView
              events={events}
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
        onSuccess={handleSuccess}
      />

      {/* Edit Event Dialog */}
      <EventDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        event={selectedEvent || undefined}
        onSuccess={handleSuccess}
      />

      {/* Event Detail Dialog */}
      <EventDetailDialog
        open={detailDialogOpen}
        onOpenChange={setDetailDialogOpen}
        event={selectedEvent}
        onEdit={handleEditEvent}
        onDelete={handleSuccess}
      />

      {/* Import/Export Dialog */}
      <ImportExportDialog
        isOpen={importExportDialogOpen}
        onClose={() => setImportExportDialogOpen(false)}
        onImportSuccess={fetchEvents}
      />
    </div>
  );
}

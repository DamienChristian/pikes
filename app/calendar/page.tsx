"use client";

import { useState, useEffect } from "react";
import {
  Calendar,
  CalendarDays,
  CalendarClock,
  Download,
  Plus,
  Trash2,
  Eye,
  EyeOff,
  Settings,
  Share2,
  LogOut,
  Users,
} from "lucide-react";
import { Button } from "@/app/components/ui/button";
import { CalendarMonthView } from "@/app/components/calendar/CalendarMonthView";
import { CalendarWeekView } from "@/app/components/calendar/CalendarWeekView";
import { CalendarDayView } from "@/app/components/calendar/CalendarDayView";
import { EventDialog } from "@/app/components/calendar/EventDialog";
import { EventDetailDialog } from "@/app/components/calendar/EventDetailDialog";
import { MiniCalendar } from "@/app/components/calendar/MiniCalendar";
import { ImportExportDialog } from "@/app/components/calendar/ImportExportDialog";
import { CalendarDialog } from "@/app/components/calendar/CalendarDialog";
import { CalendarSettingsDialog } from "@/app/components/calendar/CalendarSettingsDialog";
import { ShareCalendarDialog } from "@/app/components/calendar/ShareCalendarDialog";
import { CalendarEvent, UserCalendar } from "@/app/types";
import { toast } from "sonner";
import { startOfDay } from "date-fns";
import { useAppDispatch, useAppSelector } from "@/app/lib/store/hooks";
import {
  fetchCalendars,
  optimisticToggleVisibility,
  revertToggleVisibility,
  toggleCalendarVisibility,
  deleteCalendar as deleteCalendarThunk,
} from "@/app/lib/store/calendarsSlice";
import { fetchEvents } from "@/app/lib/store/eventsSlice";

type ViewMode = "month" | "week" | "day";

export default function CalendarPage() {
  const dispatch = useAppDispatch();
  const calendars = useAppSelector((state) => state.calendars.items);
  const events = useAppSelector((state) => state.events.items);
  const loading = useAppSelector((state) => state.events.loading);

  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>("month");

  // Dialog states
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [importExportDialogOpen, setImportExportDialogOpen] = useState(false);
  const [calendarDialogOpen, setCalendarDialogOpen] = useState(false);
  const [settingsDialogOpen, setSettingsDialogOpen] = useState(false);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [activeCalendar, setActiveCalendar] = useState<UserCalendar | null>(
    null
  );
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(
    null
  );
  const [createDate, setCreateDate] = useState<Date | undefined>();

  useEffect(() => {
    dispatch(fetchEvents());
    dispatch(fetchCalendars());
  }, [dispatch]);

  // Handle ?join=<token> query param for join-by-link
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const joinToken = params.get("join");
    if (!joinToken) return;

    // Clean the URL immediately
    window.history.replaceState({}, "", window.location.pathname);

    (async () => {
      try {
        const res = await fetch("/api/calendars/join", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token: joinToken }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to join calendar");
        toast.success(data.message || "Joined calendar");
        dispatch(fetchCalendars());
        dispatch(fetchEvents());
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Failed to join calendar"
        );
      }
    })();
  }, [dispatch]);

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
    dispatch(fetchEvents());
    handleDialogClose();
  };

  // Toggle calendar visibility
  const handleToggleCalendar = async (calendarId: string) => {
    const cal = calendars.find((c) => c.id === calendarId);
    if (!cal) return;

    // Capture the desired new visibility before the optimistic flip
    const newVisibility = !cal.isVisible;

    // Optimistic update
    dispatch(optimisticToggleVisibility(calendarId));

    try {
      await dispatch(
        toggleCalendarVisibility({ calendarId, isVisible: newVisibility })
      ).unwrap();
    } catch {
      // Revert on error
      dispatch(
        revertToggleVisibility({ calendarId, isVisible: cal.isVisible })
      );
      toast.error("Failed to update calendar visibility");
    }
  };

  // Delete a calendar (or leave shared calendar)
  const handleDeleteCalendar = async (calendarId: string) => {
    const cal = calendars.find((c) => c.id === calendarId);
    if (!cal) return;

    if (cal.isDefault) {
      toast.error("Cannot delete the default calendar");
      return;
    }

    const isOwner = cal.role === "owner";
    const message = isOwner
      ? `Delete "${cal.name}" and all its events?`
      : `Leave "${cal.name}"? You will lose access to this shared calendar.`;

    if (!confirm(message)) return;

    try {
      await dispatch(deleteCalendarThunk(calendarId)).unwrap();
      toast.success(
        isOwner ? `Calendar "${cal.name}" deleted` : `Left "${cal.name}"`
      );
      dispatch(fetchEvents());
    } catch {
      toast.error(
        isOwner ? "Failed to delete calendar" : "Failed to leave calendar"
      );
    }
  };

  const handleOpenSettings = (cal: UserCalendar) => {
    setActiveCalendar(cal);
    setSettingsDialogOpen(true);
  };

  const handleOpenShare = (cal: UserCalendar) => {
    setActiveCalendar(cal);
    setShareDialogOpen(true);
  };

  // Split calendars into own vs shared
  const ownCalendars = calendars.filter((c) => c.role === "owner");
  const sharedCalendars = calendars.filter((c) => c.role !== "owner");

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
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-sm">My Calendars</h3>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => setCalendarDialogOpen(true)}
                title="New calendar"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <div className="space-y-1">
              {ownCalendars.map((cal) => (
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
                    {cal.members && cal.members.length > 0 && (
                      <Users className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                    )}
                  </button>
                  <button onClick={() => handleToggleCalendar(cal.id)}>
                    {cal.isVisible ? (
                      <Eye className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                    ) : (
                      <EyeOff className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                    )}
                  </button>
                  {!cal.isDefault && (
                    <>
                      <button
                        onClick={() => handleOpenSettings(cal)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                        title="Settings"
                      >
                        <Settings className="h-3.5 w-3.5 text-muted-foreground" />
                      </button>
                      <button
                        onClick={() => handleOpenShare(cal)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                        title="Share"
                      >
                        <Share2 className="h-3.5 w-3.5 text-muted-foreground" />
                      </button>
                      <button
                        onClick={() => handleDeleteCalendar(cal.id)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                        title="Delete"
                      >
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </button>
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Shared Calendars */}
          {sharedCalendars.length > 0 && (
            <div className="lg:block bg-card border rounded-lg p-4 space-y-3">
              <h3 className="font-semibold text-sm">Shared with me</h3>
              <div className="space-y-1">
                {sharedCalendars.map((cal) => (
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
                      <span className="text-[10px] text-muted-foreground flex-shrink-0 capitalize">
                        {cal.role}
                      </span>
                    </button>
                    <button onClick={() => handleToggleCalendar(cal.id)}>
                      {cal.isVisible ? (
                        <Eye className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                      ) : (
                        <EyeOff className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                      )}
                    </button>
                    <button
                      onClick={() => handleDeleteCalendar(cal.id)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                      title="Leave calendar"
                    >
                      <LogOut className="h-3.5 w-3.5 text-destructive" />
                    </button>
                  </div>
                ))}
              </div>
              {sharedCalendars.some((c) => c.ownerName) && (
                <p className="text-[10px] text-muted-foreground">
                  Shared by:{" "}
                  {[
                    ...new Set(
                      sharedCalendars.map((c) => c.ownerName).filter(Boolean)
                    ),
                  ].join(", ")}
                </p>
              )}
            </div>
          )}
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
        onImportSuccess={() => {
          dispatch(fetchEvents());
          dispatch(fetchCalendars());
        }}
      />

      {/* Create Calendar Dialog */}
      <CalendarDialog
        open={calendarDialogOpen}
        onOpenChange={setCalendarDialogOpen}
      />

      {/* Calendar Settings Dialog */}
      <CalendarSettingsDialog
        open={settingsDialogOpen}
        onOpenChange={setSettingsDialogOpen}
        calendar={activeCalendar}
      />

      {/* Share Calendar Dialog */}
      <ShareCalendarDialog
        open={shareDialogOpen}
        onOpenChange={setShareDialogOpen}
        calendar={activeCalendar}
      />
    </div>
  );
}

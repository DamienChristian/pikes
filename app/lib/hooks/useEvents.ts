"use client";

import { useState, useCallback } from "react";
import { CalendarEvent } from "@/app/types";

export function useEvents() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/events");
      if (!response.ok) {
        throw new Error("Failed to fetch events");
      }
      const data = await response.json();
      setEvents(data.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  }, []);

  const createEvent = useCallback(
    async (
      eventData: Omit<
        CalendarEvent,
        "id" | "userId" | "createdAt" | "updatedAt"
      >
    ) => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch("/api/events", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(eventData),
        });
        if (!response.ok) {
          throw new Error("Failed to create event");
        }
        const data = await response.json();
        setEvents((prev) => [...prev, data.data]);
        return data.data;
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
        throw err;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const updateEvent = useCallback(
    async (
      id: string,
      eventData: Partial<
        Omit<CalendarEvent, "id" | "userId" | "createdAt" | "updatedAt">
      >
    ) => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(`/api/events/${id}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(eventData),
        });
        if (!response.ok) {
          throw new Error("Failed to update event");
        }
        const data = await response.json();
        setEvents((prev) =>
          prev.map((event) => (event.id === id ? data.data : event))
        );
        return data.data;
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
        throw err;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const deleteEvent = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/events/${id}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        throw new Error("Failed to delete event");
      }
      setEvents((prev) => prev.filter((event) => event.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    events,
    loading,
    error,
    fetchEvents,
    createEvent,
    updateEvent,
    deleteEvent,
  };
}

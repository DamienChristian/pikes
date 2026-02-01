"use client";

import { useState, useCallback } from "react";
import { CalendarView } from "@/app/types";

export function useCalendarView(initialView: CalendarView = "month") {
  const [view, setView] = useState<CalendarView>(initialView);
  const [currentDate, setCurrentDate] = useState<Date>(new Date());

  const changeView = useCallback((newView: CalendarView) => {
    setView(newView);
  }, []);

  const goToToday = useCallback(() => {
    setCurrentDate(new Date());
  }, []);

  const goToDate = useCallback((date: Date) => {
    setCurrentDate(date);
  }, []);

  const navigateNext = useCallback(() => {
    setCurrentDate((prev) => {
      const next = new Date(prev);
      if (view === "month") {
        next.setMonth(next.getMonth() + 1);
      } else if (view === "week") {
        next.setDate(next.getDate() + 7);
      } else if (view === "day") {
        next.setDate(next.getDate() + 1);
      }
      return next;
    });
  }, [view]);

  const navigatePrev = useCallback(() => {
    setCurrentDate((prev) => {
      const next = new Date(prev);
      if (view === "month") {
        next.setMonth(next.getMonth() - 1);
      } else if (view === "week") {
        next.setDate(next.getDate() - 7);
      } else if (view === "day") {
        next.setDate(next.getDate() - 1);
      }
      return next;
    });
  }, [view]);

  return {
    view,
    currentDate,
    changeView,
    goToToday,
    goToDate,
    navigateNext,
    navigatePrev,
  };
}

"use client";

import { Users, CalendarDays, Clock } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/app/components/ui/card";

interface SharedCalendar {
  id: string;
  name: string;
  color: string;
  memberCount: number;
  totalEvents: number;
  upcomingEvents: number;
}

interface SharedCalendarsSummaryProps {
  data: {
    owned: SharedCalendar[];
    memberOf: SharedCalendar[];
  };
}

function CalendarRow({ cal }: { cal: SharedCalendar }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2.5 border-b last:border-b-0">
      <div className="flex items-center gap-2.5 min-w-0">
        <div
          className="w-3.5 h-3.5 rounded-full flex-shrink-0"
          style={{ backgroundColor: cal.color }}
        />
        <span className="font-medium text-sm truncate">{cal.name}</span>
      </div>
      <div className="flex items-center gap-4 flex-shrink-0 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <Users className="h-3 w-3" />
          {cal.memberCount}
        </span>
        <span className="flex items-center gap-1">
          <CalendarDays className="h-3 w-3" />
          {cal.totalEvents}
        </span>
        <span className="flex items-center gap-1">
          <Clock className="h-3 w-3" />
          {cal.upcomingEvents}
        </span>
      </div>
    </div>
  );
}

export function SharedCalendarsSummary({ data }: SharedCalendarsSummaryProps) {
  const hasData = data.owned.length > 0 || data.memberOf.length > 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Shared Calendars</CardTitle>
        <CardDescription>
          Collaboration overview across your shared calendars
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!hasData ? (
          <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">
            No shared calendars yet — share a calendar to see activity here.
          </div>
        ) : (
          <div className="space-y-6">
            {/* Calendars owned by user (shared with others) */}
            {data.owned.length > 0 && (
              <div>
                <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                  Your shared calendars
                </h4>
                <div>
                  {data.owned.map((cal) => (
                    <CalendarRow key={cal.id} cal={cal} />
                  ))}
                </div>
              </div>
            )}

            {/* Calendars shared with user */}
            {data.memberOf.length > 0 && (
              <div>
                <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                  Calendars shared with you
                </h4>
                <div>
                  {data.memberOf.map((cal) => (
                    <CalendarRow key={cal.id} cal={cal} />
                  ))}
                </div>
              </div>
            )}

            {/* Summary row */}
            <div className="flex items-center justify-between pt-3 border-t text-xs text-muted-foreground">
              <span>
                {data.owned.length + data.memberOf.length} shared calendar
                {data.owned.length + data.memberOf.length !== 1 ? "s" : ""}{" "}
                total
              </span>
              <div className="flex gap-4">
                <span className="flex items-center gap-1">
                  <Users className="h-3 w-3" /> Members
                </span>
                <span className="flex items-center gap-1">
                  <CalendarDays className="h-3 w-3" /> Total
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" /> Upcoming
                </span>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

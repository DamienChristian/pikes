"use client";

import * as React from "react";
import { Calendar as CalendarIcon, ChevronDownIcon } from "lucide-react";
import { Button } from "@/app/components/ui/button";
import { Calendar } from "@/app/components/ui/calendar";
import { cn } from "@/app/lib/utils";
import { format } from "date-fns";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/app/components/ui/popover";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";

interface DateTimePickerProps {
  value: Date;
  onChange: (date: Date) => void;
  disabled?: boolean;
  label?: string;
}

export function DateTimePicker({
  value,
  onChange,
  disabled = false,
}: DateTimePickerProps) {
  const [selectedDate, setSelectedDate] = React.useState<Date>(value);
  const [timeValue, setTimeValue] = React.useState<string>(
    format(value, "HH:mm")
  );

  const handleDateSelect = (date: Date | undefined) => {
    if (!date) return;
    setSelectedDate(date);

    // Apply the current time to the new date
    const [hours, minutes] = timeValue.split(":").map(Number);
    const newDateTime = new Date(date);
    newDateTime.setHours(hours, minutes, 0, 0);
    onChange(newDateTime);
  };

  const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = e.target.value;
    setTimeValue(newTime);

    // Update the date with new time
    const [hours, minutes] = newTime.split(":").map(Number);
    if (!isNaN(hours) && !isNaN(minutes)) {
      const newDateTime = new Date(selectedDate);
      newDateTime.setHours(hours, minutes, 0, 0);
      onChange(newDateTime);
    }
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          disabled={disabled}
          className={cn(
            "w-full justify-start text-left font-normal",
            !value && "text-muted-foreground"
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {value ? (
            format(value, "PPP 'at' p")
          ) : (
            <span>Pick a date and time</span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto min-w-[320px] p-0" align="start">
        <div className="p-4">
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={handleDateSelect}
            initialFocus
          />
          <div className="mt-3 border-t pt-3">
            <Label htmlFor="time" className="text-sm font-medium">
              Time
            </Label>
            <Input
              id="time"
              type="time"
              value={timeValue}
              onChange={handleTimeChange}
              className="mt-2"
            />
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

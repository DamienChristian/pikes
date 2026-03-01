import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import { UserCalendar } from "@/app/types";

interface CalendarsState {
  items: UserCalendar[];
  loading: boolean;
  error: string | null;
}

const initialState: CalendarsState = {
  items: [],
  loading: false,
  error: null,
};

export const fetchCalendars = createAsyncThunk(
  "calendars/fetchCalendars",
  async () => {
    const response = await fetch("/api/calendars");
    if (!response.ok) {
      throw new Error("Failed to fetch calendars");
    }
    const data = await response.json();
    return data.data.calendars as UserCalendar[];
  }
);

export const createCalendar = createAsyncThunk(
  "calendars/createCalendar",
  async (payload: { name: string; color: string }) => {
    const response = await fetch("/api/calendars", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || "Failed to create calendar");
    }
    return data.data.calendar as UserCalendar;
  }
);

export const toggleCalendarVisibility = createAsyncThunk(
  "calendars/toggleVisibility",
  async (calendarId: string, { getState }) => {
    const state = getState() as { calendars: CalendarsState };
    const cal = state.calendars.items.find((c) => c.id === calendarId);
    if (!cal) throw new Error("Calendar not found");

    const response = await fetch(`/api/calendars/${calendarId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isVisible: !cal.isVisible }),
    });
    if (!response.ok) throw new Error("Failed to update");

    return { calendarId, isVisible: !cal.isVisible };
  }
);

export const deleteCalendar = createAsyncThunk(
  "calendars/deleteCalendar",
  async (calendarId: string) => {
    const response = await fetch(`/api/calendars/${calendarId}`, {
      method: "DELETE",
    });
    if (!response.ok) throw new Error("Failed to delete");
    return calendarId;
  }
);

const calendarsSlice = createSlice({
  name: "calendars",
  initialState,
  reducers: {
    // Optimistic toggle for instant UI feedback
    optimisticToggleVisibility(state, action: PayloadAction<string>) {
      const cal = state.items.find((c) => c.id === action.payload);
      if (cal) {
        cal.isVisible = !cal.isVisible;
      }
    },
    revertToggleVisibility(
      state,
      action: PayloadAction<{ calendarId: string; isVisible: boolean }>
    ) {
      const cal = state.items.find((c) => c.id === action.payload.calendarId);
      if (cal) {
        cal.isVisible = action.payload.isVisible;
      }
    },
  },
  extraReducers: (builder) => {
    builder
      // fetchCalendars
      .addCase(fetchCalendars.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchCalendars.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload;
      })
      .addCase(fetchCalendars.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || "Failed to fetch calendars";
      })
      // createCalendar
      .addCase(createCalendar.fulfilled, (state, action) => {
        state.items.push(action.payload);
      })
      // toggleCalendarVisibility — state already handled optimistically
      .addCase(toggleCalendarVisibility.rejected, () => {
        // Revert is handled by the component via revertToggleVisibility
      })
      // deleteCalendar
      .addCase(deleteCalendar.fulfilled, (state, action) => {
        state.items = state.items.filter((c) => c.id !== action.payload);
      });
  },
});

export const { optimisticToggleVisibility, revertToggleVisibility } =
  calendarsSlice.actions;
export default calendarsSlice.reducer;

import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { CalendarEvent } from "@/app/types";

interface EventsState {
  items: CalendarEvent[];
  loading: boolean;
  error: string | null;
}

const initialState: EventsState = {
  items: [],
  loading: false,
  error: null,
};

export const fetchEvents = createAsyncThunk("events/fetchEvents", async () => {
  const response = await fetch("/api/events?limit=100");
  if (!response.ok) {
    if (response.status === 401) {
      window.location.href = "/auth/login";
      throw new Error("Unauthorized");
    }
    throw new Error("Failed to fetch events");
  }
  const data = await response.json();
  return data.data.events as CalendarEvent[];
});

const eventsSlice = createSlice({
  name: "events",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchEvents.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchEvents.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload;
      })
      .addCase(fetchEvents.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || "Failed to fetch events";
      });
  },
});

export default eventsSlice.reducer;

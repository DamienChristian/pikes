import { configureStore } from "@reduxjs/toolkit";
import calendarsReducer from "./calendarsSlice";
import eventsReducer from "./eventsSlice";

export const makeStore = () => {
  return configureStore({
    reducer: {
      calendars: calendarsReducer,
      events: eventsReducer,
    },
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware({
        serializableCheck: {
          // Dates come back as strings from the API, but some components
          // may pass Date objects through — ignore those paths.
          ignoredPaths: ["events.items"],
          ignoredActionPaths: ["payload"],
        },
      }),
  });
};

export type AppStore = ReturnType<typeof makeStore>;
export type RootState = ReturnType<AppStore["getState"]>;
export type AppDispatch = AppStore["dispatch"];

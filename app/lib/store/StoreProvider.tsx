"use client";

import { useState } from "react";
import { Provider } from "react-redux";
import { makeStore, AppStore } from "@/app/lib/store";

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [store] = useState<AppStore>(() => makeStore());

  return <Provider store={store}>{children}</Provider>;
}

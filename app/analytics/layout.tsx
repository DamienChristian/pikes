import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Analytics",
  description:
    "View statistics and insights about your calendar, events, tasks, and notes.",
};

export default function AnalyticsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}

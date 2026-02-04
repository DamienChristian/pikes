import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Calendar",
  description: "View and manage your events in a beautiful calendar interface.",
};

export default function CalendarLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}

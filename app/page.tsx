import { Metadata } from "next";
import { getSession } from "@/app/lib/utils/session";
import { Calendar, Clock, Users, BarChart3 } from "lucide-react";
import { Button } from "@/app/components/ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/app/components/ui/card";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Home",
  description:
    "Welcome to Pikes Calendar - your modern event management solution. Organize, schedule, and track your events with ease.",
};

export default async function Home() {
  const session = await getSession();

  return (
    <div className="bg-gradient-to-b from-background to-secondary/20">
      {/* Hero Section */}
      <section className="container mx-auto px-4 py-16 md:py-24 lg:py-32">
        <div className="flex flex-col items-center justify-center text-center space-y-8 max-w-4xl mx-auto">
          <div className="flex items-center justify-center w-20 h-20 rounded-full bg-primary/10 ring-4 ring-primary/20">
            <Calendar className="w-10 h-10 text-primary" />
          </div>

          <div className="space-y-4">
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl lg:text-7xl">
              Welcome to <span className="text-primary">Pikes Calendar</span>
            </h1>
            <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto">
              A modern calendar application to manage your events and schedule
              efficiently. Stay organized and never miss an important date.
            </p>
          </div>

          {session ? (
            <div className="space-y-4">
              <p className="text-lg text-muted-foreground">
                Welcome back,{" "}
                <span className="font-semibold text-foreground">
                  {session.firstName}
                </span>
                ! Your calendar is ready.
              </p>
              <Button size="lg" asChild>
                <Link href="/profile">Go to Dashboard</Link>
              </Button>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row gap-4">
              <Button size="lg" asChild>
                <Link href="/auth/signup">Get Started</Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link href="/auth/login">Sign In</Link>
              </Button>
            </div>
          )}
        </div>
      </section>

      {/* Features Section */}
      <section className="container mx-auto px-4 py-16 md:py-24">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl mb-4">
            Everything you need to stay organized
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Powerful features to help you manage your time effectively
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="border-2 hover:border-primary/50 transition-colors">
            <CardHeader>
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                <Calendar className="w-6 h-6 text-primary" />
              </div>
              <CardTitle>Event Management</CardTitle>
              <CardDescription>
                Create, edit, and organize all your events in one place
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="border-2 hover:border-primary/50 transition-colors">
            <CardHeader>
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                <Clock className="w-6 h-6 text-primary" />
              </div>
              <CardTitle>Smart Reminders</CardTitle>
              <CardDescription>
                Never miss an important event with intelligent notifications
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="border-2 hover:border-primary/50 transition-colors">
            <CardHeader>
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                <Users className="w-6 h-6 text-primary" />
              </div>
              <CardTitle>Collaboration</CardTitle>
              <CardDescription>
                Share calendars and coordinate with your team effortlessly
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="border-2 hover:border-primary/50 transition-colors">
            <CardHeader>
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                <BarChart3 className="w-6 h-6 text-primary" />
              </div>
              <CardTitle>Analytics</CardTitle>
              <CardDescription>
                Track your productivity and optimize your schedule
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </section>
    </div>
  );
}

"use client";

import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import {
  User,
  LogOut,
  Calendar,
  ListTodo,
  FileText,
  Menu,
  BarChart3,
} from "lucide-react";
import { Button } from "@/app/components/ui/button";
import { ThemeToggle } from "@/app/components/ui/theme-toggle";
import Image from "next/image";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/app/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/app/components/ui/sheet";
import { SessionUser } from "@/app/types";
import { toast } from "sonner";
import { useState } from "react";

interface HeaderProps {
  session: SessionUser | null;
}

export function Header({ session }: HeaderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const isAuthPage = pathname?.startsWith("/auth");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  async function handleLogout() {
    try {
      const response = await fetch("/api/auth/logout", {
        method: "POST",
      });

      if (response.ok) {
        toast.success("Logged out successfully");
        setMobileMenuOpen(false);
        router.push("/auth/login");
        router.refresh();
      }
    } catch {
      toast.error("Failed to logout");
    }
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link
          href="/"
          className="flex items-center space-x-2 hover:opacity-80 transition-opacity"
        >
          <Image
            src="/logo-icon-only.svg"
            alt="Pikes Calendar"
            width={32}
            height={32}
            className="w-8 h-8"
          />
          <span className="text-lg sm:text-xl font-bold">Pikes</span>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center space-x-2 sm:space-x-4">
          {session && (
            <>
              <Button variant="ghost" asChild>
                <Link href="/calendar">
                  <Calendar className="h-4 w-4 mr-2" />
                  Calendar
                </Link>
              </Button>
              <Button variant="ghost" asChild>
                <Link href="/tasks">
                  <ListTodo className="h-4 w-4 mr-2" />
                  Tasks
                </Link>
              </Button>
              <Button variant="ghost" asChild>
                <Link href="/notes">
                  <FileText className="h-4 w-4 mr-2" />
                  Notes
                </Link>
              </Button>
              <Button variant="ghost" asChild>
                <Link href="/analytics">
                  <BarChart3 className="h-4 w-4 mr-2" />
                  Analytics
                </Link>
              </Button>
            </>
          )}
          <ThemeToggle />
          {session ? (
            <>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className="flex items-center space-x-2"
                    suppressHydrationWarning
                  >
                    <User className="h-4 w-4" />
                    <span>
                      {session.firstName} {session.lastName}
                    </span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>My Account</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href="/profile" className="cursor-pointer">
                      <User className="mr-2 h-4 w-4" />
                      Profile
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={handleLogout}
                    className="cursor-pointer text-destructive focus:text-destructive"
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : !isAuthPage ? (
            <div className="flex items-center space-x-2">
              <Button variant="ghost" asChild>
                <Link href="/auth/login">Login</Link>
              </Button>
              <Button asChild>
                <Link href="/auth/signup">Sign Up</Link>
              </Button>
            </div>
          ) : null}
        </nav>

        {/* Mobile Navigation */}
        <div className="flex md:hidden items-center gap-2">
          <ThemeToggle />
          {session ? (
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[280px] sm:w-[320px]">
                <SheetHeader>
                  <SheetTitle>Menu</SheetTitle>
                </SheetHeader>
                <div className="flex flex-col gap-4 mt-6">
                  <Button variant="ghost" asChild className="justify-start">
                    <Link
                      href="/calendar"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <Calendar className="h-4 w-4 mr-2" />
                      Calendar
                    </Link>
                  </Button>
                  <Button variant="ghost" asChild className="justify-start">
                    <Link
                      href="/tasks"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <ListTodo className="h-4 w-4 mr-2" />
                      Tasks
                    </Link>
                  </Button>
                  <Button variant="ghost" asChild className="justify-start">
                    <Link
                      href="/notes"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <FileText className="h-4 w-4 mr-2" />
                      Notes
                    </Link>
                  </Button>
                  <Button variant="ghost" asChild className="justify-start">
                    <Link
                      href="/analytics"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <BarChart3 className="h-4 w-4 mr-2" />
                      Analytics
                    </Link>
                  </Button>
                  <div className="border-t pt-4">
                    <Button
                      variant="ghost"
                      asChild
                      className="justify-start w-full"
                    >
                      <Link
                        href="/profile"
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        <User className="h-4 w-4 mr-2" />
                        Profile ({session.firstName})
                      </Link>
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={handleLogout}
                      className="justify-start w-full text-destructive hover:text-destructive"
                    >
                      <LogOut className="h-4 w-4 mr-2" />
                      Logout
                    </Button>
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          ) : !isAuthPage ? (
            <div className="flex items-center space-x-2">
              <Button variant="ghost" asChild size="sm">
                <Link href="/auth/login">Login</Link>
              </Button>
              <Button asChild size="sm">
                <Link href="/auth/signup">Sign Up</Link>
              </Button>
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
}

"use client";

import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { User, LogOut } from "lucide-react";
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
import { SessionUser } from "@/app/types";
import { toast } from "sonner";

interface HeaderProps {
  session: SessionUser | null;
}

export function Header({ session }: HeaderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const isAuthPage = pathname?.startsWith("/auth");

  async function handleLogout() {
    try {
      const response = await fetch("/api/auth/logout", {
        method: "POST",
      });

      if (response.ok) {
        toast.success("Logged out successfully");
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

        <nav className="flex items-center space-x-2 sm:space-x-4">
          <ThemeToggle />
          {session ? (
            <>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className="flex items-center space-x-2"
                  >
                    <User className="h-4 w-4" />
                    <span className="hidden sm:inline">
                      {session.firstName} {session.lastName}
                    </span>
                    <span className="sm:hidden">{session.firstName}</span>
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
              <Button variant="ghost" asChild className="text-sm sm:text-base">
                <Link href="/auth/login">Login</Link>
              </Button>
              <Button asChild className="text-sm sm:text-base">
                <Link href="/auth/signup">Sign Up</Link>
              </Button>
            </div>
          ) : null}
        </nav>
      </div>
    </header>
  );
}

import { Metadata } from "next";
import { LoginForm } from "@/app/components/auth/LoginForm";

export const metadata: Metadata = {
  title: "Login",
  description:
    "Sign in to your Pikes Calendar account to manage your events and schedules.",
};

export default function LoginPage() {
  return (
    <div className="container flex flex-col items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[400px] md:w-[450px]">
        <div className="flex flex-col space-y-2 text-center">
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">
            Welcome back
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            Enter your credentials to access your account
          </p>
        </div>
        <LoginForm />
      </div>
    </div>
  );
}

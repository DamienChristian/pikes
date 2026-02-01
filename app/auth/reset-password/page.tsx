import { Metadata } from "next";
import { Suspense } from "react";
import { ResetPasswordForm } from "@/app/components/auth/ResetPasswordForm";

export const metadata: Metadata = {
  title: "Reset Password",
  description: "Set a new password for your Pikes Calendar account.",
};

export default function ResetPasswordPage() {
  return (
    <div className="container flex flex-col items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[400px] md:w-[450px]">
        <div className="flex flex-col space-y-2 text-center">
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">
            Reset your password
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            Enter your new password below
          </p>
        </div>
        <Suspense fallback={<div>Loading...</div>}>
          <ResetPasswordForm />
        </Suspense>
      </div>
    </div>
  );
}

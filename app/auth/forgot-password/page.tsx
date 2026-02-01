import { Metadata } from "next";
import { ForgotPasswordForm } from "@/app/components/auth/ForgotPasswordForm";

export const metadata: Metadata = {
  title: "Forgot Password",
  description: "Reset your Pikes Calendar account password.",
};

export default function ForgotPasswordPage() {
  return (
    <div className="container flex flex-col items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[400px] md:w-[450px]">
        <div className="flex flex-col space-y-2 text-center">
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">
            Forgot your password?
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            Enter your email and we&apos;ll send you instructions to reset your
            password
          </p>
        </div>
        <ForgotPasswordForm />
      </div>
    </div>
  );
}

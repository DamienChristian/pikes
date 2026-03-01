import { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSession } from "@/app/lib/utils/session";
import { SignupForm } from "@/app/components/auth/SignupForm";

export const metadata: Metadata = {
  title: "Sign Up",
  description:
    "Create a new Pikes Calendar account to start organizing your events and schedules.",
};

export default async function SignupPage() {
  const session = await getSession();
  if (session) {
    redirect("/calendar");
  }

  return (
    <div className="container flex flex-col items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[450px] md:w-[500px]">
        <div className="flex flex-col space-y-2 text-center">
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">
            Create an account
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            Enter your information to get started
          </p>
        </div>
        <SignupForm />
      </div>
    </div>
  );
}

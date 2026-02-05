"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/app/components/ui/card";
import { Button } from "@/app/components/ui/button";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";

export default function VerifyEmailPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [status, setStatus] = useState<"loading" | "success" | "error">(
    "loading"
  );
  const [message, setMessage] = useState("");

  useEffect(() => {
    const verifyEmail = async () => {
      if (!token) {
        setStatus("error");
        setMessage("Invalid verification link");
        return;
      }

      try {
        const response = await fetch("/api/auth/verify-email", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ token }),
        });

        const data = await response.json();

        if (response.ok && data.success) {
          setStatus("success");
          setMessage(data.message || "Email verified successfully!");

          // Redirect to calendar after 3 seconds
          setTimeout(() => {
            router.push("/calendar");
          }, 3000);
        } else {
          setStatus("error");
          setMessage(data.error || "Failed to verify email");
        }
      } catch (error) {
        console.error("Verification error:", error);
        setStatus("error");
        setMessage("An error occurred during verification");
      }
    };

    verifyEmail();
  }, [token, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl text-center">
            Email Verification
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          {status === "loading" && (
            <>
              <Loader2 className="w-16 h-16 text-blue-500 animate-spin mx-auto" />
              <p className="text-gray-600">Verifying your email...</p>
            </>
          )}

          {status === "success" && (
            <>
              <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto" />
              <p className="text-lg font-semibold text-green-600">{message}</p>
              <p className="text-gray-600">Redirecting to calendar...</p>
            </>
          )}

          {status === "error" && (
            <>
              <XCircle className="w-16 h-16 text-red-500 mx-auto" />
              <p className="text-lg font-semibold text-red-600">{message}</p>
              <div className="space-y-2">
                <Button
                  onClick={() => router.push("/auth/login")}
                  className="w-full"
                >
                  Go to Login
                </Button>
                <p className="text-sm text-gray-500">
                  Need a new verification link?{" "}
                  <a href="/profile" className="text-blue-600 hover:underline">
                    Request new link
                  </a>
                </p>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

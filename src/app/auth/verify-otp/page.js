"use client";
import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useUserStore } from "@/store/userStore";
import { useSnackbar } from "@/store/snackbarStore";
import WideBtn from "@/components/buttons/WideBtn";
import FormInput from "@/components/auth/FormInput";

// Route constants
const APP_ROUTE = "/home";

function VerifyOTPContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const setUser = useUserStore((state) => state.setUser);
  const { showSnackbar } = useSnackbar();

  const [otp, setOtp] = useState("");

  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [error, setError] = useState("");

  const type = searchParams.get("type"); // "signup" or "login"
  const email = searchParams.get("email");
  const username = searchParams.get("username");
  const inviteToken = searchParams.get("invite");
  const roomCode = searchParams.get("roomCode");

  useEffect(() => {
    // Redirect if required params are missing
    if (!type || !email) {
      router.push("/auth");
    }
  }, [type, email, router]);

  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const response = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          otp,
          type,
          inviteToken,
          roomCode,
        }),
      });

      const result = await response.json();

      if (response.ok && result.success && result.user) {
        // Save user to Zustand store
        setUser(result.user);

        // Navigate to app/home page
        router.push(APP_ROUTE);
      } else {
        setError(result.error || "Invalid OTP. Please try again.");
      }
    } catch (err) {
      console.error("OTP verification error:", err);
      setError("Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOTP = async () => {
    if (!email || !type) {
      showSnackbar("Missing email or type information", "error");
      return;
    }

    setIsResending(true);
    try {
      const response = await fetch("/api/auth/send-otp", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          username: username || "",
          type,
        }),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        showSnackbar("OTP resent successfully!", "success");
      } else {
        showSnackbar(result.error || "Failed to resend OTP", "error");
      }
    } catch (error) {
      console.error("Resend OTP error:", error);
      showSnackbar("Failed to resend OTP", "error");
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center text-white p-4">
      {/* OTP Form Container - glassmorphic styling */}
      <div className="py-8 px-6 rounded-4xl border-2 border-white/20 bg-white/10 frosted w-full max-w-md min-w-[25vw]">
        <div className="text-center">
          <h2 className="text-2xl text-white font-bold mb-2">
            Verify Your Email
          </h2>
          <p className="text-white/70 mb-2 text-sm">
            We've sent a verification code to
          </p>
          <p className="text-white mb-8 font-semibold">{email}</p>

          <form onSubmit={handleVerifyOTP} className="space-y-4">
            <FormInput
              type="text"
              placeholder="Enter OTP"
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
              maxLength={6}
              required
            />

            {error && <p className="text-red text-sm">{error}</p>}

            <WideBtn type="submit" disabled={isLoading || otp.length < 4}>
              {isLoading ? "Verifying..." : "Verify OTP"}
            </WideBtn>
          </form>

          <button
            onClick={handleResendOTP}
            disabled={isResending}
            className="mt-6 text-gray-100 hover:text-white text-sm transition-all duration-300 ease-in-out disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isResending ? "Resending..." : "Didn't receive the code? "}{" "}
            {!isResending && <span className="text-white font-semibold cursor-pointer">Resend</span>}
          </button>

          <button
            onClick={() => router.push("/auth")}
            className="mt-4 text-white/70 hover:text-white text-sm transition-all duration-300 ease-in-out block mx-auto"
          >
            ← Back to login
          </button>
        </div>
      </div>
    </div>
  );
}

export default function VerifyOTPPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-black text-white">
          <div className="text-center">
            <div className="animate-pulse text-red text-2xl font-bold mb-4">
              AUTUMN SPIRES
            </div>
            <p className="text-gray-400">Loading...</p>
          </div>
        </div>
      }
    >
      <VerifyOTPContent />
    </Suspense>
  );
}

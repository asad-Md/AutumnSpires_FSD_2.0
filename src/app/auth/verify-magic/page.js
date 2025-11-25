"use client";
import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useUserStore } from "@/store/userStore";

const APP_ROUTE = "/home";

function VerifyMagicContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const setUser = useUserStore((state) => state.setUser);
  const [status, setStatus] = useState("verifying");
  const [error, setError] = useState("");

  useEffect(() => {
    const token = searchParams.get("token");

    if (!token) {
      setStatus("error");
      setError("Invalid verification link");
      return;
    }

    const verifyMagicLink = async () => {
      try {
        const response = await fetch(`/api/auth/verify-magic?token=${token}`);
        const data = await response.json();

        if (response.ok && data.success && data.user) {
          setUser(data.user);
          setStatus("success");
          setTimeout(() => {
            router.push(APP_ROUTE);
          }, 1500);
        } else {
          setStatus("error");
          setError(data.error || "Invalid or expired link");
        }
      } catch (err) {
        console.error("Magic link verification error:", err);
        setStatus("error");
        setError("Something went wrong. Please try again.");
      }
    };

    verifyMagicLink();
  }, [searchParams, router, setUser]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center text-white p-4">
      <div className="py-8 px-6 rounded-4xl border-2 border-white/20 bg-white/10 frosted w-full max-w-md">
        <div className="text-center">
          {status === "verifying" && (
            <>
              <div className="w-16 h-16 border-4 border-white/20 border-t-crimson rounded-full animate-spin mx-auto mb-4"></div>
              <h2 className="text-2xl text-white font-bold mb-2">
                Verifying...
              </h2>
              <p className="text-white/70 text-sm">
                Please wait while we verify your link
              </p>
            </>
          )}

          {status === "success" && (
            <>
              <div className="w-16 h-16 bg-black rounded-full flex items-center justify-center mx-auto mb-4">
                <svg
                  className="w-8 h-8 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
              <h2 className="text-2xl text-white font-bold mb-2">Success!</h2>
              <p className="text-white/70 text-sm">
                Redirecting you to the spires...
              </p>
            </>
          )}

          {status === "error" && (
            <>
              <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg
                  className="w-8 h-8 text-red-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </div>
              <h2 className="text-2xl text-white font-bold mb-2">
                Verification Failed
              </h2>
              <p className="text-red-400 text-sm mb-4">{error}</p>
              <button
                onClick={() => router.push("/auth")}
                className="bg-white/10 hover:bg-white/20 text-white py-2 px-6 rounded-full transition-colors"
              >
                Back to Login
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function VerifyMagicPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="w-16 h-16 border-4 border-white/20 border-t-crimson rounded-full animate-spin"></div>
        </div>
      }
    >
      <VerifyMagicContent />
    </Suspense>
  );
}

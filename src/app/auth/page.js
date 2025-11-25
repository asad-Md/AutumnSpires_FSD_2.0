"use client";
import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import PlainBtn from "@/components/buttons/PlainBtn";
import SignupForm from "@/components/auth/SignupForm";
import LoginForm from "@/components/auth/LoginForm";

function AuthPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const inviteToken = searchParams.get("invite");
  const roomCode = searchParams.get("roomCode");
  const [activeTab, setActiveTab] = useState(inviteToken || roomCode ? "signup" : "login");
  const [isLoading, setIsLoading] = useState(false);
  const [signupRef, setSignupRef] = useState(null);
  const [loginRef, setLoginRef] = useState(null);

  // Signup form state
  const [signupData, setSignupData] = useState({
    username: "",
    email: "",
  });

  // Login form state
  const [loginEmail, setLoginEmail] = useState("");

  const handleSignup = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await fetch("/api/auth/send-otp", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: signupData.email,
          username: signupData.username,
          type: "signup",
        }),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        // Navigate to OTP verification page with state
        const params = new URLSearchParams({
          type: "signup",
          email: signupData.email,
          username: signupData.username,
        });

        if (inviteToken) {
          params.append("invite", inviteToken);
        }
        if (roomCode) {
          params.append("roomCode", roomCode);
        }

        router.push(`/auth/verify-otp?${params.toString()}`);
      } else {
        console.error("Signup error:", result.error);
      }
    } catch (error) {
      console.error("Signup error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await fetch("/api/auth/send-otp", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: loginEmail,
          type: "login",
        }),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        // Navigate to OTP verification page with state
        const params = new URLSearchParams({
          type: "login",
          email: loginEmail,
        });
        
        if (roomCode) {
          params.append("roomCode", roomCode);
        }

        router.push(`/auth/verify-otp?${params.toString()}`);
      } else {
        console.error("Login error:", result.error);
      }
    } catch (error) {
      console.error("Login error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center text-white p-4">
      {inviteToken && (
        <div className="mb-4 px-4 py-2 bg-green-500/20 border border-green-500/40 rounded-2xl text-green-200 text-sm">
          🎉 You've been invited! Sign up to connect with your friend.
        </div>
      )}

      <div className="py-4 px-2 rounded-4xl border-2 border-white/20 bg-white/10 frosted flex min-h-96 flex-col items-center min-w-[20vw]">
        {/* Tab Buttons */}
        <div className="bg-black rounded-4xl border border-gray-800/40 flex items-center my-2 p-1 relative gap-1">
          {/* Animated background indicator */}
          {signupRef && loginRef && (
            <motion.div
              className="absolute bg-white border border-white/30 rounded-full"
              initial={false}
              animate={{
                x:
                  (activeTab === "signup"
                    ? signupRef.offsetLeft
                    : loginRef.offsetLeft) - 4,
                width:
                  activeTab === "signup"
                    ? signupRef.offsetWidth
                    : loginRef.offsetWidth,
                height:
                  activeTab === "signup"
                    ? signupRef.offsetHeight
                    : loginRef.offsetHeight,
              }}
              transition={{
                type: "spring",
                stiffness: 300,
                damping: 30,
              }}
            />
          )}

          <PlainBtn
            buttonRef={setSignupRef}
            onClick={() => setActiveTab("signup")}
            isActive={activeTab === "signup"}
          >
            Signup
          </PlainBtn>
          <PlainBtn
            buttonRef={setLoginRef}
            onClick={() => setActiveTab("login")}
            isActive={activeTab === "login"}
          >
            Login
          </PlainBtn>
        </div>

        {/* Form Container - fixed height to prevent layout shift */}
        <div className="w-full max-w-sm relative">
          <AnimatePresence mode="wait">
            {activeTab === "signup" ? (
              <motion.div
                key="signup"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.3, ease: "easeInOut" }}
                className="absolute inset-0"
              >
                <SignupForm
                  signupData={signupData}
                  setSignupData={setSignupData}
                  handleSignup={handleSignup}
                  isLoading={isLoading}
                />
              </motion.div>
            ) : (
              <motion.div
                key="login"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3, ease: "easeInOut" }}
                className="absolute inset-0"
              >
                <LoginForm
                  loginEmail={loginEmail}
                  setLoginEmail={setLoginEmail}
                  handleLogin={handleLogin}
                  isLoading={isLoading}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

export default function AuthPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-white">Loading...</div>
        </div>
      }
    >
      <AuthPageContent />
    </Suspense>
  );
}

"use client";
import Hero from "@/components/landing/Hero";
import Features from "@/components/landing/Features";
import Privacy from "@/components/landing/Privacy";
import HowItWorks from "@/components/landing/HowItWorks";
import Community from "@/components/landing/Community";
import Contact from "@/components/landing/Contact";
import Footer from "@/components/landing/Footer";

export default function Home() {
  return (
    <main className="w-full min-h-screen">
      <header className="fixed top-0 left-0 right-0 z-50 flex items-center justify-center py-4 bg-black/15 backdrop-blur-sm border-b border-white/2">
        <h1 className="text-white text-6xl font-bold tracking-wider">
          AUTUMN SPIRES
        </h1>
      </header>
      <Hero />
      <Features />
      <HowItWorks />
      <Privacy />
      <Community />
      <Contact />
      <Footer />
    </main>
  );
}

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

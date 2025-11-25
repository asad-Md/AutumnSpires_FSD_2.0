"use client";
import { motion } from "motion/react";
import Link from "next/link";
import { ArrowRight, Shield } from "lucide-react";

export default function Hero() {
  return (
    <section className="min-h-screen flex flex-col items-center justify-center px-4 relative overflow-hidden bg-white dark:bg-black transition-colors duration-300">
      {/* Background Elements */}
      <div className="absolute inset-0 z-0 opacity-20 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-neutral-200 dark:bg-neutral-800 rounded-full filter blur-[100px] transition-colors duration-300" />
        <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-neutral-300 dark:bg-neutral-900 rounded-full filter blur-[80px] transition-colors duration-300" />
      </div>

      <div className="z-10 max-w-5xl mx-auto text-center space-y-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="flex items-center justify-center gap-2 text-sm font-medium tracking-widest uppercase text-neutral-500 dark:text-neutral-400 mb-4"
        >
          <Shield className="w-4 h-4" />
          <span>End-to-End Encrypted</span>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
          className="text-6xl md:text-8xl font-bold tracking-tighter text-black dark:text-white leading-tight transition-colors duration-300"
        >
          Privacy that <br />
          <span className="text-transparent bg-clip-text bg-linear-to-r from-neutral-600 to-black dark:from-neutral-400 dark:to-white">
            Feels Infinite.
          </span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4, ease: "easeOut" }}
          className="text-xl md:text-2xl text-neutral-600 dark:text-neutral-400 max-w-2xl mx-auto font-light transition-colors duration-300"
        >
          Connect freely in temporary rooms with video, screen sharing, and
          whiteboards. No logs, no traces, just you and your friends.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.6, ease: "easeOut" }}
          className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-8"
        >
          <Link
            href="/auth"
            className="group relative px-8 py-4 bg-black dark:bg-white text-white dark:text-black rounded-full text-lg font-medium overflow-hidden transition-all hover:scale-105 hover:shadow-xl dark:hover:shadow-[0_0_40px_-10px_rgba(255,255,255,0.3)]"
          >
            <span className="relative z-10 flex items-center gap-2">
              Get Started <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </span>
            <div className="absolute inset-0 bg-neutral-800 dark:bg-neutral-200 transform scale-x-0 group-hover:scale-x-100 transition-transform origin-left duration-300" />
          </Link>
          <Link
            href="/about"
            className="px-8 py-4 text-black dark:text-white border border-neutral-200 dark:border-neutral-800 rounded-full text-lg font-medium hover:bg-neutral-50 dark:hover:bg-neutral-900 transition-colors"
          >
            Learn More
          </Link>
        </motion.div>
      </div>
    </section>
  );
}

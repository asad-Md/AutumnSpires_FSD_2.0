"use client";
import { motion } from "motion/react";
import { Video, ScreenShare, PenTool, MessageSquare, Clock, Lock } from "lucide-react";

const features = [
  {
    icon: Clock,
    title: "Temporary Rooms",
    description: "Rooms that vanish when you leave. No history, no digital footprint.",
  },
  {
    icon: Video,
    title: "HD Video & Voice",
    description: "Crystal clear communication powered by low-latency P2P technology.",
  },
  {
    icon: Lock,
    title: "End-to-End Encrypted",
    description: "Your conversations are yours alone. We couldn't read them if we wanted to.",
  },
  {
    icon: ScreenShare,
    title: "Screen Sharing",
    description: "Share your work, gameplay, or ideas instantly with a single click.",
  },
  {
    icon: PenTool,
    title: "Collaborative Whiteboard",
    description: "Brainstorm together in real-time on an infinite canvas.",
  },
  {
    icon: MessageSquare,
    title: "Friend Chats",
    description: "Keep in touch with your inner circle through secure private messaging.",
  },
];

export default function Features() {
  return (
    <section className="py-24 px-4 bg-neutral-50 dark:bg-black relative transition-colors duration-300">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-20">
          <h2 className="text-4xl md:text-5xl font-bold text-black dark:text-white mb-6 tracking-tight transition-colors duration-300">
            Everything you need. <br />
            <span className="text-neutral-500">Nothing you don't.</span>
          </h2>
          <p className="text-xl text-neutral-600 dark:text-neutral-400 max-w-2xl mx-auto transition-colors duration-300">
            A complete suite of communication tools designed for privacy and simplicity.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="p-8 rounded-3xl bg-white dark:bg-neutral-900 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors border border-neutral-200 dark:border-neutral-800 shadow-sm"
            >
              <div className="w-12 h-12 bg-black dark:bg-white text-white dark:text-black rounded-2xl flex items-center justify-center mb-6 transition-colors duration-300">
                <feature.icon className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-black dark:text-white mb-3 transition-colors duration-300">{feature.title}</h3>
              <p className="text-neutral-600 dark:text-neutral-400 leading-relaxed transition-colors duration-300">{feature.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

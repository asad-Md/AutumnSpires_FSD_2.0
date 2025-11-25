"use client";
import { motion } from "motion/react";
import { UserPlus, Share2, Users } from "lucide-react";

const steps = [
  {
    icon: UserPlus,
    title: "Create a Room",
    description: "Start a new temporary room with a single click. No account required.",
  },
  {
    icon: Share2,
    title: "Share the Link",
    description: "Send the unique room link to your friends or colleagues.",
  },
  {
    icon: Users,
    title: "Connect Instantly",
    description: "Jump into video, voice, or chat immediately. Secure and private.",
  },
];

export default function HowItWorks() {
  return (
    <section className="py-24 px-4 bg-white dark:bg-black relative border-t border-neutral-100 dark:border-neutral-900 transition-colors duration-300">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-20">
          <h2 className="text-4xl md:text-5xl font-bold text-black dark:text-white mb-6 tracking-tight transition-colors duration-300">
            Simple by Design.
          </h2>
          <p className="text-xl text-neutral-600 dark:text-neutral-400 max-w-2xl mx-auto transition-colors duration-300">
            No complex setups. No downloads. Just a link.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 relative">
          {/* Connecting Line (Desktop) */}
          <div className="hidden md:block absolute top-12 left-0 w-full h-0.5 bg-linear-to-r from-transparent via-neutral-200 dark:via-neutral-800 to-transparent z-0 transition-colors duration-300" />

          {steps.map((step, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.2 }}
              className="relative z-10 flex flex-col items-center text-center"
            >
              <div className="w-24 h-24 bg-white dark:bg-neutral-900 rounded-full flex items-center justify-center mb-8 border-4 border-neutral-100 dark:border-black shadow-xl transition-colors duration-300">
                <step.icon className="w-10 h-10 text-black dark:text-white transition-colors duration-300" />
              </div>
              <h3 className="text-2xl font-bold text-black dark:text-white mb-4 transition-colors duration-300">{step.title}</h3>
              <p className="text-neutral-600 dark:text-neutral-400 leading-relaxed max-w-xs transition-colors duration-300">{step.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

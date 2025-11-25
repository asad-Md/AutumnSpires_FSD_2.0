"use client";
import { motion } from "motion/react";

export default function Community() {
  return (
    <section className="py-24 px-4 bg-neutral-50 dark:bg-neutral-900 relative overflow-hidden transition-colors duration-300">
      <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#000000_1px,transparent_1px)] dark:bg-[radial-gradient(#ffffff_1px,transparent_1px)] bg-size-[16px_16px] transition-colors duration-300" />
      
      <div className="max-w-4xl mx-auto text-center relative z-10">
        <motion.h2
          initial={{ opacity: 0, scale: 0.9 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-4xl md:text-6xl font-bold text-black dark:text-white mb-8 tracking-tight transition-colors duration-300"
        >
          Join the <span className="text-transparent bg-clip-text bg-linear-to-r from-neutral-600 to-black dark:from-neutral-400 dark:to-white">Privacy Revolution.</span>
        </motion.h2>
        
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="text-xl text-neutral-600 dark:text-neutral-400 mb-12 max-w-2xl mx-auto transition-colors duration-300"
        >
          Thousands of users trust Autumn Spires for their most sensitive conversations. 
          Experience the freedom of truly private communication.
        </motion.p>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {[
                { label: "Active Users", value: "10k+" },
                { label: "Secure Rooms", value: "50k+" },
                { label: "Messages Sent", value: "1M+" },
                { label: "Data Logged", value: "0" },
            ].map((stat, index) => (
                <motion.div 
                    key={index}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5, delay: 0.4 + (index * 0.1) }}
                    className="p-4"
                >
                    <div className="text-3xl md:text-4xl font-bold text-black dark:text-white mb-2 transition-colors duration-300">{stat.value}</div>
                    <div className="text-sm text-neutral-500 uppercase tracking-wider">{stat.label}</div>
                </motion.div>
            ))}
        </div>
      </div>
    </section>
  );
}

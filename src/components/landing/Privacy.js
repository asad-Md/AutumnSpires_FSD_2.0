"use client";
import { motion } from "motion/react";
import { ShieldCheck, EyeOff, ServerOff } from "lucide-react";

export default function Privacy() {
  return (
    <section className="py-24 px-4 bg-white dark:bg-black text-black dark:text-white relative overflow-hidden transition-colors duration-300">
      {/* Abstract Background */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-neutral-100 dark:bg-neutral-900 rounded-full filter blur-[120px] opacity-50 pointer-events-none transition-colors duration-300" />
      
      <div className="max-w-7xl mx-auto relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
          >
            <h2 className="text-4xl md:text-6xl font-bold mb-8 tracking-tight text-black dark:text-white transition-colors duration-300">
              Your Data is <br />
              <span className="text-neutral-500">None of Our Business.</span>
            </h2>
            <p className="text-xl text-neutral-600 dark:text-neutral-400 mb-8 leading-relaxed transition-colors duration-300">
              We built Autumn Spires with a zero-knowledge architecture. 
              We don't track you, we don't sell your data, and we can't see your messages.
            </p>
            
            <div className="space-y-6">
              <div className="flex items-start gap-4">
                <ShieldCheck className="w-8 h-8 text-black dark:text-white mt-1 transition-colors duration-300" />
                <div>
                  <h3 className="text-lg font-bold mb-1 text-black dark:text-white transition-colors duration-300">End-to-End Encryption</h3>
                  <p className="text-neutral-600 dark:text-neutral-400 transition-colors duration-300">Messages are encrypted on your device and only decrypted on the recipient's.</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <ServerOff className="w-8 h-8 text-black dark:text-white mt-1 transition-colors duration-300" />
                <div>
                  <h3 className="text-lg font-bold mb-1 text-black dark:text-white transition-colors duration-300">No Persistent Storage</h3>
                  <p className="text-neutral-600 dark:text-neutral-400 transition-colors duration-300">Temporary room data is wiped instantly when the session ends.</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <EyeOff className="w-8 h-8 text-black dark:text-white mt-1 transition-colors duration-300" />
                <div>
                  <h3 className="text-lg font-bold mb-1 text-black dark:text-white transition-colors duration-300">No Tracking</h3>
                  <p className="text-neutral-600 dark:text-neutral-400 transition-colors duration-300">No analytics, no cookies, no third-party trackers.</p>
                </div>
              </div>
            </div>
          </motion.div>

          <motion.div
             initial={{ opacity: 0, scale: 0.9 }}
             whileInView={{ opacity: 1, scale: 1 }}
             viewport={{ once: true }}
             transition={{ duration: 0.8 }}
             className="relative"
          >
            <div className="aspect-square rounded-3xl bg-neutral-50 dark:bg-linear-to-br dark:from-neutral-800 dark:to-black border border-neutral-200 dark:border-neutral-800 p-8 flex items-center justify-center transition-colors duration-300">
                <div className="text-center">
                    <div className="text-9xl font-bold text-neutral-200 dark:text-neutral-800 select-none transition-colors duration-300">100%</div>
                    <div className="text-2xl font-medium text-neutral-500 mt-4">Private & Secure</div>
                </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

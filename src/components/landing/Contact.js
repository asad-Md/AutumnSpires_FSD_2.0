"use client";
import { motion } from "motion/react";
import { Mail, MessageCircle, Github } from "lucide-react";

export default function Contact() {
  return (
    <section className="py-24 px-4 bg-white dark:bg-black relative transition-colors duration-300">
      <div className="max-w-4xl mx-auto text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="text-4xl md:text-5xl font-bold text-black dark:text-white mb-6 transition-colors duration-300">Get in Touch</h2>
          <p className="text-xl text-neutral-600 dark:text-neutral-400 mb-12 transition-colors duration-300">
            Have questions? Found a bug? Just want to say hi? <br />
            We'd love to hear from you.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <a href="mailto:hello@autumnspires.com" className="group p-8 rounded-2xl bg-neutral-50 dark:bg-neutral-900 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors border border-neutral-200 dark:border-neutral-800">
            <Mail className="w-8 h-8 text-black dark:text-white mx-auto mb-4 group-hover:scale-110 transition-transform" />
            <h3 className="text-lg font-bold text-black dark:text-white mb-2 transition-colors duration-300">Email Us</h3>
            <p className="text-neutral-500">hello@autumnspires.com</p>
          </a>
          
          <a href="#" className="group p-8 rounded-2xl bg-neutral-50 dark:bg-neutral-900 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors border border-neutral-200 dark:border-neutral-800">
            <MessageCircle className="w-8 h-8 text-black dark:text-white mx-auto mb-4 group-hover:scale-110 transition-transform" />
            <h3 className="text-lg font-bold text-black dark:text-white mb-2 transition-colors duration-300">Discord</h3>
            <p className="text-neutral-500">Join our community</p>
          </a>

          <a href="#" className="group p-8 rounded-2xl bg-neutral-50 dark:bg-neutral-900 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors border border-neutral-200 dark:border-neutral-800">
            <Github className="w-8 h-8 text-black dark:text-white mx-auto mb-4 group-hover:scale-110 transition-transform" />
            <h3 className="text-lg font-bold text-black dark:text-white mb-2 transition-colors duration-300">GitHub</h3>
            <p className="text-neutral-500">Check out the code</p>
          </a>
        </div>
      </div>
    </section>
  );
}

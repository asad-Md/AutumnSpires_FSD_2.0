export default function Footer() {
  return (
    <footer className="bg-white dark:bg-black py-12 px-4 border-t border-neutral-100 dark:border-neutral-900 transition-colors duration-300">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
        <div className="text-center md:text-left">
          <h3 className="text-xl font-bold text-black dark:text-white tracking-wider mb-2 transition-colors duration-300">AUTUMN SPIRES</h3>
          <p className="text-sm text-neutral-500">© {new Date().getFullYear()} Autumn Spires. All rights reserved.</p>
        </div>
        
        <div className="flex gap-8">
          <a href="#" className="text-neutral-600 dark:text-neutral-400 hover:text-black dark:hover:text-white transition-colors text-sm font-medium">Privacy Policy</a>
          <a href="#" className="text-neutral-600 dark:text-neutral-400 hover:text-black dark:hover:text-white transition-colors text-sm font-medium">Terms of Service</a>
          <a href="#" className="text-neutral-600 dark:text-neutral-400 hover:text-black dark:hover:text-white transition-colors text-sm font-medium">GitHub</a>
        </div>
      </div>
    </footer>
  );
}

import localFont from "next/font/local";
import walls from "@/public/walls.png";
import Snackbar from "@/components/common/Snackbar";
import PresenceListener from "@/components/common/PresenceListener";
import AuthListener from "@/components/auth/AuthListener";
import SmoothScroll from "@/components/common/SmoothScroll";
import ThemeToggle from "@/components/common/ThemeToggle";
import { ThemeProvider } from "next-themes";
import "./globals.css";

const googleSansFlex = localFont({
  src: "../fonts/GoogleSansFlex.ttf",
  variable: "--font-google-sans-flex",
  display: "swap",
});

export const metadata = {
  title: "Spiraut or Autspire",
  description: "autspire",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${googleSansFlex.className} antialiased relative`}
      >
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
          <div
            className="fixed inset-0 transform scale-105 z-0 filter blur-[15px]"
            style={{
              backgroundImage: `url(${walls.src})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
              backgroundRepeat: "no-repeat",
            }}
          />
          <div className="relative z-10 flex flex-col items-center justify-center w-full">
            <h1 className="text-gray-800 dark:text-white text-2xl font-bold font-stretch-150% mb-12 tracking-wider absolute top-4 transition-colors">
              AUTUMN SPIRES
            </h1>
            {children}
          </div>
          <Snackbar />
          <AuthListener />
          <PresenceListener />
          <SmoothScroll />
          <ThemeToggle />
        </ThemeProvider>
      </body>
    </html>
  );
}

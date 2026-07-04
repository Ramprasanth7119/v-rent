import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { PersonaProvider } from "../components/layout/PersonaContext";
import { DashboardShell } from "../components/layout/DashboardShell";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "V-RENT — PropTech Super Platform",
  description: "AI-Powered, secure, and scalable Singapore real-estate ecosystem.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-background text-foreground transition-colors duration-200">
        <PersonaProvider>
          <DashboardShell>
            {children}
          </DashboardShell>
        </PersonaProvider>
      </body>
    </html>
  );
}


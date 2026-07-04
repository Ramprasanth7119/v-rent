import type { Metadata } from "next";
import "./globals.css";
import { PersonaProvider } from "../components/layout/PersonaContext";
import { DashboardShell } from "../components/layout/DashboardShell";

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
      className="h-full antialiased font-sans"
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


import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { I18nInitializer } from "@/components/layout/I18nInitializer";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Claude Dashboard",
  description: "Multi-Agent Workflow Dashboard",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.className} min-h-screen bg-background antialiased`}>
        <I18nInitializer />
        {children}
      </body>
    </html>
  );
}

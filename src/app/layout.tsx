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
    <html lang="en" className="dark overflow-x-hidden">
      <body className={`${inter.className} min-h-screen bg-background antialiased overflow-x-hidden`}>
        <I18nInitializer />
        {children}
      </body>
    </html>
  );
}

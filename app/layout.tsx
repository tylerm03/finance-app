import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Finance App",
  description: "Personal finance tracker",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-gray-950">
        <nav className="border-b border-gray-800 bg-gray-900 px-6 py-3">
          <div className="flex gap-6 text-sm">
            <Link href="/" className="text-gray-100 hover:text-blue-400">
              Home
            </Link>
            <Link href="/transactions" className="text-gray-100 hover:text-blue-400">
              Transactions
            </Link>
            <Link href="/spending" className="text-gray-100 hover:text-blue-400">
              Spending
            </Link>
            <Link href="/recurring" className="text-gray-100 hover:text-blue-400">
              Recurring
            </Link>
          </div>
        </nav>
        {children}
      </body>
    </html>
  );
}

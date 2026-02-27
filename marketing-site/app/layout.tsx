import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
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
  title: "HireApp - AI Powered Matchmaking",
  description: "Connect with top talent or find your dream job with AI-powered matchmaking. Smart video intros, real-time feedback, and automated insights.",
  keywords: ["hiring", "jobs", "AI recruiting", "video interviews", "talent matching"],
  openGraph: {
    title: "HireApp - AI Powered Matchmaking",
    description: "Connect with top talent or find your dream job with AI-powered matchmaking.",
    url: "https://hireapp.example.com",
    siteName: "HireApp",
    images: [{ url: "https://hireapp.example.com/og-image.jpg" }],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "HireApp",
    description: "AI-powered recruiting platform",
  }
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased flex flex-col min-h-screen`}
      >
        <header className="bg-white border-b sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between h-16 items-center">
              <div className="flex-shrink-0 flex items-center">
                <a href="/" className="text-2xl font-bold text-blue-600">HireApp</a>
              </div>
              <nav className="hidden md:ml-6 md:flex md:space-x-8">
                <a href="/features" className="text-gray-500 hover:text-gray-900 px-3 py-2 text-sm font-medium">Features</a>
                <a href="/pricing" className="text-gray-500 hover:text-gray-900 px-3 py-2 text-sm font-medium">Pricing</a>
                <a href="/about" className="text-gray-500 hover:text-gray-900 px-3 py-2 text-sm font-medium">About</a>
                <a href="/contact" className="text-gray-500 hover:text-gray-900 px-3 py-2 text-sm font-medium">Contact</a>
              </nav>
              <div className="flex items-center">
                <a href="#" className="ml-8 inline-flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700">Get Started</a>
              </div>
            </div>
          </div>
        </header>

        <main className="flex-grow">
          {children}
        </main>

        <footer className="bg-white border-t mt-auto">
          <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8 flex justify-center">
            <p className="text-base text-gray-400">&copy; {new Date().getFullYear()} HireApp. All rights reserved.</p>
          </div>
        </footer>
      </body>
    </html>
  );
}

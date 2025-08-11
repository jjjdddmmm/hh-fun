import { ClerkProvider } from "@clerk/nextjs";
import { cn } from "@/lib/utils";
import type { Metadata } from "next";
import { Inter, Black_Han_Sans } from "next/font/google";
import ErrorBoundary from "@/components/ErrorBoundary";
import { NotificationProvider } from "@/lib/contexts/NotificationContext";
import { ConfirmationProvider } from "@/lib/contexts/ConfirmationContext";
import "./globals.css";

const fontSans = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
});

const blackHanSans = Black_Han_Sans({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-black-han-sans",
});

export const metadata: Metadata = {
  title: "HH.Fun - AI-Powered Real Estate Analysis",
  description: "Get comprehensive property analysis with AI-powered insights for smarter real estate decisions.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClerkProvider>
      <html lang="en" suppressHydrationWarning>
        <body
          className={cn(
            "min-h-screen bg-background font-sans antialiased",
            fontSans.variable,
            blackHanSans.variable
          )}
        >
          <ErrorBoundary>
            <NotificationProvider>
              <ConfirmationProvider>
                {children}
              </ConfirmationProvider>
            </NotificationProvider>
          </ErrorBoundary>
        </body>
      </html>
    </ClerkProvider>
  );
}
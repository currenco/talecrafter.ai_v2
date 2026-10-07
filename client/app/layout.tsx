import "./globals.css";
import Provider from "./Provider";
import Header from "./(components)/Header";
import Footer from "./(components)/Footer";
import localFont from "next/font/local";
import { cn } from "@/lib/utils";
import type { Metadata } from "next";

const appFont = localFont({
  src: "./fonts/nunito-variable.woff2",
  variable: "--font-app",
  weight: "200 1000",
  style: "normal",
  display: "swap",
});

export const metadata: Metadata = {
  icons: {
    icon: "/talecrafter-favicon-large.png",
    shortcut: "/talecrafter-favicon-large.png",
    apple: "/talecrafter-favicon-large.png",
  },
  verification: {
    google: "4cYPJNRIPLpPOo2bZpPVuB_QXUqE9nHd5AKff5B6tOw",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={cn("dark", appFont.variable)}
    >
      <body className="font-sans">
        <Provider>
          <Header />
          {children}
          <Footer />
        </Provider>
      </body>
    </html>
  );
}

import "./globals.css";
import Provider from "./Provider";
import Header from "./(components)/Header";
import Footer from "./(components)/Footer";
import { Geist } from "next/font/google";
import { cn } from "@/lib/utils";
import type { Metadata } from "next";

const geist = Geist({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
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
    <html lang="en" className={cn("dark", "font-sans", geist.variable)}>
      <body className={geist.className}>
        <Provider>
          <Header />
          {children}
          <Footer />
        </Provider>
      </body>
    </html>
  );
}

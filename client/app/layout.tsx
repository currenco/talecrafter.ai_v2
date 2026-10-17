import "./globals.css";
import Provider from "./Provider";
import Header from "./(components)/Header";
import Footer from "./(components)/Footer";
import localFont from "next/font/local";
import Script from "next/script";
import { cn } from "@/lib/utils";
import type { Metadata } from "next";
import { rootMetadata } from "@/lib/seo/metadata";
import { siteStructuredData } from "@/lib/seo/structured-data";
import JsonLd from "@/components/seo/JsonLd";

const appFont = localFont({
  src: "./fonts/nunito-variable.woff2",
  variable: "--font-app",
  weight: "200 1000",
  style: "normal",
  display: "swap",
});

export const metadata: Metadata = {
  ...rootMetadata,
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
        <JsonLd data={siteStructuredData} />
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-R65QVFM3XK"
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-R65QVFM3XK');
          `}
        </Script>
        <Provider>
          <Header />
          {children}
          <Footer />
        </Provider>
      </body>
    </html>
  );
}

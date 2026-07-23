import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Sports Edge",
  description: "Explainable ATP match predictions built on a modular sports analytics platform.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

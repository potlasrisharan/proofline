import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Proofline — Brand truth, before publish",
  description: "An evidence-led brand governance workspace for content teams.",
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

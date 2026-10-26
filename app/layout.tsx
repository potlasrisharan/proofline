import type { Metadata } from "next";
import { ModalAccessibility } from "./components/modal-accessibility";
import { ProductTour } from "./components/product-tour";
import "./globals.css";
import "./trust.css";

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
      <body>{children}<ModalAccessibility /><ProductTour /></body>
    </html>
  );
}

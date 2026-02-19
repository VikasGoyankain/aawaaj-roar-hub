import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Aawaaj Admin Dashboard",
  description: "Secure command center for Aawaaj Movement",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

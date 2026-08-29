import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Body & Soul | Fitness Management",
  description: "Premium gym operations, memberships, and attendance.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

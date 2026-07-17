import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ORIVON",
  description: "AI Knowledge Workspace",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

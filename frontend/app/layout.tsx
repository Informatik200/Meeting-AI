import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Meeting AI",
  description: "Private meeting transcripts and action items",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

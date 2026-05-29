import type { Metadata, Viewport } from "next";
import { tokens } from "@familieappen/ui";
import "@familieappen/ui/tokens.css";
import "./globals.css";
import { AppShell } from "../components/AppShell";

export const metadata: Metadata = {
  title: "FamilieAppen",
  description: "A simple family logistics web app shell."
};

export const viewport: Viewport = {
  themeColor: tokens.colors.background,
  width: "device-width",
  initialScale: 1
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}

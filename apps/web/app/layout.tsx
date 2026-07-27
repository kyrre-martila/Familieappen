import type { Metadata, Viewport } from "next";
import { tokens } from "@familieappen/ui";
import "@familieappen/ui/tokens.css";
import "./globals.css";
import { RootAppFrame } from "../components/AppShell";
import { AuthProvider } from "../components/AuthProvider";
import { FamilyProvider } from "../components/FamilyProvider";

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
        <AuthProvider><FamilyProvider><RootAppFrame>{children}</RootAppFrame></FamilyProvider></AuthProvider>
      </body>
    </html>
  );
}

import type { Metadata } from "next";
import "./globals.css";
import { APP_DESCRIPTION, APP_NAME } from "@/lib/branding";

export const metadata: Metadata = {
  title: `${APP_NAME} | ${APP_DESCRIPTION}`,
  description: `${APP_NAME} — ${APP_DESCRIPTION}`,
  applicationName: APP_NAME,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className="antialiased">{children}</body>
    </html>
  );
}

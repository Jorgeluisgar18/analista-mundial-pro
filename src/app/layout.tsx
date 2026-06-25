import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Analista Mundial Pro",
    template: "%s · Analista Mundial Pro",
  },
  description:
    "Análisis estadístico, táctico y probabilístico prepartido con evidencia trazable.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" data-scroll-behavior="smooth">
      <body>{children}</body>
    </html>
  );
}

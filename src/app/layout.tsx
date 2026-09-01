import type { Metadata, Viewport } from "next";
import "./globals.css";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#E91E8C",
};

export const metadata: Metadata = {
  title: "Markdown Previewer — Write, Preview & Export",
  description:
    "A crayon-styled markdown editor & previewer PWA. Write, preview, export to PDF/DOCX/Google Docs, and refine with AI — all offline-capable.",
  keywords: ["markdown", "editor", "previewer", "PWA", "export", "PDF", "DOCX"],
  authors: [{ name: "Markdown Previewer" }],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

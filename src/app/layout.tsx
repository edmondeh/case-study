import type { Metadata, Viewport } from "next";
import "../styles/globals.css";
import { Providers } from "./Providers";

export const metadata: Metadata = {
  title: "Image comments",
  description: "Comment on an image together, Figma style.",
  robots: { index: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}

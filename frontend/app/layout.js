import "./globals.css";
import { Epilogue, Space_Grotesk } from "next/font/google";
import AppShell from "../components/AppShell";

const headingFont = Epilogue({ subsets: ["latin"], variable: "--font-heading" });
const bodyFont = Space_Grotesk({ subsets: ["latin"], variable: "--font-body" });

export const metadata = {
  title: "Thinking Pixel IMS",
  description: "Creative internal management system for digital atelier operations.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={`${headingFont.variable} ${bodyFont.variable}`}>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}

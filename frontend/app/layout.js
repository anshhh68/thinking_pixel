import "./globals.css";
import { DM_Sans, JetBrains_Mono } from "next/font/google";
import ThemeProviderWrapper from "../components/ThemeProvider";
import AppShell from "../components/AppShell";

const dmSans = DM_Sans({ subsets: ["latin"], variable: "--font-sans" });
const jetbrains = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono", weight: ["400", "500"] });

export const metadata = { title: "Thinking Pixel IMS", description: "Internal Management System" };
export const viewport = { width: "device-width", initialScale: 1 };

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${dmSans.variable} ${jetbrains.variable}`}>
      <body>
        <ThemeProviderWrapper>
          <AppShell>{children}</AppShell>
        </ThemeProviderWrapper>
      </body>
    </html>
  );
}

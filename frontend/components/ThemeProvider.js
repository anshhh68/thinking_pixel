"use client";
import { ThemeProvider } from "../lib/theme";

export default function ThemeProviderWrapper({ children }) {
  return <ThemeProvider>{children}</ThemeProvider>;
}

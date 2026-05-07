"use client";
import { createContext, useContext, useState, useEffect } from "react";

export const DARK = {
  name: "Studio Dark",
  sidebarBg: "#0C0D11",
  contentBg: "#111318",
  surfaceBg: "#181C24",
  elevatedBg: "#1E2230",
  border: "#232838",
  borderStrong: "#2E3547",
  text1: "#EEF0F7",
  text2: "#828899",
  text3: "#4A5168",
  accent: "#F05A22",
  accentHover: "#D94E1C",
  accentSoft: "rgba(240,90,34,0.13)",
  indigo: "#7C7FF5",
  indigoSoft: "rgba(124,127,245,0.13)",
  emerald: "#10B981",
  emeraldSoft: "rgba(16,185,129,0.13)",
  amber: "#F59E0B",
  amberSoft: "rgba(245,158,11,0.13)",
  red: "#F87171",
  redSoft: "rgba(248,113,113,0.13)",
  cyan: "#22D3EE",
  cyanSoft: "rgba(34,211,238,0.13)",
  navBg: "rgba(12,13,17,0.85)",
  shadow: "0 2px 16px rgba(0,0,0,0.35)",
  cardShadow: "0 1px 4px rgba(0,0,0,0.25)",
  isDark: true,
};

export const LIGHT = {
  name: "Clean Light",
  sidebarBg: "#FFFFFF",
  contentBg: "#F5F6FA",
  surfaceBg: "#FFFFFF",
  elevatedBg: "#FFFFFF",
  border: "#E8EBF3",
  borderStrong: "#D1D5E4",
  text1: "#0F1117",
  text2: "#606677",
  text3: "#A0A6B8",
  accent: "#F05A22",
  accentHover: "#D94E1C",
  accentSoft: "rgba(240,90,34,0.09)",
  indigo: "#6366F1",
  indigoSoft: "rgba(99,102,241,0.09)",
  emerald: "#10B981",
  emeraldSoft: "rgba(16,185,129,0.09)",
  amber: "#D97706",
  amberSoft: "rgba(217,119,6,0.09)",
  red: "#EF4444",
  redSoft: "rgba(239,68,68,0.09)",
  cyan: "#0891B2",
  cyanSoft: "rgba(8,145,178,0.09)",
  navBg: "rgba(245,246,250,0.88)",
  shadow: "0 2px 16px rgba(0,0,0,0.07)",
  cardShadow: "0 1px 3px rgba(0,0,0,0.08)",
  isDark: false,
};

const ThemeCtx = createContext({ t: DARK, isDark: true, toggle: () => {} });
export const useTheme = () => useContext(ThemeCtx);

export function ThemeProvider({ children }) {
  const [isDark, setIsDark] = useState(true);

  useEffect(() => {
    const saved = localStorage.getItem("tp_theme");
    if (saved === "light") setIsDark(false);
  }, []);

  const toggle = () => {
    const next = !isDark;
    setIsDark(next);
    localStorage.setItem("tp_theme", next ? "dark" : "light");
  };

  const t = isDark ? DARK : LIGHT;
  return (
    <ThemeCtx.Provider value={{ t, isDark, toggle }}>
      <style>{`
        body{background:${t.contentBg};color:${t.text1}}
        ::-webkit-scrollbar{width:5px;height:5px}
        ::-webkit-scrollbar-track{background:transparent}
        ::-webkit-scrollbar-thumb{background:${t.border};border-radius:8px}
        *{scrollbar-width:thin;scrollbar-color:${t.border} transparent}
        @keyframes fadeIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
        @keyframes slideInLeft{from{opacity:0;transform:translateX(-16px)}to{opacity:1;transform:translateX(0)}}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}
        @keyframes ping{0%{transform:scale(1);opacity:1}75%,100%{transform:scale(2);opacity:0}}
        @keyframes slideDown{from{opacity:0;transform:translateY(-8px)}to{opacity:1;transform:translateY(0)}}
        @keyframes scaleIn{from{opacity:0;transform:scale(.95)}to{opacity:1;transform:scale(1)}}
        .anim-fade{animation:fadeIn .25s ease both}
        .anim-scale{animation:scaleIn .2s ease both}
        .anim-down{animation:slideDown .2s ease both}
        .anim-left{animation:slideInLeft .2s ease both}
        button,input,a,[data-theme-transition]{transition:background-color .15s ease,color .15s ease,border-color .15s ease,box-shadow .15s ease}
      `}</style>
      {children}
    </ThemeCtx.Provider>
  );
}

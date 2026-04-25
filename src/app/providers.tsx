"use client";

import { SessionProvider } from "next-auth/react";
import { createContext, useContext, useEffect, useState, ReactNode } from "react";

/* ============================================================
   THEME CONTEXT — gestione dark / light mode
   - Persistenza in localStorage sotto chiave "mc-theme"
   - Applicazione via attributo data-theme su <html>
   - Fallback alla preferenza di sistema (prefers-color-scheme)
   - Lo script no-flash è in layout.tsx per evitare il FOUC
============================================================ */

type Theme = "light" | "dark";

type ThemeContextValue = {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (t: Theme) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme deve essere usato dentro <Providers>");
  return ctx;
}

function ThemeProvider({ children }: { children: ReactNode }) {
  // Initial state viene hydrato dallo script no-flash di layout.tsx
  // quindi leggiamo il valore già applicato su <html>
  const [theme, setThemeState] = useState<Theme>("light");

  useEffect(() => {
    // Al primo mount leggiamo il tema già applicato dallo script no-flash
    const current = document.documentElement.getAttribute("data-theme") as Theme | null;
    if (current === "dark" || current === "light") {
      setThemeState(current);
    }
  }, []);

  const applyTheme = (t: Theme) => {
    document.documentElement.setAttribute("data-theme", t);
    try {
      localStorage.setItem("mc-theme", t);
    } catch {
      // localStorage può essere bloccato, ignoriamo silenziosamente
    }
    setThemeState(t);
  };

  const toggleTheme = () => applyTheme(theme === "light" ? "dark" : "light");
  const setTheme = (t: Theme) => applyTheme(t);

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function Providers({ children }: { children: ReactNode }) {
  return (
    <SessionProvider>
      <ThemeProvider>{children}</ThemeProvider>
    </SessionProvider>
  );
}

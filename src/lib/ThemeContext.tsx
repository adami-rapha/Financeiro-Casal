import React, { createContext, useContext, useEffect, useState } from "react";

type Theme = "dark" | "light";

type ThemeContextValue = {
    theme: Theme;
    toggle: () => void;
};

const ThemeContext = createContext<ThemeContextValue>({
    theme: "dark",
    toggle: () => { },
});

export function useTheme() {
    return useContext(ThemeContext);
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
    const [theme, setTheme] = useState<Theme>(() => {
        const saved = localStorage.getItem("fc-theme");
        return (saved === "light" || saved === "dark") ? saved : "dark";
    });

    useEffect(() => {
        document.documentElement.setAttribute("data-theme", theme);
        localStorage.setItem("fc-theme", theme);
    }, [theme]);

    function toggle() {
        setTheme(prev => (prev === "dark" ? "light" : "dark"));
    }

    return React.createElement(
        ThemeContext.Provider,
        { value: { theme, toggle } },
        children
    );
}

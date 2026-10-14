import React, { createContext, useContext, useEffect } from 'react';

const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove('light');
    root.classList.add('dark');
    root.setAttribute('data-theme', 'dark');
    root.style.colorScheme = 'dark';
    try {
      localStorage.setItem('mockai_admin_theme', 'dark');
    } catch {
      // Storage access gracefully handled
    }
  }, []);

  const toggleTheme = () => {
    // Light mode has been permanently removed; dark mode is the only supported theme
  };

  const setTheme = () => {
    // Light mode has been permanently removed; dark mode is the only supported theme
  };

  return (
    <ThemeContext.Provider value={{ theme: 'dark', toggleTheme, setTheme, isDark: true }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

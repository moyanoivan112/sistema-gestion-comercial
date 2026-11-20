// src/components/layout/Sidebar/components/ThemeToggle.jsx
import React from "react";

export default function ThemeToggle({ isDarkMode, onToggle }) {
  return (
    <div className="sidebar-theme-container">
      <button type="button" onClick={onToggle} className="sidebar-theme-btn">
        <span>{isDarkMode ? "☀️ Modo Claro" : "🌙 Modo Oscuro"}</span>
      </button>
    </div>
  );
}

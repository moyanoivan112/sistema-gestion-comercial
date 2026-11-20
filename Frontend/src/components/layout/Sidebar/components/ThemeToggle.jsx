// src/components/layout/Sidebar/components/ThemeToggle.jsx
import React from "react";
import Icon from "../../../common/Icon";

export default function ThemeToggle({ isDarkMode, onToggle }) {
  return (
    <div className="sidebar-theme-container">
      <button type="button" onClick={onToggle} className="sidebar-theme-btn">
        {isDarkMode ? (
          <>
            <Icon name="Sun" size={18} />
            <span>Modo Claro</span>
          </>
        ) : (
          <>
            <Icon name="MoonStar" size={18} />
            <span>Modo Oscuro</span>
          </>
        )}
      </button>
    </div>
  );
}

import React from "react";
import Icon from "../../../components/common/Icon";
import "./StatCard.css";

export default function StatCard({ type, iconName, iconColor, title, value }) {
  return (
    <div className={`stat-card ${type}`}>
      <div className="stat-icon">
        <Icon name={iconName} size={40} color={iconColor} />
      </div>
      <div className="stat-info">
        <h3>{title}</h3>
        <p className="stat-number">{value}</p>
      </div>
    </div>
  );
}

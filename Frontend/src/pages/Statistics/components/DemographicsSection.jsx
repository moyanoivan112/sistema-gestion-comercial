import React from "react";
import HistoricalChart from "./HistoricalChart";

export default function DemographicsSection({
  personas = [],
  ministerios = [],
  totalActivos = 0,
  totalBajas = 0,
  totalMinisterios = 0,
}) {
  return (
    <div className="statistics-demografia-card">
      <HistoricalChart
        personas={personas}
        ministerios={ministerios}
        totalActivos={totalActivos}
        totalBajas={totalBajas}
        totalMinisterios={totalMinisterios}
      />
    </div>
  );
}

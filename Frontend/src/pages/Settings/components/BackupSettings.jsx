// src/pages/Settings/components/BackupSettings.jsx
import { useState } from "react";
import api from "../../../services/api";
import "./BackupSettings.css"; // (O puedes unificarlo en tu CSS general)

export default function BackupSettings() {
  const [loadingExport, setLoadingExport] = useState(false);
  const [archivoImportar, setArchivoImportar] = useState(null);

  const handleExportar = async () => {
    try {
      setLoadingExport(true);
      const response = await api.get("/backup/exportar", {
        responseType: "blob",
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute(
        "download",
        `backup_congregacion_${new Date().toISOString().slice(0, 10)}.json`,
      );
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error("Error al descargar backup:", err);
      alert("Error al generar la copia de seguridad en el servidor.");
    } finally {
      setLoadingExport(false);
    }
  };

  const handleImportar = async (e) => {
    e.preventDefault();
    if (!archivoImportar) return alert("Selecciona un archivo JSON primero.");

    if (
      !window.confirm(
        "⚠️ ADVERTENCIA: Restaurar una copia de seguridad sobrescribirá o sincronizará los registros actuales. ¿Deseas continuar?",
      )
    ) {
      return;
    }

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const jsonData = JSON.parse(event.target.result);
        const res = await api.post("/backup/importar", jsonData);
        alert(res.data.mensaje || "¡Restauración completada con éxito!");
        window.location.reload();
      } catch (err) {
        console.error(err);
        alert(
          "El archivo no tiene un formato JSON válido o el servidor rechazó la importación.",
        );
      }
    };
    reader.readAsText(archivoImportar);
  };

  return (
    <div className="backup-settings-card">
      <div className="backup-header-section">
        <h3 className="backup-title">
          Copia de Seguridad y Restauración del Sistema
        </h3>
        <p className="backup-subtitle">
          Resguarda la información completa de la base de datos o recupera el
          sistema ante cualquier imprevisto.
        </p>
      </div>

      <div className="backup-grid">
        {/* Tarjeta de Exportación */}
        <div className="backup-action-box">
          <h4>📥 Descargar Respaldo</h4>
          <p>
            Genera y descarga un archivo en formato JSON que contiene todas las
            tablas de miembros, ministerios y registros históricos.
          </p>
          <button
            type="button"
            onClick={handleExportar}
            disabled={loadingExport}
            className="btn-backup-export"
          >
            {loadingExport
              ? "Generando Respaldo..."
              : "Descargar Backup (.json)"}
          </button>
        </div>

        {/* Tarjeta de Importación */}
        <div className="backup-action-box">
          <h4>📤 Restaurar Sistema</h4>
          <p>
            Selecciona un archivo de respaldo previo (JSON) emitido por este
            sistema para reasignar y reestructurar la base de datos.
          </p>
          <form onSubmit={handleImportar} className="backup-import-form">
            <input
              type="file"
              accept=".json"
              onChange={(e) => setArchivoImportar(e.target.files[0])}
              className="backup-file-input"
            />
            <button type="submit" className="btn-backup-import">
              Restaurar Datos
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

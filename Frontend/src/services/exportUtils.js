// src/services/exportUtils.js
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export const exportarDatos = (
  format,
  scopeName,
  type,
  datosPersonas,
  statsData = {},
) => {
  // Si es estrictamente de tipo datos y no hay nadie, detenemos
  if ((!datosPersonas || datosPersonas.length === 0) && type === "datos") {
    alert("⚠️ No hay datos de personas disponibles para exportar.");
    return;
  }

  const confirmar = window.confirm(
    `¿Deseas descargar el reporte de "${scopeName}" en formato ${format.toUpperCase()}?`,
  );

  if (!confirmar) {
    return;
  }

  const nombreArchivoLimpio = scopeName.replace(/[^a-zA-Z0-9]/g, "_");

  // Destructuramos las métricas que llegan desde Statistics.jsx (si aplican)
  const {
    totalActivos,
    totalBautizados,
    porcentajeBautizo,
    totalDiscipulado,
    porcentajeDiscipulado,
    totalBajas,
  } = statsData;

  // ==========================================
  // 1. EXPORTAR A EXCEL (XLSX)
  // ==========================================
  if (format === "excel") {
    try {
      const workbook = XLSX.utils.book_new();

      // Si el usuario pidió demografía o completo, agregamos una pestaña de Resumen Estadístico
      if (type === "demografia" || type === "completo") {
        const resumenData = [
          { Métrica: "Reporte de Alcance", Valor: scopeName },
          {
            Métrica: "Fecha de Emisión",
            Valor: new Date().toLocaleDateString(),
          },
          {
            Métrica: "Total de Registrados",
            Valor: totalActivos || datosPersonas.length,
          },
          {
            Métrica: "Total Bautizados",
            Valor: `${totalBautizados || 0} (${porcentajeBautizo || 0}%)`,
          },
          {
            Métrica: "En Discipulado",
            Valor: `${totalDiscipulado || 0} (${porcentajeDiscipulado || 0}%)`,
          },
          { Métrica: "Bajas / Inactivos", Valor: totalBajas || 0 },
        ];
        const wsResumen = XLSX.utils.json_to_sheet(resumenData);
        XLSX.utils.book_append_sheet(
          workbook,
          wsResumen,
          "Resumen Estadístico",
        );
      }

      // Pestaña de listado de personas (siempre que el tipo no sea estrictamente solo demografía)
      if (type === "datos" || type === "completo") {
        const datosParaExcel = datosPersonas.map((p, index) => ({
          "#": index + 1,
          Nombre: p.nombre || "",
          Apellido: p.apellido || "",
          DNI: p.dni || "N/D",
          Teléfono: p.telefono || "N/D",
          Bautizado: p.bautizado ? "Sí" : "No",
          "En Discipulado": p.en_discipulado ? "Sí" : "No",
          Discipulador: p.discipulador || "Ninguno",
        }));

        const wsPersonas = XLSX.utils.json_to_sheet(datosParaExcel);
        XLSX.utils.book_append_sheet(
          workbook,
          wsPersonas,
          "Listado de Miembros",
        );
      }

      XLSX.writeFile(workbook, `Reporte_${nombreArchivoLimpio}.xlsx`);
      alert("✅ ¡El archivo de Excel se está descargando con éxito!");
    } catch (error) {
      console.error("Error al generar Excel:", error);
      alert("❌ Ocurrió un error al generar el archivo Excel.");
    }
  }

  // ==========================================
  // 2. EXPORTAR A PDF (jsPDF + autotable + barras visuales)
  // ==========================================
  else if (format === "pdf") {
    try {
      const doc = new jsPDF();

      doc.setFontSize(16);
      doc.setTextColor(30, 41, 59);
      doc.text("Sistema de Gestión Congregacional", 14, 20);

      doc.setFontSize(11);
      doc.setTextColor(100, 116, 139);
      doc.text(`Reporte: ${scopeName}`, 14, 28);
      doc.text(
        `Enfoque: ${type.toUpperCase()} | Fecha: ${new Date().toLocaleDateString()}`,
        14,
        34,
      );

      let startYTable = 42;

      // Si se seleccionó demografia o completo, dibujamos el panel con gráficos de barras visuales
      if (type === "demografia" || type === "completo") {
        doc.setFillColor(241, 245, 249);
        doc.roundedRect(14, 38, 182, 45, 3, 3, "F");

        doc.setFontSize(10);
        doc.setTextColor(30, 41, 59);
        doc.text("RESUMEN DE INDICADORES Y GRÁFICOS DE PROGRESO:", 18, 46);

        doc.setFontSize(9);
        doc.setTextColor(71, 85, 105);
        doc.text(
          `• Total Registrados: ${totalActivos || datosPersonas.length}`,
          18,
          54,
        );
        doc.text(`• Bajas / Inactivos: ${totalBajas || 0}`, 110, 54);

        // --- DIBUJO DE GRÁFICO DE BARRAS PROPORCIONALES ---
        const porcBau = porcentajeBautizo || 0;
        const porcDisc = porcentajeDiscipulado || 0;

        // Etiqueta y barra de Bautizados
        doc.text(`Bautizados: ${totalBautizados || 0} (${porcBau}%)`, 18, 64);
        doc.setFillColor(226, 232, 240); // Fondo de barra gris claro
        doc.roundedRect(75, 60, 110, 5, 2, 2, "F");
        doc.setFillColor(2, 132, 199); // Relleno de barra azul
        if (porcBau > 0) {
          doc.roundedRect(
            75,
            60,
            Math.max((110 * porcBau) / 100, 4),
            5,
            2,
            2,
            "F",
          );
        }

        // Etiqueta y barra de Discipulado
        doc.text(
          `Discipulado: ${totalDiscipulado || 0} (${porcDisc}%)`,
          18,
          72,
        );
        doc.setFillColor(226, 232, 240);
        doc.roundedRect(75, 68, 110, 5, 2, 2, "F");
        doc.setFillColor(217, 119, 6); // Relleno de barra ámbar/naranja
        if (porcDisc > 0) {
          doc.roundedRect(
            75,
            68,
            Math.max((110 * porcDisc) / 100, 4),
            5,
            2,
            2,
            "F",
          );
        }

        startYTable = 88;
      }

      // Tabla de datos detallados (si aplica)
      if (type === "datos" || type === "completo") {
        const filasTabla = datosPersonas.map((p, index) => [
          index + 1,
          `${p.apellido || ""}, ${p.nombre || ""}`,
          p.dni || "N/D",
          p.telefono || "N/D",
          p.bautizado ? "Sí" : "No",
          p.en_discipulado ? "Sí" : "No",
        ]);

        autoTable(doc, {
          startY: startYTable,
          head: [
            [
              "#",
              "Nombre y Apellido",
              "DNI",
              "Teléfono",
              "Bautizado",
              "Discipulado",
            ],
          ],
          body: filasTabla,
          theme: "grid",
          headStyles: { fillColor: [2, 132, 199] },
          styles: { fontSize: 8, cellPadding: 4 },
        });
      }

      doc.save(`Reporte_${nombreArchivoLimpio}.pdf`);
      alert(
        "✅ ¡El archivo PDF con gráficos de progreso se está descargando con éxito!",
      );
    } catch (error) {
      console.error("Error al generar PDF:", error);
      alert("❌ Ocurrió un error al generar el archivo PDF.");
    }
  }
};

// src/services/exportUtils.js
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const calcularMetricasFallback = (datosPersonas = [], statsData = {}) => {
  const lista = Array.isArray(datosPersonas) ? datosPersonas : [];
  const totalActivos =
    typeof statsData.totalActivos === "number"
      ? statsData.totalActivos
      : lista.length;

  const totalBautizados =
    typeof statsData.totalBautizados === "number"
      ? statsData.totalBautizados
      : lista.filter((p) => Boolean(p.bautizado)).length;

  const totalDiscipulado =
    typeof statsData.totalDiscipulado === "number"
      ? statsData.totalDiscipulado
      : lista.filter((p) => Boolean(p.en_discipulado)).length;

  const totalConDiscipulador =
    typeof statsData.totalConDiscipulador === "number"
      ? statsData.totalConDiscipulador
      : lista.filter(
          (p) => p.discipulador && String(p.discipulador).trim() !== "",
        ).length;

  const totalBajas =
    typeof statsData.totalBajas === "number" ? statsData.totalBajas : 0;

  const porcentajeBautizo =
    typeof statsData.porcentajeBautizo === "number"
      ? statsData.porcentajeBautizo
      : totalActivos > 0
        ? Math.round((totalBautizados / totalActivos) * 100)
        : 0;

  const porcentajeDiscipulado =
    typeof statsData.porcentajeDiscipulado === "number"
      ? statsData.porcentajeDiscipulado
      : totalActivos > 0
        ? Math.round((totalDiscipulado / totalActivos) * 100)
        : 0;

  const porcentajeAcompanamiento =
    typeof statsData.porcentajeAcompanamiento === "number"
      ? statsData.porcentajeAcompanamiento
      : totalDiscipulado > 0
        ? Math.round((totalConDiscipulador / totalDiscipulado) * 100)
        : 0;

  return {
    totalActivos,
    totalBautizados,
    porcentajeBautizo,
    totalDiscipulado,
    porcentajeDiscipulado,
    totalConDiscipulador,
    porcentajeAcompanamiento,
    totalBajas,
  };
};

export const exportarDatos = (
  format,
  scopeName,
  type,
  datosPersonas = [],
  statsData = {},
) => {
  const listaPersonas = Array.isArray(datosPersonas) ? datosPersonas : [];

  if (listaPersonas.length === 0 && type === "datos") {
    alert("⚠️ No hay datos de personas disponibles para exportar.");
    return;
  }

  const confirmar = window.confirm(
    `¿Deseas descargar el reporte de "${scopeName}" en formato ${format.toUpperCase()}?`,
  );

  if (!confirmar) {
    return;
  }

  const nombreIglesia =
    localStorage.getItem("nombre_iglesia") ||
    "Sistema de Gestión Congregacional";
  const fechaEmision = new Date().toLocaleString("es-AR", {
    dateStyle: "short",
    timeStyle: "short",
  });
  const fechaCorta = new Date().toLocaleDateString("es-AR");
  const nombreArchivoLimpio = `${nombreIglesia}_${scopeName}_${type}`
    .replace(/[^a-zA-Z0-9_-]/g, "_")
    .replace(/_+/g, "_");

  const {
    totalActivos,
    totalBautizados,
    porcentajeBautizo,
    totalDiscipulado,
    porcentajeDiscipulado,
    totalConDiscipulador,
    porcentajeAcompanamiento,
    totalBajas,
  } = calcularMetricasFallback(listaPersonas, statsData);

  // ==========================================
  // 1. EXPORTAR A EXCEL (XLSX)
  // ==========================================
  if (format === "excel") {
    try {
      const workbook = XLSX.utils.book_new();

      if (type === "demografia" || type === "completo") {
        const resumenData = [
          { Indicador: "Iglesia / Organización", Valor: nombreIglesia },
          { Indicador: "Alcance del Reporte", Valor: scopeName },
          { Indicador: "Tipo de Reporte", Valor: type.toUpperCase() },
          { Indicador: "Fecha y Hora de Emisión", Valor: fechaEmision },
          { Indicador: "Total Registrados / Activos", Valor: totalActivos },
          {
            Indicador: "Bautizados",
            Valor: `${totalBautizados} (${porcentajeBautizo}%)`,
          },
          {
            Indicador: "En Discipulado",
            Valor: `${totalDiscipulado} (${porcentajeDiscipulado}%)`,
          },
          {
            Indicador: "Con discipulador asignado",
            Valor: `${totalConDiscipulador} (${porcentajeAcompanamiento}% de los discipulados)`,
          },
          { Indicador: "Bajas / Inactivos", Valor: totalBajas },
        ];

        const wsResumen = XLSX.utils.json_to_sheet(resumenData);
        wsResumen["!cols"] = [{ wch: 36 }, { wch: 34 }];
        XLSX.utils.book_append_sheet(
          workbook,
          wsResumen,
          "Resumen Estadístico",
        );
      }

      if (type === "datos" || type === "completo") {
        const datosParaExcel = listaPersonas.map((p, index) => ({
          "#": index + 1,
          Apellido: p.apellido || "",
          Nombre: p.nombre || "",
          DNI: p.dni || "N/D",
          Teléfono: p.telefono || "N/D",
          Bautizado: p.bautizado ? "Sí" : "No",
          "En Discipulado": p.en_discipulado ? "Sí" : "No",
          Discipulador:
            p.discipulador && String(p.discipulador).trim() !== ""
              ? p.discipulador
              : "Sin asignar",
        }));

        const wsPersonas = XLSX.utils.json_to_sheet(datosParaExcel);
        wsPersonas["!cols"] = [
          { wch: 5 },
          { wch: 20 },
          { wch: 20 },
          { wch: 14 },
          { wch: 16 },
          { wch: 12 },
          { wch: 16 },
          { wch: 22 },
        ];
        XLSX.utils.book_append_sheet(
          workbook,
          wsPersonas,
          "Listado de Miembros",
        );
      }

      XLSX.writeFile(workbook, `${nombreArchivoLimpio}.xlsx`);
      alert("✅ ¡El archivo de Excel se descargó correctamente!");
    } catch (error) {
      console.error("Error al generar Excel:", error);
      alert("❌ Ocurrió un error al generar el archivo Excel.");
    }
    return;
  }

  // ==========================================
  // 2. EXPORTAR A PDF (jsPDF + autotable)
  // ==========================================
  if (format === "pdf") {
    try {
      const doc = new jsPDF();

      // Encabezado institucional
      doc.setFillColor(15, 23, 42);
      doc.rect(0, 0, 210, 34, "F");

      doc.setFontSize(15);
      doc.setTextColor(255, 255, 255);
      doc.text(nombreIglesia, 14, 15);

      doc.setFontSize(10);
      doc.setTextColor(186, 230, 253);
      doc.text(`Reporte: ${scopeName}  |  Tipo: ${type.toUpperCase()}`, 14, 23);
      doc.text(`Emitido: ${fechaEmision}`, 14, 29);

      let cursorY = 42;

      if (type === "demografia" || type === "completo") {
        doc.setFillColor(241, 245, 249);
        doc.roundedRect(14, cursorY, 182, 54, 3, 3, "F");

        doc.setFontSize(10);
        doc.setTextColor(15, 23, 42);
        doc.text("RESUMEN EJECUTIVO E INDICADORES", 18, cursorY + 8);

        doc.setFontSize(9);
        doc.setTextColor(51, 65, 85);
        doc.text(`Total Registrados: ${totalActivos}`, 18, cursorY + 16);
        doc.text(`Bajas / Inactivos: ${totalBajas}`, 110, cursorY + 16);

        const dibujarBarra = (
          etiqueta,
          conteo,
          porcentaje,
          yPos,
          colorRgb,
          textoPorcentaje = null,
        ) => {
          doc.setFontSize(8.5);
          doc.setTextColor(30, 41, 59);
          const detallePorc = textoPorcentaje || `${porcentaje}%`;
          doc.text(`${etiqueta}: ${conteo} (${detallePorc})`, 18, yPos + 3.5);

          const barraX = 96;
          const barraAncho = 90;
          const barraAlto = 4.5;

          doc.setFillColor(226, 232, 240);
          doc.roundedRect(barraX, yPos, barraAncho, barraAlto, 2, 2, "F");

          if (porcentaje > 0) {
            doc.setFillColor(colorRgb[0], colorRgb[1], colorRgb[2]);
            const fillW = Math.max(
              (barraAncho * Math.min(porcentaje, 100)) / 100,
              4,
            );
            doc.roundedRect(barraX, yPos, fillW, barraAlto, 2, 2, "F");
          }
        };

        dibujarBarra(
          "Bautizados",
          totalBautizados,
          porcentajeBautizo,
          cursorY + 22,
          [22, 163, 74],
        );
        dibujarBarra(
          "En Discipulado",
          totalDiscipulado,
          porcentajeDiscipulado,
          cursorY + 30,
          [202, 138, 4],
        );
        dibujarBarra(
          "Con discipulador",
          totalConDiscipulador,
          porcentajeAcompanamiento,
          cursorY + 38,
          [2, 132, 199],
          `${porcentajeAcompanamiento}% de discipulado`,
        );

        cursorY += 62;
      }

      if (type === "datos" || type === "completo") {
        const filasTabla = listaPersonas.map((p, index) => [
          index + 1,
          `${p.apellido || ""}, ${p.nombre || ""}`.trim().replace(/^,\s*/, ""),
          p.dni || "N/D",
          p.telefono || "N/D",
          p.bautizado ? "Sí" : "No",
          p.en_discipulado ? "Sí" : "No",
          p.discipulador && String(p.discipulador).trim() !== ""
            ? p.discipulador
            : "—",
        ]);

        autoTable(doc, {
          startY: cursorY,
          head: [
            [
              "#",
              "Apellido y Nombre",
              "DNI",
              "Teléfono",
              "Bautizado",
              "Discipulado",
              "Discipulador",
            ],
          ],
          body: filasTabla,
          theme: "striped",
          headStyles: { fillColor: [2, 132, 199], textColor: 255 },
          styles: { fontSize: 8, cellPadding: 3 },
          didDrawPage: (data) => {
            const pageCount = doc.internal.getNumberOfPages();
            doc.setFontSize(8);
            doc.setTextColor(100, 116, 139);
            doc.text(
              `Página ${data.pageNumber} de ${pageCount}  •  ${fechaCorta}`,
              14,
              doc.internal.pageSize.height - 8,
            );
          },
        });
      }

      doc.save(`${nombreArchivoLimpio}.pdf`);
      alert("✅ ¡El archivo PDF se descargó correctamente!");
    } catch (error) {
      console.error("Error al generar PDF:", error);
      alert("❌ Ocurrió un error al generar el archivo PDF.");
    }
  }
};

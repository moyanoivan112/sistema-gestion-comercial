import { useState, useEffect } from "react";
import api from "../../services/api";
import AttendanceCards from "./components/AttendanceCards";
import LideresGrid from "./components/LideresGrid";
import AttendanceList from "./components/AttendanceList";
import AsignarAlumnoModal from "./components/AsignarAlumnoModal";
import HistorialTab from "./components/HistorialTab";
import { obtenerRolActual, permisosPorRol } from "../../utils/rolePermissions";
import "./Attendance.css";

export default function Attendance() {
  const permisos = permisosPorRol(obtenerRolActual());

  const [activeTab, setActiveTab] = useState("tomar");
  const [ministerios, setMinisterios] = useState([]);
  const [meetingDate, setMeetingDate] = useState(
    new Date().toISOString().split("T")[0],
  );

  // Navegación
  const [viewMode, setViewMode] = useState("cards"); // "cards", "lideres-grid", "list"
  const [selectedMinisterio, setSelectedMinisterio] = useState(null);
  const [lideresList, setLideresList] = useState([]);
  const [selectedLider, setSelectedLider] = useState(null);

  // Lista y Estado de Asistencia
  const [members, setMembers] = useState([]);
  const [attendanceStatus, setAttendanceStatus] = useState({});
  const [loading, setLoading] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);

  useEffect(() => {
    api
      .get("/ministerios")
      .then((res) => {
        const data = res.data;
        setMinisterios(
          Array.isArray(data) ? data.filter((m) => m.activo !== 0) : [],
        );
      })
      .catch((err) => console.error("Error al cargar ministerios:", err));
  }, []);

  const handleSelectMinisterio = (min) => {
    setSelectedMinisterio(min);
    setSelectedLider(null);
    const lower = min.nombre.toLowerCase();
    const conLideres =
      lower.includes("escuela bíblica") ||
      lower.includes("escuela biblica") ||
      lower.includes("pre adolescentes");

    if (conLideres) {
      setLoading(true);
      api
        .get(`/ministerios/${min.id}/lideres`)
        .then((res) => {
          const data = res.data;
          setLideresList(Array.isArray(data) ? data : []);
          setViewMode("lideres-grid");
          setLoading(false);
        })
        .catch((err) => {
          console.error(err);
          setLoading(false);
        });
    } else {
      cargarMiembrosGenerales(min.id);
    }
  };

  const cargarMiembrosGenerales = (idMin) => {
    setLoading(true);
    api
      .get(`/asistencia/personas`, { params: { tipo: idMin } })
      .then((res) => {
        const data = res.data;
        const arr = Array.isArray(data) ? data : [];
        setMembers(arr);
        setAttendanceStatus({});
        setViewMode("list");
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setMembers([]);
        setLoading(false);
      });
  };

  const handleSelectLider = (lider) => {
    setSelectedLider(lider);
    setLoading(true);
    api
      .get(`/ministerios/${selectedMinisterio.id}/lideres/${lider.id}/alumnos`)
      .then((res) => {
        const data = res.data;
        const arr = Array.isArray(data) ? data : [];
        setMembers(arr);
        setAttendanceStatus({});
        setViewMode("list");
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setMembers([]);
        setLoading(false);
      });
  };

  const handleVolver = () => {
    if (selectedLider) {
      setSelectedLider(null);
      setMembers([]);
      setViewMode("lideres-grid");
    } else if (selectedMinisterio) {
      setSelectedMinisterio(null);
      setViewMode("cards");
    }
  };

  const handleSaveAttendance = async () => {
    const validMemberIds = new Set(members.map((m) => m.id));

    const registros = Object.keys(attendanceStatus)
      .filter((id) => validMemberIds.has(Number(id)))
      .map((id) => ({
        id_persona: Number(id),
        presente: attendanceStatus[id],
      }));

    if (registros.length === 0) {
      return alert("No hay registros válidos para guardar.");
    }

    try {
      const res = await api.post("/asistencia", {
        fecha_registro: meetingDate,
        id_ministerio: selectedMinisterio.id,
        registros,
      });
      alert(res.data?.mensaje || "¡Asistencia guardada!");
    } catch (err) {
      console.error(err);
      const msg = err.response?.data?.mensaje || "Error de red al guardar.";
      alert(err.response?.data?.mensaje ? `Error: ${msg}` : msg);
    }
  };

  return (
    <section className="attendance-module">
      <header className="attendance-header">
        <h2>Control de Asistencia</h2>
        <p>
          Registra y consulta el historial de asistencia de la congregación.
        </p>
      </header>

      <div className="attendance-tabs-container">
        <button
          type="button"
          className={`attendance-tab ${activeTab === "tomar" ? "active" : ""}`}
          onClick={() => {
            setActiveTab("tomar");
            setViewMode("cards");
            setSelectedMinisterio(null);
            setSelectedLider(null);
          }}
        >
          <span className="attendance-tab-icon">📋</span> Tomar Asistencia
        </button>
        <button
          type="button"
          className={`attendance-tab ${activeTab === "historial" ? "active" : ""}`}
          onClick={() => setActiveTab("historial")}
        >
          <span className="attendance-tab-icon">📊</span> Historial de
          Asistencia
        </button>
      </div>

      {activeTab === "tomar" && (
        <div>
          {viewMode !== "cards" && (
            <div className="attendance-dynamic-header">
              <div>
                <h3 className="attendance-dynamic-title">
                  {selectedLider
                    ? `${selectedMinisterio?.nombre} — Clase de ${selectedLider.apellido}, ${selectedLider.nombre}`
                    : selectedMinisterio?.nombre}
                </h3>
                <p className="attendance-dynamic-subtitle">
                  Gestiona los presentes y ausentes de la clase.
                </p>
              </div>

              <div className="attendance-dynamic-actions">
                <div className="attendance-date-picker-wrapper">
                  <span className="attendance-date-icon">📅</span>
                  <input
                    type="date"
                    className="attendance-date-input"
                    value={meetingDate}
                    onChange={(e) => setMeetingDate(e.target.value)}
                    max={new Date().toISOString().split("T")[0]}
                  />
                </div>

                <button
                  type="button"
                  onClick={handleVolver}
                  className="attendance-back-btn"
                >
                  ← Volver
                </button>
              </div>
            </div>
          )}

          {viewMode === "cards" && (
            <AttendanceCards
              ministerios={ministerios}
              onSelect={handleSelectMinisterio}
            />
          )}
          {viewMode === "lideres-grid" && (
            <LideresGrid
              ministerio={selectedMinisterio}
              lideres={lideresList}
              loading={loading}
              onSelectLider={handleSelectLider}
            />
          )}
          {viewMode === "list" && (
            <AttendanceList
              ministerio={selectedMinisterio}
              lideres={selectedLider}
              date={meetingDate}
              members={members}
              loading={loading}
              attendanceStatus={attendanceStatus}
              onStatusChange={(id, st) =>
                setAttendanceStatus((p) => ({ ...p, [id]: st }))
              }
              onSave={handleSaveAttendance}
              onOpenAddModal={
                permisos.puedeAsignarAlumnos
                  ? () => setShowAddModal(true)
                  : null
              }
              canAssignStudents={permisos.puedeAsignarAlumnos}
              setAttendanceStatus={setAttendanceStatus}
            />
          )}
        </div>
      )}

      {showAddModal && permisos.puedeAsignarAlumnos && (
        <AsignarAlumnoModal
          ministerio={selectedMinisterio}
          lider={selectedLider}
          onClose={() => setShowAddModal(false)}
          onSuccess={() => handleSelectLider(selectedLider)}
        />
      )}

      {activeTab === "historial" && <HistorialTab />}
    </section>
  );
}

# Sistema de Gestión Congregacional (PWA Full-Stack)

Aplicación web progresiva (**PWA**) y API REST desarrollada para administrar el padrón de miembros, ministerios y clases, el registro y seguimiento de asistencia, las métricas demográficas y espirituales, los roles de usuario y los respaldos de base de datos.

---

## Arquitectura General

El sistema sigue una arquitectura **cliente-servidor desacoplada**:

- **Frontend:** React + Vite + React Router (PWA con `manifest.webmanifest`, soporte para tema claro/oscuro `html.dark-theme`, gráficos con Recharts y exportación a Excel/PDF).
- **Backend:** Node.js + Express con estructura modular de rutas (`routes/`), controladores (`controllers/`), middlewares (`middleware/`) y tareas programadas (`cron/`).
- **Base de Datos:** MySQL mediante pool de conexiones (`config/db.js`) y transacciones SQL en operaciones compuestas o críticas.

---

## Módulos Principales

### Backend (`Node.js` + `Express` + `MySQL`)

- **Autenticación y Roles (`authRoutes.js`, `authMiddleware.js`):** inicio de sesión con JWT, creación de usuarios, actualización de roles (`Líder`, `Administrador`), recuperación de contraseña y validación de token en rutas protegidas.
- **Personas / Padrón (`personaRoutes.js`, `memberRoutes.js`, `personaController.js`):** alta, consulta, edición, baja lógica (`activo = 0`), consulta y reactivación de miembros inactivos, además de estadísticas y tendencias para el tablero.
- **Ministerios y Liderazgo (`ministerioRoutes.js`, `ministerioController.js`):** administración de reuniones/grupos y sus reglas (`edad_minima`, `edad_maxima`, `requiere_bautismo`, `activo`), excepciones por persona (`personas_ministerios`), designación de líderes/profesores (`ministerio_lideres`) y asignación o traspaso de alumnos (`lider_grupo_personas`) con control de conflictos (`409 Conflict`).
- **Asistencia (`asistenciaRoutes.js`, `asistenciaController.js`):** consulta de personas aptas, verificación de registros previos, guardado/edición de asistencia, historial de fechas, alertas de ausencias prolongadas y comparativas entre última y penúltima reunión (ausentes y reingresos).
- **Respaldos (`backupRoutes.js`, `backupController.js`, `cronBackup.js`):** exportación e importación de copias de seguridad en formato JSON con transacción SQL y programación automática de respaldos.

### Frontend (`React` + `Vite` PWA)

- **Enrutamiento y Sesión (`AppRouter.jsx`, `MainLayout.jsx`, `Sidebar.jsx`, `services/api.js`):** rutas protegidas por sesión y rol de administrador, actualización reactiva del nombre institucional (`churchNameChanged`) e interceptor de Axios con token `Bearer` y manejo de `401`.
- **Registro de Miembros (`Registry.jsx`, `useRegistry.js`, `MemberForm.jsx`, `MembersTable.jsx`, `InactiveMembers.jsx`):** búsqueda, filtros por estado espiritual y sexo/género, ordenamiento, paginación, ficha de detalle, alta/edición con confirmación y reactivación de inactivos.
- **Asistencia (`Attendance.jsx`, `AttendanceCards.jsx`, `LideresGrid.jsx`, `AttendanceList.jsx`, `AsignarAlumnoModal.jsx`, `HistorialTab.jsx`, `DetalleAsistenciaModal.jsx`):** toma de asistencia por reunión o por clase de líder/profesor, detección de asistencia previa, carga guiada fila por fila, validación de completitud, traspaso de alumnos, historial paginado y modal unificado de detalle.
- **Dashboard y Estadísticas (`Dashboard.jsx`, `Statistics.jsx`, widgets y `exportUtils.js`):** saludo horario, accesos rápidos, cumpleaños del mes y de los últimos 7 días, alertas diarias por día de la semana, alertas de ausencias, tarjetas métricas, comparativas de reuniones, gráficos y exportación a `.xlsx` y `.pdf`.
- **Configuración y Usuarios (`Settings.jsx`, `GeneralSettings.jsx`, `MinisteriosSettings.jsx`, `ProfesoresSettings.jsx`, `BackupSettings.jsx`, `RoleAssignment.jsx`, `RecuperarPassword.jsx`):** ajuste institucional, gestión de reuniones/ministerios, asignación de profesores, copias/restauraciones JSON, gestión de usuarios/roles y restablecimiento de contraseña.

---

## Reglas de Negocio Clave

- **Baja lógica (`activo = 0`):** preserva el historial de asistencia y relaciones de los miembros, permitiendo reactivarlos sin pérdida de trazabilidad.
- **Elegibilidad y excepciones:** combina reglas de edad/bautismo de cada ministerio con asignaciones particulares en `personas_ministerios`.
- **Control de traspasos (`409 Conflict`):** si un alumno ya pertenece a otro líder en el mismo ministerio, exige confirmación explícita antes de reasignarlo sin duplicar registros.
- **Integridad de asistencia y transacciones:** valida que todos los integrantes estén marcados antes de guardar asistencia nueva y utiliza transacciones (`beginTransaction`, `commit`, `rollback`) en escrituras compuestas como sincronización de ministerios y restauración de backups.

---

## Instalación y Puesta en Marcha

### 1. Backend

```bash
cd backend
npm install
```

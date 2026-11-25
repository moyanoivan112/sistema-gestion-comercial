import "./Registry.css";
import MembersTable from "./components/MembersTable";
import MemberForm from "./components/MemberForm";
import RegistryToolbar from "./components/RegistryToolbar";
import Pagination from "./components/Pagination";
import InactiveMembers from "./InactiveMembers";
import { useRegistry } from "./hooks/useRegistry";
import { obtenerRolActual, permisosPorRol } from "../../utils/rolePermissions";

export default function Registry() {
  const {
    currentRows,
    searchTerm,
    filterBy,
    generoFilter,
    sortBy,
    isFormOpen,
    memberToEdit,
    currentPage,
    totalPages,
    currentView,
    setCurrentView,
    setCurrentPage,
    handleSearchChange,
    handleFilterChange,
    handleGeneroChange,
    handleSortChange,
    handleOpenForm,
    handleCloseForm,
    handleSaveMember,
    handleDeleteMember,
  } = useRegistry();

  const permisos = permisosPorRol(obtenerRolActual());
  const vistaActiva =
    currentView === "inactive" && !permisos.puedeVerInactivos
      ? "active"
      : currentView;

  return (
    <section className="registry-module">
      <header className="registry-header">
        <h2>Registro de Congregación</h2>
        <p>Administración de Miembros, Asistentes y sus datos personales.</p>
      </header>

      {/* Contenedor de Pestañas con Clases CSS */}
      <div className="registry-tabs-container">
        <button
          type="button"
          onClick={() => setCurrentView("active")}
          className={`registry-tab-btn ${vistaActiva === "active" ? "active" : ""}`}
        >
          📋 Todos los Registros
        </button>
        {permisos.puedeVerInactivos && (
          <button
            type="button"
            onClick={() => setCurrentView("inactive")}
            className={`registry-tab-btn ${vistaActiva === "inactive" ? "active" : ""}`}
          >
            🗑️ Miembros Inactivos
          </button>
        )}
      </div>

      {/* Contenido condicional según la pestaña seleccionada */}
      {vistaActiva === "active" ? (
        <>
          <RegistryToolbar
            searchTerm={searchTerm}
            onSearchChange={handleSearchChange}
            filterBy={filterBy}
            onFilterChange={handleFilterChange}
            generoFilter={generoFilter}
            onGeneroChange={handleGeneroChange}
            sortBy={sortBy}
            onSortChange={handleSortChange}
            onAddClick={
              permisos.puedeCrearEditarPersona
                ? () => handleOpenForm()
                : undefined
            }
            canAdd={permisos.puedeCrearEditarPersona}
          />

          <br />

          <MembersTable
            data={currentRows}
            onEdit={permisos.puedeCrearEditarPersona ? handleOpenForm : null}
            onDelete={permisos.puedeDarBajaPersona ? handleDeleteMember : null}
            canEdit={permisos.puedeCrearEditarPersona}
            canDelete={permisos.puedeDarBajaPersona}
          />

          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={(newPage) => setCurrentPage(newPage)}
          />
        </>
      ) : (
        <InactiveMembers />
      )}

      {isFormOpen && permisos.puedeCrearEditarPersona && (
        <MemberForm
          initialData={memberToEdit}
          onClose={handleCloseForm}
          onSave={handleSaveMember}
        />
      )}
    </section>
  );
}

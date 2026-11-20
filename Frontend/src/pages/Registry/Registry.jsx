// src/pages/Registry/Registry.jsx
import "./Registry.css";
import MembersTable from "./components/MembersTable";
import MemberForm from "./components/MemberForm";
import RegistryToolbar from "./components/RegistryToolbar";
import Pagination from "./components/Pagination";
import InactiveMembers from "./InactiveMembers";
import { useRegistry } from "./hooks/useRegistry";

export default function Registry() {
  const {
    currentRows,
    searchTerm,
    filterBy,
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
    handleSortChange,
    handleOpenForm,
    handleCloseForm,
    handleSaveMember,
    handleDeleteMember,
  } = useRegistry();

  return (
    <section className="registry-module">
      <header className="registry-header">
        <h2>Registro de Congregación</h2>
        <p>Administración de Miembros, Asistentes y sus datos personales.</p>
      </header>

      {/* Contenedor de Pestañas con Clases CSS */}
      <div className="registry-tabs-container">
        <button
          onClick={() => setCurrentView("active")}
          className={`registry-tab-btn ${currentView === "active" ? "active" : ""}`}
        >
          📋 Todos los Registros
        </button>
        <button
          onClick={() => setCurrentView("inactive")}
          className={`registry-tab-btn ${currentView === "inactive" ? "active" : ""}`}
        >
          🗑️ Miembros Inactivos
        </button>
      </div>

      {/* Contenido condicional según la pestaña seleccionada */}
      {currentView === "active" ? (
        <>
          <RegistryToolbar
            searchTerm={searchTerm}
            onSearchChange={handleSearchChange}
            filterBy={filterBy}
            onFilterChange={handleFilterChange}
            sortBy={sortBy}
            onSortChange={handleSortChange}
            onAddClick={() => handleOpenForm()}
          />

          <br />

          <MembersTable
            data={currentRows}
            onEdit={handleOpenForm}
            onDelete={handleDeleteMember}
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

      {isFormOpen && (
        <MemberForm
          initialData={memberToEdit}
          onClose={handleCloseForm}
          onSave={handleSaveMember}
        />
      )}
    </section>
  );
}

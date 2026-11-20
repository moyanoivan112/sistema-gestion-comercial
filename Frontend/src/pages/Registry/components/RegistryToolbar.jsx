// src/pages/Registry/components/RegistryToolbar.jsx
import "./RegistryToolbar.css";
import SearchBar from "./SearchBar";
import Icon from "../../../components/common/Icon";

export default function RegistryToolbar({
  searchTerm,
  onSearchChange,
  filterBy,
  onFilterChange,
  sortBy,
  onSortChange,
  onAddClick,
}) {
  return (
    <div className="registry-toolbar">
      {/* 1. Buscador */}
      <div className="toolbar-search-wrapper">
        <SearchBar searchTerm={searchTerm} onSearchChange={onSearchChange} />
      </div>

      {/* 2. Selector de Filtro (Bautizados / Discipulado) */}
      <div className="toolbar-select-wrapper">
        <select
          className="form-select toolbar-select"
          value={filterBy}
          onChange={onFilterChange}
        >
          <option value="todos">Todos los registros</option>
          <option value="bautizados">Bautizados (Sí)</option>
          <option value="no_bautizados">No Bautizados</option>
          <option value="discipulado">En Discipulado</option>
        </select>
      </div>

      {/* 3. Selector de Ordenamiento (A-Z, Z-A, Recientes) */}
      <div className="toolbar-select-wrapper">
        <select
          className="form-select toolbar-select"
          value={sortBy}
          onChange={onSortChange}
        >
          <option value="az">Ordenar: A - Z</option>
          <option value="za">Ordenar: Z - A</option>
          <option value="recientes">Más recientes</option>
          <option value="edad-menor">Edad: Menor a Mayor (Más jóvenes)</option>
          <option value="edad-mayor">Edad: Mayor a Menor (Más adultos)</option>
        </select>
      </div>

      {/* 4. Botón de acción principal */}
      <div className="button-container">
        <button
          type="button"
          className="btn-primary btn-agregar"
          onClick={onAddClick}
        >
          <span className="icon">
            <Icon name="agregar-hermano" size={20} color="rgb(255, 255, 255)" />
          </span>{" "}
          Añadir Hermano
        </button>
      </div>
    </div>
  );
}

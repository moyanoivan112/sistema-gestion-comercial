// src/pages/Registry/components/RegistryToolbar.jsx
import "./RegistryToolbar.css";
import SearchBar from "./SearchBar";
import Icon from "../../../components/common/Icon";

export default function RegistryToolbar({
  searchTerm,
  onSearchChange,
  filterBy,
  onFilterChange,
  generoFilter = "todos",
  onGeneroChange = () => {},
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
          aria-label="Filtrar por estado espiritual"
        >
          <option value="todos">Todos los registros</option>
          <option value="bautizados">Bautizados (Sí)</option>
          <option value="no_bautizados">No Bautizados</option>
          <option value="discipulado">En Discipulado</option>
        </select>
      </div>

      {/* 3. Selector de Filtro por Sexo / Género */}
      <div className="toolbar-select-wrapper">
        <select
          className="form-select toolbar-select"
          value={generoFilter}
          onChange={onGeneroChange}
          aria-label="Filtrar por sexo o género"
        >
          <option value="todos">Sexo: Todos</option>
          <option value="Masculino">Masculino</option>
          <option value="Femenino">Femenino</option>
        </select>
      </div>

      {/* 4. Selector de Ordenamiento (A-Z, Z-A, Recientes, Edad) */}
      <div className="toolbar-select-wrapper">
        <select
          className="form-select toolbar-select"
          value={sortBy}
          onChange={onSortChange}
          aria-label="Ordenar registros"
        >
          <option value="az">Ordenar: A - Z</option>
          <option value="za">Ordenar: Z - A</option>
          <option value="recientes">Más recientes</option>
          <option value="edad-menor">Edad: Menor a Mayor (Más jóvenes)</option>
          <option value="edad-mayor">Edad: Mayor a Menor (Más adultos)</option>
        </select>
      </div>

      {/* 5. Botón de acción principal */}
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

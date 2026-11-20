import { useState, useEffect } from "react";
import api from "../../../services/api";

export function useRegistry() {
  const [members, setMembers] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [memberToEdit, setMemberToEdit] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 10;
  const [currentView, setCurrentView] = useState("active");

  // Estados para Filtro y Ordenamiento
  const [filterBy, setFilterBy] = useState("todos"); // "todos", "bautizados", "no_bautizados", "discipulado"
  const [sortBy, setSortBy] = useState("az"); // "az", "za", "recientes"

  const fetchMembers = async () => {
    try {
      const response = await api.get("/personas");
      setMembers(response.data);
    } catch (error) {
      console.error("Error al cargar los miembros:", error);
    }
  };

  useEffect(() => {
    fetchMembers();
  }, []);

  const handleOpenForm = (member = null) => {
    setMemberToEdit(member);
    setIsFormOpen(true);
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
    setMemberToEdit(null);
  };

  const handleSaveMember = async (memberData) => {
    try {
      if (memberData.id) {
        await api.put(`/personas/${memberData.id}`, memberData);
      } else {
        const dataToSend = {
          ...memberData,
          fecha_registro: new Date().toISOString().split("T")[0],
        };
        await api.post("/personas", dataToSend);
      }
      fetchMembers();
      handleCloseForm();
    } catch (error) {
      console.error("Error al guardar el miembro:", error);
      const mensajeError =
        error.response?.data?.mensaje || "Error al guardar el miembro";
      alert(mensajeError);
    }
  };

  const handleDeleteMember = async (id) => {
    if (
      !window.confirm("¿Estás seguro de que deseas dar de baja este registro?")
    )
      return;

    try {
      await api.delete(`/personas/${id}`);
      setMembers(members.filter((member) => member.id !== id));
    } catch (error) {
      console.error("Error al dar de baja el miembro:", error);
      alert("No se pudo procesar la baja.");
    }
  };

  const handleSearchChange = (term) => {
    setSearchTerm(term);
    setCurrentPage(1);
  };

  const handleFilterChange = (e) => {
    setFilterBy(e.target.value);
    setCurrentPage(1);
  };

  const handleSortChange = (e) => {
    setSortBy(e.target.value);
    setCurrentPage(1);
  };

  // 1. Filtrado combinado robusto (Buscador por texto + Selector de categoría flexible)
  const filteredMembers = members.filter((member) => {
    const fullName =
      `${member.nombre || ""} ${member.apellido || ""}`.toLowerCase();
    const matchesSearch = fullName.includes(searchTerm.toLowerCase());

    let matchesFilter = true;

    if (filterBy === "bautizados") {
      // Acepta true, 1, o el texto "Sí" (ignorando mayúsculas)
      const val = member.bautizado;
      matchesFilter =
        val === true ||
        val === 1 ||
        String(val).toLowerCase() === "sí" ||
        String(val).toLowerCase() === "si";
    } else if (filterBy === "no_bautizados") {
      // Acepta false, 0, o el texto "No" (o vacío/nulo)
      const val = member.bautizado;
      matchesFilter =
        val === false ||
        val === 0 ||
        String(val).toLowerCase() === "no" ||
        !val;
    } else if (filterBy === "discipulado") {
      // Acepta true, 1, o el texto "Sí" para discipulado
      const val = member.en_discipulado;
      matchesFilter =
        val === true ||
        val === 1 ||
        String(val).toLowerCase() === "sí" ||
        String(val).toLowerCase() === "si";
    }

    return matchesSearch && matchesFilter;
  });

  // 2. Ordenamiento dinámico basado en apellido, fecha de registro / ID o edad (fecha de nacimiento)
  const sortedMembers = [...filteredMembers].sort((a, b) => {
    // Creamos cadenas normalizadas: "apellido nombre"
    const apellidoNombreA =
      `${a.apellido || ""} ${a.nombre || ""}`.toLowerCase();
    const apellidoNombreB =
      `${b.apellido || ""} ${b.nombre || ""}`.toLowerCase();

    if (sortBy === "az") {
      return apellidoNombreA.localeCompare(apellidoNombreB); // De la A a la Z por apellido
    } else if (sortBy === "za") {
      return apellidoNombreB.localeCompare(apellidoNombreA); // De la Z a la A por apellido
    } else if (sortBy === "recientes") {
      // Priorizamos comparar por fecha de registro si ambos la tienen
      const fechaA = a.fecha_registro
        ? new Date(a.fecha_registro).getTime()
        : 0;
      const fechaB = b.fecha_registro
        ? new Date(b.fecha_registro).getTime()
        : 0;

      if (fechaB !== fechaA) {
        return fechaB - fechaA; // Del más nuevo al más antiguo por fecha
      }

      // Resguardo secundario por ID (el ID más alto es el más reciente creado)
      return (b.id || 0) - (a.id || 0);
    } else if (sortBy === "edad-menor") {
      // Del más joven al más mayor (Fecha de nacimiento más reciente a más antigua)
      const fechaNacA = a.fecha_nacimiento
        ? new Date(a.fecha_nacimiento).getTime()
        : 0;
      const fechaNacB = b.fecha_nacimiento
        ? new Date(b.fecha_nacimiento).getTime()
        : 0;
      return fechaNacB - fechaNacA;
    } else if (sortBy === "edad-mayor") {
      // Del más mayor al más joven (Fecha de nacimiento más antigua a más reciente)
      const fechaNacA = a.fecha_nacimiento
        ? new Date(a.fecha_nacimiento).getTime()
        : 0;
      const fechaNacB = b.fecha_nacimiento
        ? new Date(b.fecha_nacimiento).getTime()
        : 0;
      return fechaNacA - fechaNacB;
    }
    return 0;
  });

  // 3. Paginación sobre los miembros ya filtrados y ordenados
  const indexOfLastRow = currentPage * rowsPerPage;
  const indexOfFirstRow = indexOfLastRow - rowsPerPage;
  const currentRows = sortedMembers.slice(indexOfFirstRow, indexOfLastRow);
  const totalPages = Math.ceil(sortedMembers.length / rowsPerPage);

  return {
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
  };
}

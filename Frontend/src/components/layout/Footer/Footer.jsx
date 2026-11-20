import "./Footer.css"; // Buena práctica: Los estilos en su propio archivo

export default function Footer() {
  // Buena práctica: El año se calcula automáticamente
  const currentYear = new Date().getFullYear();

  return (
    <footer className="footer-container">
      <div className="footer-content">
        <p>
          &copy; {currentYear} Sistema de Gestión Congregacional. Todos los
          derechos reservados.
        </p>

        {/* Enlaces solicitados en tu Layout original */}
        <nav className="footer-links">
          <a href="mailto:soporte@tuiglesia.com">Contacto</a>
          <span>|</span>
          <a href="">Ayuda</a>
        </nav>
      </div>
    </footer>
  );
}

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./assets/css/bootstrap.min.css";
import "./assets/js/bootstrap.bundle.min.js";
import App from "./App.jsx";
import "./styles/global.css";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

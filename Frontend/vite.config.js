import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  resolve: {
    // ESTO ES LA MAGIA: Obliga a Vite a usar una sola copia de React
    dedupe: ["react", "react-dom"],
  },
});

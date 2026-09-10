import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  // Платформа живёт под путём на makemelook.ai: корень домена занят живой
  // страницей вейтлиста. Без base ассеты запрашивались бы с корня и ловили
  // бы вейтлист вместо файлов.
  base: "/console/",
  plugins: [react(), tailwindcss()],
  server: {
    port: 5175,
    proxy: {
      "/api": "http://localhost:8090",
      "/r": "http://localhost:8090",
    },
  },
});

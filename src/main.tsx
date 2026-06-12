// main.tsx
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import initDatabase from "../src/database/db";

initDatabase()
  .then(() => {
    ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    );
  })
  .catch((error) => {
    console.error("Erro ao inicializar banco:", error);
  });
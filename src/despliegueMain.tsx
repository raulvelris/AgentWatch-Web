import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import ControlSesion from "./componentes/ControlSesion";
import PanelDespliegue from "./componentes/PanelDespliegue";

// Entry standalone del Módulo 2 (Despliegue / CI-CD). Se monta como página
// aparte (/despliegue.html) para no tocar el shell del Módulo 1. Importa
// ./index.css para heredar la paleta del repo; Despliegue.css llega vía
// PanelDespliegue.

// El agente a desplegar ya no llega por prop: PanelDespliegue carga la lista
// real del backend (GET /agents/) y persiste la selección en localStorage.
// El puente con el wizard del M1 (agentwatch_draft_agent) vive allí y solo
// aplica si ese agente existe de verdad en el backend.

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <div className="page">
      <div style={{ maxWidth: "1100px", margin: "0 auto" }}>
        <ControlSesion />
        <PanelDespliegue />
      </div>
    </div>
  </StrictMode>
);

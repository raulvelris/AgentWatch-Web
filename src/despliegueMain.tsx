import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import PanelDespliegue from "./componentes/PanelDespliegue";

// Entry standalone del Módulo 2 (Despliegue / CI-CD). Se monta como página
// aparte (/despliegue.html) para no tocar el shell del Módulo 1. Importa
// ./index.css para heredar la paleta del repo; Despliegue.css llega vía
// PanelDespliegue.
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <div className="page">
      <div style={{ maxWidth: "1100px", margin: "0 auto" }}>
        <PanelDespliegue defaultAgentId={crypto.randomUUID()} />
      </div>
    </div>
  </StrictMode>
);

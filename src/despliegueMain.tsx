import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import PanelDespliegue from "./componentes/PanelDespliegue";

// Entry standalone del Módulo 2 (Despliegue / CI-CD). Se monta como página
// aparte (/despliegue.html) para no tocar el shell del Módulo 1. Importa
// ./index.css para heredar la paleta del repo; Despliegue.css llega vía
// PanelDespliegue.

// TODO (OPCIÓN B — ELIMINAR cuando se coordine con Gerson/M1):
// Puente temporal para la demo: tomamos el id del agente en construcción desde
// localStorage (clave que escribe el WizardAgente del M1). Lo correcto sería que
// el Wizard navegue a /despliegue.html?agentId={id} y aquí leamos ese query param
// con new URLSearchParams(window.location.search), borrando esta lectura.
// Nota: el id guardado es el UUID generado en el cliente (App.tsx), no
// necesariamente el id del backend; ver pendiente en el resumen de la tarea.
function leerIdAgenteGuardado(): string {
  try {
    const bruto = localStorage.getItem("agentwatch_draft_agent");
    if (bruto) {
      const id = (JSON.parse(bruto) as { id?: unknown }).id;
      if (typeof id === "string" && id.trim()) {
        return id;
      }
    }
  } catch {
    // localStorage bloqueado o JSON corrupto: caemos al UUID aleatorio.
  }
  return crypto.randomUUID();
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <div className="page">
      <div style={{ maxWidth: "1100px", margin: "0 auto" }}>
        <PanelDespliegue defaultAgentId={leerIdAgenteGuardado()} />
      </div>
    </div>
  </StrictMode>
);

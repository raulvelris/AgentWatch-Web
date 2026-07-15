import { useState } from "react";

import BarraLateral from "./componentes/BarraLateral";
import WizardAgente from "./componentes/WizardAgente";
import PanelPlantillas from "./componentes/PanelPlantillas";
import PanelPoliticas from "./componentes/PanelPoliticas";
import PanelAuditoria from "./componentes/PanelAuditoria";
import PanelMetricasNegocio from "./componentes/PanelMetricasNegocio";
import ReplayEjecucion from "./componentes/ReplayEjecucion";
import VistaPreviaAgente from "./componentes/VistaPreviaAgente";
import ControlSesion from "./componentes/ControlSesion";

import type { Agente } from "./types/Agente";

import "./estilos/App.css";

type Plantilla = {
  id: string;
  nombre: string;
  descripcion: string;
  caso_uso: string;
  tiempo_estimado: string;
  categoria: string;
  favorito: boolean;
};

function App() {
  const [activeMenu, setActiveMenu] = useState("Crear agente");

  const [mostrarPreview, setMostrarPreview] = useState(false);

  // El borrador guardado se lee en el inicializador lazy del estado (antes iba
  // en un useEffect con setState síncrono, que react-hooks/set-state-in-effect
  // marca como error y provocaba un doble render al montar).
  const [agentData, setAgentData] = useState<Agente>(() => {
    try {
      const draft = localStorage.getItem("agentwatch_draft_agent");
      if (draft) {
        return JSON.parse(draft) as Agente;
      }
    } catch {
      // Borrador corrupto: se arranca con el agente vacío.
    }
    return {
      id: crypto.randomUUID(),
      nombre: "",
      tipo: "Revisor de documentos",
      proposito: "",
      fuente: "Documentos PDF",
      descripcionFuente: "",
      regla: "",
      supervision: "Medio",
      estado: "DRAFT",
    };
  });

  const usarPlantilla = (plantilla: Plantilla) => {
    const nuevoAgente: Agente = {
      id: crypto.randomUUID(),
      nombre: plantilla.nombre,
      tipo: plantilla.nombre,
      proposito: plantilla.descripcion,
      fuente: "Documentos PDF",
      descripcionFuente: plantilla.caso_uso,
      regla: "No divulgar información confidencial.",
      supervision: "Medio",
      estado: "DRAFT",
    };

    setAgentData(nuevoAgente);

    localStorage.setItem(
      "agentwatch_draft_agent",
      JSON.stringify(nuevoAgente)
    );

    setActiveMenu("Crear agente");
  };

  return (
    <div className="page">
      <div className="shell">
        <BarraLateral activeMenu={activeMenu} setActiveMenu={setActiveMenu} />

        <main className="content">
          <ControlSesion />
          <div className="topbar">
            <div>
              <div className="eyebrow">AgentWatch Studio</div>

              <h1>{activeMenu}</h1>

              <p>
                Configura agentes empresariales, define su propósito y aplica
                reglas de gobernanza antes del despliegue.
              </p>
            </div>

            <button
              className="ghost-button"
              onClick={() => setMostrarPreview(true)}
            >
              Vista previa
            </button>
          </div>

          {activeMenu === "Crear agente" && (
            <WizardAgente agentData={agentData} setAgentData={setAgentData} />
          )}

          {activeMenu === "Plantillas" && (
            <PanelPlantillas
              setActiveMenu={setActiveMenu}
              usarPlantilla={usarPlantilla}
            />
          )}

          {activeMenu === "Políticas" && <PanelPoliticas />}

          {activeMenu === "Auditoría estática" && <PanelAuditoria />}

          {activeMenu === "Métricas de negocio" && <PanelMetricasNegocio />}

          {activeMenu === "Replay de ejecución" && <ReplayEjecucion />}
        </main>
      </div>

      {mostrarPreview && (
        <VistaPreviaAgente
          agente={agentData}
          onClose={() => setMostrarPreview(false)}
        />
      )}
    </div>
  );
}

export default App;
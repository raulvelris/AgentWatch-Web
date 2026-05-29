import { useEffect, useState } from "react";
import BarraLateral from "./componentes/BarraLateral";
import WizardAgente from "./componentes/WizardAgente";
import PanelPlantillas from "./componentes/PanelPlantillas";
import PanelPoliticas from "./componentes/PanelPoliticas";
import PanelAuditoria from "./componentes/PanelAuditoria";
import VistaPreviaAgente from "./componentes/VistaPreviaAgente";
import type { Agente } from "./types/Agente";
import "./estilos/App.css";

function App() {
  const [activeMenu, setActiveMenu] = useState("Crear agente");

  const [mostrarPreview, setMostrarPreview] = useState(false);

  const [agentData, setAgentData] = useState<Agente>({
    id: crypto.randomUUID(),
    nombre: "",
    tipo: "Revisor de documentos",
    proposito: "",
    fuente: "Documentos PDF",
    descripcionFuente: "",
    regla: "",
    supervision: "Medio",
    estado: "DRAFT",
  });

  useEffect(() => {
    const draft = localStorage.getItem("agentwatch_draft_agent");

    if (draft) {
      setAgentData(JSON.parse(draft));
    }
  }, []);

  return (
    <div className="page">
      <div className="shell">
        <BarraLateral
          activeMenu={activeMenu}
          setActiveMenu={setActiveMenu}
        />

        <main className="content">
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
            <WizardAgente
              agentData={agentData}
              setAgentData={setAgentData}
            />
          )}

          {activeMenu === "Plantillas" && (
            <PanelPlantillas setActiveMenu={setActiveMenu} />
          )}

          {activeMenu === "Políticas" && <PanelPoliticas />}

          {activeMenu === "Auditoría estática" && <PanelAuditoria />}
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
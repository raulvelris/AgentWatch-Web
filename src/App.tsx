import { useState } from "react";
import BarraLateral from "./componentes/BarraLateral";
import WizardAgente from "./componentes/WizardAgente";
import PanelPlantillas from "./componentes/PanelPlantillas";
import PanelPoliticas from "./componentes/PanelPoliticas";
import PanelAuditoria from "./componentes/PanelAuditoria";
import "./estilos/App.css";

function App() {
  const [activeMenu, setActiveMenu] = useState("Crear agente");

  return (
    <div className="page">
      <div className="shell">
        <BarraLateral activeMenu={activeMenu} setActiveMenu={setActiveMenu} />

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
              onClick={() => alert("Vista previa del agente en desarrollo")}
            >
              Vista previa
            </button>
          </div>

          {activeMenu === "Crear agente" && <WizardAgente />}

          {activeMenu === "Plantillas" && (
            <PanelPlantillas setActiveMenu={setActiveMenu} />
          )}

          {activeMenu === "Políticas" && <PanelPoliticas />}

          {activeMenu === "Auditoría estática" && <PanelAuditoria />}
        </main>
      </div>
    </div>
  );
}

export default App;
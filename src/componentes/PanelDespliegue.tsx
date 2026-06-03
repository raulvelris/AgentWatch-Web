import { useState } from "react";
import RegistroDespliegue from "./RegistroDespliegue";
import HistorialVersiones from "./HistorialVersiones";
import { MODO_MOCK } from "../servicios/despliegueServicio";
import "../estilos/Despliegue.css";

type Props = {
  // Id del agente en construcción (App). Sirve de valor por defecto editable.
  defaultAgentId: string;
};

function PanelDespliegue({ defaultAgentId }: Props) {
  // `borrador` es lo que se escribe; `agentId` es el id confirmado (Enter/blur).
  // Confirmar en vez de actualizar por tecla evita recargar el historial en cada
  // pulsación y permite remontar los paneles con key para un estado limpio.
  const [borrador, setBorrador] = useState(defaultAgentId);
  const [agentId, setAgentId] = useState(defaultAgentId);

  const aplicarAgente = () => {
    const limpio = borrador.trim();
    if (limpio && limpio !== agentId) {
      setAgentId(limpio);
    }
  };

  return (
    <div className="despliegue-wrap">
      <div className="section-card">
        <h2>Despliegue y CI/CD</h2>

        <p>
          Despliega el agente, observa el log del pipeline en vivo y gestiona
          sus versiones (rollback).
        </p>

        {MODO_MOCK && (
          <div className="preview-box">
            <strong>Modo demo activo</strong>
            <p>
              El backend de despliegue aún no está conectado. El log y las
              versiones que ves son simulados. Cambia <code>MODO_MOCK</code> a{" "}
              <code>false</code> en <code>despliegueServicio.ts</code> cuando el
              backend esté disponible.
            </p>
          </div>
        )}

        <label>ID del agente</label>
        <input
          type="text"
          value={borrador}
          onChange={(e) => setBorrador(e.target.value)}
          onBlur={aplicarAgente}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              aplicarAgente();
            }
          }}
          placeholder="UUID del agente a desplegar"
        />
        <p style={{ marginTop: "8px", color: "#94a3b8", fontSize: "13px" }}>
          Pulsa Enter o sal del campo para cargar ese agente.
        </p>
      </div>

      {/* key={agentId}: al confirmar otro agente, los paneles se remontan con
          estado limpio (sin versiones ni despliegues stale del anterior). */}
      <RegistroDespliegue key={agentId} agentId={agentId} />

      <HistorialVersiones key={agentId} agentId={agentId} />
    </div>
  );
}

export default PanelDespliegue;

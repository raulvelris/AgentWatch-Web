import { useEffect, useState } from "react";
import RegistroDespliegue from "./RegistroDespliegue";
import HistorialVersiones from "./HistorialVersiones";
import PanelAmbientes from "./PanelAmbientes";
import { listarAgentes, MODO_MOCK } from "../servicios/despliegueServicio";
import type { AgenteResumen } from "../types/Despliegue";
import "../estilos/Despliegue.css";

// Clave estable donde la página guarda el agente elegido. Antes el id venía
// de un UUID aleatorio por recarga (agentwatch_draft_agent o crypto.randomUUID)
// y el historial "desaparecía" tras un Ctrl+R: el deploy apuntaba a un agente
// que no existía en el backend.
const CLAVE_AGENTE = "agentwatch_agente_despliegue";

// Puente con el wizard del M1: si el usuario acaba de crear un agente, su id
// queda en agentwatch_draft_agent y se preselecciona, pero SOLO si existe de
// verdad en la lista del backend.
function leerIdBorradorM1(): string | null {
  try {
    const bruto = localStorage.getItem("agentwatch_draft_agent");
    if (!bruto) return null;
    const id = (JSON.parse(bruto) as { id?: unknown }).id;
    return typeof id === "string" && id.trim() ? id : null;
  } catch {
    return null;
  }
}

function resolverPreferido(agentes: AgenteResumen[]): string {
  const ids = new Set(agentes.map((a) => a.id));
  const guardado = localStorage.getItem(CLAVE_AGENTE);
  if (guardado && ids.has(guardado)) return guardado;
  const borrador = leerIdBorradorM1();
  if (borrador && ids.has(borrador)) return borrador;
  return agentes[0]?.id ?? "";
}

function PanelDespliegue() {
  const [agentes, setAgentes] = useState<AgenteResumen[]>([]);
  const [agentId, setAgentId] = useState("");
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reintento, setReintento] = useState(0);
  // Cada despliegue terminado (éxito o fallo) incrementa el contador y
  // remonta el historial: la versión nueva aparece sin recargar la página.
  const [refrescoVersiones, setRefrescoVersiones] = useState(0);

  // Carga de la lista real de agentes. El setState va en los callbacks
  // .then/.catch, no en el cuerpo del efecto (react-hooks/set-state-in-effect).
  useEffect(() => {
    let ignorar = false;
    listarAgentes()
      .then((lista) => {
        if (ignorar) return;
        setAgentes(lista);
        setError(null);
        const preferido = resolverPreferido(lista);
        setAgentId(preferido);
        if (preferido) {
          localStorage.setItem(CLAVE_AGENTE, preferido);
        }
      })
      .catch((e: unknown) => {
        if (ignorar) return;
        setError(
          e instanceof Error ? e.message : "No se pudo cargar la lista de agentes."
        );
      })
      .finally(() => {
        if (!ignorar) setCargando(false);
      });
    return () => {
      ignorar = true;
    };
  }, [reintento]);

  const reintentar = () => {
    setCargando(true);
    setError(null);
    setReintento((v) => v + 1);
  };

  const elegirAgente = (id: string) => {
    setAgentId(id);
    localStorage.setItem(CLAVE_AGENTE, id);
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

        <label>Agente</label>
        {cargando ? (
          <p>Cargando agentes...</p>
        ) : error ? (
          <div className="error-box">
            <strong>No se pudo cargar la lista de agentes.</strong>
            <p style={{ margin: "8px 0 0" }}>{error}</p>
            <div style={{ marginTop: "12px" }}>
              <button className="secondary" onClick={reintentar}>
                Reintentar
              </button>
            </div>
          </div>
        ) : agentes.length === 0 ? (
          <div className="preview-box">
            <p>
              No hay agentes registrados en el backend. Crea uno en el wizard
              (Módulo 1) y vuelve a esta página.
            </p>
          </div>
        ) : (
          <>
            <select
              value={agentId}
              onChange={(e) => elegirAgente(e.target.value)}
            >
              {agentes.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.nombre} ({a.estado})
                </option>
              ))}
            </select>
            <p style={{ marginTop: "8px", color: "#94a3b8", fontSize: "13px" }}>
              La selección se guarda en este navegador: el historial sigue ahí
              después de recargar la página.
            </p>
          </>
        )}
      </div>

      {/* key={agentId}: al elegir otro agente, los paneles se remontan con
          estado limpio (sin versiones ni despliegues stale del anterior). */}
      {/* Las keys llevan prefijo porque son HERMANOS: dos hijos con la misma
          key (antes los tres usaban key={agentId}) hacen que React duplique u
          omita nodos al cambiar de agente ("Encountered two children with the
          same key", reproducido en el E2E). */}
      {agentId && (
        <>
          <RegistroDespliegue
            key={`reg:${agentId}`}
            agentId={agentId}
            onDespliegueTerminado={() => setRefrescoVersiones((v) => v + 1)}
          />

          {/* La key incluye el contador: al terminar un deploy el historial se
              remonta y refetchea (un deploy fallido también deja una versión
              'fallida' que vale mostrar). PanelAmbientes queda afuera para no
              perder el estado de sus formularios. */}
          <HistorialVersiones
            key={`hist:${agentId}:${refrescoVersiones}`}
            agentId={agentId}
          />

          <PanelAmbientes key={`amb:${agentId}`} agentId={agentId} />
        </>
      )}
    </div>
  );
}

export default PanelDespliegue;

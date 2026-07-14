import { useCallback, useEffect, useState } from "react";
import { obtenerSesion } from "../servicios/authServicio";
import {
  ejecutarRollback,
  MODO_MOCK,
  obtenerVersiones,
} from "../servicios/despliegueServicio";
import type { Version } from "../types/Version";

type Props = {
  agentId: string;
};

function etiquetaEstado(estado: Version["estado"]) {
  if (estado === "activa") {
    return "pill pill-ok";
  }
  if (estado === "rollback") {
    return "pill pill-info";
  }
  if (estado === "fallida") {
    return "pill pill-bad";
  }
  return "pill";
}

function HistorialVersiones({ agentId }: Props) {
  const [versiones, setVersiones] = useState<Version[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [confirmando, setConfirmando] = useState<Version | null>(null);
  const [rollbackId, setRollbackId] = useState<string | null>(null);

  // Recarga usada por "Reintentar" y tras un rollback (manejadores de evento:
  // aquí setState es válido).
  const recargar = useCallback(async () => {
    try {
      const datos = await obtenerVersiones(agentId);
      setVersiones(datos);
      setError(null);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "No se pudieron cargar las versiones."
      );
    } finally {
      setCargando(false);
    }
  }, [agentId]);

  // Carga inicial / al cambiar de agente. El setState va dentro de los callbacks
  // .then/.catch (asíncronos), no en el cuerpo síncrono del efecto, para cumplir
  // react-hooks/set-state-in-effect.
  useEffect(() => {
    let ignorar = false;
    obtenerVersiones(agentId)
      .then((datos) => {
        if (ignorar) return;
        setVersiones(datos);
        setError(null);
      })
      .catch((e: unknown) => {
        if (ignorar) return;
        setError(
          e instanceof Error
            ? e.message
            : "No se pudieron cargar las versiones."
        );
      })
      .finally(() => {
        if (!ignorar) setCargando(false);
      });
    return () => {
      ignorar = true;
    };
  }, [agentId]);

  const reintentar = () => {
    setCargando(true);
    setError(null);
    recargar();
  };

  const confirmarRollback = async (version: Version) => {
    // Corte en el cliente: el rollback exige token ADMIN. Sin sesión se avisa
    // acá en vez de disparar un request que va a dar 401.
    if (!MODO_MOCK && !obtenerSesion()) {
      setConfirmando(null);
      setError(
        "Sin sesión activa: entra como admin_a (ADMIN) en la barra superior para hacer rollback."
      );
      return;
    }
    setRollbackId(version.id);
    setError(null);
    try {
      await ejecutarRollback(agentId, version.id);
      setConfirmando(null);
      await recargar();
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "No se pudo ejecutar el rollback."
      );
    } finally {
      setRollbackId(null);
    }
  };

  return (
    <div className="section-card">
      <h2>Historial de versiones</h2>

      <p>
        Versiones desplegadas del agente. Puedes revertir (rollback) a una
        versión anterior.
      </p>

      {cargando ? (
        <p>Cargando versiones...</p>
      ) : error && versiones.length === 0 ? (
        <div className="error-box">
          <strong>No se pudieron cargar las versiones.</strong>
          <p style={{ margin: "8px 0 0" }}>{error}</p>
          <div style={{ marginTop: "12px" }}>
            <button className="secondary" onClick={reintentar}>
              Reintentar
            </button>
          </div>
        </div>
      ) : versiones.length === 0 ? (
        <div className="preview-box">
          <p>No hay versiones registradas para este agente.</p>
        </div>
      ) : (
        <>
          {error && (
            <div className="error-box" style={{ marginBottom: "12px" }}>
              <p style={{ margin: 0 }}>{error}</p>
            </div>
          )}

          <div className="timeline">
            {versiones.map((version) => (
              <div
                key={version.id}
                className={`timeline-item ${version.estado}`}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: "12px",
                  }}
                >
                  <strong>Versión {version.numero}</strong>
                  <span className={etiquetaEstado(version.estado)}>
                    {version.estado}
                  </span>
                </div>

                <p style={{ margin: "8px 0 4px", color: "#cbd5e1" }}>
                  <strong>Fecha:</strong> {version.fecha} &nbsp;·&nbsp;
                  <strong>Autor:</strong> {version.autor}
                </p>

                <p className="hash" title={version.hash_sha256}>
                  sha256: {version.hash_sha256}
                </p>

                <div style={{ marginTop: "12px" }}>
                  <button
                    className="secondary"
                    onClick={() => setConfirmando(version)}
                    disabled={
                      version.estado === "activa" || rollbackId !== null
                    }
                  >
                    {version.estado === "activa"
                      ? "Versión activa"
                      : "Rollback a esta versión"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {confirmando && (
        <div className="modal-overlay">
          <div className="modal-card">
            <h2>Confirmar rollback</h2>
            <p>
              Vas a revertir el agente a la <strong>versión{" "}
              {confirmando.numero}</strong> ({confirmando.fecha}). La versión
              activa actual quedará marcada como rollback.
            </p>

            <div className="actions">
              <button
                className="secondary"
                onClick={() => setConfirmando(null)}
                disabled={rollbackId !== null}
              >
                Cancelar
              </button>
              <button
                className="primary"
                onClick={() => confirmarRollback(confirmando)}
                disabled={rollbackId !== null}
              >
                {rollbackId !== null ? "Ejecutando..." : "Confirmar rollback"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default HistorialVersiones;

import { useEffect, useRef, useState } from "react";
import { desplegarAgente } from "../servicios/despliegueServicio";
import type { EventoDespliegue, FaseDespliegue } from "../types/Despliegue";

type Props = {
  agentId: string;
};

type LineaLog = {
  fase: FaseDespliegue;
  mensaje: string;
  hora: string;
};

function RegistroDespliegue({ agentId }: Props) {
  const [lineas, setLineas] = useState<LineaLog[]>([]);
  const [desplegando, setDesplegando] = useState(false);
  const [resultado, setResultado] = useState<EventoDespliegue | null>(null);
  const [error, setError] = useState<string | null>(null);

  const cancelarRef = useRef<(() => void) | null>(null);
  const finLogRef = useRef<HTMLDivElement | null>(null);

  // Si el componente se desmonta a mitad del stream, lo cancelamos
  // (evita doble-stream con StrictMode y fugas de conexión).
  useEffect(() => {
    return () => {
      if (cancelarRef.current) {
        cancelarRef.current();
      }
    };
  }, []);

  // Autoscroll del log a medida que llegan líneas.
  useEffect(() => {
    finLogRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [lineas]);

  const iniciarDespliegue = () => {
    if (!agentId.trim()) {
      setError("Falta el ID del agente para desplegar.");
      return;
    }

    setLineas([]);
    setResultado(null);
    setError(null);
    setDesplegando(true);

    cancelarRef.current = desplegarAgente(agentId, {
      onEvento: (evento) => {
        setLineas((previas) => [
          ...previas,
          {
            fase: evento.fase,
            mensaje: evento.mensaje,
            hora: new Date().toLocaleTimeString(),
          },
        ]);

        if (evento.fase === "done") {
          setResultado(evento);
          setDesplegando(false);
          // RF05: el pipeline puede terminar (fase "done") pero con fallo.
          if (evento.estado === "failed") {
            setError(evento.mensaje || "El despliegue terminó con fallo.");
          }
        }

        if (evento.fase === "error") {
          setError(evento.mensaje);
          setDesplegando(false);
        }
      },
      onError: (mensaje) => {
        setError(mensaje);
        setDesplegando(false);
      },
      onFin: () => {
        setDesplegando(false);
      },
    });
  };

  return (
    <div className="section-card">
      <h2>Registro de despliegue</h2>

      <p>
        Dispara el despliegue del agente y observa el progreso en vivo
        (build → push → deploy → healthcheck).
      </p>

      <div className="actions" style={{ justifyContent: "flex-start" }}>
        <button
          className="primary"
          onClick={iniciarDespliegue}
          disabled={desplegando}
        >
          {desplegando ? "Desplegando..." : "Desplegar agente"}
        </button>
      </div>

      {(desplegando || lineas.length > 0) && (
        <div className="log-box">
          {lineas.length === 0 ? (
            <div className="log-line">
              <span className="log-msg">Conectando con el pipeline...</span>
            </div>
          ) : (
            lineas.map((linea, indice) => (
              <div
                key={indice}
                className={
                  linea.fase === "error" ? "log-line fase-error" : "log-line"
                }
              >
                <span className="log-hora">{linea.hora}</span>
                <span className="log-fase">{linea.fase}</span>
                <span className="log-msg">{linea.mensaje}</span>
              </div>
            ))
          )}
          <div ref={finLogRef} />
        </div>
      )}

      {resultado && resultado.estado === "success" && (
        <div className="preview-box">
          <strong>Despliegue finalizado</strong>

          <p>
            <strong>URL del agente:</strong>{" "}
            {resultado.url ? (
              <a href={resultado.url} target="_blank" rel="noreferrer">
                {resultado.url}
              </a>
            ) : (
              "No disponible"
            )}
          </p>

          <p>
            <strong>Estado de salud:</strong>{" "}
            <span
              className={
                resultado.salud === "healthy" ? "pill pill-ok" : "pill pill-bad"
              }
            >
              {resultado.salud === "healthy" ? "healthy" : "unhealthy"}
            </span>
          </p>
        </div>
      )}

      {error && (
        <div className="error-box">
          <strong>No se pudo completar el despliegue.</strong>
          <p style={{ margin: "8px 0 0" }}>{error}</p>
          <div style={{ marginTop: "12px" }}>
            <button
              className="secondary"
              onClick={iniciarDespliegue}
              disabled={desplegando}
            >
              Reintentar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default RegistroDespliegue;

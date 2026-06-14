import { useCallback, useEffect, useState } from "react";
import {
  listarAmbientes,
  listarNotificaciones,
  listarPromociones,
  solicitarPromocion,
} from "../servicios/ambientesServicio";
import type {
  Ambiente,
  EstadoPromocion,
  Notificacion,
  Promocion,
} from "../types/Ambiente";
import "../estilos/Ambientes.css";

type Props = {
  agentId: string;
};

const AMBIENTES_FALLBACK: Ambiente[] = ["dev", "staging", "prod"];

// El backend devuelve las promociones ordenadas por id: la última "aprobada"
// define el ambiente actual del agente. Sin promociones aprobadas → "dev".
function ambienteActual(promos: Promocion[]): string {
  for (let i = promos.length - 1; i >= 0; i--) {
    if (promos[i].estado === "aprobada") {
      return promos[i].ambiente_destino;
    }
  }
  return "dev";
}

function pillEstado(estado: EstadoPromocion): string {
  if (estado === "aprobada") return "pill pill-ok";
  if (estado === "expirada") return "pill pill-bad";
  return "pill pill-warn"; // pendiente
}

function formatearFecha(iso: string): string {
  const fecha = new Date(iso);
  return Number.isNaN(fecha.getTime()) ? iso : fecha.toLocaleString();
}

function PanelAmbientes({ agentId }: Props) {
  const [ambientes, setAmbientes] = useState<Ambiente[]>([]);
  const [promociones, setPromociones] = useState<Promocion[]>([]);
  const [notificaciones, setNotificaciones] = useState<Notificacion[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Formulario de promotion.
  const [origen, setOrigen] = useState("dev");
  const [destino, setDestino] = useState("staging");
  const [solicitante, setSolicitante] = useState("demo@agentwatch.dev");
  const [rol, setRol] = useState("DEVELOPER");
  const [enviando, setEnviando] = useState(false);
  const [resultado, setResultado] = useState<{
    tipo: "ok" | "err";
    texto: string;
  } | null>(null);

  const [outboxAbierto, setOutboxAbierto] = useState(false);

  // Carga sin setState (la usan el efecto y "Reintentar"); así el setState vive
  // siempre en callbacks async y cumple react-hooks/set-state-in-effect.
  const cargarDatos = useCallback(
    () =>
      Promise.all([
        listarAmbientes(),
        listarPromociones(agentId),
        listarNotificaciones(agentId),
      ]),
    [agentId]
  );

  useEffect(() => {
    let ignorar = false;
    cargarDatos()
      .then(([ambs, promos, notis]) => {
        if (ignorar) return;
        setAmbientes(ambs);
        setPromociones(promos);
        setNotificaciones(notis);
        setError(null);
      })
      .catch((e: unknown) => {
        if (ignorar) return;
        setError(
          e instanceof Error ? e.message : "No se pudo cargar la sección RF06."
        );
      })
      .finally(() => {
        if (!ignorar) setCargando(false);
      });
    return () => {
      ignorar = true;
    };
  }, [cargarDatos]);

  // Recarga tras una promotion (manejador de evento: setState síncrono permitido).
  const recargar = useCallback(async () => {
    try {
      const [promos, notis] = await Promise.all([
        listarPromociones(agentId),
        listarNotificaciones(agentId),
      ]);
      setPromociones(promos);
      setNotificaciones(notis);
      setError(null);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "No se pudieron recargar los datos."
      );
    }
  }, [agentId]);

  const reintentar = () => {
    setCargando(true);
    setError(null);
    cargarDatos()
      .then(([ambs, promos, notis]) => {
        setAmbientes(ambs);
        setPromociones(promos);
        setNotificaciones(notis);
        setError(null);
      })
      .catch((e: unknown) => {
        setError(
          e instanceof Error ? e.message : "No se pudo cargar la sección RF06."
        );
      })
      .finally(() => setCargando(false));
  };

  const enviar = async () => {
    if (!agentId.trim()) {
      setResultado({ tipo: "err", texto: "Falta el ID del agente." });
      return;
    }
    setEnviando(true);
    setResultado(null);
    try {
      const promocion = await solicitarPromocion(agentId, {
        ambiente_origen: origen,
        ambiente_destino: destino,
        solicitante: solicitante.trim() || "demo@agentwatch.dev",
        rol_solicitante: rol,
      });
      setResultado({
        tipo: "ok",
        texto:
          promocion.estado === "aprobada"
            ? `Promoción aprobada (${promocion.ambiente_origen} → ${promocion.ambiente_destino}).`
            : `Promoción ${promocion.estado} (${promocion.ambiente_origen} → ${promocion.ambiente_destino}). Espera aprobación de un ADMIN.`,
      });
      await recargar();
    } catch (e) {
      setResultado({
        tipo: "err",
        texto:
          e instanceof Error ? e.message : "No se pudo solicitar la promoción.",
      });
    } finally {
      setEnviando(false);
    }
  };

  const ambs = ambientes.length > 0 ? ambientes : AMBIENTES_FALLBACK;
  const actual = ambienteActual(promociones);

  return (
    <div className="section-card">
      <h2>Ambientes y Promotion</h2>
      <p>
        Ambientes del agente (dev → staging → prod) y solicitudes de promoción
        con aprobación. La promoción a <strong>prod</strong> requiere rol ADMIN.
      </p>

      {/* Tarjetas de ambiente: la activa = última promoción aprobada. */}
      <div className="ambientes-grid">
        {ambs.map((amb) => (
          <div
            key={amb}
            className={amb === actual ? "ambiente-card activa" : "ambiente-card"}
          >
            <span className="ambiente-nombre">{amb}</span>
            {amb === actual ? (
              <span className="pill pill-ok">activo</span>
            ) : (
              <span className="pill">inactivo</span>
            )}
          </div>
        ))}
      </div>

      {/* Formulario de promotion. El select de rol es el stub sin JWT que
          permite demostrar ambos flujos (DEVELOPER pendiente / ADMIN aprobada). */}
      <div className="promo-form">
        <div>
          <label htmlFor="amb-origen">Ambiente origen</label>
          <select
            id="amb-origen"
            value={origen}
            onChange={(e) => setOrigen(e.target.value)}
          >
            <option value="dev">dev</option>
            <option value="staging">staging</option>
          </select>
        </div>

        <div>
          <label htmlFor="amb-destino">Ambiente destino</label>
          <select
            id="amb-destino"
            value={destino}
            onChange={(e) => setDestino(e.target.value)}
          >
            <option value="staging">staging</option>
            <option value="prod">prod</option>
          </select>
        </div>

        <div>
          <label htmlFor="amb-solicitante">Solicitante</label>
          <input
            id="amb-solicitante"
            type="text"
            value={solicitante}
            onChange={(e) => setSolicitante(e.target.value)}
            placeholder="correo@dominio"
          />
        </div>

        <div>
          <label htmlFor="amb-rol">Rol (stub sin JWT)</label>
          <select
            id="amb-rol"
            value={rol}
            onChange={(e) => setRol(e.target.value)}
          >
            <option value="DEVELOPER">DEVELOPER</option>
            <option value="ADMIN">ADMIN</option>
          </select>
        </div>
      </div>

      <div className="actions" style={{ justifyContent: "flex-start" }}>
        <button className="primary" onClick={enviar} disabled={enviando}>
          {enviando ? "Solicitando..." : "Solicitar Promotion"}
        </button>
      </div>

      {resultado && (
        <div className={resultado.tipo === "ok" ? "preview-box" : "error-box"}>
          <p style={{ margin: 0 }}>{resultado.texto}</p>
        </div>
      )}

      {/* Historial de promociones. */}
      <h3 className="bloque-titulo">Historial de promociones</h3>
      {cargando ? (
        <p>Cargando ambientes y promociones...</p>
      ) : error && promociones.length === 0 ? (
        <div className="error-box">
          <strong>No se pudo cargar la información de RF06.</strong>
          <p style={{ margin: "8px 0 0" }}>{error}</p>
          <div style={{ marginTop: "12px" }}>
            <button className="secondary" onClick={reintentar}>
              Reintentar
            </button>
          </div>
        </div>
      ) : promociones.length === 0 ? (
        <div className="preview-box">
          <p style={{ margin: 0 }}>
            No hay solicitudes de promoción para este agente.
          </p>
        </div>
      ) : (
        <table className="tabla-promos">
          <thead>
            <tr>
              <th>Ruta</th>
              <th>Solicitante</th>
              <th>Aprobado por</th>
              <th>Estado</th>
              <th>Fecha</th>
            </tr>
          </thead>
          <tbody>
            {promociones.map((p, indice) => (
              <tr key={indice}>
                <td>
                  {p.ambiente_origen} → {p.ambiente_destino}
                </td>
                <td>{p.solicitante}</td>
                <td>{p.aprobado_por ?? "—"}</td>
                <td>
                  <span className={pillEstado(p.estado)}>{p.estado}</span>
                </td>
                <td>{formatearFecha(p.fecha)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* Outbox de notificaciones (colapsable). */}
      <button
        className="secondary outbox-toggle"
        onClick={() => setOutboxAbierto((v) => !v)}
      >
        {outboxAbierto ? "▾" : "▸"} Notificaciones encoladas — pendientes de
        entrega por M6 ({notificaciones.length})
      </button>

      {outboxAbierto &&
        (notificaciones.length === 0 ? (
          <div className="preview-box">
            <p style={{ margin: 0 }}>No hay notificaciones encoladas.</p>
          </div>
        ) : (
          <table className="tabla-promos">
            <thead>
              <tr>
                <th>Tipo</th>
                <th>Mensaje</th>
                <th>Fecha</th>
              </tr>
            </thead>
            <tbody>
              {notificaciones.map((n) => (
                <tr key={n.id}>
                  <td>
                    <span className="pill pill-info">{n.tipo}</span>
                  </td>
                  <td>{n.mensaje}</td>
                  <td>{formatearFecha(n.fecha)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ))}

      {/* Stubs honestos: documentados en la arquitectura, sin backend aún. */}
      <div className="stub-box">
        <span className="stub-label">⚠ STUB</span>
        <p style={{ margin: 0 }}>
          🔐 Variables de entorno cifradas vía Azure Key Vault — integración
          pendiente (HU-06 CA-02, requiere suscripción Azure). El backend aún no
          expone esta API.
        </p>
      </div>

      <div className="stub-box">
        <span className="stub-label">⚠ STUB</span>
        <p style={{ margin: 0 }}>
          ☸ Ambientes mapeados a Kubernetes namespaces — pendiente de
          infraestructura real (HU-06). Hoy los ambientes son etiquetas lógicas
          en la base de datos, no namespaces K8s.
        </p>
      </div>
    </div>
  );
}

export default PanelAmbientes;

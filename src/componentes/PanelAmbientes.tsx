import { useCallback, useEffect, useState } from "react";
import {
  eliminarVarAmbiente,
  guardarVarsAmbiente,
  listarAmbientes,
  listarNotificaciones,
  listarPromociones,
  listarVarsAmbiente,
  solicitarPromocion,
} from "../servicios/ambientesServicio";
import type { VarsAmbiente } from "../servicios/ambientesServicio";
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

  // RF06/ADR-02.6: variables de entorno cifradas (Fernet) por ambiente.
  const [varsEnv, setVarsEnv] = useState("dev");
  const [vars, setVars] = useState<VarsAmbiente>({});
  const [varsCargando, setVarsCargando] = useState(true);
  const [varsError, setVarsError] = useState<string | null>(null);
  const [nombreVar, setNombreVar] = useState("");
  const [valorVar, setValorVar] = useState("");
  const [guardandoVar, setGuardandoVar] = useState(false);
  const [varsMsg, setVarsMsg] = useState<{
    tipo: "ok" | "err";
    texto: string;
  } | null>(null);

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

  // --- RF06/ADR-02.6: variables de entorno cifradas (Fernet) por ambiente ---
  // Mismo patrón de carga que el efecto principal: setState solo en callbacks
  // async (cumple react-hooks/set-state-in-effect). La recarga manual y el
  // setState síncrono viven en manejadores de evento.
  const cargarVars = useCallback(
    () => listarVarsAmbiente(agentId, varsEnv),
    [agentId, varsEnv]
  );

  useEffect(() => {
    let ignorar = false;
    cargarVars()
      .then((v) => {
        if (ignorar) return;
        setVars(v);
        setVarsError(null);
      })
      .catch((e: unknown) => {
        if (ignorar) return;
        setVarsError(
          e instanceof Error ? e.message : "No se pudieron cargar las variables."
        );
      })
      .finally(() => {
        if (!ignorar) setVarsCargando(false);
      });
    return () => {
      ignorar = true;
    };
  }, [cargarVars]);

  const recargarVars = useCallback(async () => {
    try {
      const v = await listarVarsAmbiente(agentId, varsEnv);
      setVars(v);
      setVarsError(null);
    } catch (e) {
      setVarsError(
        e instanceof Error ? e.message : "No se pudieron recargar las variables."
      );
    }
  }, [agentId, varsEnv]);

  const guardarVar = async () => {
    const nombre = nombreVar.trim();
    if (!nombre) {
      setVarsMsg({ tipo: "err", texto: "Falta el nombre de la variable." });
      return;
    }
    if (!valorVar) {
      setVarsMsg({ tipo: "err", texto: "Falta el valor de la variable." });
      return;
    }
    setGuardandoVar(true);
    setVarsMsg(null);
    try {
      await guardarVarsAmbiente(agentId, varsEnv, { [nombre]: valorVar });
      setVarsMsg({
        tipo: "ok",
        texto: `Variable "${nombre}" guardada cifrada en ${varsEnv}.`,
      });
      setNombreVar("");
      setValorVar("");
      await recargarVars();
    } catch (e) {
      setVarsMsg({
        tipo: "err",
        texto:
          e instanceof Error ? e.message : "No se pudo guardar la variable.",
      });
    } finally {
      setGuardandoVar(false);
    }
  };

  const eliminarVar = async (nombre: string) => {
    setVarsMsg(null);
    try {
      await eliminarVarAmbiente(agentId, varsEnv, nombre);
      setVarsMsg({ tipo: "ok", texto: `Variable "${nombre}" eliminada.` });
      await recargarVars();
    } catch (e) {
      setVarsMsg({
        tipo: "err",
        texto:
          e instanceof Error ? e.message : "No se pudo eliminar la variable.",
      });
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

      {/* RF06/ADR-02.6: variables de entorno por ambiente, cifradas con Fernet
          (stand-in local de Key Vault). La API solo devuelve valores
          enmascarados; la BD solo contiene ciphertext (EC-02.5). */}
      <h3 className="bloque-titulo">Variables de entorno (cifradas)</h3>

      <div className="actions" style={{ justifyContent: "flex-start" }}>
        <div>
          <label htmlFor="vars-env">Ambiente</label>
          <select
            id="vars-env"
            value={varsEnv}
            onChange={(e) => {
              setVarsEnv(e.target.value);
              setVarsCargando(true);
              setVarsMsg(null);
            }}
          >
            {ambs.map((amb) => (
              <option key={amb} value={amb}>
                {amb}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Formulario: agregar/actualizar una variable (el backend la cifra). */}
      <div className="promo-form">
        <div>
          <label htmlFor="var-nombre">Nombre</label>
          <input
            id="var-nombre"
            type="text"
            value={nombreVar}
            onChange={(e) => setNombreVar(e.target.value)}
            placeholder="OPENAI_KEY"
          />
        </div>
        <div>
          <label htmlFor="var-valor">Valor (secreto)</label>
          <input
            id="var-valor"
            type="password"
            value={valorVar}
            onChange={(e) => setValorVar(e.target.value)}
            placeholder="sk-..."
          />
        </div>
      </div>

      <div className="actions" style={{ justifyContent: "flex-start" }}>
        <button className="primary" onClick={guardarVar} disabled={guardandoVar}>
          {guardandoVar ? "Cifrando..." : "Guardar cifrada"}
        </button>
      </div>

      {varsMsg && (
        <div className={varsMsg.tipo === "ok" ? "preview-box" : "error-box"}>
          <p style={{ margin: 0 }}>{varsMsg.texto}</p>
        </div>
      )}

      {/* Tabla de variables del ambiente (valores enmascarados por el backend). */}
      {varsCargando ? (
        <p>Cargando variables de {varsEnv}...</p>
      ) : varsError ? (
        <div className="error-box">
          <p style={{ margin: 0 }}>{varsError}</p>
        </div>
      ) : Object.keys(vars).length === 0 ? (
        <div className="preview-box">
          <p style={{ margin: 0 }}>
            No hay variables en <strong>{varsEnv}</strong>.
          </p>
        </div>
      ) : (
        <table className="tabla-promos">
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Valor (enmascarado)</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {Object.entries(vars).map(([nombre, valor]) => (
              <tr key={nombre}>
                <td>{nombre}</td>
                <td>
                  <code>{valor}</code>
                </td>
                <td>
                  <button
                    className="secondary"
                    onClick={() => eliminarVar(nombre)}
                  >
                    Eliminar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* Badge: IMPLEMENTADO (no es un stub). Borde sólido verde, no punteado. */}
      <div
        style={{
          marginTop: 16,
          padding: "12px 16px",
          border: "1px solid #22c55e",
          borderRadius: 14,
          background: "rgba(34, 197, 94, 0.08)",
          color: "#cbd5e1",
        }}
      >
        🔐 Cifrado: <strong>Fernet local (ADR-02.6)</strong> — clave fuera de la
        BD (<code>ENVVARS_KEY</code>); la API solo expone valores enmascarados y
        la BD solo contiene ciphertext (EC-02.5). En producción: Azure Key Vault
        (ADR-02.4).
      </div>

      {/* Stub honesto restante: documentado en la arquitectura, sin backend. */}

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

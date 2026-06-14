import { MODO_MOCK } from "./despliegueServicio";
import type {
  Ambiente,
  Notificacion,
  ParamsPromocion,
  Promocion,
} from "../types/Ambiente";

// Mismo patrón que despliegueServicio.ts (fetch plano + MODO_MOCK). Reutiliza el
// mismo interruptor MODO_MOCK para no duplicar la fuente de verdad.
const API_URL = import.meta.env.VITE_API_URL ?? "http://127.0.0.1:8000/api/v1";

// ---------------------------------------------------------------------------
// RF06 — Ambientes (dev/staging/prod), promotion con aprobación y outbox.
// ---------------------------------------------------------------------------

export async function listarAmbientes(): Promise<Ambiente[]> {
  if (MODO_MOCK) {
    return ["dev", "staging", "prod"];
  }
  const respuesta = await fetch(`${API_URL}/agents/environments`);
  if (!respuesta.ok) {
    throw new Error("No se pudieron cargar los ambientes.");
  }
  const datos = await respuesta.json();
  return Array.isArray(datos?.environments) ? datos.environments : [];
}

export async function solicitarPromocion(
  agentId: string,
  params: ParamsPromocion
): Promise<Promocion> {
  if (MODO_MOCK) {
    return promocionarMock(agentId, params);
  }

  const respuesta = await fetch(`${API_URL}/agents/${agentId}/promote`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });

  if (!respuesta.ok) {
    // El backend manda el motivo en `detail` (p. ej. 403 a prod sin ADMIN,
    // 400 ambiente inválido); lo propagamos para mostrarlo inline.
    let detalle = `El backend respondió ${respuesta.status}`;
    try {
      const error = await respuesta.json();
      if (typeof error?.detail === "string") {
        detalle = error.detail;
      }
    } catch {
      // Respuesta sin cuerpo JSON: se queda el mensaje por defecto.
    }
    throw new Error(detalle);
  }

  const datos = await respuesta.json();
  return datos.promotion as Promocion;
}

export async function listarPromociones(agentId: string): Promise<Promocion[]> {
  if (MODO_MOCK) {
    return promocionesMock.map((p) => ({ ...p, agent_id: agentId }));
  }
  const respuesta = await fetch(`${API_URL}/agents/${agentId}/promotions`);
  if (!respuesta.ok) {
    throw new Error("No se pudieron cargar las promociones.");
  }
  const datos = await respuesta.json();
  return Array.isArray(datos?.promotions) ? datos.promotions : [];
}

export async function listarNotificaciones(
  agentId: string
): Promise<Notificacion[]> {
  if (MODO_MOCK) {
    return notificacionesMock.map((n) => ({ ...n, agent_id: agentId }));
  }
  const respuesta = await fetch(
    `${API_URL}/notifications/?agent_id=${encodeURIComponent(agentId)}`
  );
  if (!respuesta.ok) {
    throw new Error("No se pudieron cargar las notificaciones.");
  }
  const datos = await respuesta.json();
  return Array.isArray(datos?.notifications) ? datos.notifications : [];
}

// ---------------------------------------------------------------------------
// Fixtures de modo demo (mismo espíritu que versionesMock en despliegueServicio).
// Replican las reglas del backend para que la demo offline sea coherente.
// ---------------------------------------------------------------------------

let promocionesMock: Promocion[] = [
  {
    agent_id: "",
    ambiente_origen: "dev",
    ambiente_destino: "staging",
    solicitante: "carla.admin@agentwatch.dev",
    aprobado_por: "carla.admin@agentwatch.dev",
    estado: "aprobada",
    fecha: "2026-05-30T14:22:00+00:00",
  },
  {
    agent_id: "",
    ambiente_origen: "dev",
    ambiente_destino: "staging",
    solicitante: "ana.dev@agentwatch.dev",
    aprobado_por: null,
    estado: "pendiente",
    fecha: "2026-05-31T09:10:00+00:00",
  },
];

let notificacionesMock: Notificacion[] = [
  {
    id: 1,
    tipo: "promotion_pendiente",
    destinatario_rol: "ADMIN",
    mensaje:
      "Promoción (dev -> staging) solicitada por ana.dev@agentwatch.dev; espera aprobación (expira en 24h).",
    agent_id: "",
    fecha: "2026-05-31T09:10:00+00:00",
  },
];

function promocionarMock(agentId: string, params: ParamsPromocion): Promocion {
  const esAdmin = params.rol_solicitante.toUpperCase() === "ADMIN";
  // Misma regla que el backend: a prod solo puede promover un ADMIN.
  if (params.ambiente_destino === "prod" && !esAdmin) {
    throw new Error(
      "La promoción a prod requiere aprobación de un usuario con rol ADMIN"
    );
  }

  const nueva: Promocion = {
    agent_id: agentId,
    ambiente_origen: params.ambiente_origen,
    ambiente_destino: params.ambiente_destino,
    solicitante: params.solicitante,
    aprobado_por: esAdmin ? params.solicitante : null,
    estado: esAdmin ? "aprobada" : "pendiente",
    fecha: new Date().toISOString(),
  };
  promocionesMock = [...promocionesMock, nueva];

  if (nueva.estado === "pendiente") {
    notificacionesMock = [
      ...notificacionesMock,
      {
        id: notificacionesMock.length + 1,
        tipo: "promotion_pendiente",
        destinatario_rol: "ADMIN",
        mensaje:
          `Promoción (${nueva.ambiente_origen} -> ${nueva.ambiente_destino}) ` +
          `solicitada por ${nueva.solicitante}; espera aprobación (expira en 24h).`,
        agent_id: agentId,
        fecha: nueva.fecha,
      },
    ];
  }

  return nueva;
}

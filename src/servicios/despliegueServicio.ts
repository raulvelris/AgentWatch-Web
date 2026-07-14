import type { AgenteResumen, EventoDespliegue } from "../types/Despliegue";
import type { Version } from "../types/Version";
import { fetchConAuth } from "./authServicio";

// Mismo contrato y estilo que agenteServicio.ts (fetch plano, sin librerías).
const API_URL = import.meta.env.VITE_API_URL ?? "http://127.0.0.1:8000/api/v1";

// Interruptor de modo demo. Con MODO_MOCK = true los componentes corren y se
// demuestran SIN backend (log en vivo simulado + fixtures de versiones).
// Se controla con la env var VITE_MODO_MOCK ("true" activa el mock); ausente
// o cualquier otro valor usa el backend real. Ver .env.example.
export const MODO_MOCK = import.meta.env.VITE_MODO_MOCK === "true";

export interface ManejadoresDespliegue {
  onEvento: (evento: EventoDespliegue) => void;
  onError: (mensaje: string) => void;
  onFin: () => void;
}

// ---------------------------------------------------------------------------
// Selector de agentes: el deploy exige que el agente exista en el backend
// (tabla `agents`), así que la página carga la lista real en vez de aceptar
// un id tipeado que puede no existir.
// ---------------------------------------------------------------------------

// Réplica de los 2 agentes demo que siembra el backend al arrancar.
const AGENTES_MOCK: AgenteResumen[] = [
  {
    id: "12345678-1234-5678-1234-567812345678",
    nombre: "Soporte Nivel 1",
    estado: "ACTIVE",
  },
  {
    id: "87654321-4321-8765-4321-876543210987",
    nombre: "Analista de Datos",
    estado: "PAUSED",
  },
];

export async function listarAgentes(): Promise<AgenteResumen[]> {
  if (MODO_MOCK) {
    return [...AGENTES_MOCK];
  }

  const respuesta = await fetch(`${API_URL}/agents/`);
  if (!respuesta.ok) {
    throw new Error("No se pudo cargar la lista de agentes.");
  }

  const datos = await respuesta.json();
  if (!Array.isArray(datos?.agents)) {
    return [];
  }
  return (datos.agents as Array<Record<string, unknown>>)
    .filter((a) => typeof a?.id === "string")
    .map((a) => ({
      id: a.id as string,
      nombre: typeof a.nombre === "string" ? a.nombre : (a.id as string),
      estado: typeof a.estado === "string" ? a.estado : "",
    }));
}

// ---------------------------------------------------------------------------
// RF05 — Despliegue con log en vivo (Server-Sent Events sobre POST).
//
// EventSource del navegador solo hace GET (sin body ni headers), por eso el
// stream de un POST se lee con fetch + ReadableStream y se parsea el framing
// SSE a mano. Devuelve una función para cancelar (la usa el cleanup de React).
// ---------------------------------------------------------------------------
export function desplegarAgente(
  agentId: string,
  manejadores: ManejadoresDespliegue
): () => void {
  if (MODO_MOCK) {
    return desplegarMock(agentId, manejadores);
  }
  return desplegarReal(agentId, manejadores);
}

function desplegarReal(
  agentId: string,
  manejadores: ManejadoresDespliegue
): () => void {
  const controlador = new AbortController();

  (async () => {
    try {
      const respuesta = await fetchConAuth(`${API_URL}/agents/${agentId}/deploy`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
        signal: controlador.signal,
      });

      if (!respuesta.ok || !respuesta.body) {
        throw new Error(`El backend respondió ${respuesta.status}`);
      }

      const lector = respuesta.body.getReader();
      const decodificador = new TextDecoder();
      let buffer = "";
      let terminalRecibido = false;

      // Marca si llegó un frame terminal (done/error) para distinguir un cierre
      // normal de uno prematuro.
      const onEvento = (evento: EventoDespliegue) => {
        if (evento.fase === "done" || evento.fase === "error") {
          terminalRecibido = true;
        }
        manejadores.onEvento(evento);
      };

      let terminado = false;
      while (!terminado) {
        const { done, value } = await lector.read();
        if (done) {
          terminado = true;
          break;
        }

        // Normaliza CRLF -> LF: un \r final sin su \n queda intacto hasta el
        // siguiente chunk, así que solo se sustituyen pares "\r\n" completos.
        buffer = (buffer + decodificador.decode(value, { stream: true })).replace(
          /\r\n/g,
          "\n"
        );

        // Los eventos SSE se separan por una línea en blanco ("\n\n").
        let limite = buffer.indexOf("\n\n");
        while (limite !== -1) {
          const frame = buffer.slice(0, limite);
          buffer = buffer.slice(limite + 2);
          procesarFrame(frame, onEvento);
          limite = buffer.indexOf("\n\n");
        }
      }

      // Vacía el decodificador y procesa el último frame aunque no venga seguido
      // de "\n\n" (algunos servidores cierran sin línea en blanco final).
      buffer = (buffer + decodificador.decode()).replace(/\r\n/g, "\n");
      if (buffer.trim()) {
        procesarFrame(buffer, onEvento);
      }

      if (terminalRecibido) {
        manejadores.onFin();
      } else {
        manejadores.onError(
          "La conexión con el pipeline se cerró antes de finalizar el despliegue."
        );
      }
    } catch (error) {
      // Cancelación por desmontaje no es un error real.
      if (controlador.signal.aborted) {
        return;
      }
      manejadores.onError(
        error instanceof Error
          ? error.message
          : "No se pudo conectar con el backend de despliegue."
      );
    }
  })();

  return () => controlador.abort();
}

function procesarFrame(
  frame: string,
  onEvento: (evento: EventoDespliegue) => void
) {
  for (const linea of frame.split("\n")) {
    if (!linea.startsWith("data:")) {
      continue;
    }

    const datos = linea.slice(5).trim();
    if (!datos) {
      continue;
    }

    try {
      onEvento(JSON.parse(datos) as EventoDespliegue);
    } catch {
      // Frame que no es JSON (p. ej. comentario keep-alive): se ignora.
    }
  }
}

// Despliegue simulado: emite el guion por temporizadores para que el log se
// anime de verdad en la demo. Cancelable igual que el real.
function desplegarMock(
  agentId: string,
  manejadores: ManejadoresDespliegue
): () => void {
  const guion: EventoDespliegue[] = [
    { fase: "queued", mensaje: "Despliegue encolado en el pipeline CI/CD." },
    { fase: "build", mensaje: "Construyendo imagen Docker del agente..." },
    { fase: "build", mensaje: "Capa base lista. Instalando dependencias." },
    { fase: "push", mensaje: "Subiendo imagen al registry de contenedores." },
    { fase: "deploy", mensaje: "Desplegando contenedor en el clúster." },
    { fase: "healthcheck", mensaje: "Verificando estado de salud del servicio." },
    {
      fase: "done",
      mensaje: "Despliegue completado correctamente.",
      url: `https://agente-${agentId.slice(0, 8) || "demo"}.demo.run.app`,
      salud: "healthy",
      estado: "success",
    },
  ];

  const temporizadores: number[] = [];
  let cancelado = false;

  guion.forEach((evento, indice) => {
    const id = window.setTimeout(() => {
      if (cancelado) {
        return;
      }
      manejadores.onEvento(evento);
      if (indice === guion.length - 1) {
        manejadores.onFin();
      }
    }, 700 * (indice + 1));
    temporizadores.push(id);
  });

  return () => {
    cancelado = true;
    temporizadores.forEach((id) => window.clearTimeout(id));
  };
}

// ---------------------------------------------------------------------------
// RF07 — Historial de versiones y rollback.
// ---------------------------------------------------------------------------

// Fixture mutable para que el rollback se refleje en la demo.
let versionesMock: Version[] = [
  {
    id: "v-3",
    numero: 3,
    fecha: "2026-05-30 14:22",
    autor: "enzo.ordonez",
    hash_sha256:
      "9f2c1a7b4e6d8c0f3a2b5d7e9c1f4a6b8d0e2c4f6a8b0d2e4c6f8a0b2d4e6f81",
    estado: "activa",
  },
  {
    id: "v-2",
    numero: 2,
    fecha: "2026-05-28 09:10",
    autor: "maria.lopez",
    hash_sha256:
      "3b7e1d9f5a2c8e4b6d0f2a4c6e8b0d2f4a6c8e0b2d4f6a8c0e2b4d6f8a0c2e43",
    estado: "inactiva",
  },
  {
    id: "v-1",
    numero: 1,
    fecha: "2026-05-25 17:45",
    autor: "enzo.ordonez",
    hash_sha256:
      "1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b",
    estado: "inactiva",
  },
];

export async function obtenerVersiones(agentId: string): Promise<Version[]> {
  if (MODO_MOCK) {
    return [...versionesMock];
  }

  const respuesta = await fetch(`${API_URL}/agents/${agentId}/versions`);

  if (!respuesta.ok) {
    throw new Error("Error al obtener las versiones del agente");
  }

  const datos = await respuesta.json();
  // Si el backend responde con una forma inesperada, degradamos a lista vacía
  // (la UI muestra el estado "sin versiones") en vez de reventar en render.
  return Array.isArray(datos?.versions) ? datos.versions : [];
}

export async function ejecutarRollback(
  agentId: string,
  versionId: string
): Promise<{ ok: boolean }> {
  if (MODO_MOCK) {
    versionesMock = versionesMock.map((version) => {
      if (version.id === versionId) {
        return { ...version, estado: "activa" };
      }
      if (version.estado === "activa") {
        return { ...version, estado: "rollback" };
      }
      return version;
    });
    return { ok: true };
  }

  const respuesta = await fetchConAuth(
    `${API_URL}/agents/${agentId}/rollback/${versionId}`,
    { method: "POST" }
  );

  if (!respuesta.ok) {
    throw new Error("Error al ejecutar el rollback");
  }

  return respuesta.json();
}

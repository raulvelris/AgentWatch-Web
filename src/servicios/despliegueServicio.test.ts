import { describe, expect, it, vi } from "vitest";
import {
  desplegarAgente,
  ejecutarRollback,
  listarAgentes,
  obtenerVersiones,
} from "./despliegueServicio";
import type { ManejadoresDespliegue } from "./despliegueServicio";
import type { EventoDespliegue } from "../types/Despliegue";

const BASE = "http://127.0.0.1:8000/api/v1";

function json(status: number, cuerpo: unknown): Response {
  return new Response(JSON.stringify(cuerpo), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

// Stream SSE sintético: encola los chunks tal cual (permite partir frames por
// la mitad, meter CRLF, etc.) y cierra.
function streamDeChunks(chunks: string[]): Response {
  const codificador = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    start(controlador) {
      for (const chunk of chunks) {
        controlador.enqueue(codificador.encode(chunk));
      }
      controlador.close();
    },
  });
  return new Response(stream, {
    status: 200,
    headers: { "Content-Type": "text/event-stream" },
  });
}

// Manejadores espiados + promesa que resuelve al terminar (onFin u onError).
function manejadoresEspia(): {
  manejadores: ManejadoresDespliegue;
  eventos: EventoDespliegue[];
  onFin: ReturnType<typeof vi.fn>;
  onError: ReturnType<typeof vi.fn>;
  terminado: Promise<void>;
} {
  const eventos: EventoDespliegue[] = [];
  let resolver: () => void;
  const terminado = new Promise<void>((res) => {
    resolver = res;
  });
  const onFin = vi.fn(() => resolver());
  const onError = vi.fn(() => resolver());
  return {
    manejadores: {
      onEvento: (e) => eventos.push(e),
      onError,
      onFin,
    },
    eventos,
    onFin,
    onError,
    terminado,
  };
}

describe("listarAgentes", () => {
  it("mapea la lista real y filtra entradas sin id", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        json(200, {
          agents: [
            { id: "a-1", nombre: "Soporte", estado: "ACTIVE" },
            { id: "a-2" }, // sin nombre ni estado: degrada con valores por defecto
            { nombre: "sin id" }, // se filtra
          ],
        })
      )
    );

    const agentes = await listarAgentes();

    expect(agentes).toEqual([
      { id: "a-1", nombre: "Soporte", estado: "ACTIVE" },
      { id: "a-2", nombre: "a-2", estado: "" },
    ]);
  });

  it("con una forma inesperada devuelve lista vacía", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(json(200, { otra: 1 })));
    expect(await listarAgentes()).toEqual([]);
  });

  it("con error HTTP tira un mensaje claro", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(json(500, {})));
    await expect(listarAgentes()).rejects.toThrow(
      "No se pudo cargar la lista de agentes."
    );
  });
});

describe("obtenerVersiones", () => {
  it("devuelve las versiones envueltas en {versions}", async () => {
    const versiones = [{ id: "v1", numero: 1, estado: "activa" }];
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(json(200, { versions: versiones }))
    );
    expect(await obtenerVersiones("a-1")).toEqual(versiones);
  });

  it("degrada a lista vacía si la forma es inesperada", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(json(200, { versions: 3 })));
    expect(await obtenerVersiones("a-1")).toEqual([]);
  });

  it("propaga el detail del backend en errores", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(json(404, { detail: "Agente no encontrado" }))
    );
    await expect(obtenerVersiones("a-x")).rejects.toThrow("Agente no encontrado");
  });
});

describe("ejecutarRollback", () => {
  it("hace POST al endpoint de rollback y devuelve el cuerpo", async () => {
    const fetchMock = vi.fn().mockResolvedValue(json(200, { ok: true }));
    vi.stubGlobal("fetch", fetchMock);

    const r = await ejecutarRollback("a-1", "a-1-v1");

    expect(fetchMock).toHaveBeenCalledWith(
      `${BASE}/agents/a-1/rollback/a-1-v1`,
      expect.objectContaining({ method: "POST" })
    );
    expect(r).toEqual({ ok: true });
  });

  it("propaga el detail (403 sin rol ADMIN)", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(json(403, { detail: "Se requiere rol ADMIN" }))
    );
    await expect(ejecutarRollback("a-1", "v-9")).rejects.toThrow(
      "Se requiere rol ADMIN"
    );
  });
});

describe("rollback en modo demo (contrato real del backend)", () => {
  it("es append-only: crea una versión nueva 'rollback' con el hash heredado", async () => {
    // Review de contrato: el mock viejo marcaba la objetivo como 'activa' y la
    // activa como 'rollback' (semántica INVERSA a la del backend, que apendea
    // una versión nueva y pasa la vigente a 'inactiva').
    vi.resetModules();
    vi.stubEnv("VITE_MODO_MOCK", "true");
    const servicio = await import("./despliegueServicio");

    const antes = await servicio.obtenerVersiones("agente-demo");
    const objetivo = antes[0];
    const vigenteAntes = antes.find(
      (v) => v.estado === "activa" || v.estado === "rollback"
    );

    await servicio.ejecutarRollback("agente-demo", objetivo.id);
    const despues = await servicio.obtenerVersiones("agente-demo");

    // Nada se borra: hay una versión más.
    expect(despues).toHaveLength(antes.length + 1);
    // La nueva es la última, con estado rollback y el hash de la objetivo.
    const nueva = despues[despues.length - 1];
    expect(nueva.estado).toBe("rollback");
    expect(nueva.hash_sha256).toBe(objetivo.hash_sha256);
    // La objetivo NO queda activa; la vigente anterior pasa a inactiva.
    expect(despues.find((v) => v.id === objetivo.id)?.estado).toBe("inactiva");
    expect(despues.find((v) => v.id === vigenteAntes?.id)?.estado).toBe(
      "inactiva"
    );
    // Exactamente una vigente.
    expect(
      despues.filter((v) => v.estado === "activa" || v.estado === "rollback")
    ).toHaveLength(1);

    vi.unstubAllEnvs();
  });
});

describe("desplegarAgente (SSE real sobre fetch + ReadableStream)", () => {
  it("parsea frames partidos entre chunks y con CRLF, y termina en onFin", async () => {
    // El primer frame llega cortado a mitad del JSON y con CRLF; el segundo
    // (done) llega entero. Es el caso real de un proxy que trocea el stream.
    const fetchMock = vi.fn().mockResolvedValue(
      streamDeChunks([
        'data: {"fase": "build", "mensaje": "Constru',
        'yendo imagen"}\r\n\r\n',
        ': keep-alive\n\n', // comentario SSE: se ignora
        'data: {"fase": "done", "mensaje": "ok", "estado": "success", "salud": "healthy", "url": "http://agente.demo"}\n\n',
      ])
    );
    vi.stubGlobal("fetch", fetchMock);

    const espia = manejadoresEspia();
    desplegarAgente("a-1", espia.manejadores);
    await espia.terminado;

    expect(espia.eventos).toEqual([
      { fase: "build", mensaje: "Construyendo imagen" },
      {
        fase: "done",
        mensaje: "ok",
        estado: "success",
        salud: "healthy",
        url: "http://agente.demo",
      },
    ]);
    expect(espia.onFin).toHaveBeenCalledTimes(1);
    expect(espia.onError).not.toHaveBeenCalled();
  });

  it("manda el token de la sesión en el POST", async () => {
    sessionStorage.setItem(
      "agentwatch_auth",
      JSON.stringify({ token: "jwt-abc", usuario: "admin_a", rol: "ADMIN", tenant: "t" })
    );
    const fetchMock = vi
      .fn()
      .mockResolvedValue(streamDeChunks(['data: {"fase": "done", "mensaje": "x", "estado": "success"}\n\n']));
    vi.stubGlobal("fetch", fetchMock);

    const espia = manejadoresEspia();
    desplegarAgente("a-1", espia.manejadores);
    await espia.terminado;

    expect(fetchMock).toHaveBeenCalledWith(
      `${BASE}/agents/a-1/deploy`,
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({ Authorization: "Bearer jwt-abc" }),
      })
    );
  });

  it("procesa el último frame aunque el stream cierre sin línea en blanco final", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        streamDeChunks([
          'data: {"fase": "build", "mensaje": "b"}\n\n',
          'data: {"fase": "done", "mensaje": "fin", "estado": "success"}', // sin \n\n
        ])
      )
    );

    const espia = manejadoresEspia();
    desplegarAgente("a-1", espia.manejadores);
    await espia.terminado;

    expect(espia.eventos.map((e) => e.fase)).toEqual(["build", "done"]);
    expect(espia.onFin).toHaveBeenCalledTimes(1);
  });

  it("narra el camino de fallo del backend: estado error, revert y done failed", async () => {
    // Frames reales del backend con ?fallo=healthcheck: la fase que falló llega
    // con estado "error" (no con fase "error"), después revert y done failed.
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        streamDeChunks([
          'data: {"fase": "healthcheck", "mensaje": "fallo simulado", "estado": "error"}\n\n',
          'data: {"fase": "revert", "mensaje": "restaurando v1", "version_restaurada": "a-1-v1"}\n\n',
          'data: {"fase": "done", "mensaje": "Despliegue fallido", "estado": "failed"}\n\n',
        ])
      )
    );

    const espia = manejadoresEspia();
    desplegarAgente("a-1", espia.manejadores);
    await espia.terminado;

    expect(espia.eventos[0]).toMatchObject({ fase: "healthcheck", estado: "error" });
    expect(espia.eventos[1]).toMatchObject({ fase: "revert" });
    // El tipo EventoDespliegue declara los campos extra del camino de fallo.
    expect(espia.eventos[1].version_restaurada).toBe("a-1-v1");
    expect(espia.eventos[2]).toMatchObject({ fase: "done", estado: "failed" });
    // El frame done (aunque failed) es terminal: cuenta como fin, no como corte.
    expect(espia.onFin).toHaveBeenCalledTimes(1);
    expect(espia.onError).not.toHaveBeenCalled();
  });

  it("un cierre sin frame terminal es un corte, no un fin", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        streamDeChunks(['data: {"fase": "build", "mensaje": "b"}\n\n'])
      )
    );

    const espia = manejadoresEspia();
    desplegarAgente("a-1", espia.manejadores);
    await espia.terminado;

    expect(espia.onError).toHaveBeenCalledWith(
      "La conexión con el pipeline se cerró antes de finalizar el despliegue."
    );
    expect(espia.onFin).not.toHaveBeenCalled();
  });

  it("propaga el detail del backend cuando el deploy no abre stream (404)", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        json(404, { detail: "No se encontró la configuración del agente" })
      )
    );

    const espia = manejadoresEspia();
    desplegarAgente("no-existe", espia.manejadores);
    await espia.terminado;

    expect(espia.onError).toHaveBeenCalledWith(
      "No se encontró la configuración del agente"
    );
  });

  it("una respuesta OK sin body es un error claro", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response(null, { status: 200 }))
    );

    const espia = manejadoresEspia();
    desplegarAgente("a-1", espia.manejadores);
    await espia.terminado;

    expect(espia.onError).toHaveBeenCalledWith(
      "El backend no devolvió un stream de despliegue."
    );
  });

  it("ignora frames con data que no es JSON sin cortar el stream", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        streamDeChunks([
          "data: esto-no-es-json\n\n",
          'data: {"fase": "done", "mensaje": "ok", "estado": "success"}\n\n',
        ])
      )
    );

    const espia = manejadoresEspia();
    desplegarAgente("a-1", espia.manejadores);
    await espia.terminado;

    expect(espia.eventos.map((e) => e.fase)).toEqual(["done"]);
    expect(espia.onFin).toHaveBeenCalledTimes(1);
  });
});

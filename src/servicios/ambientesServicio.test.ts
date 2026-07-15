import { describe, expect, it, vi } from "vitest";
import {
  eliminarVarAmbiente,
  guardarVarsAmbiente,
  listarAmbientes,
  listarNotificaciones,
  listarPromociones,
  listarVarsAmbiente,
  solicitarPromocion,
} from "./ambientesServicio";

const BASE = "http://127.0.0.1:8000/api/v1";

function json(status: number, cuerpo: unknown): Response {
  return new Response(JSON.stringify(cuerpo), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("listarAmbientes / listarPromociones / listarNotificaciones", () => {
  it("desenvuelven las listas del backend", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(json(200, { environments: ["dev", "staging", "prod"] }))
      .mockResolvedValueOnce(json(200, { promotions: [{ estado: "aprobada" }] }))
      .mockResolvedValueOnce(json(200, { notifications: [{ id: 1 }] }));
    vi.stubGlobal("fetch", fetchMock);

    expect(await listarAmbientes()).toEqual(["dev", "staging", "prod"]);
    expect(await listarPromociones("a-1")).toEqual([{ estado: "aprobada" }]);
    expect(await listarNotificaciones("a-1")).toEqual([{ id: 1 }]);
  });

  it("degradan a lista vacía ante formas inesperadas", async () => {
    // Un Response por llamada: el body de un Response solo se puede leer una vez.
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation(async () => json(200, { basura: true }))
    );
    expect(await listarAmbientes()).toEqual([]);
    expect(await listarPromociones("a-1")).toEqual([]);
    expect(await listarNotificaciones("a-1")).toEqual([]);
  });
});

describe("solicitarPromocion", () => {
  it("devuelve la promotion del backend", async () => {
    const promotion = {
      agent_id: "a-1",
      ambiente_origen: "dev",
      ambiente_destino: "staging",
      solicitante: "admin_a",
      aprobado_por: "admin_a",
      estado: "aprobada",
      fecha: "2026-07-14T00:00:00+00:00",
    };
    const fetchMock = vi.fn().mockResolvedValue(json(200, { promotion }));
    vi.stubGlobal("fetch", fetchMock);

    const r = await solicitarPromocion("a-1", {
      ambiente_origen: "dev",
      ambiente_destino: "staging",
    });

    expect(fetchMock).toHaveBeenCalledWith(
      `${BASE}/agents/a-1/promote`,
      expect.objectContaining({ method: "POST" })
    );
    expect(r).toEqual(promotion);
  });

  it("propaga el 409 del release gate con su motivo", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        json(409, {
          detail: "Release gate: tasa de éxito 40% por debajo del umbral 80%",
        })
      )
    );

    await expect(
      solicitarPromocion("a-1", {
        ambiente_origen: "staging",
        ambiente_destino: "prod",
      })
    ).rejects.toThrow("Release gate: tasa de éxito 40% por debajo del umbral 80%");
  });

  it("propaga el 403 de prod sin ADMIN", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        json(403, {
          detail:
            "La promoción a prod requiere aprobación de un usuario con rol ADMIN",
        })
      )
    );

    await expect(
      solicitarPromocion("a-1", {
        ambiente_origen: "staging",
        ambiente_destino: "prod",
      })
    ).rejects.toThrow(
      "La promoción a prod requiere aprobación de un usuario con rol ADMIN"
    );
  });
});

describe("promocionarMock (modo demo)", () => {
  it("aplica la regla real: el rol y el solicitante salen de la sesión", async () => {
    // MODO_MOCK se evalúa al importar el módulo: hay que re-importarlo con la
    // env var puesta para ejercitar la rama de demo.
    vi.resetModules();
    vi.stubEnv("VITE_MODO_MOCK", "true");
    sessionStorage.setItem(
      "agentwatch_auth",
      JSON.stringify({ token: "t", usuario: "viewer_a", rol: "VIEWER", tenant: "x" })
    );
    const servicio = await import("./ambientesServicio");

    // Con sesión VIEWER, prod se rechaza (misma regla que el backend)...
    await expect(
      servicio.solicitarPromocion("a-1", {
        ambiente_origen: "staging",
        ambiente_destino: "prod",
      })
    ).rejects.toThrow(/rol ADMIN/);

    // ...y a staging queda pendiente, a nombre del usuario de la sesión.
    const p = await servicio.solicitarPromocion("a-1", {
      ambiente_origen: "dev",
      ambiente_destino: "staging",
    });
    expect(p.estado).toBe("pendiente");
    expect(p.solicitante).toBe("viewer_a");

    vi.unstubAllEnvs();
  });
});

describe("variables de entorno (RF06)", () => {
  it("listarVarsAmbiente devuelve las vars enmascaradas", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(json(200, { vars: { OPENAI_KEY: "sk-***" } }))
    );
    expect(await listarVarsAmbiente("a-1", "dev")).toEqual({
      OPENAI_KEY: "sk-***",
    });
  });

  it("degrada a objeto vacío ante formas inesperadas", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(json(200, { vars: 7 })));
    expect(await listarVarsAmbiente("a-1", "dev")).toEqual({});
  });

  it("el 503 de ENVVARS_KEY llega a la UI con su explicación", async () => {
    const motivo =
      "La clave ENVVARS_KEY no descifra los secretos guardados; revisa .env";
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(json(503, { detail: motivo }))
    );
    await expect(listarVarsAmbiente("a-1", "dev")).rejects.toThrow(motivo);
  });

  it("guardarVarsAmbiente hace PUT con {vars} y propaga el detail", async () => {
    const fetchMock = vi.fn().mockResolvedValue(json(200, { ok: true }));
    vi.stubGlobal("fetch", fetchMock);

    await guardarVarsAmbiente("a-1", "dev", { K: "v" });

    expect(fetchMock).toHaveBeenCalledWith(
      `${BASE}/agents/a-1/environments/dev/vars`,
      expect.objectContaining({
        method: "PUT",
        body: JSON.stringify({ vars: { K: "v" } }),
      })
    );

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(json(401, { detail: "Falta el token" }))
    );
    await expect(guardarVarsAmbiente("a-1", "dev", { K: "v" })).rejects.toThrow(
      "Falta el token"
    );
  });

  it("eliminarVarAmbiente codifica el nombre y propaga el detail", async () => {
    const fetchMock = vi.fn().mockResolvedValue(json(200, { ok: true }));
    vi.stubGlobal("fetch", fetchMock);

    await eliminarVarAmbiente("a-1", "dev", "K/RARA");

    expect(fetchMock).toHaveBeenCalledWith(
      `${BASE}/agents/a-1/environments/dev/vars/K%2FRARA`,
      expect.objectContaining({ method: "DELETE" })
    );

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(json(403, { detail: "Se requiere rol ADMIN" }))
    );
    await expect(eliminarVarAmbiente("a-1", "dev", "K")).rejects.toThrow(
      "Se requiere rol ADMIN"
    );
  });
});

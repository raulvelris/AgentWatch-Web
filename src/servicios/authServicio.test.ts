import { describe, expect, it, vi } from "vitest";
import {
  cerrarSesion,
  fetchConAuth,
  iniciarSesion,
  obtenerSesion,
} from "./authServicio";

const SESION = {
  token: "jwt-de-prueba",
  usuario: "admin_a",
  rol: "ADMIN",
  tenant: "tenant_a",
};

function json(status: number, cuerpo: unknown): Response {
  return new Response(JSON.stringify(cuerpo), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("iniciarSesion", () => {
  it("guarda la sesión en sessionStorage y la devuelve", async () => {
    const fetchMock = vi.fn().mockResolvedValue(json(200, SESION));
    vi.stubGlobal("fetch", fetchMock);

    const sesion = await iniciarSesion("admin_a");

    expect(fetchMock).toHaveBeenCalledWith(
      "http://127.0.0.1:8000/api/v1/auth/login?usuario=admin_a"
    );
    expect(sesion).toEqual(SESION);
    expect(JSON.parse(sessionStorage.getItem("agentwatch_auth") ?? "")).toEqual(
      SESION
    );
  });

  it("codifica el usuario en la URL", async () => {
    const fetchMock = vi.fn().mockResolvedValue(json(200, SESION));
    vi.stubGlobal("fetch", fetchMock);

    await iniciarSesion("usuario raro&");

    expect(fetchMock).toHaveBeenCalledWith(
      "http://127.0.0.1:8000/api/v1/auth/login?usuario=usuario%20raro%26"
    );
  });

  it("propaga el error del login stub (200 con {error})", async () => {
    // El login del backend responde 200 con {error} si el usuario no existe.
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(json(200, { error: "Usuario no encontrado" }))
    );

    await expect(iniciarSesion("nadie")).rejects.toThrow("Usuario no encontrado");
    expect(sessionStorage.getItem("agentwatch_auth")).toBeNull();
  });

  it("con status no-OK tira error con el status", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(json(500, {})));
    await expect(iniciarSesion("admin_a")).rejects.toThrow(
      "El backend respondió 500 al iniciar sesión"
    );
  });
});

describe("obtenerSesion / cerrarSesion", () => {
  it("devuelve null sin sesión y con JSON corrupto", () => {
    expect(obtenerSesion()).toBeNull();
    sessionStorage.setItem("agentwatch_auth", "{esto no es json");
    expect(obtenerSesion()).toBeNull();
  });

  it("cerrarSesion borra la sesión", () => {
    sessionStorage.setItem("agentwatch_auth", JSON.stringify(SESION));
    cerrarSesion();
    expect(obtenerSesion()).toBeNull();
  });
});

describe("fetchConAuth", () => {
  it("agrega Authorization: Bearer cuando hay sesión y respeta las opciones", async () => {
    sessionStorage.setItem("agentwatch_auth", JSON.stringify(SESION));
    const fetchMock = vi.fn().mockResolvedValue(json(200, {}));
    vi.stubGlobal("fetch", fetchMock);

    await fetchConAuth("http://x/api", { method: "POST", body: "{}" });

    expect(fetchMock).toHaveBeenCalledWith("http://x/api", {
      method: "POST",
      body: "{}",
      headers: { Authorization: `Bearer ${SESION.token}` },
    });
  });

  it("sin sesión no toca los headers", async () => {
    const fetchMock = vi.fn().mockResolvedValue(json(200, {}));
    vi.stubGlobal("fetch", fetchMock);

    await fetchConAuth("http://x/api", { method: "DELETE" });

    expect(fetchMock).toHaveBeenCalledWith("http://x/api", { method: "DELETE" });
  });
});

import { describe, expect, it } from "vitest";
import { extraerDetalle } from "./apiErrores";

// Respuesta HTTP sintética con el status y el cuerpo dados.
function respuesta(status: number, cuerpo: string | null): Response {
  return new Response(cuerpo, {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("extraerDetalle", () => {
  it("devuelve el detail que manda FastAPI", async () => {
    const r = respuesta(403, JSON.stringify({ detail: "Se requiere rol ADMIN" }));
    expect(await extraerDetalle(r)).toBe("Se requiere rol ADMIN");
  });

  it("con cuerpo no JSON cae al mensaje por defecto", async () => {
    const r = respuesta(500, "Internal Server Error");
    expect(await extraerDetalle(r, "Fallo el rollback")).toBe("Fallo el rollback");
  });

  it("sin porDefecto arma el mensaje con el status", async () => {
    const r = respuesta(503, null);
    expect(await extraerDetalle(r)).toBe("El backend respondió 503");
  });

  it("ignora un detail no-string (422 de validación de FastAPI)", async () => {
    // FastAPI manda detail como lista de objetos en los 422.
    const r = respuesta(
      422,
      JSON.stringify({ detail: [{ loc: ["body"], msg: "field required" }] })
    );
    expect(await extraerDetalle(r)).toBe("El backend respondió 422");
  });

  it("ignora un detail vacío o de espacios", async () => {
    const r = respuesta(400, JSON.stringify({ detail: "   " }));
    expect(await extraerDetalle(r, "por defecto")).toBe("por defecto");
  });
});

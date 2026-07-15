import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { Promocion } from "../types/Ambiente";

vi.mock("../servicios/ambientesServicio", () => ({
  listarAmbientes: vi.fn(),
  listarPromociones: vi.fn(),
  listarNotificaciones: vi.fn(),
  listarVarsAmbiente: vi.fn(),
  guardarVarsAmbiente: vi.fn(),
  eliminarVarAmbiente: vi.fn(),
  solicitarPromocion: vi.fn(),
}));

import PanelAmbientes from "./PanelAmbientes";
import {
  listarAmbientes,
  listarNotificaciones,
  listarPromociones,
  listarVarsAmbiente,
  solicitarPromocion,
} from "../servicios/ambientesServicio";

const PROMO_APROBADA: Promocion = {
  agent_id: "a-1",
  ambiente_origen: "dev",
  ambiente_destino: "staging",
  solicitante: "admin_a",
  aprobado_por: "admin_a",
  estado: "aprobada",
  fecha: "2026-07-10T10:00:00+00:00",
};

function mocksBase({
  promociones = [] as Promocion[],
  vars = {} as Record<string, string>,
} = {}) {
  vi.mocked(listarAmbientes).mockResolvedValue(["dev", "staging", "prod"]);
  vi.mocked(listarPromociones).mockResolvedValue(promociones);
  vi.mocked(listarNotificaciones).mockResolvedValue([]);
  vi.mocked(listarVarsAmbiente).mockResolvedValue(vars);
}

function conSesion(rol = "ADMIN", usuario = "admin_a") {
  sessionStorage.setItem(
    "agentwatch_auth",
    JSON.stringify({ token: "t", usuario, rol, tenant: "x" })
  );
}

describe("PanelAmbientes", () => {
  it("marca como activo el ambiente de la última promoción aprobada", async () => {
    mocksBase({ promociones: [PROMO_APROBADA] });

    render(<PanelAmbientes agentId="a-1" />);

    const staging = (await screen.findByText("staging", {
      selector: ".ambiente-nombre",
    })).closest(".ambiente-card");
    expect(staging).toHaveClass("activa");
  });

  it("una promoción pendiente muestra que espera aprobación de un ADMIN", async () => {
    mocksBase();
    conSesion("VIEWER", "viewer_a");
    vi.mocked(solicitarPromocion).mockResolvedValue({
      ...PROMO_APROBADA,
      aprobado_por: null,
      estado: "pendiente",
    });
    const usuario = userEvent.setup();

    render(<PanelAmbientes agentId="a-1" />);
    await screen.findByRole("button", { name: "Solicitar Promotion" });

    await usuario.click(
      screen.getByRole("button", { name: "Solicitar Promotion" })
    );

    expect(
      await screen.findByText(/Promoción pendiente .*Espera aprobación de un ADMIN/)
    ).toBeInTheDocument();
  });

  it("el 409 del release gate se muestra con su motivo", async () => {
    mocksBase();
    conSesion();
    vi.mocked(solicitarPromocion).mockRejectedValue(
      new Error("Release gate: tasa de éxito 40% por debajo del umbral 80%")
    );
    const usuario = userEvent.setup();

    render(<PanelAmbientes agentId="a-1" />);
    await screen.findByRole("button", { name: "Solicitar Promotion" });

    await usuario.click(
      screen.getByRole("button", { name: "Solicitar Promotion" })
    );

    expect(
      await screen.findByText(
        "Release gate: tasa de éxito 40% por debajo del umbral 80%"
      )
    ).toBeInTheDocument();
  });

  it("el 503 de ENVVARS_KEY llega a la sección de variables con su detalle", async () => {
    mocksBase();
    const motivo =
      "La clave ENVVARS_KEY no descifra los secretos guardados; revisa .env";
    vi.mocked(listarVarsAmbiente).mockRejectedValue(new Error(motivo));

    render(<PanelAmbientes agentId="a-1" />);

    expect(await screen.findByText(motivo)).toBeInTheDocument();
  });

  it("lista las variables enmascaradas del ambiente", async () => {
    mocksBase({ vars: { OPENAI_KEY: "sk-***" } });

    render(<PanelAmbientes agentId="a-1" />);

    expect(await screen.findByText("OPENAI_KEY")).toBeInTheDocument();
    expect(screen.getByText("sk-***")).toBeInTheDocument();
  });
});

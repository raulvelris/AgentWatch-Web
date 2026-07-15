import { render, screen, waitFor } from "@testing-library/react";
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
  guardarVarsAmbiente,
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

  it("el form ya no pide solicitante ni rol: salen del token de la sesión", async () => {
    mocksBase();
    conSesion();
    vi.mocked(solicitarPromocion).mockResolvedValue(PROMO_APROBADA);
    const usuario = userEvent.setup();

    render(<PanelAmbientes agentId="a-1" />);
    await screen.findByRole("button", { name: "Solicitar Promotion" });

    // Los dos campos muertos (el backend los ignoraba) ya no existen.
    expect(screen.queryByLabelText(/Rol \(stub sin JWT\)/)).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Solicitante")).not.toBeInTheDocument();

    await usuario.click(
      screen.getByRole("button", { name: "Solicitar Promotion" })
    );

    // El body va sin solicitante ni rol_solicitante: el backend usa el JWT.
    expect(solicitarPromocion).toHaveBeenCalledWith("a-1", {
      ambiente_origen: "dev",
      ambiente_destino: "staging",
    });
  });

  it("sin sesión el promote corta en el cliente con un hint", async () => {
    mocksBase();
    const usuario = userEvent.setup();

    render(<PanelAmbientes agentId="a-1" />);
    await screen.findByRole("button", { name: "Solicitar Promotion" });

    await usuario.click(
      screen.getByRole("button", { name: "Solicitar Promotion" })
    );

    expect(screen.getByText(/Sin sesión activa/)).toBeInTheDocument();
    expect(solicitarPromocion).not.toHaveBeenCalled();
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

  it("guardar una variable no pisa la tabla si el usuario cambió de ambiente", async () => {
    // Review de correctitud: recargarVars capturaba el varsEnv del click. Si el
    // PUT resolvía después de cambiar el select, la tabla del ambiente nuevo
    // quedaba pisada con las variables del ambiente viejo.
    mocksBase();
    conSesion();
    vi.mocked(listarVarsAmbiente).mockImplementation(
      async (_id, env): Promise<Record<string, string>> =>
        env === "dev" ? { DEV_VAR: "d***" } : { STG_VAR: "s***" }
    );
    let resolverPut: () => void = () => {};
    vi.mocked(guardarVarsAmbiente).mockImplementation(
      () =>
        new Promise<void>((res) => {
          resolverPut = res;
        })
    );
    const usuario = userEvent.setup();

    render(<PanelAmbientes agentId="a-1" />);
    expect(await screen.findByText("DEV_VAR")).toBeInTheDocument();

    // Dispara el PUT (queda en vuelo) y cambia a staging mientras tanto.
    await usuario.type(screen.getByLabelText("Nombre"), "NUEVA");
    await usuario.type(screen.getByLabelText("Valor (secreto)"), "x");
    await usuario.click(screen.getByRole("button", { name: "Guardar cifrada" }));
    await usuario.selectOptions(screen.getByLabelText("Ambiente"), "staging");
    expect(await screen.findByText("STG_VAR")).toBeInTheDocument();

    resolverPut();
    // La tabla tiene que seguir mostrando staging, no las vars de dev.
    await waitFor(() => {
      expect(screen.queryByText("DEV_VAR")).not.toBeInTheDocument();
    });
    expect(screen.getByText("STG_VAR")).toBeInTheDocument();
  });

  it("si la recarga tras una promoción falla, el error se ve aunque haya tabla", async () => {
    // Review de correctitud: con promociones ya cargadas, el error de recargar()
    // se seteaba pero ningún bloque del JSX lo pintaba.
    mocksBase({ promociones: [PROMO_APROBADA] });
    conSesion();
    vi.mocked(solicitarPromocion).mockResolvedValue(PROMO_APROBADA);
    vi.mocked(listarPromociones)
      .mockResolvedValueOnce([PROMO_APROBADA]) // carga inicial
      .mockRejectedValueOnce(new Error("No se pudieron recargar los datos.")); // recarga
    const usuario = userEvent.setup();

    render(<PanelAmbientes agentId="a-1" />);
    await screen.findByRole("button", { name: "Solicitar Promotion" });

    await usuario.click(
      screen.getByRole("button", { name: "Solicitar Promotion" })
    );

    expect(
      await screen.findByText("No se pudieron recargar los datos.")
    ).toBeInTheDocument();
  });
});

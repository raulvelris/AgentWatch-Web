import { act } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

vi.mock("../servicios/despliegueServicio", () => ({
  MODO_MOCK: false,
  desplegarAgente: vi.fn(),
}));

import RegistroDespliegue from "./RegistroDespliegue";
import { desplegarAgente } from "../servicios/despliegueServicio";
import type { ManejadoresDespliegue } from "../servicios/despliegueServicio";

function conSesion() {
  sessionStorage.setItem(
    "agentwatch_auth",
    JSON.stringify({ token: "t", usuario: "admin_a", rol: "ADMIN", tenant: "x" })
  );
}

// Captura los manejadores que el componente le pasa al servicio, para emitir
// frames SSE sintéticos desde el test.
function capturarManejadores(): () => ManejadoresDespliegue {
  let capturados: ManejadoresDespliegue | null = null;
  vi.mocked(desplegarAgente).mockImplementation((_id, manejadores) => {
    capturados = manejadores;
    return () => {};
  });
  return () => {
    if (!capturados) throw new Error("desplegarAgente no fue llamado");
    return capturados;
  };
}

describe("RegistroDespliegue", () => {
  it("sin sesión corta en el cliente con un hint y no llama al backend", async () => {
    const usuario = userEvent.setup();
    render(<RegistroDespliegue agentId="a-1" />);

    await usuario.click(screen.getByRole("button", { name: "Desplegar agente" }));

    expect(
      screen.getByText(/Sin sesión activa: entra como admin_a/)
    ).toBeInTheDocument();
    expect(desplegarAgente).not.toHaveBeenCalled();
  });

  it("pinta en rojo el frame de fallo real ({fase: X, estado: 'error'})", async () => {
    conSesion();
    const manejadores = capturarManejadores();
    const usuario = userEvent.setup();
    render(<RegistroDespliegue agentId="a-1" />);

    await usuario.click(screen.getByRole("button", { name: "Desplegar agente" }));
    expect(desplegarAgente).toHaveBeenCalledWith("a-1", expect.any(Object));

    act(() => {
      manejadores().onEvento({ fase: "build", mensaje: "construyendo" });
      manejadores().onEvento({
        fase: "healthcheck",
        mensaje: "healthcheck fallido",
        estado: "error",
      });
    });

    const lineaNormal = screen.getByText("construyendo").closest(".log-line");
    const lineaError = screen
      .getByText("healthcheck fallido")
      .closest(".log-line");
    expect(lineaNormal).not.toHaveClass("fase-error");
    expect(lineaError).toHaveClass("fase-error");
  });

  it("muestra la caja de éxito con URL y salud en done/success", async () => {
    conSesion();
    const manejadores = capturarManejadores();
    const usuario = userEvent.setup();
    render(<RegistroDespliegue agentId="a-1" />);

    await usuario.click(screen.getByRole("button", { name: "Desplegar agente" }));
    act(() => {
      manejadores().onEvento({
        fase: "done",
        mensaje: "listo",
        estado: "success",
        url: "https://agente.demo.run.app",
        salud: "healthy",
      });
      manejadores().onFin();
    });

    expect(screen.getByText("Despliegue finalizado")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "https://agente.demo.run.app" })
    ).toBeInTheDocument();
    expect(screen.getByText("healthy")).toHaveClass("pill-ok");
  });

  it("un done con estado failed muestra el error del pipeline", async () => {
    conSesion();
    const manejadores = capturarManejadores();
    const usuario = userEvent.setup();
    render(<RegistroDespliegue agentId="a-1" />);

    await usuario.click(screen.getByRole("button", { name: "Desplegar agente" }));
    act(() => {
      manejadores().onEvento({
        fase: "done",
        mensaje: "Despliegue fallido: se restauró v1",
        estado: "failed",
      });
      manejadores().onFin();
    });

    expect(
      screen.getByText("No se pudo completar el despliegue.")
    ).toBeInTheDocument();
    expect(
      screen.getAllByText("Despliegue fallido: se restauró v1").length
    ).toBeGreaterThan(0);
  });

  it("avisa al padre al terminar, tanto en éxito como en error de conexión", async () => {
    conSesion();
    const manejadores = capturarManejadores();
    const usuario = userEvent.setup();
    const onTerminado = vi.fn();
    render(
      <RegistroDespliegue agentId="a-1" onDespliegueTerminado={onTerminado} />
    );

    await usuario.click(screen.getByRole("button", { name: "Desplegar agente" }));
    act(() => {
      manejadores().onFin();
    });
    expect(onTerminado).toHaveBeenCalledTimes(1);

    await usuario.click(screen.getByRole("button", { name: "Desplegar agente" }));
    act(() => {
      manejadores().onError("se cortó la conexión");
    });
    // Un deploy que falla también deja una versión 'fallida' que vale refrescar.
    expect(onTerminado).toHaveBeenCalledTimes(2);
    expect(screen.getByText("se cortó la conexión")).toBeInTheDocument();
  });

  it("deshabilita el botón mientras hay un despliegue en curso", async () => {
    conSesion();
    capturarManejadores();
    const usuario = userEvent.setup();
    render(<RegistroDespliegue agentId="a-1" />);

    await usuario.click(screen.getByRole("button", { name: "Desplegar agente" }));

    expect(screen.getByRole("button", { name: "Desplegando..." })).toBeDisabled();
  });
});

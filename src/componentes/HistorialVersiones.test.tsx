import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

vi.mock("../servicios/despliegueServicio", () => ({
  MODO_MOCK: false,
  obtenerVersiones: vi.fn(),
  ejecutarRollback: vi.fn(),
}));

import HistorialVersiones from "./HistorialVersiones";
import {
  ejecutarRollback,
  obtenerVersiones,
} from "../servicios/despliegueServicio";
import type { Version } from "../types/Version";

const HASH_V1 = "a".repeat(64);

const VERSIONES: Version[] = [
  {
    id: "a-1-v1",
    numero: 1,
    fecha: "2026-07-01",
    autor: "admin_a",
    hash_sha256: HASH_V1,
    estado: "inactiva",
  },
  {
    id: "a-1-v2",
    numero: 2,
    fecha: "2026-07-02",
    autor: "admin_a",
    hash_sha256: "b".repeat(64),
    estado: "fallida",
  },
  {
    id: "a-1-v3",
    numero: 3,
    fecha: "2026-07-03",
    autor: "admin_a",
    hash_sha256: "c".repeat(64),
    estado: "activa",
  },
];

function conSesion() {
  sessionStorage.setItem(
    "agentwatch_auth",
    JSON.stringify({ token: "t", usuario: "admin_a", rol: "ADMIN", tenant: "x" })
  );
}

describe("HistorialVersiones", () => {
  it("pinta las versiones con sus estados: activa deshabilitada, fallida en rojo", async () => {
    vi.mocked(obtenerVersiones).mockResolvedValue(VERSIONES);

    render(<HistorialVersiones agentId="a-1" />);

    expect(await screen.findByText("Versión 3")).toBeInTheDocument();
    // La fallida lleva el pill de error (regresión del fix de estilos).
    expect(screen.getByText("fallida")).toHaveClass("pill-bad");
    // La activa no se puede "rollbackear" a sí misma.
    expect(screen.getByRole("button", { name: "Versión activa" })).toBeDisabled();
    // El hash SHA-256 se muestra completo.
    expect(screen.getByText(`sha256: ${HASH_V1}`)).toBeInTheDocument();
  });

  it("el rollback pide confirmación, llama al servicio y recarga", async () => {
    conSesion();
    vi.mocked(obtenerVersiones).mockResolvedValue(VERSIONES);
    vi.mocked(ejecutarRollback).mockResolvedValue({ ok: true });
    const usuario = userEvent.setup();

    render(<HistorialVersiones agentId="a-1" />);
    await screen.findByText("Versión 3");

    // Dos candidatas a rollback (v1 inactiva, v2 fallida): se elige la primera.
    await usuario.click(
      screen.getAllByRole("button", { name: "Rollback a esta versión" })[0]
    );
    expect(
      screen.getByRole("heading", { name: "Confirmar rollback" })
    ).toBeInTheDocument();

    await usuario.click(
      screen.getByRole("button", { name: "Confirmar rollback" })
    );

    await waitFor(() => {
      expect(ejecutarRollback).toHaveBeenCalledWith("a-1", "a-1-v1");
    });
    // Recarga tras el rollback (carga inicial + recarga = 2 llamadas).
    await waitFor(() => {
      expect(obtenerVersiones).toHaveBeenCalledTimes(2);
    });
    // El modal se cierra al terminar.
    expect(
      screen.queryByRole("heading", { name: "Confirmar rollback" })
    ).not.toBeInTheDocument();
  });

  it("sin sesión el rollback corta en el cliente con un hint", async () => {
    vi.mocked(obtenerVersiones).mockResolvedValue(VERSIONES);
    const usuario = userEvent.setup();

    render(<HistorialVersiones agentId="a-1" />);
    await screen.findByText("Versión 3");

    await usuario.click(
      screen.getAllByRole("button", { name: "Rollback a esta versión" })[0]
    );
    await usuario.click(
      screen.getByRole("button", { name: "Confirmar rollback" })
    );

    expect(
      screen.getByText(/Sin sesión activa: entra como admin_a/)
    ).toBeInTheDocument();
    expect(ejecutarRollback).not.toHaveBeenCalled();
    expect(
      screen.queryByRole("heading", { name: "Confirmar rollback" })
    ).not.toBeInTheDocument();
  });

  it("si el rollback falla, cierra el modal y el motivo queda visible", async () => {
    conSesion();
    vi.mocked(obtenerVersiones).mockResolvedValue(VERSIONES);
    vi.mocked(ejecutarRollback).mockRejectedValue(
      new Error("Se requiere rol ADMIN")
    );
    const usuario = userEvent.setup();

    render(<HistorialVersiones agentId="a-1" />);
    await screen.findByText("Versión 3");

    await usuario.click(
      screen.getAllByRole("button", { name: "Rollback a esta versión" })[0]
    );
    await usuario.click(
      screen.getByRole("button", { name: "Confirmar rollback" })
    );

    // El motivo tiene que quedar a la vista: si el modal siguiera abierto,
    // su overlay taparía el error-box de la card.
    expect(await screen.findByText("Se requiere rol ADMIN")).toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: "Confirmar rollback" })
    ).not.toBeInTheDocument();
  });

  it("ante un error de carga muestra el motivo y Reintentar recarga", async () => {
    vi.mocked(obtenerVersiones)
      .mockRejectedValueOnce(new Error("Agente no encontrado"))
      .mockResolvedValueOnce(VERSIONES);
    const usuario = userEvent.setup();

    render(<HistorialVersiones agentId="a-x" />);

    expect(await screen.findByText("Agente no encontrado")).toBeInTheDocument();

    await usuario.click(screen.getByRole("button", { name: "Reintentar" }));

    expect(await screen.findByText("Versión 3")).toBeInTheDocument();
  });

  it("subir `refresco` refetchea sin desmontar (el modal abierto sobrevive)", async () => {
    // Review de correctitud: el refresh por remount (key con contador) mataba
    // un rollback en vuelo. Ahora el refresh llega por prop, sin remount.
    conSesion();
    vi.mocked(obtenerVersiones).mockResolvedValue(VERSIONES);
    const usuario = userEvent.setup();

    const { rerender } = render(<HistorialVersiones agentId="a-1" refresco={0} />);
    await screen.findByText("Versión 3");

    await usuario.click(
      screen.getAllByRole("button", { name: "Rollback a esta versión" })[0]
    );
    expect(
      screen.getByRole("heading", { name: "Confirmar rollback" })
    ).toBeInTheDocument();

    rerender(<HistorialVersiones agentId="a-1" refresco={1} />);

    await waitFor(() => {
      expect(obtenerVersiones).toHaveBeenCalledTimes(2);
    });
    expect(
      screen.getByRole("heading", { name: "Confirmar rollback" })
    ).toBeInTheDocument();
  });
});

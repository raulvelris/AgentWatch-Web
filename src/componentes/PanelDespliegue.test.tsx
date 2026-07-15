import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

// Hijos reemplazados por marcadores: acá se prueba SOLO la lógica del selector
// (carga, preferencia, persistencia). Cada hijo tiene sus propios tests.
vi.mock("./RegistroDespliegue", () => ({
  default: ({ agentId }: { agentId: string }) => (
    <div data-testid="registro">{agentId}</div>
  ),
}));
vi.mock("./HistorialVersiones", () => ({
  default: ({ agentId }: { agentId: string }) => (
    <div data-testid="historial">{agentId}</div>
  ),
}));
vi.mock("./PanelAmbientes", () => ({
  default: ({ agentId }: { agentId: string }) => (
    <div data-testid="ambientes">{agentId}</div>
  ),
}));
vi.mock("../servicios/despliegueServicio", () => ({
  MODO_MOCK: false,
  listarAgentes: vi.fn(),
}));

import PanelDespliegue from "./PanelDespliegue";
import { listarAgentes } from "../servicios/despliegueServicio";

const LISTA = [
  { id: "a-1", nombre: "Soporte Nivel 1", estado: "ACTIVE" },
  { id: "a-2", nombre: "Analista de Datos", estado: "PAUSED" },
];

const CLAVE = "agentwatch_agente_despliegue";

describe("PanelDespliegue (selector de agentes reales)", () => {
  it("carga la lista, selecciona el primero y lo persiste", async () => {
    vi.mocked(listarAgentes).mockResolvedValue(LISTA);

    render(<PanelDespliegue />);

    const selector = await screen.findByRole("combobox");
    expect(selector).toHaveValue("a-1");
    expect(screen.getAllByRole("option")).toHaveLength(2);
    expect(localStorage.getItem(CLAVE)).toBe("a-1");
    // Los tres paneles reciben el agente elegido.
    expect(screen.getByTestId("registro")).toHaveTextContent("a-1");
    expect(screen.getByTestId("historial")).toHaveTextContent("a-1");
    expect(screen.getByTestId("ambientes")).toHaveTextContent("a-1");
  });

  it("respeta la selección guardada si el agente sigue existiendo", async () => {
    localStorage.setItem(CLAVE, "a-2");
    vi.mocked(listarAgentes).mockResolvedValue(LISTA);

    render(<PanelDespliegue />);

    expect(await screen.findByRole("combobox")).toHaveValue("a-2");
  });

  it("usa el puente del wizard M1 si la selección guardada ya no existe", async () => {
    localStorage.setItem(CLAVE, "id-borrado");
    localStorage.setItem("agentwatch_draft_agent", JSON.stringify({ id: "a-2" }));
    vi.mocked(listarAgentes).mockResolvedValue(LISTA);

    render(<PanelDespliegue />);

    expect(await screen.findByRole("combobox")).toHaveValue("a-2");
    // La preferencia queda normalizada en la clave propia de la página.
    expect(localStorage.getItem(CLAVE)).toBe("a-2");
  });

  it("cambiar de agente persiste la elección y remonta los paneles", async () => {
    vi.mocked(listarAgentes).mockResolvedValue(LISTA);
    const usuario = userEvent.setup();

    render(<PanelDespliegue />);

    await usuario.selectOptions(await screen.findByRole("combobox"), "a-2");

    expect(localStorage.getItem(CLAVE)).toBe("a-2");
    expect(screen.getByTestId("historial")).toHaveTextContent("a-2");
  });

  it("sin agentes muestra el aviso del wizard y no monta paneles", async () => {
    vi.mocked(listarAgentes).mockResolvedValue([]);

    render(<PanelDespliegue />);

    expect(
      await screen.findByText(/No hay agentes registrados/)
    ).toBeInTheDocument();
    expect(screen.queryByTestId("registro")).not.toBeInTheDocument();
  });

  it("ante un error muestra el motivo y Reintentar vuelve a cargar", async () => {
    vi.mocked(listarAgentes)
      .mockRejectedValueOnce(new Error("backend caído"))
      .mockResolvedValueOnce(LISTA);
    const usuario = userEvent.setup();

    render(<PanelDespliegue />);

    expect(await screen.findByText("backend caído")).toBeInTheDocument();

    await usuario.click(screen.getByRole("button", { name: "Reintentar" }));

    expect(await screen.findByRole("combobox")).toHaveValue("a-1");
    expect(vi.mocked(listarAgentes)).toHaveBeenCalledTimes(2);
  });
});

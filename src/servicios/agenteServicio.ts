import { fetchConAuth } from "./authServicio";

const API_URL = import.meta.env.VITE_API_URL ?? "http://127.0.0.1:8000/api/v1";

// El payload llega ya convertido a la forma del backend (snake_case) por el
// wizard; unknown en vez de any: JSON.stringify no necesita más.
export const crearAgente = async (agente: unknown) => {
  const response = await fetchConAuth(`${API_URL}/agents/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(agente),
  });

  if (!response.ok) {
    throw new Error("Error al crear el agente");
  }

  return response.json();
};

export const obtenerPlantillas = async () => {
  const response = await fetch(`${API_URL}/templates/`);

  if (!response.ok) {
    throw new Error("Error al obtener plantillas");
  }

  return response.json();
};

export const obtenerAgentes = async () => {
  const response = await fetch(`${API_URL}/agents/`);

  if (!response.ok) {
    throw new Error("Error al obtener agentes");
  }

  return response.json();
};

export const obtenerReportesSeguridad = async () => {
  const response = await fetch(`${API_URL}/security/reports`);

  if (!response.ok) {
    throw new Error("Error al obtener reportes de seguridad");
  }

  return response.json();
};
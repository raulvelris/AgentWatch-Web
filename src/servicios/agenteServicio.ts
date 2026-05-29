const API_URL = "http://127.0.0.1:8000/api/v1";

export const crearAgente = async (agente: any) => {
  const response = await fetch(`${API_URL}/agents/`, {
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
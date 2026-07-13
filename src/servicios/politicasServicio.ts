import { fetchConAuth } from "./authServicio";

const API_URL =
  import.meta.env.VITE_API_URL ?? "http://127.0.0.1:8000/api/v1";

export type PoliticaBackend = {
  id: string;
  tenant_id: string;
  nombre: string;
  descripcion: string;
  severidad: string;
  activa: boolean;
  tipo: "informativa" | "release_gate";
  metrica: string | null;
  umbral: number | null;
  ventana: number | null;
};

export async function crearPolitica(
  politica: PoliticaBackend
): Promise<PoliticaBackend> {
  const respuesta = await fetchConAuth(`${API_URL}/governance/policies`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(politica),
  });

  if (!respuesta.ok) {
    let mensaje = `El backend respondió ${respuesta.status}`;

    try {
      const error = await respuesta.json();
      mensaje = error?.detail ?? mensaje;
    } catch {
      // Se conserva el mensaje básico.
    }

    throw new Error(mensaje);
  }

  const datos = await respuesta.json();
  return datos.policy;
}
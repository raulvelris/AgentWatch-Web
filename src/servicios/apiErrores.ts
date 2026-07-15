// Extrae el `detail` que manda FastAPI en los errores (401/403/404/409/503)
// para mostrarlo tal cual en la UI en vez de un mensaje genérico. Es el mismo
// patrón que usaba solicitarPromocion inline, extraído para todo el Módulo 2.
export async function extraerDetalle(
  respuesta: Response,
  porDefecto?: string
): Promise<string> {
  let detalle = porDefecto ?? `El backend respondió ${respuesta.status}`;
  try {
    const cuerpo: unknown = await respuesta.json();
    const detail = (cuerpo as { detail?: unknown })?.detail;
    if (typeof detail === "string" && detail.trim()) {
      detalle = detail;
    }
  } catch {
    // Respuesta sin cuerpo JSON: se queda el mensaje por defecto.
  }
  return detalle;
}

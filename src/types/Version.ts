// Tipos del Módulo 2 (Despliegue / CI/CD) — RF07.
// Forma que devuelve el backend (snake_case, igual que ReporteAuditoria).
// El listado llega envuelto: GET /agents/{id}/versions -> { versions: Version[] }.

// "fallida": una versión candidata cuyo deploy falló y el revert automático
// dejó vigente a la previa (RF05). El backend la devuelve en GET /versions.
export type EstadoVersion = "activa" | "inactiva" | "rollback" | "fallida";

export interface Version {
  id: string;
  numero: number;
  fecha: string;
  autor: string;
  hash_sha256: string;
  estado: EstadoVersion;
  // El backend la manda siempre ("Deploy ...", "rollback to ..."); opcional
  // para no romper fixtures viejas.
  descripcion?: string;
}

// Tipos del Módulo 2 (Despliegue / CI/CD) — RF07.
// Forma que devuelve el backend (snake_case, igual que ReporteAuditoria).
// El listado llega envuelto: GET /agents/{id}/versions -> { versions: Version[] }.

export type EstadoVersion = "activa" | "inactiva" | "rollback";

export interface Version {
  id: string;
  numero: number;
  fecha: string;
  autor: string;
  hash_sha256: string;
  estado: EstadoVersion;
}

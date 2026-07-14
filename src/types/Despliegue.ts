// Tipos del Módulo 2 (Despliegue / CI/CD) — RF05.
// El backend transmite el progreso del despliegue como Server-Sent Events
// (un frame `data: {json}` por evento). Cada frame deserializa a EventoDespliegue.

export type FaseDespliegue =
  | "queued"
  | "build"
  | "push"
  | "deploy"
  | "healthcheck"
  // "revert": el deploy falló y el backend restauró la versión previa (RF05).
  | "revert"
  | "done"
  | "error";

export type EstadoSalud = "healthy" | "unhealthy";

// "error" llega en el frame de la fase que falló ({fase: "healthcheck",
// estado: "error"}); "failed" llega en el frame done de un deploy fallido.
export type EstadoDespliegue = "success" | "failed" | "error";

export interface EventoDespliegue {
  fase: FaseDespliegue;
  mensaje: string;
  timestamp?: string;
  // Los siguientes solo llegan en la fase final ("done") o de "error":
  url?: string;
  salud?: EstadoSalud;
  estado?: EstadoDespliegue;
}

// Resumen de un agente real del backend (GET /agents/) para el selector de la
// página de despliegue. El deploy exige que el agente exista en el backend;
// los campos completos del agente son del Módulo 1.
export interface AgenteResumen {
  id: string;
  nombre: string;
  estado: string;
}

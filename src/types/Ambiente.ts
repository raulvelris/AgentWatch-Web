// Tipos del Módulo 2 (Ambientes / Promotion) — RF06.
// Los literales de `estado` y `tipo` coinciden EXACTO con lo que devuelve el
// backend (environments.py / notifications.py): están en español.

export type Ambiente = "dev" | "staging" | "prod";

export type EstadoPromocion = "aprobada" | "pendiente" | "expirada";

// OJO: el backend (_a_dict en environments.py) NO devuelve `id` en la promotion.
export interface Promocion {
  agent_id: string;
  ambiente_origen: string;
  ambiente_destino: string;
  solicitante: string;
  aprobado_por: string | null;
  estado: EstadoPromocion;
  fecha: string;
}

export type TipoNotificacion =
  | "promotion_pendiente"
  | "promotion_expirada"
  | "deploy_fallido";

export interface Notificacion {
  id: number;
  tipo: TipoNotificacion;
  destinatario_rol: string;
  mensaje: string;
  agent_id: string | null;
  fecha: string;
}

// El body del promote solo lleva los ambientes: el solicitante y el rol los
// toma el backend de los claims del JWT (environments.py). Los campos viejos
// `solicitante` y `rol_solicitante` quedaron deprecados y el backend los ignora.
export interface ParamsPromocion {
  ambiente_origen: string;
  ambiente_destino: string;
}

// Auth mínima del Módulo 2 (Web). Reusa el login JWT del backend
// (GET /auth/login?usuario=...) que ya existe y valida get_current_claims.
// El token se guarda en sessionStorage para que sobreviva la navegación dura
// a /despliegue.html (misma pestaña). fetchConAuth lo agrega como
// Authorization: Bearer en las llamadas del Módulo 2 (deploy, rollback,
// promote, env-vars), que el backend ahora exige.

const API_URL = import.meta.env.VITE_API_URL ?? "http://127.0.0.1:8000/api/v1";
const CLAVE_SESION = "agentwatch_auth";

export interface Sesion {
  token: string;
  usuario: string;
  rol: string;
}

export async function iniciarSesion(usuario: string): Promise<Sesion> {
  const respuesta = await fetch(
    `${API_URL}/auth/login?usuario=${encodeURIComponent(usuario)}`
  );
  if (!respuesta.ok) {
    throw new Error(`El backend respondió ${respuesta.status} al iniciar sesión`);
  }
  const datos = await respuesta.json();
  // El login devuelve { error } (con 200) si el usuario no existe.
  if (!datos?.token) {
    throw new Error(datos?.error ?? "Login sin token");
  }
  const sesion: Sesion = {
    token: datos.token,
    usuario: datos.usuario,
    rol: datos.rol,
  };
  sessionStorage.setItem(CLAVE_SESION, JSON.stringify(sesion));
  return sesion;
}

export function obtenerSesion(): Sesion | null {
  try {
    const bruto = sessionStorage.getItem(CLAVE_SESION);
    return bruto ? (JSON.parse(bruto) as Sesion) : null;
  } catch {
    return null;
  }
}

export function cerrarSesion(): void {
  sessionStorage.removeItem(CLAVE_SESION);
}

// Envuelve fetch agregando el header Authorization si hay sesión. Pasa el resto
// de opciones tal cual (sirve para el SSE del deploy, que usa signal).
export function fetchConAuth(
  url: string,
  opts: RequestInit = {}
): Promise<Response> {
  const sesion = obtenerSesion();
  if (sesion?.token) {
    return fetch(url, {
      ...opts,
      headers: { ...(opts.headers ?? {}), Authorization: `Bearer ${sesion.token}` },
    });
  }
  return fetch(url, opts);
}

import { useState } from "react";

import {
  cerrarSesion,
  iniciarSesion,
  obtenerSesion,
  type Sesion,
} from "../servicios/authServicio";

// Control de sesión mínimo para el Módulo 2. El backend ahora exige token en
// deploy, rollback, promote y en el PUT/DELETE de variables. Este control obtiene
// un JWT del login stub y lo deja en sessionStorage; los servicios lo agregan
// como Authorization: Bearer. Para la demo alcanza con entrar como admin_a
// (ADMIN) o viewer_a (VIEWER) y ver cómo cambian los permisos.

const barra: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "0.75rem",
  flexWrap: "wrap",
  padding: "0.6rem 0.9rem",
  marginBottom: "1rem",
  borderRadius: "8px",
  border: "1px solid rgba(148, 163, 184, 0.35)",
  fontSize: "0.9rem",
};

export default function ControlSesion() {
  const [sesion, setSesion] = useState<Sesion | null>(obtenerSesion());
  const [error, setError] = useState<string | null>(null);

  async function entrar(usuario: string) {
    setError(null);
    try {
      setSesion(await iniciarSesion(usuario));
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo iniciar sesión");
    }
  }

  function salir() {
    cerrarSesion();
    setSesion(null);
  }

  return (
    <div style={barra}>
      {sesion ? (
        <>
          <span>
            Sesión: <strong>{sesion.usuario}</strong> ({sesion.rol})
          </span>
          <button type="button" onClick={salir}>
            Salir
          </button>
        </>
      ) : (
        <>
          <span>Sin sesión. Las acciones de despliegue exigen un token.</span>
          <button type="button" onClick={() => entrar("admin_a")}>
            Entrar como admin_a (ADMIN)
          </button>
          <button type="button" onClick={() => entrar("viewer_a")}>
            Entrar como viewer_a (VIEWER)
          </button>
        </>
      )}
      {error && <span style={{ color: "crimson" }}>{error}</span>}
    </div>
  );
}

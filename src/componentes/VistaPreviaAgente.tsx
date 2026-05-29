import type { Agente } from "../types/Agente";

type Props = {
  agente: Agente;
  onClose: () => void;
};

function VistaPreviaAgente({ agente, onClose }: Props) {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.6)",
        display: "grid",
        placeItems: "center",
        zIndex: 999,
      }}
    >
      <div
        style={{
          width: "700px",
          maxWidth: "90%",
          background: "#0f172a",
          border: "1px solid #334155",
          borderRadius: "20px",
          padding: "25px",
          color: "white",
        }}
      >
        <h2>Vista previa del agente</h2>

        <p>
          Revisa la información antes de guardar o desplegar el agente.
        </p>

        <hr />

        <p>
          <strong>Nombre:</strong> {agente.nombre || "Sin completar"}
        </p>

        <p>
          <strong>Tipo:</strong> {agente.tipo}
        </p>

        <p>
          <strong>Propósito:</strong>{" "}
          {agente.proposito || "Sin completar"}
        </p>

        <p>
          <strong>Fuente:</strong> {agente.fuente}
        </p>

        <p>
          <strong>Descripción fuente:</strong>{" "}
          {agente.descripcionFuente || "Sin completar"}
        </p>

        <p>
          <strong>Regla:</strong>{" "}
          {agente.regla || "Sin completar"}
        </p>

        <p>
          <strong>Supervisión:</strong> {agente.supervision}
        </p>

        <p>
          <strong>Estado:</strong> {agente.estado}
        </p>

        <div
          style={{
            marginTop: "20px",
            display: "flex",
            justifyContent: "flex-end",
          }}
        >
          <button
            className="primary"
            onClick={onClose}
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}

export default VistaPreviaAgente;
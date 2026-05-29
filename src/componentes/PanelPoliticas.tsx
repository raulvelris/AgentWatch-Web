import { useEffect, useState } from "react";
import { obtenerAgentes } from "../servicios/agenteServicio";

type PoliticaVersion = {
  id: string;
  textoOriginal: string;
  restriccionTecnica: string;
  fecha: string;
  agentesAsignados: string[];
};

type Agente = {
  id: string;
  nombre: string;
  tipo: string;
};

const politicasPredefinidas = [
  {
    titulo: "Confidencialidad",
    texto: "El agente no debe revelar información confidencial de la empresa.",
    industria: "Legal",
  },
  {
    titulo: "Competidores",
    texto: "El agente nunca debe mencionar a competidores.",
    industria: "Retail",
  },
  {
    titulo: "Idioma",
    texto: "El agente debe responder siempre en español.",
    industria: "General",
  },
  {
    titulo: "Fuentes",
    texto:
      "El agente debe citar sus fuentes cuando entregue información importante.",
    industria: "Gobierno",
  },
  {
    titulo: "Salud",
    texto: "El agente no debe dar diagnósticos ni recomendaciones médicas.",
    industria: "Salud",
  },
];

function PanelPoliticas() {
  const [politica, setPolitica] = useState("");
  const [traduccion, setTraduccion] = useState("");
  const [versiones, setVersiones] = useState<PoliticaVersion[]>([]);
  const [agentes, setAgentes] = useState<Agente[]>([]);
  const [agentesSeleccionados, setAgentesSeleccionados] = useState<string[]>(
    []
  );

  useEffect(() => {
    obtenerAgentes()
      .then((data) => {
        setAgentes(data.agents);
      })
      .catch((error) => {
        console.error(error);
      });
  }, []);

  const usarPoliticaPredefinida = (texto: string) => {
    setPolitica(texto);
    setTraduccion("");
  };

  const cambiarSeleccionAgente = (nombreAgente: string) => {
    if (agentesSeleccionados.includes(nombreAgente)) {
      setAgentesSeleccionados(
        agentesSeleccionados.filter((agente) => agente !== nombreAgente)
      );
    } else {
      setAgentesSeleccionados([...agentesSeleccionados, nombreAgente]);
    }
  };

  const normalizarTexto = (texto: string) => {
    return texto
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[.,;:¿?¡!]/g, "")
      .trim();
  };

  const obtenerTemaPrincipal = (texto: string) => {
    const textoNormalizado = normalizarTexto(texto);

    const temas = [
      "competidores",
      "competidor",
      "informacion confidencial",
      "datos confidenciales",
      "diagnosticos",
      "recomendaciones medicas",
      "fuentes",
      "espanol",
      "ingles",
    ];

    const temaEncontrado = temas.find((tema) =>
      textoNormalizado.includes(tema)
    );

    return temaEncontrado || "";
  };

  const obtenerIntencion = (texto: string) => {
    const textoNormalizado = normalizarTexto(texto);

    const patronesNegacion = [
      "no debe",
      "nunca",
      "prohibido",
      "no puede",
      "evitar",
      "no mencionar",
      "no revelar",
      "no responder",
      "no dar",
    ];

    const patronesObligacion = [
      "debe",
      "siempre",
      "obligatorio",
      "permitir",
      "puede",
      "mencionar",
      "revelar",
      "responder",
      "dar",
      "citar",
    ];

    const esNegacion = patronesNegacion.some((patron) =>
      textoNormalizado.includes(patron)
    );

    if (esNegacion) {
      return "NEGACION";
    }

    const esObligacion = patronesObligacion.some((patron) =>
      textoNormalizado.includes(patron)
    );

    if (esObligacion) {
      return "OBLIGACION";
    }

    return "NEUTRA";
  };

  const existeConflicto = () => {
    const temaNuevaPolitica = obtenerTemaPrincipal(politica);
    const intencionNuevaPolitica = obtenerIntencion(politica);

    if (!temaNuevaPolitica || intencionNuevaPolitica === "NEUTRA") {
      return false;
    }

    return versiones.some((version) => {
      const temaGuardado = obtenerTemaPrincipal(version.textoOriginal);
      const intencionGuardada = obtenerIntencion(version.textoOriginal);

      const mismoTema = temaGuardado === temaNuevaPolitica;
      const intencionesOpuestas =
        (intencionGuardada === "NEGACION" &&
          intencionNuevaPolitica === "OBLIGACION") ||
        (intencionGuardada === "OBLIGACION" &&
          intencionNuevaPolitica === "NEGACION");

      return mismoTema && intencionesOpuestas;
    });
  };

  const traducirPolitica = () => {
    if (!politica.trim()) {
      alert("Escribe una política antes de traducir.");
      return;
    }

    const restriccion = `{
  "tipo": "restriccion_comportamiento",
  "regla": "${politica}",
  "accion": "validar_antes_de_responder",
  "estado": "pendiente_confirmacion"
}`;

    setTraduccion(restriccion);
  };

  const guardarPolitica = () => {
    if (!politica.trim() || !traduccion.trim()) {
      alert("Primero escribe y traduce una política.");
      return;
    }

    if (agentesSeleccionados.length === 0) {
      alert("Selecciona al menos un agente para asignar la política.");
      return;
    }

    if (existeConflicto()) {
      alert("Conflicto detectado: ya existe una política opuesta sobre el mismo tema.");
      return;
    }

    const nuevaVersion: PoliticaVersion = {
      id: crypto.randomUUID(),
      textoOriginal: politica,
      restriccionTecnica: traduccion,
      fecha: new Date().toLocaleString(),
      agentesAsignados: agentesSeleccionados,
    };

    setVersiones([nuevaVersion, ...versiones]);
    setPolitica("");
    setTraduccion("");
    setAgentesSeleccionados([]);

    alert("Política guardada y asignada correctamente.");
  };

  return (
    <div className="section-card">
      <h2>Editor de políticas</h2>

      <p>
        Define reglas de gobernanza en lenguaje natural para controlar el
        comportamiento del agente.
      </p>

      <div className="preview-box">
        <strong>Biblioteca de políticas predefinidas</strong>

        <p>
          Selecciona una política base para cargarla en el editor y modificarla
          si es necesario.
        </p>

        <div className="template-grid">
          {politicasPredefinidas.map((item) => (
            <div className="template-card" key={item.titulo}>
              <h3>{item.titulo}</h3>

              <p>{item.texto}</p>

              <p>
                <strong>Industria:</strong> {item.industria}
              </p>

              <button
                className="primary"
                onClick={() => usarPoliticaPredefinida(item.texto)}
              >
                Usar política
              </button>
            </div>
          ))}
        </div>
      </div>

      <label>Nueva política</label>

      <textarea
        placeholder="Ejemplo: El agente nunca debe mencionar a competidores."
        value={politica}
        onChange={(e) => setPolitica(e.target.value)}
      />

      <div className="preview-box">
        <strong>Asignar política a agentes</strong>

        {agentes.length === 0 ? (
          <p>No hay agentes creados todavía.</p>
        ) : (
          agentes.map((agente) => (
            <label
              key={agente.id}
              style={{
                display: "block",
                marginTop: "10px",
                cursor: "pointer",
              }}
            >
              <input
                type="checkbox"
                checked={agentesSeleccionados.includes(agente.nombre)}
                onChange={() => cambiarSeleccionAgente(agente.nombre)}
              />{" "}
              {agente.nombre} — {agente.tipo}
            </label>
          ))
        )}
      </div>

      <div className="actions">
        <button className="primary" onClick={traducirPolitica}>
          Traducir política
        </button>

        <button className="secondary" onClick={guardarPolitica}>
          Guardar versión
        </button>
      </div>

      {traduccion && (
        <div className="preview-box">
          <strong>Restricción técnica generada</strong>

          <pre>{traduccion}</pre>
        </div>
      )}

      <div className="preview-box">
        <strong>Historial de versiones</strong>

        {versiones.length === 0 ? (
          <p>No hay políticas guardadas todavía.</p>
        ) : (
          versiones.map((version, index) => (
            <div key={version.id} style={{ marginTop: "15px" }}>
              <strong>v{versiones.length - index}</strong>
              <p>{version.textoOriginal}</p>
              <small>{version.fecha}</small>

              <p>
                <strong>Agentes asignados:</strong>{" "}
                {version.agentesAsignados.join(", ")}
              </p>

              <pre>{version.restriccionTecnica}</pre>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default PanelPoliticas;
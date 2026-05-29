import { useState } from "react";

type PoliticaVersion = {
  id: string;
  textoOriginal: string;
  restriccionTecnica: string;
  fecha: string;
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
    texto: "El agente debe citar sus fuentes cuando entregue información importante.",
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

  const usarPoliticaPredefinida = (texto: string) => {
    setPolitica(texto);
    setTraduccion("");
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

    const nuevaVersion: PoliticaVersion = {
      id: crypto.randomUUID(),
      textoOriginal: politica,
      restriccionTecnica: traduccion,
      fecha: new Date().toLocaleString(),
    };

    setVersiones([nuevaVersion, ...versiones]);
    setPolitica("");
    setTraduccion("");

    alert("Política guardada como nueva versión.");
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
              <pre>{version.restriccionTecnica}</pre>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default PanelPoliticas;
import { useState } from "react";
import type { Agente } from "../types/Agente";

type Props = {
  agentData: Agente;
  setAgentData: React.Dispatch<React.SetStateAction<Agente>>;
};

const steps = [
  {
    title: "Propósito",
    description: "Datos principales del agente",
  },
  {
    title: "Fuentes de datos",
    description: "Documentos, APIs o entradas",
  },
  {
    title: "Comportamiento",
    description: "Reglas y límites del agente",
  },
  {
    title: "Revisión",
    description: "Validación antes de guardar",
  },
];

const templates = [
  "Revisor de documentos",
  "Extractor de datos",
  "Generador de resúmenes",
  "Consolidador multi-fuente",
  "Asistente de decisiones",
];

function WizardAgente({ agentData, setAgentData }: Props) {
  const [activeStep, setActiveStep] = useState(0);
  const [error, setError] = useState("");

  const [testInput, setTestInput] = useState("");
  const [testResponse, setTestResponse] = useState("");

  const handleChange = (field: keyof Agente, value: string) => {
    setAgentData({
      ...agentData,
      [field]: value,
    });

    setError("");
  };

  const validateStep = () => {
    if (activeStep === 0) {
      if (!agentData.nombre.trim()) {
        setError("El nombre del agente es obligatorio.");
        return false;
      }

      if (!agentData.proposito.trim()) {
        setError("El propósito del agente es obligatorio.");
        return false;
      }
    }

    if (activeStep === 1) {
      if (!agentData.descripcionFuente.trim()) {
        setError("La descripción de la fuente es obligatoria.");
        return false;
      }
    }

    if (activeStep === 2) {
      if (!agentData.regla.trim()) {
        setError("La regla de comportamiento es obligatoria.");
        return false;
      }
    }

    return true;
  };

  const guardarBorrador = () => {
    localStorage.setItem("agentwatch_draft_agent", JSON.stringify(agentData));

    alert("Borrador guardado correctamente.");
  };

  const nextStep = () => {
    const isValid = validateStep();

    if (!isValid) {
      return;
    }

    if (activeStep < steps.length - 1) {
      setActiveStep(activeStep + 1);
    } else {
      guardarBorrador();
      alert("Agente creado en estado DRAFT");
    }
  };

  const previousStep = () => {
    if (activeStep > 0) {
      setActiveStep(activeStep - 1);
    }
  };

  const probarAgente = () => {
    if (!testInput.trim()) {
      setTestResponse("Ingrese un input de prueba.");
      return;
    }

    setTestResponse(
      `Respuesta simulada del agente "${agentData.nombre}": el agente procesó el mensaje "${testInput}" siguiendo el propósito configurado: "${agentData.proposito}".`
    );
  };

  return (
    <div className="wizard-grid">
      <div className="steps-card">
        {steps.map((step, index) => (
          <button
            key={step.title}
            className={activeStep === index ? "step active" : "step"}
            onClick={() => setActiveStep(index)}
          >
            <span>{String(index + 1).padStart(2, "0")}</span>

            <div>
              <strong>{step.title}</strong>
              <p>{step.description}</p>
            </div>
          </button>
        ))}
      </div>

      <div className="form-card">
        <div className="form-header">
          <div>
            <div className="eyebrow">Paso {activeStep + 1}</div>
            <h2>{steps[activeStep].title}</h2>
          </div>

          <div className="status-pill">Draft</div>
        </div>

        {activeStep === 0 && (
          <>
            <label>Nombre del agente</label>

            <input
              type="text"
              placeholder="Ejemplo: Revisor de contratos legales"
              value={agentData.nombre}
              onChange={(e) => handleChange("nombre", e.target.value)}
            />

            <label>Tipo de agente</label>

            <select
              value={agentData.tipo}
              onChange={(e) => handleChange("tipo", e.target.value)}
            >
              {templates.map((template) => (
                <option key={template}>{template}</option>
              ))}
            </select>

            <label>Propósito</label>

            <textarea
              placeholder="Describe qué tarea realizará el agente y qué resultado debe entregar..."
              value={agentData.proposito}
              onChange={(e) => handleChange("proposito", e.target.value)}
            />
          </>
        )}

        {activeStep === 1 && (
          <>
            <label>Fuente principal</label>

            <select
              value={agentData.fuente}
              onChange={(e) => handleChange("fuente", e.target.value)}
            >
              <option>Documentos PDF</option>
              <option>Base de datos</option>
              <option>API externa</option>
              <option>Texto manual</option>
            </select>

            <label>Descripción de la fuente</label>

            <textarea
              placeholder="Describe de dónde obtendrá información el agente..."
              value={agentData.descripcionFuente}
              onChange={(e) =>
                handleChange("descripcionFuente", e.target.value)
              }
            />
          </>
        )}

        {activeStep === 2 && (
          <>
            <label>Regla de comportamiento</label>

            <textarea
              placeholder="Ejemplo: El agente no debe revelar información confidencial."
              value={agentData.regla}
              onChange={(e) => handleChange("regla", e.target.value)}
            />

            <label>Nivel de supervisión</label>

            <select
              value={agentData.supervision}
              onChange={(e) => handleChange("supervision", e.target.value)}
            >
              <option>Bajo</option>
              <option>Medio</option>
              <option>Alto</option>
            </select>
          </>
        )}

        {activeStep === 3 && (
          <div className="review-box">
            <h3>Revisión final</h3>

            <p>
              Revisa la configuración antes de guardar el agente en estado
              DRAFT.
            </p>

            <ul>
              <li>
                <strong>ID del agente:</strong> {agentData.id}
              </li>
              <li>
                <strong>Nombre:</strong> {agentData.nombre}
              </li>
              <li>
                <strong>Tipo:</strong> {agentData.tipo}
              </li>
              <li>
                <strong>Propósito:</strong> {agentData.proposito}
              </li>
              <li>
                <strong>Fuente:</strong> {agentData.fuente}
              </li>
              <li>
                <strong>Descripción fuente:</strong>{" "}
                {agentData.descripcionFuente}
              </li>
              <li>
                <strong>Regla:</strong> {agentData.regla}
              </li>
              <li>
                <strong>Supervisión:</strong> {agentData.supervision}
              </li>
              <li>
                <strong>Estado:</strong> {agentData.estado}
              </li>
            </ul>

            <hr style={{ margin: "20px 0" }} />

            <h3>Prueba del agente</h3>

            <textarea
              placeholder="Ingrese un input de prueba..."
              value={testInput}
              onChange={(e) => setTestInput(e.target.value)}
            />

            <div style={{ marginTop: "10px" }}>
              <button className="primary" onClick={probarAgente}>
                Probar agente
              </button>
            </div>

            {testResponse && (
              <div
                style={{
                  marginTop: "15px",
                  padding: "15px",
                  borderRadius: "12px",
                  background: "#0f172a",
                  border: "1px solid #334155",
                }}
              >
                <strong>Respuesta:</strong>
                <p>{testResponse}</p>
              </div>
            )}
          </div>
        )}

        {error && (
          <div
            style={{
              marginTop: "15px",
              padding: "12px",
              borderRadius: "12px",
              background: "rgba(239,68,68,0.15)",
              border: "1px solid #ef4444",
              color: "#fecaca",
              fontWeight: "bold",
            }}
          >
            {error}
          </div>
        )}

        <div className="preview-box">
          <strong>Resumen esperado</strong>

          <p>
            El agente será creado en estado DRAFT y podrá ser revisado antes del
            despliegue.
          </p>
        </div>

        <div className="actions">
          <button
            className="secondary"
            onClick={previousStep}
            disabled={activeStep === 0}
          >
            Atrás
          </button>

          <button className="secondary" onClick={guardarBorrador}>
            Guardar borrador
          </button>

          <button className="primary" onClick={nextStep}>
            {activeStep === steps.length - 1 ? "Finalizar" : "Siguiente"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default WizardAgente;
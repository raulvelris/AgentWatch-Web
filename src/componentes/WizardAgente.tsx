import { useState } from "react";

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

function WizardAgente() {
  const [activeStep, setActiveStep] = useState(0);

  const nextStep = () => {
    if (activeStep < steps.length - 1) {
      setActiveStep(activeStep + 1);
    } else {
      alert("Agente creado en estado DRAFT");
    }
  };

  const previousStep = () => {
    if (activeStep > 0) {
      setActiveStep(activeStep - 1);
    }
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
            />

            <label>Tipo de agente</label>
            <select>
              {templates.map((template) => (
                <option key={template}>{template}</option>
              ))}
            </select>

            <label>Propósito</label>
            <textarea placeholder="Describe qué tarea realizará el agente y qué resultado debe entregar..." />
          </>
        )}

        {activeStep === 1 && (
          <>
            <label>Fuente principal</label>
            <select>
              <option>Documentos PDF</option>
              <option>Base de datos</option>
              <option>API externa</option>
              <option>Texto manual</option>
            </select>

            <label>Descripción de la fuente</label>
            <textarea placeholder="Describe de dónde obtendrá información el agente..." />
          </>
        )}

        {activeStep === 2 && (
          <>
            <label>Regla de comportamiento</label>
            <textarea placeholder="Ejemplo: El agente no debe revelar información confidencial." />

            <label>Nivel de supervisión</label>
            <select>
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
              El agente será creado en estado DRAFT. Luego podrá pasar por
              validación, auditoría y despliegue.
            </p>
            <ul>
              <li>Configuración inicial registrada</li>
              <li>Plantilla seleccionada</li>
              <li>Políticas listas para revisión</li>
            </ul>
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

          <button
            className="secondary"
            onClick={() => alert("Borrador guardado localmente")}
          >
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
type Props = {
  setActiveMenu: (menu: string) => void;
};

const templates = [
  "Revisor de documentos",
  "Extractor de datos",
  "Generador de resúmenes",
  "Consolidador multi-fuente",
  "Asistente de decisiones",
];

function PanelPlantillas({ setActiveMenu }: Props) {
  return (
    <div className="section-card">
      <h2>Biblioteca de plantillas</h2>

      <p>
        Selecciona una plantilla base para iniciar un agente.
      </p>

      <div className="template-grid">
        {templates.map((template) => (
          <div className="template-card" key={template}>
            <h3>{template}</h3>

            <p>
              Plantilla prediseñada para acelerar la configuración del agente.
            </p>

            <button onClick={() => setActiveMenu("Crear agente")}>
              Usar plantilla
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

export default PanelPlantillas;
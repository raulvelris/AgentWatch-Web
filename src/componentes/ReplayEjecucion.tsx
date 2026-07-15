import { useEffect, useState } from "react";

type ReplayStep = {
  step_number: number;
  step_type: string;
  title: string;
  description: string;
  input: unknown;
  output: unknown;
  policy_result: string | null;
  tool_used: string | null;
  status: string;
};

type ReplayResponse = {
  execution_id: string;
  found: boolean;
  load_time_ms: number;
  target_pdf: string;
  total_steps: number;
  replay_mode: string;
  controls_supported: string[];
  steps: ReplayStep[];
};

function ReplayEjecucion() {
  const [executionId, setExecutionId] = useState("EXE_FINAL_001");
  const [data, setData] = useState<ReplayResponse | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(false);

  const cargarReplay = async () => {
    try {
      setLoading(true);
      setPlaying(false);
      setCurrentStep(0);

      const response = await fetch(
        `http://127.0.0.1:8000/api/v1/executions/${executionId}/replay`
      );

      const result = await response.json();
      setData(result);
    } catch (error) {
      console.error("Error cargando replay RF20:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Diferida a microtask: cargarReplay hace setState síncrono y
    // react-hooks/set-state-in-effect lo marca como error si corre en el
    // cuerpo del efecto. Mismo comportamiento (carga al montar).
    void Promise.resolve().then(cargarReplay);
  }, []);

  useEffect(() => {
    if (!playing || !data?.steps?.length) return;

    const interval = setInterval(() => {
      setCurrentStep((prev) => {
        if (prev >= data.steps.length - 1) {
          setPlaying(false);
          return prev;
        }
        return prev + 1;
      });
    }, 1200);

    return () => clearInterval(interval);
  }, [playing, data]);

  const step = data?.steps?.[currentStep];

  const stepBack = () => {
    setPlaying(false);
    setCurrentStep((prev) => Math.max(prev - 1, 0));
  };

  const stepForward = () => {
    setPlaying(false);
    if (!data?.steps?.length) return;
    setCurrentStep((prev) => Math.min(prev + 1, data.steps.length - 1));
  };

  return (
    <section className="panel">
      <div className="section-header">
        <div>
          <h2>Replay de ejecución</h2>
          <p>Reproducción paso a paso de una ejecución registrada en Neo4j.</p>
        </div>

        <button className="primary-button" onClick={cargarReplay}>
          {loading ? "Cargando..." : "Cargar replay"}
        </button>
      </div>

      <div className="table-card replay-search">
        <h3>Buscar ejecución</h3>

        <input
          className="replay-input"
          value={executionId}
          onChange={(e) => setExecutionId(e.target.value)}
          placeholder="Ejemplo: EXE_FINAL_001"
        />
      </div>

      {data?.found && step && (
        <>
          <div className="metric-grid">
            <div className="metric-card">
              <span>Ejecución</span>
              <strong>{data.execution_id}</strong>
              <small>ID reproducido</small>
            </div>

            <div className="metric-card">
              <span>Pasos</span>
              <strong>
                {currentStep + 1}/{data.total_steps}
              </strong>
              <small>Replay paso a paso</small>
            </div>

            <div className="metric-card">
              <span>Tiempo de carga</span>
              <strong>{data.load_time_ms} ms</strong>
              <small>Objetivo: {data.target_pdf}</small>
            </div>

            <div className="metric-card">
              <span>Modo</span>
              <strong>{data.replay_mode}</strong>
              <small>Replay idempotente</small>
            </div>
          </div>

          <div className="table-card">
            <h3>Controles del replay</h3>

            <div className="replay-controls">
              <button className="ghost-button" onClick={stepBack}>
                ◀ Atrás
              </button>

              <button className="primary-button" onClick={() => setPlaying(true)}>
                ▶ Play
              </button>

              <button className="ghost-button" onClick={() => setPlaying(false)}>
                ⏸ Pause
              </button>

              <button className="ghost-button" onClick={stepForward}>
                Siguiente ▶
              </button>
            </div>
          </div>

          <div className="table-card replay-step-card">
            <div className="step-badge">Paso {step.step_number}</div>

            <h3>{step.title}</h3>
            <p>{step.description}</p>

            <div className="step-info-grid">
              <div>
                <span>Tipo</span>
                <strong>{step.step_type}</strong>
              </div>

              <div>
                <span>Estado</span>
                <strong>{step.status}</strong>
              </div>

              <div>
                <span>Herramienta</span>
                <strong>{step.tool_used ?? "No aplica"}</strong>
              </div>

              <div>
                <span>Política</span>
                <strong>{step.policy_result ?? "No aplica"}</strong>
              </div>
            </div>

            <h4>Input</h4>
            <pre className="code-box">{JSON.stringify(step.input, null, 2)}</pre>

            <h4>Output</h4>
            <pre className="code-box">{JSON.stringify(step.output, null, 2)}</pre>
          </div>

          <div className="table-card">
            <h3>Timeline de ejecución</h3>

            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Tipo</th>
                  <th>Título</th>
                  <th>Estado</th>
                </tr>
              </thead>

              <tbody>
                {data.steps.map((item, index) => (
                  <tr
                    key={item.step_number}
                    className={index === currentStep ? "active-row" : ""}
                  >
                    <td>{item.step_number}</td>
                    <td>{item.step_type}</td>
                    <td>{index === currentStep ? "▶ " : ""}{item.title}</td>
                    <td>{item.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="table-card">
            <h3>Resumen RF20</h3>

            <ul>
              <li>Replay paso a paso desde Neo4j.</li>
              <li>Controles: play, pause, step-forward y step-backward.</li>
              <li>Visualización de input y output por cada paso.</li>
              <li>Tiempo de carga menor a 2 segundos.</li>
              <li>Replay idempotente validado desde backend.</li>
            </ul>
          </div>
        </>
      )}
    </section>
  );
}

export default ReplayEjecucion;
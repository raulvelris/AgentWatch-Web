import { useEffect, useState } from "react";

type AgentMetric = {
  agent_id: string;
  period: string;
  total_tasks: number;
  completed_tasks: number;
  generated_value_usd: number;
  operation_cost_usd: number;
  roi: number;
  cost_per_completed_task_usd: number;
  human_hours_saved: number;
  quality_rate_percent: number;
};

type MetricsResponse = {
  tenant_id: string;
  agent_filter: string | null;
  period: string;
  refresh_interval_ms: number;
  agents: AgentMetric[];
};

function PanelMetricasNegocio() {
  const [data, setData] = useState<MetricsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string>("");

  const cargarMetricas = async () => {
    try {
      setLoading(true);

      const response = await fetch(
        "http://127.0.0.1:8000/api/v1/metrics/business?tenant_id=TEN001&period=month"
      );

      const result = await response.json();

      setData(result);
      setLastUpdated(new Date().toLocaleString());
    } catch (error) {
      console.error("Error cargando métricas RF19:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Diferida a microtask: cargarMetricas hace setLoading(true) síncrono y
    // react-hooks/set-state-in-effect lo marca como error si corre en el
    // cuerpo del efecto. El comportamiento es el mismo (carga al montar).
    void Promise.resolve().then(cargarMetricas);

    const interval = setInterval(() => {
      cargarMetricas();
    }, 300000);

    return () => clearInterval(interval);
  }, []);

  const agents = data?.agents ?? [];

  const totalTasks = agents.reduce((sum, item) => sum + item.total_tasks, 0);
  const completedTasks = agents.reduce(
    (sum, item) => sum + item.completed_tasks,
    0
  );
  const totalGeneratedValue = agents.reduce(
    (sum, item) => sum + item.generated_value_usd,
    0
  );
  const totalOperationCost = agents.reduce(
    (sum, item) => sum + item.operation_cost_usd,
    0
  );
  const totalHoursSaved = agents.reduce(
    (sum, item) => sum + item.human_hours_saved,
    0
  );

  const globalRoi =
    totalOperationCost > 0
      ? Number((totalGeneratedValue / totalOperationCost).toFixed(2))
      : 0;

  const globalCostPerTask =
    completedTasks > 0
      ? Number((totalOperationCost / completedTasks).toFixed(2))
      : 0;

  const globalQuality =
    totalTasks > 0 ? Number(((completedTasks / totalTasks) * 100).toFixed(2)) : 0;

  return (
    <section className="panel">
      <div className="section-header">
        <div>
          <h2>Dashboard de Métricas de Negocio</h2>

          <p>
            Visualización gerencial del ROI, costos, horas ahorradas y calidad
            de los agentes.
          </p>

          <p className="muted">
            Tenant: <strong>{data?.tenant_id ?? "TEN001"}</strong> | Periodo:{" "}
            <strong>{data?.period ?? "month"}</strong>
          </p>

          {lastUpdated && (
            <p className="muted">
              Última actualización: <strong>{lastUpdated}</strong>
            </p>
          )}
        </div>

        <button
          className="primary-button"
          onClick={cargarMetricas}
          disabled={loading}
        >
          {loading ? "Actualizando..." : "Actualizar métricas"}
        </button>
      </div>

      {loading && <p>Cargando métricas...</p>}

      {!loading && agents.length === 0 && (
        <p>No se encontraron métricas para el tenant TEN001.</p>
      )}

      {agents.length > 0 && (
        <>
          <div className="metric-grid">
            <div className="metric-card">
              <span>ROI Global</span>
              <strong>{globalRoi}x</strong>
              <small>Valor generado / costo operativo</small>
            </div>

            <div className="metric-card">
              <span>Costo por tarea</span>
              <strong>${globalCostPerTask}</strong>
              <small>Costo promedio por tarea completada</small>
            </div>

            <div className="metric-card">
              <span>Horas ahorradas</span>
              <strong>{totalHoursSaved} h</strong>
              <small>Tiempo humano estimado evitado</small>
            </div>

            <div className="metric-card">
              <span>Calidad Global</span>
              <strong>{globalQuality}%</strong>
              <small>Tareas completadas correctamente</small>
            </div>
          </div>

          <div className="table-card">
            <h3>Detalle por agente</h3>

            <table>
              <thead>
                <tr>
                  <th>Agente</th>
                  <th>Periodo</th>
                  <th>Total tareas</th>
                  <th>Completadas</th>
                  <th>Valor generado</th>
                  <th>Costo operativo</th>
                  <th>ROI</th>
                  <th>Costo/tarea</th>
                  <th>Horas ahorradas</th>
                  <th>Calidad</th>
                </tr>
              </thead>

              <tbody>
                {agents.map((item, index) => (
                  <tr key={`${item.agent_id}-${index}`}>
                    <td>{item.agent_id}</td>
                    <td>{item.period}</td>
                    <td>{item.total_tasks}</td>
                    <td>{item.completed_tasks}</td>
                    <td>${item.generated_value_usd}</td>
                    <td>${item.operation_cost_usd}</td>
                    <td>{item.roi}x</td>
                    <td>${item.cost_per_completed_task_usd}</td>
                    <td>{item.human_hours_saved} h</td>
                    <td>{item.quality_rate_percent}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="table-card">
            <h3>Resumen RF19</h3>

            <ul>
              <li>Actualización automática cada 5 minutos.</li>
              <li>Fuente: /api/v1/metrics/business.</li>
              <li>Comparativo por agente y periodo.</li>
              <li>
                Fórmula ROI: valor generado / costo operativo = {globalRoi}x.
              </li>
              <li>
                Calidad: tareas completadas / total de tareas = {globalQuality}%.
              </li>
            </ul>
          </div>
        </>
      )}
    </section>
  );
}

export default PanelMetricasNegocio;
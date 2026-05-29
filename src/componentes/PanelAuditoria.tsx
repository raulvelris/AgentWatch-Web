import { useEffect, useState } from "react";
import { obtenerReportesSeguridad } from "../servicios/agenteServicio";

type ReporteAuditoria = {
  id: string;
  herramienta: string;
  paquete: string;
  version_vulnerable: string;
  version_segura: string;
  descripcion: string;
  estado: string;
  severidad: string;
  tiempo: string;
  bloquea_merge: boolean;
};

function PanelAuditoria() {
  const [reportesAuditoria, setReportesAuditoria] = useState<
    ReporteAuditoria[]
  >([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    obtenerReportesSeguridad()
      .then((data) => {
        setReportesAuditoria(data.reports);
        setCargando(false);
      })
      .catch((error) => {
        console.error(error);
        setCargando(false);
      });
  }, []);

  const totalHallazgos = reportesAuditoria.length;

  const hayBloqueo = reportesAuditoria.some(
    (reporte) =>
      reporte.severidad === "Critical" ||
      reporte.severidad === "High" ||
      reporte.bloquea_merge
  );

  if (cargando) {
    return (
      <div className="section-card">
        <h2>Auditoría estática</h2>
        <p>Cargando reportes de seguridad...</p>
      </div>
    );
  }

  return (
    <div className="section-card">
      <h2>Auditoría estática</h2>

      <p>
        Revisión automática de dependencias, código de integración y
        vulnerabilidades antes del despliegue.
      </p>

      <div className="preview-box">
        <strong>Resumen del análisis</strong>

        <p>
          <strong>Total de hallazgos:</strong> {totalHallazgos}
        </p>

        <p>
          <strong>Estado del Quality Gate:</strong>{" "}
          {hayBloqueo ? "Bloqueado por severidad High/Critical" : "Aprobado"}
        </p>
      </div>

      <div className="template-grid">
        {reportesAuditoria.map((reporte) => (
          <div className="template-card" key={reporte.id}>
            <h3>{reporte.herramienta}</h3>

            <p>{reporte.descripcion}</p>

            <p>
              <strong>Paquete / archivo:</strong> {reporte.paquete}
            </p>

            <p>
              <strong>Versión vulnerable:</strong>{" "}
              {reporte.version_vulnerable}
            </p>

            <p>
              <strong>Versión segura recomendada:</strong>{" "}
              {reporte.version_segura}
            </p>

            <p>
              <strong>Estado:</strong> {reporte.estado}
            </p>

            <p>
              <strong>Severidad:</strong> {reporte.severidad}
            </p>

            <p>
              <strong>Bloquea merge:</strong>{" "}
              {reporte.bloquea_merge ? "Sí" : "No"}
            </p>

            <p>
              <strong>Tiempo de análisis:</strong> {reporte.tiempo}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default PanelAuditoria;
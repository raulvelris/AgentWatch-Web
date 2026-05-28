function PanelAuditoria() {
  return (
    <div className="section-card">
      <h2>Auditoría estática</h2>

      <p>
        Revisión automática de dependencias, código de integración y
        vulnerabilidades antes del despliegue.
      </p>

      <div className="audit-list">
        <div>
          <strong>Semgrep</strong>
          <span>Ruleset de seguridad configurado</span>
        </div>

        <div>
          <strong>OWASP Dependency-Check</strong>
          <span>Escaneo de CVEs pendiente de integración</span>
        </div>

        <div>
          <strong>Quality Gate</strong>
          <span>Bloqueo por severidad Critical/High</span>
        </div>
      </div>
    </div>
  );
}

export default PanelAuditoria;

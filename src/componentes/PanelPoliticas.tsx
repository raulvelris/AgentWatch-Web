function PanelPoliticas() {
  return (
    <div className="section-card">
      <h2>Editor de políticas</h2>

      <p>
        Define reglas de gobernanza en lenguaje natural para controlar
        el comportamiento del agente.
      </p>

      <label>Nueva política</label>

      <textarea placeholder="Ejemplo: El agente nunca debe mencionar a competidores." />

      <button
        className="primary"
        onClick={() => alert("Política traducida a restricción técnica")}
      >
        Traducir política
      </button>
    </div>
  );
}

export default PanelPoliticas;
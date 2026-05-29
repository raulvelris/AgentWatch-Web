import { useEffect, useState } from "react";
import { obtenerPlantillas } from "../servicios/agenteServicio";

type Plantilla = {
  id: string;
  nombre: string;
  descripcion: string;
  caso_uso: string;
  tiempo_estimado: string;
  categoria: string;
  favorito: boolean;
};

type Props = {
  setActiveMenu: (menu: string) => void;
  usarPlantilla: (plantilla: Plantilla) => void;
};

function PanelPlantillas({ usarPlantilla }: Props) {
  const [plantillas, setPlantillas] = useState<Plantilla[]>([]);
  const [cargando, setCargando] = useState(true);
  const [categoriaSeleccionada, setCategoriaSeleccionada] =
    useState("todas");

  useEffect(() => {
    obtenerPlantillas()
      .then((data) => {
        setPlantillas(data.templates);
        setCargando(false);
      })
      .catch((error) => {
        console.error(error);
        setCargando(false);
      });
  }, []);

  const plantillasFiltradas =
    categoriaSeleccionada === "todas"
      ? plantillas
      : plantillas.filter(
          (plantilla) => plantilla.categoria === categoriaSeleccionada
        );

  if (cargando) {
    return (
      <div className="section-card">
        <h2>Biblioteca de plantillas</h2>
        <p>Cargando plantillas...</p>
      </div>
    );
  }

  return (
    <div className="section-card">
      <h2>Biblioteca de plantillas</h2>

      <p>Selecciona una plantilla base para iniciar un agente.</p>

      <div style={{ marginBottom: "20px" }}>
        <label>
          <strong>Filtrar por categoría:</strong>
        </label>

        <select
          value={categoriaSeleccionada}
          onChange={(e) => setCategoriaSeleccionada(e.target.value)}
          style={{ marginLeft: "10px" }}
        >
          <option value="todas">Todas</option>
          <option value="análisis">Análisis</option>
          <option value="automatización">Automatización</option>
          <option value="síntesis">Síntesis</option>
        </select>
      </div>

      <div className="template-grid">
        {plantillasFiltradas.map((plantilla) => (
          <div className="template-card" key={plantilla.id}>
            <h3>{plantilla.nombre}</h3>

            <p>{plantilla.descripcion}</p>

            <p>
              <strong>Caso de uso:</strong> {plantilla.caso_uso}
            </p>

            <p>
              <strong>Tiempo estimado:</strong>{" "}
              {plantilla.tiempo_estimado}
            </p>

            <p>
              <strong>Categoría:</strong> {plantilla.categoria}
            </p>

            {plantilla.favorito && (
              <p>
                ⭐ <strong>Favorita</strong>
              </p>
            )}

            <button
              className="primary"
              onClick={() => usarPlantilla(plantilla)}
            >
              Usar plantilla
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

export default PanelPlantillas;
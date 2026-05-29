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
  const [busqueda, setBusqueda] = useState("");

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

  const normalizarTexto = (texto: string) => {
    return texto
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
  };

  const plantillasFiltradas = plantillas.filter((plantilla) => {
    const coincideCategoria =
      categoriaSeleccionada === "todas" ||
      plantilla.categoria === categoriaSeleccionada;

    const textoBusqueda = normalizarTexto(busqueda);

    const coincideBusqueda =
      normalizarTexto(plantilla.nombre).includes(textoBusqueda) ||
      normalizarTexto(plantilla.descripcion).includes(textoBusqueda) ||
      normalizarTexto(plantilla.caso_uso).includes(textoBusqueda);

    return coincideCategoria && coincideBusqueda;
  });

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
          <strong>Buscar por nombre:</strong>
        </label>

        <input
          type="text"
          placeholder="Ejemplo: revisor, resumen, datos..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          style={{
            width: "100%",
            marginTop: "8px",
            marginBottom: "15px",
          }}
        />

        <label>
          <strong>Filtrar por categoría:</strong>
        </label>

        <select
          value={categoriaSeleccionada}
          onChange={(e) => setCategoriaSeleccionada(e.target.value)}
          style={{ marginTop: "8px" }}
        >
          <option value="todas">Todas</option>
          <option value="análisis">Análisis</option>
          <option value="automatización">Automatización</option>
          <option value="síntesis">Síntesis</option>
        </select>
      </div>

      {plantillasFiltradas.length === 0 ? (
        <div className="preview-box">
          <p>No se encontraron plantillas con esos filtros.</p>
        </div>
      ) : (
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
      )}
    </div>
  );
}

export default PanelPlantillas;
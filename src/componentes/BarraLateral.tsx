type Props = {
  activeMenu: string;
  setActiveMenu: (menu: string) => void;
};

const menuItems = [
  "Crear agente",
  "Plantillas",
  "Políticas",
  "Auditoría estática",
  // TODO (OPCIÓN B — ELIMINAR cuando se coordine con Gerson/M1): ítem puente al panel M2.
  "Despliegue",
  "Métricas de negocio",
  "Replay de ejecución",
];

function BarraLateral({
  activeMenu,
  setActiveMenu,
}: Props) {
  return (
    <aside className="sidebar">

      <div className="brand">

        <div className="logo">
          AW
        </div>

        <div>

          <h2>
            AgentWatch
          </h2>

          <span>
            AI Governance Platform
          </span>

        </div>

      </div>

      <nav>

        {menuItems.map((item) => (

          <button
            key={item}
            className={
              activeMenu === item
                ? "nav-item active"
                : "nav-item"
            }
            onClick={() => {
              // TODO (OPCIÓN B — ELIMINAR cuando se coordine con Gerson/M1):
              // "Despliegue" es una página Vite aparte (/despliegue.html), no un
              // panel de App, así que navegamos en vez de setActiveMenu. Lo correcto
              // sería un botón "Desplegar" en el WizardAgente (M1) que navegue a
              // /despliegue.html?agentId={id}, y este ítem se eliminaría.
              if (item === "Despliegue") {
                window.location.href = "/despliegue.html";
                return;
              }
              setActiveMenu(item);
            }}
          >

            {item}

          </button>

        ))}

      </nav>

    </aside>
  );
}

export default BarraLateral;
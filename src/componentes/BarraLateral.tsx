type Props = {
  activeMenu: string;
  setActiveMenu: (menu: string) => void;
};

const menuItems = ["Crear agente", "Plantillas", "Políticas", "Auditoría estática"];

function BarraLateral({ activeMenu, setActiveMenu }: Props) {
  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="logo">AW</div>

        <div>
          <h2>AgentWatch</h2>
          <span>AI Governance Platform</span>
        </div>
      </div>

      <nav>
        {menuItems.map((item) => (
          <button
            key={item}
            className={activeMenu === item ? "nav-item active" : "nav-item"}
            onClick={() => setActiveMenu(item)}
          >
            {item}
          </button>
        ))}
      </nav>
    </aside>
  );
}

export default BarraLateral;
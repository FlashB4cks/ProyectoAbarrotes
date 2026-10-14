import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { IconBarChart, IconCashRegister, IconShieldCheck, IconTruck, IconUser } from '../../components/icons/Icons';

/* ── COMPONENTE: BARRA LATERAL ── */
export const Sidebar = ({ activeTab, setActiveTab, collapsed, setCollapsed }) => {
  const { logout, user } = useAuth();

  const isAdmin = user?.rol === 'ADMINISTRADOR' || user?.is_superuser;
  const isBodegueroOrAdmin = isAdmin || user?.rol === 'BODEGUERO';

  return (
    <aside className={`sidebar ${collapsed ? 'collapsed' : ''}`}>
      <div className="sidebar-header">
        <div className="logo-box">
          <div className="logo-badge">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
              <polyline points="9 22 9 12 15 12 15 22"></polyline>
            </svg>
          </div>
          <div className="brand-info">
            <h2>NohemySys</h2>
            <span>Control Comercial</span>
          </div>
        </div>

        <button className="btn-toggle-sidebar" onClick={() => setCollapsed(!collapsed)} title={collapsed ? 'Expandir Menú' : 'Contraer Menú'}>
          {collapsed ? '❯' : '❮'}
        </button>
      </div>

      <nav className="sidebar-nav">
        <div className="nav-group">
          <span className="nav-section-title">VENTAS Y CAJA</span>
          
          <button 
            className={`nav-item ${activeTab === 'pos' ? 'active' : ''}`}
            onClick={() => setActiveTab('pos')}
            title="Punto de Venta (POS)"
          >
            <span className="nav-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="9" cy="21" r="1"></circle>
                <circle cx="20" cy="21" r="1"></circle>
                <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
              </svg>
            </span>
            <span className="nav-text">Punto de Venta (POS)</span>
          </button>

          <button 
            className={`nav-item ${activeTab === 'caja' ? 'active' : ''}`}
            onClick={() => setActiveTab('caja')}
            title="Control de Caja (Arqueo y Turnos)"
          >
            <span className="nav-icon">
              <IconCashRegister size={20} />
            </span>
            <span className="nav-text">Control de Caja</span>
          </button>

          <button 
            className={`nav-item ${activeTab === 'productos' ? 'active' : ''}`}
            onClick={() => setActiveTab('productos')}
            title="Gestión de Productos"
          >
            <span className="nav-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
                <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
                <line x1="12" y1="22.08" x2="12" y2="12"></line>
              </svg>
            </span>
            <span className="nav-text">Catálogo Productos</span>
          </button>

          <button 
            className={`nav-item ${activeTab === 'clientes' ? 'active' : ''}`}
            onClick={() => setActiveTab('clientes')}
            title="Gestión de Clientes"
          >
            <span className="nav-icon">
              <IconUser size={20} />
            </span>
            <span className="nav-text">Gestión de Clientes</span>
          </button>

          {isBodegueroOrAdmin && (
            <>
              <span className="nav-section-title" style={{ marginTop: '12px' }}>ABASTECIMIENTO</span>
              <button 
                className={`nav-item ${activeTab === 'compras' ? 'active' : ''}`}
                onClick={() => setActiveTab('compras')}
                title="Gestión de Compras"
              >
                <span className="nav-icon">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path>
                    <line x1="3" y1="6" x2="21" y2="6"></line>
                    <path d="M16 10a4 4 0 0 1-8 0"></path>
                  </svg>
                </span>
                <span className="nav-text">Gestión de Compras</span>
              </button>

              <button 
                className={`nav-item ${activeTab === 'proveedores' ? 'active' : ''}`}
                onClick={() => setActiveTab('proveedores')}
                title="Gestión de Proveedores"
              >
                <span className="nav-icon">
                  <IconTruck size={20} />
                </span>
                <span className="nav-text">Proveedores</span>
              </button>

              <button 
                className={`nav-item ${activeTab === 'inventario' ? 'active' : ''}`}
                onClick={() => setActiveTab('inventario')}
                title="Inventario y Lotes FIFO"
              >
                <span className="nav-icon">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polygon points="12 2 2 7 12 12 22 7 12 2"></polygon>
                    <polyline points="2 17 12 22 22 17"></polyline>
                    <polyline points="2 12 12 17 22 12"></polyline>
                  </svg>
                </span>
                <span className="nav-text">Lotes e Inventario</span>
              </button>
            </>
          )}

          {isAdmin && (
            <>
              <span className="nav-section-title" style={{ marginTop: '12px' }}>ADMINISTRACIÓN</span>
              <button 
                className={`nav-item ${activeTab === 'reportes' ? 'active' : ''}`}
                onClick={() => setActiveTab('reportes')}
                title="Reportes y Analíticas"
              >
                <span className="nav-icon">
                  <IconBarChart size={20} />
                </span>
                <span className="nav-text">Reportes Financieros</span>
              </button>

              <button 
                className={`nav-item ${activeTab === 'auditoria' ? 'active' : ''}`}
                onClick={() => setActiveTab('auditoria')}
                title="Bitácora de Auditoría"
              >
                <span className="nav-icon">
                  <IconShieldCheck size={20} />
                </span>
                <span className="nav-text">Bitácora Auditoría</span>
              </button>

              <button 
                className={`nav-item ${activeTab === 'usuarios' ? 'active' : ''}`}
                onClick={() => setActiveTab('usuarios')}
                title="Gestión de Usuarios"
              >
                <span className="nav-icon">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                    <circle cx="9" cy="7" r="4"></circle>
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                    <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                  </svg>
                </span>
                <span className="nav-text">Control Usuarios</span>
              </button>
            </>
          )}
        </div>
      </nav>

      <div className="sidebar-footer">
        <div className="user-chip">
          <div className="user-avatar" onClick={logout}>
            {user?.first_name?.[0] || user?.username?.[0] || 'U'}
          </div>
          <div className="user-info">
            <span className="user-name">{user?.first_name} {user?.last_name}</span>
            <span className="user-role">{user?.rol_display || user?.rol}</span>
          </div>
        </div>
        <button className="btn-logout" onClick={logout} title="Cerrar Sesión">
          <span className="logout-text">Cerrar Sesión</span>
        </button>
      </div>
    </aside>
  );
};


export default Sidebar;

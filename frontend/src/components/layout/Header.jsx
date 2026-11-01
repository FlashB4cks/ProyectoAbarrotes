import React from 'react';
import { IconBarcode } from '../../components/icons/Icons';

export const Header = ({ activeTab, onOpenScanner, isScannerConnected, onToggleMobileMenu }) => {
  let title = 'Gestión de Usuarios y Empleados';
  if (activeTab === 'pos') title = 'Punto de Venta y Facturación';
  if (activeTab === 'caja') title = 'Control de Caja y Turnos';
  if (activeTab === 'productos') title = 'Catálogo de Productos';
  if (activeTab === 'clientes') title = 'Gestión de Clientes';
  if (activeTab === 'compras') title = 'Gestión de Compras';
  if (activeTab === 'proveedores') title = 'Gestión de Proveedores';
  if (activeTab === 'inventario') title = 'Inventario y Lotes PEPS';
  if (activeTab === 'reportes') title = 'Reportes Financieros';
  if (activeTab === 'auditoria') title = 'Bitácora de Auditoría';

  return (
    <header className="main-header">
      <div className="header-left-group">
        <button
          type="button"
          className="btn-mobile-menu"
          onClick={onToggleMobileMenu}
          title="Abrir menú de navegación"
          aria-label="Abrir menú de navegación"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="3" y1="12" x2="21" y2="12"></line>
            <line x1="3" y1="6" x2="21" y2="6"></line>
            <line x1="3" y1="18" x2="21" y2="18"></line>
          </svg>
        </button>
        <div className="header-title">
          <h1>{title}</h1>
        </div>
      </div>
      <div className="header-right-group">
        <button
          type="button"
          className="btn-scanner-pill active"
          onClick={onOpenScanner}
          title="Configuración y prueba de lector de códigos de barras"
        >
          <span className="scanner-indicator-dot"></span>
          <IconBarcode size={16} />
          <span className="scanner-pill-text">Lector / Pistola USB</span>
        </button>
      </div>
    </header>
  );
};

export default Header;

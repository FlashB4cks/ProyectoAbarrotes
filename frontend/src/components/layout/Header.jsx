import React from 'react';
import { IconBarcode } from '../../components/icons/Icons';

/* ── CABECERA PRINCIPAL CON BOTÓN DE ESCÁNER ── */
export const Header = ({ activeTab, onOpenScanner, isScannerConnected }) => {
  let title = 'Gestión de Usuarios y Empleados';
  if (activeTab === 'pos') title = 'Punto de Venta (POS) y Facturación';
  if (activeTab === 'caja') title = 'Control de Caja, Arqueo y Turnos de Venta';
  if (activeTab === 'productos') title = 'Catálogo y Gestión de Productos';
  if (activeTab === 'clientes') title = 'Gestión de Clientes y Directorio Comercial';
  if (activeTab === 'compras') title = 'Gestión de Compras e Ingreso de Inventario';
  if (activeTab === 'proveedores') title = 'Gestión de Proveedores y Directorio Comercial';
  if (activeTab === 'inventario') title = 'Inventario, Lotes FIFO y Semáforo de Vencimiento';
  if (activeTab === 'reportes') title = 'Reportes Financieros y Prevención de Mermas PEPS';
  if (activeTab === 'auditoria') title = 'Bitácora de Auditoría y Trazabilidad del Sistema';
  return (
    <header className="main-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <div className="header-title">
        <h1>{title}</h1>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <button 
          type="button" 
          className="btn-scanner-pill active"
          onClick={onOpenScanner}
          title="Configuración y prueba de lector de códigos de barras (Pistola USB o App Móvil)"
        >
          <span className="scanner-indicator-dot"></span>
          <IconBarcode size={16} />
          <span>Lector / Pistola USB</span>
        </button>
      </div>
    </header>
  );
};


export default Header;

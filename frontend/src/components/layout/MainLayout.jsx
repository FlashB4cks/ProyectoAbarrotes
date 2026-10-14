import React, { useState, useEffect } from 'react';
import { NohemyApi, STORAGE_KEYS } from '../../api/nohemyApi';
import { useAuth } from '../../context/AuthContext';
import { playScannerBeep } from '../../utils/audio';
import { Toast, ChangePasswordModal, ModuleErrorBoundary } from '../../components/common';

import Sidebar from './Sidebar';
import Header from './Header';
import LoginPage from '../../pages/login/LoginPage';
import POSPage from '../../pages/pos/POSPage';
import CashControlPage from '../../pages/cash/CashControlPage';
import ProductsPage from '../../pages/products/ProductsPage';
import ClientsPage from '../../pages/clients/ClientsPage';
import PurchasesPage from '../../pages/purchases/PurchasesPage';
import SuppliersPage from '../../pages/suppliers/SuppliersPage';
import InventoryBatchesPage from '../../pages/inventory/InventoryBatchesPage';
import ReportsAnalyticsPage from '../../pages/reports/ReportsAnalyticsPage';
import AuditLogPage from '../../pages/audit/AuditLogPage';
import UsersPage from '../../pages/users/UsersPage';
import ScannerModal from '../../pages/scanner/ScannerModal';
/* ── COMPONENTE PRINCIPAL (ESCRITORIO) ── */
export const MainLayout = () => {
  const { user, loading, updateUserState } = useAuth();
  const [activeTab, setActiveTab] = useState('pos');
  const [collapsed, setCollapsed] = useState(false);

  // Estados del Escáner Inalámbrico / Celular
  const [isScannerModalOpen, setIsScannerModalOpen] = useState(false);
  const [scannerSession, setScannerSession] = useState(() => {
    try {
      const saved = localStorage.getItem('nohemysys_scanner_session');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [scannerConnected, setScannerConnected] = useState(false);
  const [scannerToast, setScannerToast] = useState(null);

  // Inicializar sesión de escáner al cargar
  const initScannerSession = async () => {
    try {
      const ses = await NohemyApi.createEscanerSesion();
      setScannerSession(ses);
      localStorage.setItem('nohemysys_scanner_session', JSON.stringify(ses));
    } catch {
      // Ignorar fallo offline
    }
  };

  useEffect(() => {
    if (!scannerSession) {
      initScannerSession();
    }
  }, []);

  // Función común al recibir un código de barras (desde app HID, pistola o celular web)
  const handleReceiveBarcode = (barcode, source) => {
    playScannerBeep(true);
    setScannerToast({
      type: 'success',
      message: `Código recibido (${source}): ${barcode}`,
    });

    // Despachar evento global
    window.dispatchEvent(new CustomEvent('nohemysys:barcode', {
      detail: { code: barcode, source }
    }));

    // Asignar al input activo de código de barras si existe (catálogo / nuevo producto)
    const barcodeInput = document.querySelector('input[name="codigo_barras"]');
    if (barcodeInput) {
      const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set;
      if (nativeSetter) {
        nativeSetter.call(barcodeInput, barcode);
        barcodeInput.dispatchEvent(new Event('input', { bubbles: true }));
        barcodeInput.dispatchEvent(new Event('change', { bubbles: true }));
      }
    }

    // Si el buscador del POS estaba enfocado y recibió caracteres durante la lectura, limpiarlo inmediatamente
    const posSearchInput = document.querySelector('.pos-search-input');
    if (posSearchInput) {
      const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set;
      if (nativeSetter) {
        nativeSetter.call(posSearchInput, '');
        posSearchInput.dispatchEvent(new Event('input', { bubbles: true }));
        posSearchInput.dispatchEvent(new Event('change', { bubbles: true }));
      }
    }
  };

  // 1. Escuchador de Teclado Rápido (Modo HID / Barcode to PC / Pistola USB o Bluetooth)
  useEffect(() => {
    let buffer = '';
    let lastKeyTime = Date.now();
    let clearTimer = null;

    const handleKeyDown = (e) => {
      if (['Shift', 'Control', 'Alt', 'Meta', 'Tab'].includes(e.key)) return;

      const now = Date.now();
      const interval = now - lastKeyTime;
      lastKeyTime = now;

      // Lectura por pistola o app HID por USB envía caracteres en ráfagas rápidas.
      // Se permite hasta 150ms de margen para apps móviles USB/Wi-Fi que puedan tener micro-pausas.
      if (interval > 150) {
        buffer = '';
      }

      if (e.key === 'Enter') {
        if (buffer.length >= 3) {
          e.preventDefault();
          e.stopPropagation();
          const code = buffer.trim();
          buffer = '';
          handleReceiveBarcode(code, 'Lector Físico / App Móvil HID');
        }
      } else if (e.key.length === 1) {
        buffer += e.key;
        clearTimeout(clearTimer);
        clearTimer = setTimeout(() => {
          buffer = '';
        }, 300);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      clearTimeout(clearTimer);
    };
  }, []);

  // 2. Escuchador en segundo plano para Escáner Web Celular vinculado
  useEffect(() => {
    if (!scannerSession?.session_id) return;

    let sinceId = 0;
    const interval = setInterval(async () => {
      try {
        const res = await NohemyApi.recibirCodigoEscaner(scannerSession.session_id, sinceId);
        if (res.status === 'not_found') {
          // Si el servidor reinició y la sesión expiró de memoria, regenerar sesión limpia
          initScannerSession();
        } else if (res.status === 'success') {
          if (res.conectado !== undefined) {
            setScannerConnected(res.conectado);
          }
          if (res.has_new && res.codigo_barras) {
            sinceId = res.code_id;
            setScannerConnected(true);
            handleReceiveBarcode(res.codigo_barras, res.dispositivo || 'Celular Vinculado');
          }
        }
      } catch {
        // En caso de fallo transitorio no interrumpir
      }
    }, 800);

    return () => clearInterval(interval);
  }, [scannerSession]);

  if (loading) {
    return (
      <div className="login-wrapper">
        <div className="login-card card p-4 text-center">
          <h2 style={{ color: 'var(--text-main)' }}>NohemySys</h2>
          <p style={{ color: 'var(--text-muted)' }}>Cargando sesión...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <LoginPage />;
  }

  const forcePasswordChange = Boolean(user?.debe_cambiar_password);

  return (
    <div className="app-container">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} collapsed={collapsed} setCollapsed={setCollapsed} />
      <div className="main-content">
        <Header 
          activeTab={activeTab} 
          onOpenScanner={() => setIsScannerModalOpen(true)}
          isScannerConnected={scannerConnected}
        />
        {activeTab === 'pos' && (
          <POSPage onOpenScanner={() => setIsScannerModalOpen(true)} />
        )}
        {activeTab === 'caja' && (
          <CashControlPage onOpenScanner={() => setIsScannerModalOpen(true)} />
        )}
        {activeTab === 'productos' && (
          <ProductsPage onOpenScanner={() => setIsScannerModalOpen(true)} />
        )}
        {activeTab === 'clientes' && <ClientsPage />}
        {activeTab === 'compras' && (
          (user?.rol === 'ADMINISTRADOR' || user?.rol === 'BODEGUERO' || user?.is_superuser) 
            ? <PurchasesPage /> 
            : <div className="card p-4 m-4 text-center text-muted">Acceso restringido a Administradores y Bodega.</div>
        )}
        {activeTab === 'proveedores' && (
          (user?.rol === 'ADMINISTRADOR' || user?.rol === 'BODEGUERO' || user?.is_superuser) 
            ? <SuppliersPage /> 
            : <div className="card p-4 m-4 text-center text-muted">Acceso restringido a Administradores y Bodega.</div>
        )}
        {activeTab === 'inventario' && (
          (user?.rol === 'ADMINISTRADOR' || user?.rol === 'BODEGUERO' || user?.is_superuser) 
            ? <InventoryBatchesPage onNavigateToPurchases={() => setActiveTab('compras')} /> 
            : <div className="card p-4 m-4 text-center text-muted">Acceso restringido a Administradores y Bodega.</div>
        )}
        {activeTab === 'reportes' && (
          (user?.rol === 'ADMINISTRADOR' || user?.is_superuser) ? (
            <ModuleErrorBoundary name="Reportes y Analíticas">
              <ReportsAnalyticsPage />
            </ModuleErrorBoundary>
          ) : <div className="card p-4 m-4 text-center text-muted">Acceso restringido a Administradores.</div>
        )}
        {activeTab === 'auditoria' && (
          (user?.rol === 'ADMINISTRADOR' || user?.is_superuser) ? (
            <ModuleErrorBoundary name="Bitácora de Auditoría">
              <AuditLogPage />
            </ModuleErrorBoundary>
          ) : <div className="card p-4 m-4 text-center text-muted">Acceso restringido a Administradores.</div>
        )}
        {activeTab === 'usuarios' && (
          (user?.rol === 'ADMINISTRADOR' || user?.is_superuser) 
            ? <UsersPage /> 
            : <div className="card p-4 m-4 text-center text-muted">Acceso restringido a Administradores.</div>
        )}
      </div>

      <ScannerModal 
        isOpen={isScannerModalOpen}
        onClose={() => setIsScannerModalOpen(false)}
        session={scannerSession}
        onGenerateSession={initScannerSession}
        connectedDevice={scannerConnected ? 'Activo' : null}
      />

      <ChangePasswordModal 
        isOpen={forcePasswordChange}
        user={user}
        onSuccess={() => {
          const updatedUser = { ...user, debe_cambiar_password: false };
          localStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(updatedUser));
          updateUserState(updatedUser);
        }}
      />

      <Toast toast={scannerToast} onClose={() => setScannerToast(null)} />
    </div>
  );
};

export default MainLayout;

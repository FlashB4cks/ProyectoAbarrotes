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

export const MainLayout = () => {
  const { user, loading, updateUserState } = useAuth();
  const [activeTab, setActiveTab] = useState('pos');
  const [collapsed, setCollapsed] = useState(false);

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

  const initScannerSession = async () => {
    try {
      const ses = await NohemyApi.createEscanerSesion();
      setScannerSession(ses);
      localStorage.setItem('nohemysys_scanner_session', JSON.stringify(ses));
    } catch {

    }
  };

  useEffect(() => {
    if (!scannerSession) {
      initScannerSession();
    }
  }, []);

  const handleReceiveBarcode = (barcode, source) => {
    playScannerBeep(true);
    setScannerToast({
      type: 'success',
      message: `Código recibido (${source}): ${barcode}`,
    });

    window.dispatchEvent(new CustomEvent('nohemysys:barcode', {
      detail: { code: barcode, source }
    }));

    const barcodeInput = document.querySelector('input[name="codigo_barras"]');
    if (barcodeInput) {
      const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set;
      if (nativeSetter) {
        nativeSetter.call(barcodeInput, barcode);
        barcodeInput.dispatchEvent(new Event('input', { bubbles: true }));
        barcodeInput.dispatchEvent(new Event('change', { bubbles: true }));
      }
    }

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

  useEffect(() => {
    let buffer = '';
    let lastKeyTime = Date.now();
    let clearTimer = null;

    const handleKeyDown = (e) => {
      if (['Shift', 'Control', 'Alt', 'Meta', 'Tab'].includes(e.key)) return;

      const now = Date.now();
      const interval = now - lastKeyTime;
      lastKeyTime = now;

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

  useEffect(() => {
    if (!scannerSession?.session_id) return;

    let sinceId = 0;
    const interval = setInterval(async () => {
      try {
        const res = await NohemyApi.recibirCodigoEscaner(scannerSession.session_id, sinceId);
        if (res.status === 'not_found') {

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
        {activeTab === 'clientes' && (
          <ModuleErrorBoundary name="Gestión de Clientes">
            <ClientsPage />
          </ModuleErrorBoundary>
        )}
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

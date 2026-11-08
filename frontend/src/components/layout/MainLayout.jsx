import React, { useState, useEffect, useRef } from 'react';
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
  const [activeTab, setActiveTab] = useState(() => {
    try {
      const savedUser = sessionStorage.getItem(STORAGE_KEYS.USER_DATA);
      const u = savedUser ? JSON.parse(savedUser) : null;
      if (u?.rol === 'ALMACENERO' || u?.rol === 'BODEGUERO') return 'productos';
    } catch {}
    return 'pos';
  });

  const currentUserIdRef = useRef(user?.id);

  // Redirigir a la pestaña correspondiente según el rol del usuario conectado
  useEffect(() => {
    if (user) {
      const isAlmacenero = user?.rol === 'ALMACENERO' || user?.rol === 'BODEGUERO';
      const targetDefaultTab = isAlmacenero ? 'productos' : 'pos';

      // Si cambió de usuario (ej. cierre de sesión e inicio con otro)
      if (user.id !== currentUserIdRef.current) {
        currentUserIdRef.current = user.id;
        setActiveTab(targetDefaultTab);
        return;
      }

      // Validar si la pestaña activa actual está autorizada para el rol
      const isAdmin = user?.rol === 'ADMINISTRADOR' || user?.is_superuser;
      const isVendedor = user?.rol === 'VENDEDOR' || (!isAdmin && !isAlmacenero);

      const canAccessVentas = isAdmin || isVendedor;
      const canAccessAbastecimiento = isAdmin || isAlmacenero;
      const canAccessAdmin = isAdmin;

      let isAllowed = true;
      if (['pos', 'caja', 'clientes'].includes(activeTab) && !canAccessVentas) {
        isAllowed = false;
      } else if (['compras', 'proveedores', 'inventario'].includes(activeTab) && !canAccessAbastecimiento) {
        isAllowed = false;
      } else if (['reportes', 'auditoria', 'usuarios'].includes(activeTab) && !canAccessAdmin) {
        isAllowed = false;
      }

      if (!isAllowed) {
        setActiveTab(targetDefaultTab);
      }
    } else {
      currentUserIdRef.current = null;
    }
  }, [user, activeTab]);
  const [collapsed, setCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const [isScannerModalOpen, setIsScannerModalOpen] = useState(false);
  const [scannerSession, setScannerSession] = useState(() => {
    try {
      const saved = sessionStorage.getItem('nohemysys_scanner_session');
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
      sessionStorage.setItem('nohemysys_scanner_session', JSON.stringify(ses));
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
          setScannerConnected(false);
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
    }, 2500);

    return () => clearInterval(interval);
  }, [scannerSession?.session_id]);

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

  const isAdmin = user?.rol === 'ADMINISTRADOR' || user?.is_superuser;
  const isAlmacenero = user?.rol === 'ALMACENERO' || user?.rol === 'BODEGUERO';
  const isVendedor = user?.rol === 'VENDEDOR' || (!isAdmin && !isAlmacenero);

  const canAccessVentas = isAdmin || isVendedor;
  const canAccessAbastecimiento = isAdmin || isAlmacenero;
  const canAccessAdmin = isAdmin;

  return (
    <div className="app-container">
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        collapsed={collapsed}
        setCollapsed={setCollapsed}
        mobileOpen={mobileMenuOpen}
        setMobileOpen={setMobileMenuOpen}
      />
      <div className="main-content">
        <Header
          activeTab={activeTab}
          onOpenScanner={() => setIsScannerModalOpen(true)}
          isScannerConnected={scannerConnected}
          onToggleMobileMenu={() => setMobileMenuOpen(prev => !prev)}
        />
        {activeTab === 'pos' && (
          canAccessVentas
            ? <POSPage onOpenScanner={() => setIsScannerModalOpen(true)} />
            : <div className="card p-4 m-4 text-center text-muted">Acceso restringido a Vendedores y Administración.</div>
        )}
        {activeTab === 'caja' && (
          canAccessVentas
            ? <CashControlPage onOpenScanner={() => setIsScannerModalOpen(true)} />
            : <div className="card p-4 m-4 text-center text-muted">Acceso restringido a Vendedores y Administración.</div>
        )}
        {activeTab === 'productos' && (
          <ProductsPage onOpenScanner={() => setIsScannerModalOpen(true)} />
        )}
        {activeTab === 'clientes' && (
          canAccessVentas ? (
            <ModuleErrorBoundary name="Gestión de Clientes">
              <ClientsPage />
            </ModuleErrorBoundary>
          ) : <div className="card p-4 m-4 text-center text-muted">Acceso restringido a Vendedores y Administración.</div>
        )}
        {activeTab === 'compras' && (
          canAccessAbastecimiento
            ? <PurchasesPage />
            : <div className="card p-4 m-4 text-center text-muted">Acceso restringido a Administradores y Almacén.</div>
        )}
        {activeTab === 'proveedores' && (
          canAccessAbastecimiento
            ? <SuppliersPage />
            : <div className="card p-4 m-4 text-center text-muted">Acceso restringido a Administradores y Almacén.</div>
        )}
        {activeTab === 'inventario' && (
          canAccessAbastecimiento
            ? <InventoryBatchesPage onNavigateToPurchases={() => setActiveTab('compras')} />
            : <div className="card p-4 m-4 text-center text-muted">Acceso restringido a Administradores y Almacén.</div>
        )}
        {activeTab === 'reportes' && (
          canAccessAdmin ? (
            <ModuleErrorBoundary name="Reportes y Analíticas">
              <ReportsAnalyticsPage />
            </ModuleErrorBoundary>
          ) : <div className="card p-4 m-4 text-center text-muted">Acceso restringido a Administradores.</div>
        )}
        {activeTab === 'auditoria' && (
          canAccessAdmin ? (
            <ModuleErrorBoundary name="Bitácora de Auditoría">
              <AuditLogPage />
            </ModuleErrorBoundary>
          ) : <div className="card p-4 m-4 text-center text-muted">Acceso restringido a Administradores.</div>
        )}
        {activeTab === 'usuarios' && (
          canAccessAdmin
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
          sessionStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(updatedUser));
          updateUserState(updatedUser);
        }}
      />

      <Toast toast={scannerToast} onClose={() => setScannerToast(null)} />
    </div>
  );
};

export default MainLayout;

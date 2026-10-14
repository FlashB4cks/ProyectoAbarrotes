import React, { useState, useEffect } from 'react';
import { playScannerBeep } from '../../utils/audio';
import { IconBarcode, IconCheck, IconSmartphone } from '../../components/icons/Icons';

/* ── MODAL: CONFIGURACIÓN DE LECTOR DE CÓDIGOS DE BARRAS (PISTOLA USB Y APP MÓVIL) ── */
export const ScannerModal = ({ isOpen, onClose, session, onGenerateSession, connectedDevice }) => {
  const [activeTab, setActiveTab] = useState('usb'); // 'usb' como pestaña predeterminada
  const [testInput, setTestInput] = useState('');
  const [testResult, setTestResult] = useState(null);

  useEffect(() => {
    if (isOpen) {
      setTestInput('');
      setTestResult(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Prueba en vivo para validar detección por pistola USB o App Móvil (ambos emulan HID)
  const handleTestKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const val = testInput.trim();
      if (val.length >= 2) {
        playScannerBeep(true);
        setTestResult({
          code: val,
          length: val.length,
          timestamp: new Date().toLocaleTimeString(),
          msg: `¡Lectura exitosa! Código recibido: ${val}`,
        });
        setTestInput('');
      }
    }
  };

  return (
    <div className="modal-backdrop" onClick={(e) => { if (e.target.className.includes('modal-backdrop')) onClose(); }}>
      <div className="modal-container modal-scanner" style={{ maxWidth: '640px' }}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '36px', height: '36px', borderRadius: '8px', background: 'rgba(184, 134, 11, 0.1)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent)'
            }}>
              <IconBarcode size={20} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: 'var(--text-main)' }}>
                Configuración de Lector de Códigos de Barras
              </h3>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                Compatibilidad con pistolas lectoras físicas USB y aplicación móvil
              </span>
            </div>
          </div>
          <button className="btn-close" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body">
          {/* Selector de modo: Solo Pistola USB y App Móvil */}
          <div className="tab-pill-group" style={{ marginBottom: '14px', display: 'flex', gap: '8px' }}>
            <button 
              type="button"
              className={`tab-pill ${activeTab === 'usb' ? 'active' : ''}`}
              onClick={() => setActiveTab('usb')}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            >
              <IconBarcode size={14} />
              <span>Pistola USB Física</span>
            </button>
            <button 
              type="button"
              className={`tab-pill ${activeTab === 'app_celular' ? 'active' : ''}`}
              onClick={() => setActiveTab('app_celular')}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            >
              <IconSmartphone size={14} />
              <span>App Móvil (Barcode to PC)</span>
            </button>
          </div>

          {/* PESTAÑA 1: PISTOLA LECTORA FÍSICA USB */}
          {activeTab === 'usb' && (
            <div>
              <div className="info-banner" style={{ marginBottom: '12px', padding: '10px 14px' }}>
                <strong style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <IconBarcode size={15} />
                  <span>Pistola Lectora de Códigos USB (Plug & Play HID)</span>
                </strong>
                <p style={{ margin: '4px 0 0 0', fontSize: '12px', lineHeight: '1.4' }}>
                  Conecta cualquier pistola o escáner de códigos de barras a un puerto USB de la computadora. Windows la detecta de forma inmediata como teclado emulado (HID) sin requerir controladores o software adicional.
                </p>
              </div>

              <div className="scanner-steps-grid" style={{ marginBottom: '14px' }}>
                <div className="scanner-step-compact">
                  <div className="scanner-step-compact-header">
                    <span className="scanner-step-badge">1</span>
                    <strong style={{ fontSize: '13px', color: 'var(--text-main)' }}>Conectar al USB</strong>
                  </div>
                  <p style={{ margin: '6px 0 0 0', fontSize: '11.5px', color: 'var(--text-muted)', lineHeight: '1.35' }}>
                    Enchufa el cable de la pistola en cualquier puerto USB de tu computadora o laptop.
                  </p>
                </div>

                <div className="scanner-step-compact">
                  <div className="scanner-step-compact-header">
                    <span className="scanner-step-badge">2</span>
                    <strong style={{ fontSize: '13px', color: 'var(--text-main)' }}>Detección Automática</strong>
                  </div>
                  <p style={{ margin: '6px 0 0 0', fontSize: '11.5px', color: 'var(--text-muted)', lineHeight: '1.35' }}>
                    Windows emitirá un sonido de confirmación y el lector quedará listo para operar de inmediato.
                  </p>
                </div>

                <div className="scanner-step-compact">
                  <div className="scanner-step-compact-header">
                    <span className="scanner-step-badge">3</span>
                    <strong style={{ fontSize: '13px', color: 'var(--text-main)' }}>Escanear Códigos</strong>
                  </div>
                  <p style={{ margin: '6px 0 0 0', fontSize: '11.5px', color: 'var(--text-muted)', lineHeight: '1.35' }}>
                    Apunta y dispara sobre cualquier código EAN-13, UPC o Code-128 para autocompletar en el sistema.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* PESTAÑA 2: APP MÓVIL (BARCODE TO PC) */}
          {activeTab === 'app_celular' && (
            <div>
              <div className="info-banner" style={{ marginBottom: '12px', padding: '10px 14px' }}>
                <strong style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <IconSmartphone size={15} />
                  <span>Usar la Aplicación Móvil "Barcode to PC" (Android / iOS)</span>
                </strong>
                <p style={{ margin: '4px 0 0 0', fontSize: '12px', lineHeight: '1.4' }}>
                  Convierte la cámara de tu teléfono celular en un lector de códigos inalámbrico que envía las lecturas directamente a NohemySys emulando un teclado físico:
                </p>
              </div>

              <div className="scanner-steps-grid" style={{ marginBottom: '14px' }}>
                <div className="scanner-step-compact">
                  <div className="scanner-step-compact-header">
                    <span className="scanner-step-badge">1</span>
                    <strong style={{ fontSize: '13px', color: 'var(--text-main)' }}>Instalar Servidor PC</strong>
                  </div>
                  <p style={{ margin: '6px 0 0 0', fontSize: '11.5px', color: 'var(--text-muted)', lineHeight: '1.35' }}>
                    Descarga gratis el programa oficial para Windows desde <strong>barcodetopc.com</strong> e instálalo.
                  </p>
                </div>

                <div className="scanner-step-compact">
                  <div className="scanner-step-compact-header">
                    <span className="scanner-step-badge">2</span>
                    <strong style={{ fontSize: '13px', color: 'var(--text-main)' }}>Instalar App en Celular</strong>
                  </div>
                  <p style={{ margin: '6px 0 0 0', fontSize: '11.5px', color: 'var(--text-muted)', lineHeight: '1.35' }}>
                    Descarga "Barcode to PC" desde Google Play o App Store. Abre la app y se conectará automáticamente.
                  </p>
                </div>

                <div className="scanner-step-compact">
                  <div className="scanner-step-compact-header">
                    <span className="scanner-step-badge">3</span>
                    <strong style={{ fontSize: '13px', color: 'var(--text-main)' }}>Escanear en Vivo</strong>
                  </div>
                  <p style={{ margin: '6px 0 0 0', fontSize: '11.5px', color: 'var(--text-muted)', lineHeight: '1.35' }}>
                    Cada código escaneado con la cámara de tu teléfono se escribirá en NohemySys al instante.
                  </p>
                </div>
              </div>

              <div style={{ background: 'var(--input-bg)', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--card-border)', fontSize: '12px', marginBottom: '14px' }}>
                <span style={{ fontWeight: 700, color: 'var(--accent)', display: 'block', marginBottom: '2px' }}>
                  Funcionamiento transparente con NohemySys
                </span>
                <p style={{ margin: 0, color: 'var(--text-muted)', lineHeight: '1.4' }}>
                  Tanto la pistola física como Barcode to PC emulan pulsaciones de teclado USB. Puedes utilizar cualquiera de los dos métodos indistintamente en el punto de venta, inventario y compras.
                </p>
              </div>
            </div>
          )}

          {/* BANCO DE PRUEBA EN VIVO (COMÚN PARA AMBAS OPCIONES) */}
          <div className="scanner-live-box">
            <div className="scanner-laser-line"></div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px', flexWrap: 'wrap', gap: '6px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '13px', fontWeight: 800, color: 'var(--accent)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <IconBarcode size={14} />
                  <span>Banco de Prueba en Tiempo Real</span>
                </span>
                <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '10px', background: 'rgba(16, 185, 129, 0.2)', color: '#10b981', fontWeight: 700 }}>
                  ● Escuchando lecturas
                </span>
              </div>
              <span style={{ fontSize: '11.5px', color: '#b8b2a8' }}>
                Dispara con la pistola o escanea con el celular para validar
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
              <input 
                type="text" 
                value={testInput} 
                onChange={(e) => setTestInput(e.target.value)}
                onKeyDown={handleTestKeyDown}
                placeholder="Apunta y dispara aquí para probar..."
                style={{
                  width: '100%',
                  maxWidth: '440px',
                  padding: '8px 14px',
                  borderRadius: '8px',
                  border: '1px solid var(--accent)',
                  background: '#100e0c',
                  color: '#ffffff',
                  fontSize: '14px',
                  textAlign: 'center',
                  fontWeight: 700,
                  letterSpacing: '0.5px'
                }}
                autoFocus
              />
              {testResult && (
                <button 
                  type="button" 
                  onClick={() => { setTestResult(null); setTestInput(''); }}
                  style={{ background: 'transparent', border: '1px solid #555', color: '#bbb', borderRadius: '6px', padding: '6px 10px', cursor: 'pointer', fontSize: '11.5px' }}
                  title="Limpiar"
                >
                  Limpiar
                </button>
              )}
            </div>

            {testResult && (
              <div style={{
                marginTop: '8px',
                padding: '6px 12px',
                background: 'rgba(16, 185, 129, 0.15)',
                border: '1px solid rgba(16, 185, 129, 0.4)',
                borderRadius: '8px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '12.5px',
                color: '#10b981',
                fontWeight: 700
              }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <IconCheck size={14} />
                  <span>¡Lectura Recibida!</span>
                </span>
                <span style={{ background: '#064e3b', color: '#6ee7b7', padding: '2px 8px', borderRadius: '4px', fontFamily: 'monospace', fontSize: '13.5px' }}>
                  {testResult.code}
                </span>
                <span style={{ color: '#a7f3d0', fontSize: '11px', fontWeight: 500 }}>
                  ({testResult.length} caracteres • {testResult.timestamp})
                </span>
              </div>
            )}
          </div>
        </div>

        <div className="modal-footer" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span className="scanner-indicator-dot"></span>
            <span style={{ fontSize: '12.5px', color: 'var(--text-muted)', fontWeight: 600 }}>
              Recepción de códigos activa en Productos, Compras e Inventario
            </span>
          </div>
          <button type="button" className="btn btn-primary" onClick={onClose} style={{ minWidth: '150px' }}>
            Entendido / Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};


export default ScannerModal;

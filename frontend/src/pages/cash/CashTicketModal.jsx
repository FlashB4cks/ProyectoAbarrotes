import React, { useEffect } from 'react';
import { IconPrinter } from '../../components/icons/Icons';

/* ── MODAL: COMPROBANTE DE CORTE DE CAJA (TÉRMICO 80MM) ── */
export const CashTicketModal = ({ isOpen, onClose, caja }) => {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !caja) return null;

  const totalVentas = (
    parseFloat(caja.total_ventas_efectivo || 0) +
    parseFloat(caja.total_ventas_tarjeta || 0) +
    parseFloat(caja.total_ventas_transferencia || 0)
  ).toFixed(2);

  const dif = parseFloat(caja.diferencia || 0);
  const estadoCuadre = Math.abs(dif) < 0.01 
    ? 'CUADRADA EXACTA' 
    : (dif > 0 ? `SOBRANTE (+Q ${dif.toFixed(2)})` : `FALTANTE (-Q ${Math.abs(dif).toFixed(2)})`);

  const isCuadrada = Math.abs(dif) < 0.01;
  const isFaltante = dif < -0.01;
  const isSobrante = dif > 0.01;

  return (
    <div className="modal-backdrop" onClick={(e) => { if (e.target.className.includes('modal-backdrop')) onClose(); }}>
      <div className="modal-container" style={{ maxWidth: '460px', maxHeight: '94vh', width: '95%' }}>
        {/* Cabecera del Modal */}
        <div className="modal-header" style={{ padding: '14px 18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ color: 'var(--accent)', display: 'flex' }}>
              <IconPrinter size={22} />
            </span>
            <div>
              <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 800 }}>Comprobante de Corte de Caja</h3>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                Turno #{caja.id_sesion} • Estado: <strong>{caja.estado}</strong>
              </span>
            </div>
          </div>
          <button className="btn-close" onClick={onClose} title="Cerrar comprobante (Esc)">✕</button>
        </div>

        {/* Cuerpo del Modal */}
        <div className="modal-body" style={{ background: '#f5f3ee', padding: '12px 14px', overflowY: 'auto' }}>
          {/* Banner Resumen de Cuadre */}
          <div 
            className="no-print"
            style={{ 
              background: isCuadrada ? '#ecfdf5' : (isFaltante ? '#fef2f2' : '#eff6ff'), 
              border: `1.5px solid ${isCuadrada ? '#10b981' : (isFaltante ? '#ef4444' : '#3b82f6')}`,
              color: isCuadrada ? '#065f46' : (isFaltante ? '#991b1b' : '#1e40af'),
              padding: '10px 14px',
              borderRadius: '8px',
              marginBottom: '10px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              fontWeight: 800,
              fontSize: '12.5px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '16px' }}>{isCuadrada ? '✓' : (isFaltante ? '⚠' : 'ℹ')}</span>
              <span>{estadoCuadre}</span>
            </div>
            <div style={{ textAlign: 'right' }}>
              <span style={{ fontSize: '10.5px', fontWeight: 600, display: 'block', opacity: 0.85 }}>DIFERENCIA</span>
              <span>{dif >= 0 ? '+' : ''}Q {dif.toFixed(2)}</span>
            </div>
          </div>

          {/* Ticket Térmico 80mm con tipografía compacta auténtica */}
          <div 
            className="ticket-preview-box ticket-printable" 
            id="printable-corte-ticket"
            style={{ 
              background: '#ffffff', 
              color: '#000000', 
              padding: '16px 14px', 
              borderRadius: '8px', 
              boxShadow: '0 2px 12px rgba(0, 0, 0, 0.08)',
              width: '100%',
              maxWidth: '380px',
              margin: '0 auto',
              fontFamily: "'Courier New', Courier, monospace",
              fontSize: '11.5px',
              lineHeight: '1.38'
            }}
          >
            {/* Encabezado del Ticket */}
            <div style={{ textAlign: 'center', borderBottom: '1px dashed #000', paddingBottom: '8px', marginBottom: '8px' }}>
              <h2 style={{ margin: '0 0 2px 0', fontSize: '16px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '1px' }}>
                DISTRIBUIDORA NOHEMY
              </h2>
              <div style={{ fontSize: '10.5px', lineHeight: '1.3' }}>
                Abarrotes y Consumo Popular • Guatemala, C.A.<br />
                <strong>COMPROBANTE DE CORTE Y ARQUEO DE CAJA</strong>
              </div>
              <div style={{ marginTop: '6px', display: 'inline-block', background: '#000', color: '#fff', padding: '2px 8px', borderRadius: '3px', fontSize: '11px', fontWeight: 800 }}>
                TURNO #{caja.id_sesion} • {caja.estado}
              </div>
            </div>

            {/* Información del Turno */}
            <div style={{ borderBottom: '1px dashed #000', paddingBottom: '8px', marginBottom: '8px' }}>
              <div><strong>Apertura:</strong> {caja.fecha_apertura ? new Date(caja.fecha_apertura).toLocaleString('es-GT') : '-'}</div>
              <div><strong>Cierre:</strong> {caja.fecha_cierre ? new Date(caja.fecha_cierre).toLocaleString('es-GT') : '-'}</div>
              <div><strong>Cajero Apertura:</strong> {caja.usuario_apertura_nombre || 'Sistema'}</div>
              {caja.usuario_cierre_nombre && <div><strong>Cajero Cierre:</strong> {caja.usuario_cierre_nombre}</div>}
              {caja.tiempo_abierta && <div><strong>Duración Turno:</strong> {caja.tiempo_abierta}</div>}
            </div>

            {/* Desglose de Ventas */}
            <div style={{ borderBottom: '1px dashed #000', paddingBottom: '8px', marginBottom: '8px' }}>
              <div style={{ fontWeight: 800, textTransform: 'uppercase', marginBottom: '3px' }}>Desglose de Ventas:</div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Ventas Efectivo:</span>
                <span>Q {Number(caja.total_ventas_efectivo || 0).toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Ventas Tarjeta:</span>
                <span>Q {Number(caja.total_ventas_tarjeta || 0).toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Ventas Transferencia:</span>
                <span>Q {Number(caja.total_ventas_transferencia || 0).toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, marginTop: '3px', borderTop: '1px dotted #000', paddingTop: '3px' }}>
                <span>TOTAL VENTAS TURNO:</span>
                <span>Q {totalVentas}</span>
              </div>
            </div>

            {/* Cuadre de Gaveta de Efectivo */}
            <div style={{ borderBottom: '1px dashed #000', paddingBottom: '8px', marginBottom: '8px' }}>
              <div style={{ fontWeight: 800, textTransform: 'uppercase', marginBottom: '3px' }}>Arqueo Físico en Gaveta:</div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Fondo Inicial:</span>
                <span>Q {Number(caja.monto_inicial || 0).toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>(+) Ventas Efectivo:</span>
                <span>Q {Number(caja.total_ventas_efectivo || 0).toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>(+) Entradas Extras:</span>
                <span>Q {Number(caja.total_ingresos_extra || 0).toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>(-) Salidas / Gastos:</span>
                <span>Q {Number(caja.total_egresos_extra || 0).toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, marginTop: '4px', borderTop: '1px solid #000', paddingTop: '3px' }}>
                <span>EFECTIVO ESPERADO:</span>
                <span>Q {Number(caja.monto_esperado || 0).toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800 }}>
                <span>EFECTIVO CONTADO:</span>
                <span>Q {Number(caja.monto_real_efectivo || 0).toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 900, fontSize: '12.5px', marginTop: '4px', borderTop: '2px solid #000', paddingTop: '3px' }}>
                <span>DIFERENCIA:</span>
                <span>{dif >= 0 ? '+' : ''}Q {dif.toFixed(2)}</span>
              </div>
              <div style={{ textAlign: 'center', fontWeight: 800, marginTop: '4px', fontSize: '10.5px', textTransform: 'uppercase' }}>
                RESULTADO: {estadoCuadre}
              </div>
            </div>

            {caja.observaciones && (
              <div style={{ fontSize: '10.5px', borderBottom: '1px dashed #000', paddingBottom: '6px', marginBottom: '8px' }}>
                <strong>Observaciones:</strong> {caja.observaciones}
              </div>
            )}

            {/* Firmas */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginTop: '16px', textAlign: 'center', fontSize: '10px' }}>
              <div style={{ borderTop: '1px solid #000', paddingTop: '3px' }}>
                Firma Cajero Entregó
              </div>
              <div style={{ borderTop: '1px solid #000', paddingTop: '3px' }}>
                Firma Administrador Recibió
              </div>
            </div>
          </div>
        </div>

        {/* Pie del modal fijo y siempre visible */}
        <div className="modal-footer" style={{ padding: '12px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Cerrar
          </button>
          <button 
            type="button" 
            className="btn btn-primary" 
            onClick={() => window.print()} 
            style={{ fontWeight: 800, display: 'inline-flex', alignItems: 'center', gap: '8px' }}
          >
            <IconPrinter size={16} />
            <span>Imprimir Ticket de Corte</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default CashTicketModal;

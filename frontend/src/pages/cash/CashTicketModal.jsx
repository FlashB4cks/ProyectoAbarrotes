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

  return (
    <div className="modal-backdrop" onClick={(e) => { if (e.target.className.includes('modal-backdrop')) onClose(); }}>
      <div className="modal-container" style={{ maxWidth: '480px' }}>
        {/* Cabecera del Modal con botón de cierre garantizado */}
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ color: 'var(--accent)', display: 'flex' }}>
              <IconPrinter size={22} />
            </span>
            <div>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800 }}>Comprobante de Corte de Caja</h3>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                Turno #{caja.id_sesion} • Estado: {caja.estado}
              </span>
            </div>
          </div>
          <button className="btn-close" onClick={onClose} title="Cerrar comprobante (Esc)">✕</button>
        </div>

        {/* Cuerpo con Scroll vertical para visualizar el ticket completo */}
        <div className="modal-body" style={{ background: '#f5f3ee', padding: '16px', display: 'flex', justifyContent: 'center' }}>
          <div 
            className="ticket-preview-box ticket-printable" 
            id="printable-corte-ticket"
            style={{ 
              background: '#ffffff', 
              color: '#000000', 
              padding: '22px 18px', 
              borderRadius: '8px', 
              boxShadow: '0 4px 15px rgba(0, 0, 0, 0.08)',
              width: '100%',
              maxWidth: '380px',
              fontFamily: 'Courier New, Courier, monospace'
            }}
          >
            {/* Encabezado del Ticket */}
            <div style={{ textAlign: 'center', borderBottom: '1px dashed #000', paddingBottom: '12px', marginBottom: '12px' }}>
              <h2 style={{ margin: '0 0 4px 0', fontSize: '18px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '1px' }}>
                DISTRIBUIDORA NOHEMY
              </h2>
              <div style={{ fontSize: '11px', lineHeight: '1.4' }}>
                Abarrotes y Consumo Popular<br />
                Guatemala, C.A.<br />
                <strong>COMPROBANTE DE CORTE Y ARQUEO DE CAJA</strong>
              </div>
              <div style={{ marginTop: '8px', display: 'inline-block', background: '#000', color: '#fff', padding: '3px 10px', borderRadius: '4px', fontSize: '12px', fontWeight: 800 }}>
                TURNO #{caja.id_sesion} • {caja.estado}
              </div>
            </div>

            {/* Información del Turno */}
            <div style={{ fontSize: '11.5px', lineHeight: '1.6', borderBottom: '1px dashed #000', paddingBottom: '10px', marginBottom: '10px' }}>
              <div><strong>Apertura:</strong> {caja.fecha_apertura ? new Date(caja.fecha_apertura).toLocaleString('es-GT') : '-'}</div>
              <div><strong>Cierre:</strong> {caja.fecha_cierre ? new Date(caja.fecha_cierre).toLocaleString('es-GT') : '-'}</div>
              <div><strong>Cajero Apertura:</strong> {caja.usuario_apertura_nombre || 'Sistema'}</div>
              {caja.usuario_cierre_nombre && <div><strong>Cajero Cierre:</strong> {caja.usuario_cierre_nombre}</div>}
              {caja.tiempo_abierta && <div><strong>Duración Turno:</strong> {caja.tiempo_abierta}</div>}
            </div>

            {/* Desglose de Ventas */}
            <div style={{ fontSize: '12px', lineHeight: '1.6', borderBottom: '1px dashed #000', paddingBottom: '10px', marginBottom: '10px' }}>
              <div style={{ fontWeight: 800, textTransform: 'uppercase', marginBottom: '4px' }}>Desglose de Ventas:</div>
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
              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, marginTop: '4px', borderTop: '1px dotted #000', paddingTop: '4px' }}>
                <span>TOTAL VENTAS TURNO:</span>
                <span>Q {totalVentas}</span>
              </div>
            </div>

            {/* Cuadre de Gaveta de Efectivo */}
            <div style={{ fontSize: '12px', lineHeight: '1.6', borderBottom: '1px dashed #000', paddingBottom: '10px', marginBottom: '10px' }}>
              <div style={{ fontWeight: 800, textTransform: 'uppercase', marginBottom: '4px' }}>Arqueo Físico en Gaveta:</div>
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
              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, marginTop: '4px', borderTop: '1px solid #000', paddingTop: '4px' }}>
                <span>EFECTIVO ESPERADO:</span>
                <span>Q {Number(caja.monto_esperado || 0).toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800 }}>
                <span>EFECTIVO CONTADO:</span>
                <span>Q {Number(caja.monto_real_efectivo || 0).toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 900, fontSize: '13px', marginTop: '4px', borderTop: '2px solid #000', paddingTop: '4px' }}>
                <span>DIFERENCIA:</span>
                <span>{dif >= 0 ? '+' : ''}Q {dif.toFixed(2)}</span>
              </div>
              <div style={{ textAlign: 'center', fontWeight: 800, marginTop: '6px', fontSize: '11px', textTransform: 'uppercase' }}>
                RESULTADO: {estadoCuadre}
              </div>
            </div>

            {caja.observaciones && (
              <div style={{ fontSize: '11px', borderBottom: '1px dashed #000', paddingBottom: '8px', marginBottom: '10px' }}>
                <strong>Observaciones:</strong> {caja.observaciones}
              </div>
            )}

            {/* Firmas */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginTop: '24px', textAlign: 'center', fontSize: '10.5px' }}>
              <div style={{ borderTop: '1px solid #000', paddingTop: '4px' }}>
                Firma Cajero Entregó
              </div>
              <div style={{ borderTop: '1px solid #000', paddingTop: '4px' }}>
                Firma Administrador Recibió
              </div>
            </div>
          </div>
        </div>

        {/* Pie del modal fijo y siempre visible */}
        <div className="modal-footer" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
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

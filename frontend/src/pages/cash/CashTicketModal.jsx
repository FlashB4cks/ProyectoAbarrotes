import React from 'react';
import { IconPrinter } from '../../components/icons/Icons';

/* ── MODAL: COMPROBANTE DE CORTE DE CAJA (TÉRMICO 80MM) ── */
export const CashTicketModal = ({ isOpen, onClose, caja }) => {
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
      <div className="modal-container" style={{ maxWidth: '420px', padding: '0', background: 'transparent', boxShadow: 'none' }}>
        <div style={{ background: '#ffffff', color: '#000000', padding: '24px 20px', borderRadius: '12px', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.4)' }} className="ticket-printable">
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
            <div style={{ marginTop: '8px', display: 'inline-block', background: '#000', color: '#fff', padding: '2px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 800 }}>
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
            <div style={{ textAlign: 'center', fontWeight: 800, marginTop: '4px', fontSize: '11px', textTransform: 'uppercase' }}>
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

        {/* Botones de acción (no se imprimen) */}
        <div style={{ display: 'flex', gap: '8px', marginTop: '14px', justifyContent: 'center' }}>
          <button type="button" className="btn btn-primary" onClick={() => window.print()} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
            <IconPrinter size={16} />
            <span>Imprimir Ticket</span>
          </button>
          <button type="button" className="btn btn-secondary" onClick={onClose} style={{ background: '#334155', color: '#fff' }}>
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};


export default CashTicketModal;

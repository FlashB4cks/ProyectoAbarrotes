import React from 'react';
import { IconPrinter, IconReceipt } from '../../components/icons/Icons';

/* ── COMPONENTE: MODAL DE TICKET TÉRMICO IMPRIMIBLE (80MM) ── */
export const InvoiceTicketModal = ({ isOpen, onClose, saleData }) => {
  if (!isOpen || !saleData) return null;

  const handlePrint = () => {
    window.print();
  };

  const fechaStr = saleData.fecha_venta
    ? new Date(saleData.fecha_venta).toLocaleString('es-GT', { dateStyle: 'short', timeStyle: 'short' })
    : new Date().toLocaleString('es-GT');

  const detalles = saleData.detalles || [];
  const subtotalCalc = detalles.reduce((acc, d) => acc + (parseFloat(d.subtotal) || 0), 0);
  const total = parseFloat(saleData.total) || 0;
  const descuento = parseFloat(saleData.descuento) || 0;
  const recibido = parseFloat(saleData.monto_recibido) || total;
  const cambio = parseFloat(saleData.cambio) || 0;

  return (
    <div className="modal-backdrop" onClick={(e) => { if (e.target.className.includes('modal-backdrop')) onClose(); }}>
      <div className="modal-container" style={{ maxWidth: '440px' }}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ display: 'flex', alignItems: 'center', color: 'var(--accent)' }}>
              <IconReceipt size={22} />
            </span>
            <div>
              <h3>Comprobante de Venta</h3>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Factura {saleData.codigo_factura}</span>
            </div>
          </div>
          <button className="btn-close" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body" style={{ background: '#f0ede6', padding: '16px', display: 'flex', justifyContent: 'center' }}>
          {/* Ticket térmico 80mm preview y target para window.print */}
          <div className="ticket-preview-box ticket-printable" id="printable-pos-ticket">
            <div style={{ textAlign: 'center', marginBottom: '8px' }}>
              <div style={{ fontSize: '18px', fontWeight: 900, letterSpacing: '1px' }}>NOHEMYSYS</div>
              <div style={{ fontSize: '12px', fontWeight: 700 }}>ABARROTERÍA Y COMERCIO GENERAL</div>
              <div style={{ fontSize: '11px', color: '#444' }}>NIT: 10482910-3 • Tel: 2200-0000</div>
              <div style={{ fontSize: '11px', color: '#444' }}>Guatemala, Centroamérica</div>
            </div>

            <div className="ticket-divider" />

            <div style={{ fontSize: '11.5px', display: 'flex', justifyContent: 'space-between' }}>
              <span><strong>FACTURA:</strong> {saleData.codigo_factura}</span>
              <span>{fechaStr}</span>
            </div>
            <div style={{ fontSize: '11.5px', marginTop: '3px' }}>
              <strong>CLIENTE:</strong> {saleData.cliente?.nombre_completo || 'Consumidor Final'}
            </div>
            <div style={{ fontSize: '11.5px', marginTop: '2px' }}>
              <strong>NIT/DPI:</strong> {saleData.cliente?.nit || 'C/F'}
            </div>
            {saleData.vendedor_nombre && (
              <div style={{ fontSize: '11.5px', marginTop: '2px' }}>
                <strong>CAJERO:</strong> {saleData.vendedor_nombre}
              </div>
            )}

            <div className="ticket-divider" />

            {/* Encabezado tabla */}
            <div style={{ display: 'grid', gridTemplateColumns: '30px 1fr 55px 65px', fontWeight: 700, fontSize: '11px', borderBottom: '1px solid #777', paddingBottom: '3px', marginBottom: '4px' }}>
              <span>CANT</span>
              <span>DESCRIPCIÓN</span>
              <span style={{ textAlign: 'right' }}>P.U.</span>
              <span style={{ textAlign: 'right' }}>TOTAL</span>
            </div>

            {/* Listado items */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
              {detalles.map((item, idx) => (
                <div key={idx} style={{ fontSize: '11.5px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '30px 1fr 55px 65px' }}>
                    <span style={{ fontWeight: 700 }}>{item.cantidad}</span>
                    <span style={{ wordBreak: 'break-word', paddingRight: '4px' }}>{item.producto_nombre}</span>
                    <span style={{ textAlign: 'right' }}>Q {parseFloat(item.precio_unitario).toFixed(2)}</span>
                    <span style={{ textAlign: 'right', fontWeight: 700 }}>Q {parseFloat(item.subtotal).toFixed(2)}</span>
                  </div>
                  {/* Trazabilidad PEPS / Lotes */}
                  {item.salidas_lotes && item.salidas_lotes.length > 0 && (
                    <div style={{ fontSize: '9.5px', color: '#555', paddingLeft: '30px', marginTop: '1px' }}>
                      ↳ PEPS: {item.salidas_lotes.map(s => `${s.correlativo_lote || 'Lote'}: ${s.cantidad_descontada}u`).join(', ')}
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="ticket-divider" />

            {/* Resumen monetario */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', fontSize: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>SUBTOTAL:</span>
                <span>Q {subtotalCalc.toFixed(2)}</span>
              </div>
              {descuento > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#666' }}>
                  <span>DESCUENTO:</span>
                  <span>- Q {descuento.toFixed(2)}</span>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', fontWeight: 900, borderTop: '1px solid #999', paddingTop: '4px', marginTop: '2px' }}>
                <span>TOTAL:</span>
                <span>Q {total.toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '2px' }}>
                <span>FORMA DE PAGO:</span>
                <span>{saleData.metodo_pago}</span>
              </div>
              {saleData.metodo_pago === 'EFECTIVO' && (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>PAGÓ CON:</span>
                    <span>Q {recibido.toFixed(2)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700 }}>
                    <span>CAMBIO:</span>
                    <span>Q {cambio.toFixed(2)}</span>
                  </div>
                </>
              )}
            </div>

            <div className="ticket-divider" />

            <div style={{ textAlign: 'center', fontSize: '11px', marginTop: '6px' }}>
              <div style={{ fontWeight: 700 }}>¡GRACIAS POR SU COMPRA!</div>
              <div style={{ fontSize: '10px', color: '#555', marginTop: '2px' }}>Conserve su ticket como constancia.</div>
              <div style={{ fontSize: '9.5px', color: '#777', marginTop: '6px', fontFamily: 'monospace' }}>
                *** NohemySys POS ***
              </div>
            </div>
          </div>
        </div>

        <div className="modal-footer" style={{ display: 'flex', justifyContent: 'space-between' }}>
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Cerrar / Nueva Venta
          </button>
          <button type="button" className="btn btn-primary" onClick={handlePrint} style={{ fontWeight: 800, display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
            <IconPrinter size={16} />
            <span>Imprimir Comprobante</span>
          </button>
        </div>
      </div>
    </div>
  );
};


export default InvoiceTicketModal;

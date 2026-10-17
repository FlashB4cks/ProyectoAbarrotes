import React from 'react';
import { IconPrinter, IconReceipt } from '../../components/icons/Icons';

/* ── COMPONENTE: MODAL DE TICKET TÉRMICO IMPRIMIBLE (80MM) ── */
export const InvoiceTicketModal = ({ isOpen, onClose, saleData }) => {
  if (!isOpen || !saleData) return null;

  // Extraer el objeto de venta real tanto si viene envuelto en { venta: ... } como si viene plano
  const sale = saleData.venta || saleData;

  const handlePrint = () => {
    window.print();
  };

  const rawFecha = sale.fecha_hora || sale.fecha_venta || sale.fecha;
  const fechaStr = rawFecha
    ? new Date(rawFecha).toLocaleString('es-GT', { dateStyle: 'short', timeStyle: 'short' })
    : new Date().toLocaleString('es-GT');

  const detalles = sale.detalles || sale.items || [];
  const codigoFactura = sale.codigo_factura || sale.numero_factura || 'TICKET-POS';
  const clienteNombre = sale.cliente_nombre || sale.cliente?.nombre_completo || (typeof sale.cliente === 'string' ? sale.cliente : 'Consumidor Final');
  const clienteNit = sale.cliente_nit || sale.cliente?.nit || 'C/F';
  const vendedor = sale.vendedor_nombre || sale.cajero || '';
  const metodoPago = sale.metodo_pago || 'EFECTIVO';

  const total = parseFloat(sale.total) || 0;
  const descuento = parseFloat(sale.descuento) || 0;
  const subtotalCalc = parseFloat(sale.subtotal) || detalles.reduce((acc, d) => acc + (parseFloat(d.subtotal) || 0), 0) || total;
  const cambio = parseFloat(sale.cambio_entregado ?? sale.cambio) || 0;
  const recibido = parseFloat(sale.monto_recibido) || (metodoPago === 'EFECTIVO' ? (total + cambio) : total);

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
              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Factura {codigoFactura}</span>
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
              <span><strong>FACTURA:</strong> {codigoFactura}</span>
              <span>{fechaStr}</span>
            </div>
            <div style={{ fontSize: '11.5px', marginTop: '3px' }}>
              <strong>CLIENTE:</strong> {clienteNombre}
            </div>
            <div style={{ fontSize: '11.5px', marginTop: '2px' }}>
              <strong>NIT/DPI:</strong> {clienteNit}
            </div>
            {vendedor && (
              <div style={{ fontSize: '11.5px', marginTop: '2px' }}>
                <strong>CAJERO:</strong> {vendedor}
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
                <span style={{ fontWeight: 700 }}>{metodoPago}</span>
              </div>
              {metodoPago === 'EFECTIVO' && (
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

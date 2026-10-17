import React, { useState, useEffect } from 'react';
import { NohemyApi } from '../../api/nohemyApi';
import { playCashRegisterSound, playScannerBeep } from '../../utils/audio';
import { IconBank, IconCard, IconCash } from '../../components/icons/Icons';

/* ── COMPONENTE: MODAL DE PAGO Y FACTURACIÓN (CHECKOUT POS) ── */
export const CheckoutModal = ({ isOpen, onClose, cartItems, subtotal, discount, total, client, onSuccessSale }) => {
  const [metodoPago, setMetodoPago] = useState('EFECTIVO');
  const [montoRecibido, setMontoRecibido] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (isOpen) {
      setMetodoPago('EFECTIVO');
      setMontoRecibido(total > 0 ? total.toFixed(2) : '');
      setErrorMsg('');
      setSubmitting(false);
    }
  }, [isOpen, total]);

  if (!isOpen) return null;

  const parsedRecibido = parseFloat(montoRecibido) || 0;
  const cambio = Math.max(0, parsedRecibido - total);
  const isInsufficient = metodoPago === 'EFECTIVO' && parsedRecibido < total;

  const handleQuickBill = (amount) => {
    if (amount === 'EXACTO') {
      setMontoRecibido(total.toFixed(2));
    } else {
      setMontoRecibido(Number(amount).toFixed(2));
    }
  };

  const handleConfirmSale = async (e) => {
    e.preventDefault();
    if (cartItems.length === 0) {
      setErrorMsg('El carrito está vacío.');
      return;
    }
    if (metodoPago === 'EFECTIVO' && parsedRecibido < total) {
      setErrorMsg(`El monto recibido (Q ${parsedRecibido.toFixed(2)}) es menor al total a cobrar (Q ${total.toFixed(2)}).`);
      return;
    }

    setSubmitting(true);
    setErrorMsg('');

    try {
      const payload = {
        cliente_id: client?.id_cliente || null,
        metodo_pago: metodoPago,
        descuento: parseFloat(discount) || 0,
        monto_recibido: metodoPago === 'EFECTIVO' ? parsedRecibido : total,
        items: cartItems.map(item => ({
          producto_id: item.producto.id_producto,
          cantidad: item.cantidad,
          precio_unitario: item.precio_unitario
        }))
      };

      const result = await NohemyApi.createVenta(payload);
      playCashRegisterSound();
      const saleObj = result?.venta || result;
      if (saleObj) {
        if (!saleObj.monto_recibido) saleObj.monto_recibido = metodoPago === 'EFECTIVO' ? parsedRecibido : total;
        if (saleObj.cambio === undefined && saleObj.cambio_entregado === undefined) saleObj.cambio = cambio;
        if (!saleObj.metodo_pago) saleObj.metodo_pago = metodoPago;
        if (!saleObj.cliente_nombre && client?.nombre_completo) saleObj.cliente_nombre = client.nombre_completo;
        if (!saleObj.cliente_nit && client?.nit) saleObj.cliente_nit = client.nit;
      }
      onSuccessSale(saleObj);
    } catch (err) {
      playScannerBeep(false);
      setErrorMsg(err.message || 'Error al procesar la venta.');
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={(e) => { if (e.target.className.includes('modal-backdrop')) onClose(); }}>
      <div className="modal-container" style={{ maxWidth: '580px' }}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ display: 'flex', alignItems: 'center', color: 'var(--accent)' }}>
              <IconCard size={22} />
            </span>
            <div>
              <h3>Cobro y Emisión de Factura</h3>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                Cliente: <strong>{client?.nombre_completo || 'Consumidor Final'}</strong> (NIT: {client?.nit || 'C/F'})
              </span>
            </div>
          </div>
          <button className="btn-close" onClick={onClose} disabled={submitting}>✕</button>
        </div>

        <form onSubmit={handleConfirmSale}>
          <div className="modal-body">
            {errorMsg && <div className="alert alert-danger" style={{ marginBottom: '14px' }}>{errorMsg}</div>}

            {/* Total Display Grande */}
            <div style={{
              background: 'linear-gradient(135deg, rgba(184, 134, 11, 0.15), rgba(184, 134, 11, 0.05))',
              border: '2px solid var(--accent)',
              borderRadius: '12px',
              padding: '16px 20px',
              textAlign: 'center',
              marginBottom: '18px'
            }}>
              <span style={{ fontSize: '13px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 700 }}>
                Total a Pagar
              </span>
              <div style={{ fontSize: '36px', fontWeight: 900, color: 'var(--accent)', marginTop: '4px' }}>
                Q {total.toFixed(2)}
              </div>
              <div style={{ fontSize: '12.5px', color: 'var(--text-muted)', marginTop: '4px' }}>
                {cartItems.reduce((acc, it) => acc + it.cantidad, 0)} artículos • Subtotal: Q {subtotal.toFixed(2)} {discount > 0 ? `• Desc: Q ${parseFloat(discount).toFixed(2)}` : ''}
              </div>
            </div>

            {/* Selector de Método de Pago */}
            <div className="form-group" style={{ marginBottom: '16px' }}>
              <label style={{ fontSize: '13px', fontWeight: 700 }}>Método de Pago</label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginTop: '6px' }}>
                {[
                  { id: 'EFECTIVO', label: 'Efectivo', Icon: IconCash },
                  { id: 'TARJETA', label: 'Tarjeta', Icon: IconCard },
                  { id: 'TRANSFERENCIA', label: 'Transferencia', Icon: IconBank },
                ].map(m => {
                  const IconComp = m.Icon;
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => {
                        setMetodoPago(m.id);
                        if (m.id !== 'EFECTIVO') setMontoRecibido(total.toFixed(2));
                      }}
                      style={{
                        padding: '12px 8px',
                        borderRadius: '8px',
                        border: metodoPago === m.id ? '2px solid var(--accent)' : '1px solid var(--card-border)',
                        background: metodoPago === m.id ? 'var(--accent)' : 'var(--input-bg)',
                        color: metodoPago === m.id ? '#ffffff' : 'var(--text-main)',
                        fontWeight: 700,
                        fontSize: '13px',
                        cursor: 'pointer',
                        transition: 'var(--transition)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px'
                      }}
                    >
                      <IconComp size={16} />
                      <span>{m.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Opciones cuando es EFECTIVO */}
            {metodoPago === 'EFECTIVO' ? (
              <div style={{ background: 'var(--input-bg)', padding: '16px', borderRadius: '10px', border: '1px solid var(--card-border)', marginBottom: '14px' }}>
                <div className="form-group" style={{ marginBottom: '10px' }}>
                  <label style={{ fontSize: '13px', fontWeight: 700 }}>Monto Recibido en Quetzales (Q)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={montoRecibido}
                    onChange={(e) => setMontoRecibido(e.target.value)}
                    placeholder="0.00"
                    style={{ fontSize: '20px', fontWeight: 800, padding: '10px 14px' }}
                    autoFocus
                  />
                </div>

                {/* Billetes rápidos de Quetzales */}
                <div style={{ marginBottom: '14px' }}>
                  <span style={{ fontSize: '11.5px', color: 'var(--text-muted)', display: 'block', marginBottom: '6px', fontWeight: 600 }}>
                    Billetes rápidos GTQ:
                  </span>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '6px' }}>
                    {['10', '20', '50', '100', '200', 'EXACTO'].map(val => (
                      <button
                        key={val}
                        type="button"
                        onClick={() => handleQuickBill(val)}
                        style={{
                          padding: '6px 2px',
                          fontSize: '11.5px',
                          fontWeight: 700,
                          borderRadius: '6px',
                          border: '1px solid var(--card-border)',
                          background: 'var(--card-bg)',
                          color: val === 'EXACTO' ? 'var(--accent)' : 'var(--text-main)',
                          cursor: 'pointer'
                        }}
                      >
                        {val === 'EXACTO' ? 'Exacto' : `Q ${val}`}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Cálculo en vivo de Cambio / Vuelto */}
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '12px 14px',
                  borderRadius: '8px',
                  background: isInsufficient ? 'rgba(239, 68, 68, 0.12)' : 'rgba(16, 185, 129, 0.12)',
                  border: `1px solid ${isInsufficient ? 'rgba(239, 68, 68, 0.3)' : 'rgba(16, 185, 129, 0.3)'}`
                }}>
                  <span style={{ fontWeight: 700, fontSize: '14px', color: isInsufficient ? '#ef4444' : '#10b981', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    {isInsufficient ? (
                      <>● Monto Faltante:</>
                    ) : (
                      <>
                        <IconCash size={16} />
                        <span>Cambio a Devolver:</span>
                      </>
                    )}
                  </span>
                  <span style={{ fontWeight: 900, fontSize: '22px', color: isInsufficient ? '#ef4444' : '#10b981' }}>
                    Q {isInsufficient ? (total - parsedRecibido).toFixed(2) : cambio.toFixed(2)}
                  </span>
                </div>
              </div>
            ) : (
              <div style={{ padding: '12px 16px', background: 'var(--input-bg)', borderRadius: '8px', marginBottom: '14px', border: '1px solid var(--card-border)' }}>
                <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                  {metodoPago === 'TARJETA' ? 'Procesando pago POS con Tarjeta de Débito/Crédito.' : 'Pago por Transferencia / Boleta de Depósito Bancario.'}
                  <br />
                  Monto a cargar: <strong>Q {total.toFixed(2)}</strong> (Exacto).
                </span>
              </div>
            )}
          </div>

          <div className="modal-footer" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={submitting}>
              Cancelar
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={submitting || isInsufficient}
              style={{ minWidth: '180px', padding: '12px 20px', fontSize: '15px', fontWeight: 800 }}
            >
              {submitting ? 'Emitiendo Factura...' : 'Cobrar y Facturar (Enter)'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};


export default CheckoutModal;

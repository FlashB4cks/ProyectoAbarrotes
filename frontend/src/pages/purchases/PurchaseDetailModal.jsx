import React from 'react';

/* ── MODAL: DETALLE DE COMPRA ── */
export const PurchaseDetailModal = ({ isOpen, onClose, compra }) => {
  if (!isOpen || !compra) return null;

  const fechaFormateada = compra.fecha_compra ? new Date(compra.fecha_compra).toLocaleString('es-GT', { dateStyle: 'medium', timeStyle: 'short' }) : 'N/A';
  const isAnulada = compra.estado === 'ANULADA';

  return (
    <div className="modal-backdrop" onClick={(e) => { if (e.target.className.includes('modal-backdrop')) onClose(); }}>
      <div className="modal-container modal-lg">
        <div className="modal-header">
          <div>
            <h3>Detalle de Compra — {compra.numero_comprobante}</h3>
            <span style={{ fontSize: '12.5px', color: 'var(--text-muted)' }}>
              Registrada el {fechaFormateada}
            </span>
          </div>
          <button className="btn-close" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body" style={{ maxHeight: '75vh', overflowY: 'auto' }}>
          <div className="form-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px', marginBottom: '20px', background: 'var(--input-bg)', padding: '16px', borderRadius: '10px', border: '1px solid var(--card-border)' }}>
            <div>
              <span style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-dim)', fontWeight: 700, display: 'block' }}>Proveedor</span>
              <strong style={{ fontSize: '14px', color: 'var(--text-main)' }}>{compra.proveedor_nombre}</strong>
            </div>
            <div>
              <span style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-dim)', fontWeight: 700, display: 'block' }}>Registrado Por</span>
              <strong style={{ fontSize: '14px', color: 'var(--text-main)' }}>{compra.usuario_nombre}</strong>
            </div>
            <div>
              <span style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-dim)', fontWeight: 700, display: 'block' }}>Estado</span>
              {isAnulada ? (
                <span className="stock-badge stock-danger">○ Anulada</span>
              ) : (
                <span className="stock-badge stock-success">● Recibida</span>
              )}
            </div>
          </div>

          <h4 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-main)', marginBottom: '10px' }}>
            Productos Incluidos en la Compra ({compra.detalles?.length || 0})
          </h4>

          <div className="purchase-table-container">
            <table className="table" style={{ margin: 0 }}>
              <thead>
                <tr>
                  <th>Código</th>
                  <th>Producto</th>
                  <th>Cantidad</th>
                  <th>Costo Unitario</th>
                  <th style={{ textAlign: 'right' }}>Subtotal</th>
                </tr>
              </thead>
              <tbody>
                {(!compra.detalles || compra.detalles.length === 0) ? (
                  <tr><td colSpan="5" style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)' }}>Sin detalles registrados.</td></tr>
                ) : (
                  compra.detalles.map((det) => (
                    <tr key={det.id_detalle_compra}>
                      <td><code className="user-code">{det.producto_codigo}</code></td>
                      <td>
                        <strong style={{ color: 'var(--text-main)' }}>{det.producto_nombre}</strong>
                      </td>
                      <td>
                        <span style={{ fontWeight: 600 }}>{det.cantidad} {det.unidad_simbolo || 'unidades'}</span>
                      </td>
                      <td>
                        Q {parseFloat(det.costo_unitario).toFixed(2)}
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--accent)' }}>
                        Q {parseFloat(det.subtotal).toFixed(2)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="purchase-summary-box">
            <span className="purchase-total-label">Total Liquidado:</span>
            <span className="purchase-total-amount">Q {parseFloat(compra.total_compra).toFixed(2)}</span>
          </div>

          <div className="modal-footer" style={{ marginTop: '20px' }}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cerrar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};


export default PurchaseDetailModal;

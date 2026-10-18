import React, { useState, useEffect, useMemo } from 'react';
import { NohemyApi } from '../../api/nohemyApi';
import { Toast } from '../../components/common';
import { IconPrinter, IconRefresh } from '../../components/icons/Icons';

/* ── COMPONENTE: HISTORIAL DE VENTAS Y FACTURAS ── */
export const SalesHistoryView = ({ onReprintTicket }) => {
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [confirmAnular, setConfirmAnular] = useState(null);
  const [motivoAnular, setMotivoAnular] = useState('');
  const [anulando, setAnulando] = useState(false);
  const [toast, setToast] = useState(null);

  const fetchSales = async () => {
    setLoading(true);
    try {
      const data = await NohemyApi.getVentas();
      setSales(Array.isArray(data) ? data : data.results || []);
    } catch (err) {
      setToast({ type: 'error', message: 'Error al cargar ventas: ' + err.message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSales();
  }, []);

  const filteredSales = useMemo(() => {
    let result = [...sales];
    if (statusFilter !== 'ALL') {
      result = result.filter(s => s.estado === statusFilter);
    }
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      result = result.filter(s =>
        (s.codigo_factura && s.codigo_factura.toLowerCase().includes(term)) ||
        (s.cliente?.nombre_completo && s.cliente.nombre_completo.toLowerCase().includes(term)) ||
        (s.cliente?.nit && s.cliente.nit.toLowerCase().includes(term)) ||
        (s.vendedor_nombre && s.vendedor_nombre.toLowerCase().includes(term))
      );
    }
    return result;
  }, [sales, searchTerm, statusFilter]);

  const handleAnular = async () => {
    if (!confirmAnular) return;
    setAnulando(true);
    try {
      await NohemyApi.anularVenta(confirmAnular.id_venta, motivoAnular);
      setToast({ type: 'success', message: `Factura ${confirmAnular.codigo_factura} anulada exitosamente. Stock devuelto a los lotes originales.` });
      setConfirmAnular(null);
      setMotivoAnular('');
      fetchSales();
    } catch (err) {
      setToast({ type: 'error', message: 'Error al anular venta: ' + err.message });
    } finally {
      setAnulando(false);
    }
  };

  return (
    <div>
      <div className="card" style={{ marginBottom: '16px' }}>
        <div className="card-header" style={{ flexWrap: 'wrap', gap: '12px' }}>
          <div className="search-and-filter-group" style={{ maxWidth: '100%', flex: 1 }}>
            <div className="search-box">
              <input
                type="text"
                placeholder="Buscar por No. Factura, Cliente, NIT o Vendedor..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="select-status-filter"
            >
              <option value="ALL">Todos los Estados</option>
              <option value="PAGADA">Completadas / Pagadas</option>
              <option value="ANULADA">Anuladas</option>
            </select>
          </div>
          <button type="button" className="btn btn-secondary" onClick={fetchSales} disabled={loading} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
            <IconRefresh size={14} />
            <span>Actualizar</span>
          </button>
        </div>

        <div className="table-responsive">
          <table className="table">
            <thead>
              <tr>
                <th>No. Factura</th>
                <th>Fecha y Hora</th>
                <th>Cliente</th>
                <th>Artículos</th>
                <th>Total GTQ</th>
                <th>Método</th>
                <th>Vendedor</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {loading && sales.length === 0 ? (
                <tr><td colSpan="9" style={{ textAlign: 'center', padding: '32px' }}>Cargando ventas...</td></tr>
              ) : filteredSales.length === 0 ? (
                <tr><td colSpan="9" style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>No se encontraron ventas con los criterios seleccionados.</td></tr>
              ) : (
                filteredSales.map((v) => {
                  const isAnulada = v.estado === 'ANULADA';
                  const fecha = v.fecha_venta ? new Date(v.fecha_venta).toLocaleString('es-GT', { dateStyle: 'short', timeStyle: 'short' }) : 'N/A';
                  return (
                    <tr key={v.id_venta} className={isAnulada ? 'row-disabled' : ''}>
                      <td>
                        <code className="user-code" style={{ fontWeight: 700 }}>{v.codigo_factura}</code>
                      </td>
                      <td>
                        <span style={{ fontSize: '12.5px', color: 'var(--text-muted)' }}>{fecha}</span>
                      </td>
                      <td>
                        <strong style={{ fontSize: '13.5px', color: 'var(--text-main)', display: 'block' }}>
                          {v.cliente?.nombre_completo || 'Consumidor Final'}
                        </strong>
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>NIT: {v.cliente?.nit || 'C/F'}</span>
                      </td>
                      <td>
                        <span style={{ fontWeight: 600 }}>{v.cantidad_articulos || v.detalles?.length || 0} unids</span>
                      </td>
                      <td>
                        <strong style={{ color: 'var(--accent)', fontSize: '15px' }}>
                          Q {parseFloat(v.total).toFixed(2)}
                        </strong>
                      </td>
                      <td>
                        <span style={{ fontSize: '12px', fontWeight: 600 }}>{v.metodo_pago}</span>
                      </td>
                      <td>
                        <span style={{ fontSize: '12.5px' }}>{v.vendedor_nombre || 'N/A'}</span>
                      </td>
                      <td>
                        {isAnulada ? (
                          <span className="stock-badge stock-danger">○ Anulada</span>
                        ) : (
                          <span className="stock-badge stock-success">● Pagada</span>
                        )}
                      </td>
                      <td>
                        <div className="actions-cell">
                          <button
                            type="button"
                            className="btn-icon-btn btn-edit"
                            onClick={() => onReprintTicket(v)}
                            title="Reimprimir Comprobante Térmico"
                            style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                          >
                            <IconPrinter size={13} />
                            <span>Ticket</span>
                          </button>
                          {!isAnulada && (
                            <button
                              type="button"
                              className="btn-icon-btn btn-danger-solid"
                              onClick={() => { setConfirmAnular(v); setMotivoAnular(''); }}
                              title="Anular Factura y Devolver Stock a Lotes"
                            >
                              Anular
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de confirmación de anulación */}
      {confirmAnular && (
        <div className="modal-backdrop" onClick={(e) => { if (e.target.className.includes('modal-backdrop')) setConfirmAnular(null); }}>
          <div className="modal-container" style={{ maxWidth: '480px' }}>
            <div className="modal-header">
              <h3>Anular Factura {confirmAnular.codigo_factura}</h3>
              <button className="btn-close" onClick={() => setConfirmAnular(null)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="alert alert-danger" style={{ marginBottom: '14px' }}>
                <strong>Advertencia de Reversión:</strong>
                <p style={{ margin: '4px 0 0 0', fontSize: '12.5px' }}>
                  Al anular esta factura se reintegrarán automáticamente las existencias a sus lotes originales de inventario (PEPS) y se generará el movimiento financiero de devolución.
                </p>
              </div>
              <div className="form-group">
                <label>Motivo de la Anulación</label>
                <textarea
                  value={motivoAnular}
                  onChange={(e) => setMotivoAnular(e.target.value)}
                  placeholder="Ej. Devolución de producto por error en cobro, cliente canceló..."
                  rows="3"
                  style={{ width: '100%', borderRadius: '8px', padding: '8px 12px' }}
                />
              </div>
            </div>
            <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setConfirmAnular(null)} disabled={anulando}>
                Cancelar
              </button>
              <button type="button" className="btn btn-danger-solid" onClick={handleAnular} disabled={anulando} style={{ padding: '8px 16px', fontWeight: 700 }}>
                {anulando ? 'Anulando...' : 'Confirmar Anulación'}
              </button>
            </div>
          </div>
        </div>
      )}

      <Toast toast={toast} onClose={() => setToast(null)} />
    </div>
  );
};


export default SalesHistoryView;

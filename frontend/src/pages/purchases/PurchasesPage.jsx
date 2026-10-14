import React, { useState, useEffect, useMemo } from 'react';
import { NohemyApi } from '../../api/nohemyApi';
import { Toast, ConfirmModal } from '../../components/common';

import NewPurchaseModal from './NewPurchaseModal';
import PurchaseDetailModal from './PurchaseDetailModal';
import SupplierModal from '../suppliers/SupplierModal';
import { SuppliersContent } from '../suppliers/SuppliersPage';
/* ── COMPONENTE: GESTIÓN DE COMPRAS E INVENTARIO ── */
export const PurchasesPage = () => {
  const [activeSubTab, setActiveSubTab] = useState('compras'); // 'compras' | 'lotes'
  const [compras, setCompras] = useState([]);
  const [lotes, setLotes] = useState([]);
  const [proveedores, setProveedores] = useState([]);
  const [productos, setProductos] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters for Compras
  const [searchTerm, setSearchTerm] = useState('');
  const [proveedorFilter, setProveedorFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL'); // ALL, RECIBIDA, ANULADA

  // Filters for Lotes
  const [loteSearchTerm, setLoteSearchTerm] = useState('');
  const [loteVencFilter, setLoteVencFilter] = useState('ALL'); // ALL, BUENO, ALERTA, POR_VENCER, VENCIDO

  // Modals
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [detailCompra, setDetailCompra] = useState(null);
  const [confirmAnular, setConfirmAnular] = useState(null);
  const [toast, setToast] = useState(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [cData, lData, prData, prodData] = await Promise.all([
        NohemyApi.getCompras(),
        NohemyApi.getLotes(),
        NohemyApi.getProveedores(),
        NohemyApi.getProductos(),
      ]);
      setCompras(Array.isArray(cData) ? cData : cData.results || []);
      setLotes(Array.isArray(lData) ? lData : lData.results || []);
      setProveedores(Array.isArray(prData) ? prData : prData.results || []);
      setProductos(Array.isArray(prodData) ? prodData : prodData.results || []);
    } catch (err) {
      setToast({ type: 'error', message: 'Error al cargar compras: ' + err.message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Filter & sort purchases: Active (RECIBIDA) first, ANULADA at the bottom!
  const filteredCompras = useMemo(() => {
    let result = [...compras];

    if (statusFilter !== 'ALL') {
      result = result.filter(c => c.estado === statusFilter);
    }

    if (proveedorFilter !== 'ALL') {
      result = result.filter(c => String(c.proveedor) === String(proveedorFilter));
    }

    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      result = result.filter(c => 
        (c.numero_comprobante && c.numero_comprobante.toLowerCase().includes(term)) ||
        (c.proveedor_nombre && c.proveedor_nombre.toLowerCase().includes(term)) ||
        (c.usuario_nombre && c.usuario_nombre.toLowerCase().includes(term))
      );
    }

    // Prioridad a compras activas (RECIBIDA); anuladas pasan hasta abajo
    return result.sort((a, b) => {
      const aActive = a.estado === 'RECIBIDA';
      const bActive = b.estado === 'RECIBIDA';
      if (aActive === bActive) {
        return new Date(b.fecha_compra) - new Date(a.fecha_compra);
      }
      return aActive ? -1 : 1;
    });
  }, [compras, searchTerm, proveedorFilter, statusFilter]);

  // Filter lotes
  const filteredLotes = useMemo(() => {
    let result = [...lotes];

    if (loteVencFilter !== 'ALL') {
      result = result.filter(l => l.estado_vencimiento === loteVencFilter);
    }

    if (loteSearchTerm.trim()) {
      const term = loteSearchTerm.toLowerCase();
      result = result.filter(l => 
        (l.numero_lote && l.numero_lote.toLowerCase().includes(term)) ||
        (l.producto_nombre && l.producto_nombre.toLowerCase().includes(term)) ||
        (l.producto_codigo && l.producto_codigo.toLowerCase().includes(term)) ||
        (l.numero_comprobante_compra && l.numero_comprobante_compra.toLowerCase().includes(term))
      );
    }

    // Ordenar lotes: activos con stock primero, y por proximidad de vencimiento
    return result.sort((a, b) => {
      if (a.is_active === b.is_active) {
        if (a.dias_para_vencer !== null && b.dias_para_vencer !== null) {
          return a.dias_para_vencer - b.dias_para_vencer;
        }
        return 0;
      }
      return a.is_active ? -1 : 1;
    });
  }, [lotes, loteSearchTerm, loteVencFilter]);

  const handleConfirmAnular = async () => {
    if (!confirmAnular) return;
    try {
      const res = await NohemyApi.anularCompra(confirmAnular.id_compra);
      setToast({ type: 'success', message: res.message || `Compra #${confirmAnular.numero_comprobante} anulada.` });
      setConfirmAnular(null);
      fetchData();
    } catch (err) {
      setToast({ type: 'error', message: err.message });
      setConfirmAnular(null);
    }
  };

  return (
    <div className="view-panel">
      {/* Pestañas secundarias: Compras vs Lotes vs Proveedores */}
      <div className="tab-pill-group">
        <button 
          className={`tab-pill ${activeSubTab === 'compras' ? 'active' : ''}`}
          onClick={() => setActiveSubTab('compras')}
        >
          Facturas de Compra ({compras.length})
        </button>
        <button 
          className={`tab-pill ${activeSubTab === 'lotes' ? 'active' : ''}`}
          onClick={() => setActiveSubTab('lotes')}
        >
          Lotes de Inventario y Vencimiento ({lotes.length})
        </button>
        <button 
          className={`tab-pill ${activeSubTab === 'proveedores' ? 'active' : ''}`}
          onClick={() => setActiveSubTab('proveedores')}
        >
          Directorio de Proveedores ({proveedores.length})
        </button>
      </div>

      {activeSubTab === 'compras' && (
        <div className="card">
          <div className="card-header" style={{ flexWrap: 'wrap' }}>
            <div className="search-and-filter-group" style={{ maxWidth: '100%' }}>
              <div className="search-box">
                <input 
                  type="text" 
                  placeholder="Buscar por Comprobante, Proveedor o Usuario..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              <select 
                value={proveedorFilter} 
                onChange={(e) => setProveedorFilter(e.target.value)}
                className="select-status-filter"
              >
                <option value="ALL">Todos los Proveedores</option>
                {proveedores.map(p => (
                  <option key={p.id_proveedor} value={p.id_proveedor}>{p.nombre_empresa}</option>
                ))}
              </select>

              <select 
                value={statusFilter} 
                onChange={(e) => setStatusFilter(e.target.value)}
                className="select-status-filter"
              >
                <option value="ALL">Todos los Estados</option>
                <option value="RECIBIDA">Solo Recibidas (Activas)</option>
                <option value="ANULADA">Solo Anuladas</option>
              </select>
            </div>

            <button className="btn btn-primary" onClick={() => setIsNewModalOpen(true)}>
              + Registrar Nueva Compra
            </button>
          </div>

          <div className="table-responsive">
            <table className="table">
              <thead>
                <tr>
                  <th>No. Comprobante</th>
                  <th>Proveedor</th>
                  <th>Fecha de Registro</th>
                  <th>Ítems</th>
                  <th>Total Compra</th>
                  <th>Registrado Por</th>
                  <th>Estado</th>
                  <th className="text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {loading && compras.length === 0 ? (
                  <tr><td colSpan="8" style={{ textAlign: 'center', padding: '32px' }}>Cargando compras registradas...</td></tr>
                ) : filteredCompras.length === 0 ? (
                  <tr><td colSpan="8" style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>No se encontraron compras con los filtros seleccionados.</td></tr>
                ) : (
                  filteredCompras.map((compra) => {
                    const isAnulada = compra.estado === 'ANULADA';
                    const fechaStr = compra.fecha_compra ? new Date(compra.fecha_compra).toLocaleDateString('es-GT', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'N/A';

                    return (
                      <tr key={compra.id_compra} className={isAnulada ? 'row-disabled' : ''}>
                        <td>
                          <code className="user-code">{compra.numero_comprobante}</code>
                        </td>
                        <td>
                          <strong style={{ color: 'var(--text-main)', fontSize: '14px' }}>
                            {compra.proveedor_nombre}
                          </strong>
                        </td>
                        <td>
                          <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{fechaStr}</span>
                        </td>
                        <td>
                          <span style={{ fontWeight: 600 }}>{compra.total_items || (compra.detalles?.length ?? 0)} productos</span>
                        </td>
                        <td>
                          <strong style={{ color: 'var(--accent)', fontSize: '15px' }}>
                            Q {parseFloat(compra.total_compra).toFixed(2)}
                          </strong>
                        </td>
                        <td>
                          <span style={{ fontSize: '13px', color: 'var(--text-main)' }}>{compra.usuario_nombre}</span>
                        </td>
                        <td>
                          {isAnulada ? (
                            <span className="stock-badge stock-danger">○ Anulada</span>
                          ) : (
                            <span className="stock-badge stock-success">● Recibida</span>
                          )}
                        </td>
                        <td>
                          <div className="actions-cell">
                            <button className="btn-icon-btn btn-edit" onClick={() => setDetailCompra(compra)}>
                              Ver Detalle
                            </button>
                            {!isAnulada && (
                              <button 
                                className="btn-icon-btn btn-danger-solid" 
                                onClick={() => setConfirmAnular(compra)}
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
      )}

      {activeSubTab === 'lotes' && (
        <div className="card">
          <div className="card-header" style={{ flexWrap: 'wrap' }}>
            <div className="search-and-filter-group" style={{ maxWidth: '100%' }}>
              <div className="search-box">
                <input 
                  type="text" 
                  placeholder="Buscar por No. Lote, Producto o Factura..." 
                  value={loteSearchTerm}
                  onChange={(e) => setLoteSearchTerm(e.target.value)}
                />
              </div>

              <select 
                value={loteVencFilter} 
                onChange={(e) => setLoteVencFilter(e.target.value)}
                className="select-status-filter"
              >
                <option value="ALL">Todos los Estados de Vencimiento</option>
                <option value="BUENO">Estado Óptimo (&gt; 30 días)</option>
                <option value="ALERTA">En Alerta (16 - 30 días)</option>
                <option value="POR_VENCER">Por Vencer (&le; 15 días)</option>
                <option value="VENCIDO">Vencidos</option>
              </select>
            </div>
          </div>

          <div className="table-responsive">
            <table className="table">
              <thead>
                <tr>
                  <th>Correlativo / No. Lote</th>
                  <th>Producto</th>
                  <th>Factura Origen</th>
                  <th>Cantidad Disp. / Inicial</th>
                  <th>Vencimiento</th>
                  <th>Días Restantes</th>
                  <th>Estado Vencimiento</th>
                </tr>
              </thead>
              <tbody>
                {loading && lotes.length === 0 ? (
                  <tr><td colSpan="7" style={{ textAlign: 'center', padding: '32px' }}>Cargando lotes de inventario...</td></tr>
                ) : filteredLotes.length === 0 ? (
                  <tr><td colSpan="7" style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>No se encontraron lotes con los filtros aplicados.</td></tr>
                ) : (
                  filteredLotes.map((lote) => {
                    const dias = lote.dias_para_vencer;
                    let badgeClass = 'lot-bueno';
                    let badgeText = '● Óptimo';

                    if (lote.estado_vencimiento === 'VENCIDO') {
                      badgeClass = 'lot-vencido';
                      badgeText = '○ Vencido';
                    } else if (lote.estado_vencimiento === 'POR_VENCER') {
                      badgeClass = 'lot-por-vencer';
                      badgeText = '● Por Vencer';
                    } else if (lote.estado_vencimiento === 'ALERTA') {
                      badgeClass = 'lot-alerta';
                      badgeText = '● Alerta Próximo';
                    }

                    const correlativo = lote.correlativo_lote || `LOT-${String(lote.id_lote).padStart(5, '0')}`;

                    return (
                      <tr key={lote.id_lote} className={!lote.is_active || lote.cantidad_actual === 0 ? 'row-disabled' : ''}>
                        <td>
                          <code className="user-code" style={{ fontWeight: 700 }}>{correlativo}</code>
                          {lote.numero_lote && lote.numero_lote !== correlativo && (
                            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                              Ref: {lote.numero_lote}
                            </div>
                          )}
                        </td>
                        <td>
                          <div className="user-name-cell">
                            <span className="name-bold">{lote.producto_nombre}</span>
                            <span className="email-sub">{lote.producto_codigo}</span>
                          </div>
                        </td>
                        <td>
                          <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                            {lote.numero_comprobante_compra || 'Manual'}
                          </span>
                        </td>
                        <td>
                          <strong style={{ color: lote.cantidad_actual > 0 ? 'var(--text-main)' : 'var(--danger)' }}>
                            {lote.cantidad_actual}
                          </strong>
                          <span style={{ color: 'var(--text-dim)', fontSize: '12px' }}> / {lote.cantidad_inicial} {lote.unidad_simbolo || 'unid'}</span>
                        </td>
                        <td>
                          <span style={{ fontSize: '13px' }}>{lote.fecha_vencimiento || 'No aplica'}</span>
                        </td>
                        <td>
                          {dias === null ? (
                            <span style={{ color: 'var(--text-dim)', fontSize: '12.5px' }}>—</span>
                          ) : dias < 0 ? (
                            <span style={{ color: 'var(--danger)', fontWeight: 700, fontSize: '13px' }}>Hace {Math.abs(dias)} días</span>
                          ) : (
                            <span style={{ fontWeight: 600, fontSize: '13px' }}>{dias} días</span>
                          )}
                        </td>
                        <td>
                          <span className={`lot-badge ${badgeClass}`}>{badgeText}</span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeSubTab === 'proveedores' && (
        <SuppliersContent onSupplierChanged={fetchData} />
      )}

      {/* Modal para Registrar Nueva Compra */}
      <NewPurchaseModal 
        isOpen={isNewModalOpen}
        onClose={() => setIsNewModalOpen(false)}
        onSuccess={(msg) => {
          setToast({ type: 'success', message: msg });
          fetchData();
        }}
        proveedores={proveedores}
        productos={productos}
        onRefreshProveedores={fetchData}
      />

      {/* Modal para Ver Detalle de Compra */}
      <PurchaseDetailModal 
        isOpen={Boolean(detailCompra)}
        onClose={() => setDetailCompra(null)}
        compra={detailCompra}
      />

      {/* Modal de Confirmación para Anulación de Compra */}
      <ConfirmModal 
        isOpen={Boolean(confirmAnular)}
        onClose={() => setConfirmAnular(null)}
        onConfirm={handleConfirmAnular}
        title="Anular Compra y Revertir Stock"
        message={`¿Está completamente seguro de anular la compra #${confirmAnular?.numero_comprobante}? Se descontará del inventario el stock ingresado en los lotes asociados si no han sido vendidos.`}
        isDanger={true}
        confirmText="Anular Compra"
      />

      <Toast toast={toast} onClose={() => setToast(null)} />
    </div>
  );
};


export default PurchasesPage;

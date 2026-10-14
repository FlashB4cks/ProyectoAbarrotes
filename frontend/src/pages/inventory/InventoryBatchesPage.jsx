import React, { useState, useEffect } from 'react';
import { NohemyApi } from '../../api/nohemyApi';
import { Toast } from '../../components/common';
import { IconAlertTriangle, IconBarcode, IconCalendar, IconCheck, IconLayers, IconPackage, IconPlus, IconRefresh, IconSearch, IconTag, IconTrash, IconUser } from '../../components/icons/Icons';

import RegisterMermaModal from './RegisterMermaModal';
/* ── MÓDULO: INVENTARIO, LOTES FIFO Y SEMÁFORO DE VENCIMIENTO ── */
export const InventoryBatchesPage = ({ onNavigateToPurchases }) => {
  const [subTab, setSubTab] = useState('semaforo'); // 'semaforo' | 'stock_critico' | 'mermas'
  const [loading, setLoading] = useState(false);
  const [lotes, setLotes] = useState([]);
  const [categories, setCategories] = useState([]);
  const [resumen, setResumen] = useState(null);
  const [stockCritico, setStockCritico] = useState([]);
  const [mermas, setMermas] = useState([]);
  const [toast, setToast] = useState(null);

  // Filtros de Lotes
  const [searchTerm, setSearchTerm] = useState('');
  const [filterEstado, setFilterEstado] = useState('ALL');
  const [filterCategory, setFilterCategory] = useState('ALL');
  const [soloDisponibles, setSoloDisponibles] = useState(true);

  // Filtros de Historial Mermas
  const [filterTipoMerma, setFilterTipoMerma] = useState('ALL');

  // Modal de Merma
  const [selectedLoteForMerma, setSelectedLoteForMerma] = useState(null);

  // Helpers de Formato y Plurales
  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    const clean = String(dateStr).split('T')[0];
    const parts = clean.split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return clean;
  };

  const pluralLotes = (n) => (n === 1 ? '1 lote' : `${n} lotes`);
  const pluralUds = (n) => (n === 1 ? '1 ud' : `${n} uds`);

  // Cargar datos
  const loadInventoryData = async () => {
    setLoading(true);
    try {
      const [resumenData, catData] = await Promise.all([
        NohemyApi.getResumenSemaforo(),
        NohemyApi.getCategorias()
      ]);
      setResumen(resumenData);
      setCategories(Array.isArray(catData) ? catData : catData.results || []);

      if (subTab === 'semaforo') {
        const lotesData = await NohemyApi.getLotes({
          search: searchTerm,
          estado_vencimiento: filterEstado,
          categoria: filterCategory,
          disponibles: soloDisponibles ? 'true' : 'false'
        });
        setLotes(Array.isArray(lotesData) ? lotesData : lotesData.results || []);
      } else if (subTab === 'stock_critico') {
        const criticoData = await NohemyApi.getStockCritico({
          search: searchTerm,
          categoria: filterCategory
        });
        setStockCritico(Array.isArray(criticoData) ? criticoData : criticoData.results || []);
      } else if (subTab === 'mermas') {
        const mermasData = await NohemyApi.getAjustesInventario({
          tipo: filterTipoMerma,
          search: searchTerm
        });
        setMermas(Array.isArray(mermasData) ? mermasData : mermasData.results || []);
      }
    } catch (err) {
      setToast({ type: 'error', message: 'Error al cargar datos de inventario: ' + err.message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInventoryData();
  }, [subTab, filterEstado, filterCategory, soloDisponibles, filterTipoMerma]);

  // Render del semáforo con badge silueta
  const renderSemaforoBadge = (lote) => {
    const estado = lote.estado_vencimiento;
    const dias = lote.dias_para_vencer;

    if (estado === 'VENCIDO') {
      const diasVencido = Math.abs(dias || 0);
      return (
        <span className="lot-badge lot-vencido" title={`Venció el ${formatDate(lote.fecha_vencimiento)}`}>
          <span style={{ display: 'inline-block', width: '7px', height: '7px', borderRadius: '50%', background: '#dc2626' }}></span>
          <span>Vencido hace {diasVencido} d</span>
        </span>
      );
    }
    if (estado === 'POR_VENCER') {
      return (
        <span className="lot-badge lot-por-vencer" title={`Vence el ${formatDate(lote.fecha_vencimiento)} - Acción urgente`}>
          <span style={{ display: 'inline-block', width: '7px', height: '7px', borderRadius: '50%', background: '#ea580c' }}></span>
          <span>Vence en {dias} d</span>
        </span>
      );
    }
    if (estado === 'ALERTA') {
      return (
        <span className="lot-badge lot-alerta" title={`Vence el ${formatDate(lote.fecha_vencimiento)} - Ubicar al frente en góndola`}>
          <span style={{ display: 'inline-block', width: '7px', height: '7px', borderRadius: '50%', background: '#d97706' }}></span>
          <span>Vence en {dias} d</span>
        </span>
      );
    }
    return (
      <span className="lot-badge lot-bueno" title={`Vence el ${formatDate(lote.fecha_vencimiento)}`}>
        <span style={{ display: 'inline-block', width: '7px', height: '7px', borderRadius: '50%', background: '#059669' }}></span>
        <span>Vigente ({dias} d)</span>
      </span>
    );
  };

  return (
    <div className="catalog-container" style={{ padding: '0 24px 32px 24px' }}>
      {/* Barra de Sub-Pestañas */}
      <div className="inv-control-bar">
        <div className="inv-control-tabs">
          <button
            type="button"
            className={`inv-tab-btn ${subTab === 'semaforo' ? 'active' : ''}`}
            onClick={() => setSubTab('semaforo')}
          >
            <IconLayers size={16} />
            <span>Semáforo de Caducidad FIFO</span>
          </button>
          <button
            type="button"
            className={`inv-tab-btn ${subTab === 'stock_critico' ? 'active' : ''}`}
            onClick={() => setSubTab('stock_critico')}
          >
            <IconAlertTriangle size={16} />
            <span>Alertas de Stock Crítico</span>
            {resumen?.stock_critico?.total_criticos > 0 && (
              <span className="pos-cart-badge" style={{ background: '#dc2626', color: '#ffffff' }}>
                {resumen.stock_critico.total_criticos}
              </span>
            )}
          </button>
          <button
            type="button"
            className={`inv-tab-btn ${subTab === 'mermas' ? 'active' : ''}`}
            onClick={() => setSubTab('mermas')}
          >
            <IconTrash size={15} />
            <span>Historial de Mermas y Bajas</span>
          </button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={loadInventoryData}
            title="Actualizar datos"
            style={{ fontSize: '12.5px', padding: '7px 16px', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <IconRefresh size={14} />
            <span>Actualizar</span>
          </button>
        </div>
      </div>

      {/* Tarjetas de Métricas / KPIs */}
      {resumen && (
        <div className="inv-kpi-grid">
          <div className="inv-kpi-card kpi-total">
            <div className="kpi-header">
              <span>Total en Almacén</span>
              <IconPackage size={16} />
            </div>
            <div className="kpi-value">
              {resumen.totales.total_unidades} <span style={{ fontSize: '13px', fontWeight: '500' }}>uds</span>
            </div>
            <div className="kpi-subtext">
              {resumen.totales.total_lotes} {resumen.totales.total_lotes === 1 ? 'lote activo' : 'lotes activos'} (Q {resumen.totales.total_valor_gtq.toFixed(2)})
            </div>
          </div>

          <div className="inv-kpi-card kpi-danger">
            <div className="kpi-header">
              <span>Lotes Vencidos</span>
              <span style={{ color: '#dc2626' }}><IconAlertTriangle size={16} /></span>
            </div>
            <div className="kpi-value" style={{ color: '#dc2626' }}>
              {resumen.semaforo.vencidos.lotes} <span style={{ fontSize: '13px', fontWeight: '500' }}>{resumen.semaforo.vencidos.lotes === 1 ? 'lote' : 'lotes'}</span>
            </div>
            <div className="kpi-subtext">
              {resumen.semaforo.vencidos.unidades} {resumen.semaforo.vencidos.unidades === 1 ? 'ud en riesgo' : 'uds en riesgo'} (Pérdida: Q {resumen.semaforo.vencidos.valor_gtq.toFixed(2)})
            </div>
          </div>

          <div className="inv-kpi-card kpi-urgent">
            <div className="kpi-header">
              <span>Por Vencer (≤ 15 d)</span>
              <span style={{ color: '#ea580c' }}><IconCalendar size={16} /></span>
            </div>
            <div className="kpi-value" style={{ color: '#ea580c' }}>
              {resumen.semaforo.por_vencer_15.lotes} <span style={{ fontSize: '13px', fontWeight: '500' }}>{resumen.semaforo.por_vencer_15.lotes === 1 ? 'lote' : 'lotes'}</span>
            </div>
            <div className="kpi-subtext">
              {resumen.semaforo.por_vencer_15.unidades} {resumen.semaforo.por_vencer_15.unidades === 1 ? 'ud crítica' : 'uds críticas'} (Q {resumen.semaforo.por_vencer_15.valor_gtq.toFixed(2)})
            </div>
          </div>

          <div className="inv-kpi-card kpi-warning">
            <div className="kpi-header">
              <span>Alerta (16 a 30 d)</span>
              <span style={{ color: '#d97706' }}><IconTag size={16} /></span>
            </div>
            <div className="kpi-value" style={{ color: '#d97706' }}>
              {resumen.semaforo.alerta_30.lotes} <span style={{ fontSize: '13px', fontWeight: '500' }}>{resumen.semaforo.alerta_30.lotes === 1 ? 'lote' : 'lotes'}</span>
            </div>
            <div className="kpi-subtext">
              {resumen.semaforo.alerta_30.unidades} {resumen.semaforo.alerta_30.unidades === 1 ? 'ud en rotación' : 'uds en rotación'} (Q {resumen.semaforo.alerta_30.valor_gtq.toFixed(2)})
            </div>
          </div>

          <div className="inv-kpi-card kpi-success">
            <div className="kpi-header">
              <span>Vigentes (&gt; 30 d)</span>
              <span style={{ color: '#059669' }}><IconCheck size={16} /></span>
            </div>
            <div className="kpi-value" style={{ color: '#059669' }}>
              {resumen.semaforo.vigentes.lotes} <span style={{ fontSize: '13px', fontWeight: '500' }}>{resumen.semaforo.vigentes.lotes === 1 ? 'lote' : 'lotes'}</span>
            </div>
            <div className="kpi-subtext">
              {resumen.semaforo.vigentes.unidades} {resumen.semaforo.vigentes.unidades === 1 ? 'ud segura' : 'uds seguras'} (Q {resumen.semaforo.vigentes.valor_gtq.toFixed(2)})
            </div>
          </div>
        </div>
      )}

      {/* PESTAÑA 1: SEMÁFORO DE CADUCIDAD FIFO */}
      {subTab === 'semaforo' && (
        <div className="card p-0">
          {/* Barra de Filtros Unificada */}
          <div style={{
            padding: '16px 20px',
            borderBottom: '1px solid var(--card-border)',
            display: 'flex',
            gap: '12px',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap'
          }}>
            <div className="search-box" style={{ flex: 1, minWidth: '260px', display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 14px' }}>
              <IconSearch size={15} style={{ color: 'var(--accent)', flexShrink: 0 }} />
              <input
                type="text"
                placeholder="Buscar por lote, producto o código de barras..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ width: '100%', background: 'transparent', border: 'none', outline: 'none', fontSize: '13.5px', color: 'var(--text-main)' }}
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '0 4px', fontSize: '13px' }}
                  title="Limpiar búsqueda"
                >
                  ✕
                </button>
              )}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <select
                className="select-status-filter"
                value={filterEstado}
                onChange={(e) => setFilterEstado(e.target.value)}
                style={{ minWidth: '200px' }}
              >
                <option value="ALL">Todos los Estados de Semáforo</option>
                <option value="VENCIDO">Vencidos (Rojo)</option>
                <option value="POR_VENCER">Por Vencer ≤ 15 días (Naranja)</option>
                <option value="ALERTA">En Alerta 16-30 días (Amarillo)</option>
                <option value="BUENO">Vigentes &gt; 30 días (Verde)</option>
              </select>

              <select
                className="select-status-filter"
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                style={{ minWidth: '170px' }}
              >
                <option value="ALL">Todas las Categorías</option>
                {categories.map(c => (
                  <option key={c.id_categoria} value={c.id_categoria}>{c.nombre}</option>
                ))}
              </select>

              <label
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '9px 14px',
                  background: soloDisponibles ? 'rgba(184, 134, 11, 0.08)' : 'var(--input-bg)',
                  border: `1px solid ${soloDisponibles ? 'rgba(184, 134, 11, 0.35)' : 'var(--card-border)'}`,
                  borderRadius: '10px',
                  fontSize: '13px',
                  fontWeight: '600',
                  color: soloDisponibles ? 'var(--accent)' : 'var(--text-muted)',
                  cursor: 'pointer',
                  userSelect: 'none',
                  transition: 'var(--transition)'
                }}
              >
                <input
                  type="checkbox"
                  checked={soloDisponibles}
                  onChange={(e) => setSoloDisponibles(e.target.checked)}
                  style={{ accentColor: 'var(--accent)', cursor: 'pointer' }}
                />
                <span>Solo con stock disponible</span>
              </label>
            </div>
          </div>

          {/* Tabla de Lotes */}
          <div className="table-responsive">
            <table className="table">
              <thead>
                <tr>
                  <th>Lote / Ref</th>
                  <th>Producto &amp; Categoría</th>
                  <th style={{ width: '170px' }}>Stock Lote (FIFO)</th>
                  <th>Costo &amp; Valor Lote</th>
                  <th>Vencimiento</th>
                  <th>Semáforo</th>
                  <th style={{ textAlign: 'right' }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="7" style={{ textAlign: 'center', padding: '36px', color: 'var(--text-muted)' }}>
                      Cargando lotes de inventario...
                    </td>
                  </tr>
                ) : lotes.length === 0 ? (
                  <tr>
                    <td colSpan="7" style={{ textAlign: 'center', padding: '36px', color: 'var(--text-muted)' }}>
                      No se encontraron lotes que coincidan con los filtros aplicados.
                    </td>
                  </tr>
                ) : (
                  lotes.map(l => {
                    const pct = l.cantidad_inicial > 0 ? Math.round((l.cantidad_actual / l.cantidad_inicial) * 100) : 0;
                    const isZero = l.cantidad_actual <= 0;

                    return (
                      <tr key={l.id_lote} style={{ opacity: isZero ? 0.6 : 1 }}>
                        <td>
                          <div style={{ fontWeight: '700', color: 'var(--text-main)', fontSize: '13px' }}>
                            {l.correlativo_lote}
                          </div>
                          <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', marginTop: '2px' }}>
                            Lote: <strong>{l.numero_lote}</strong>
                          </div>
                          {l.numero_comprobante_compra && (
                            <div style={{ fontSize: '11px', color: 'var(--accent)', marginTop: '1px' }}>
                              Fac: {l.numero_comprobante_compra}
                            </div>
                          )}
                        </td>
                        <td>
                          <div style={{ fontWeight: '600', color: 'var(--text-main)', fontSize: '13.5px' }}>
                            {l.producto_nombre}
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '3px' }}>
                            <span style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              background: 'rgba(0, 0, 0, 0.04)',
                              padding: '2px 7px',
                              borderRadius: '4px',
                              fontSize: '11px',
                              fontFamily: 'monospace',
                              color: 'var(--text-main)',
                              fontWeight: '600',
                              letterSpacing: '0.5px'
                            }}>
                              <IconBarcode size={12} style={{ color: 'var(--text-muted)' }} />
                              <span>{l.producto_codigo}</span>
                            </span>
                            {l.categoria_nombre && (
                              <span className="category-badge" style={{ fontSize: '11px', padding: '1px 6px' }}>
                                {l.categoria_nombre}
                              </span>
                            )}
                          </div>
                        </td>
                        <td>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', fontSize: '12.5px', fontWeight: '700' }}>
                            <span style={{ color: 'var(--text-main)' }}>{l.cantidad_actual} {l.unidad_simbolo}</span>
                            <span style={{ color: 'var(--text-muted)', fontSize: '11px', fontWeight: '500' }}>de {l.cantidad_inicial} {l.unidad_simbolo}</span>
                          </div>
                          <div className="lot-progress-bar" style={{ height: '7px', background: 'rgba(0,0,0,0.06)', borderRadius: '4px', marginTop: '5px' }}>
                            <div
                              className="lot-progress-fill"
                              style={{
                                width: `${pct}%`,
                                background: pct === 0 ? '#dc2626' : (pct <= 25 ? '#ea580c' : 'var(--accent)')
                              }}
                            ></div>
                          </div>
                          <div style={{ fontSize: '10.5px', color: 'var(--text-muted)', marginTop: '3px', textAlign: 'right' }}>
                            {pct}% disponible
                          </div>
                        </td>
                        <td>
                          <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-main)' }}>
                            Q {parseFloat(l.costo_unitario).toFixed(2)}
                            <span style={{ fontSize: '11px', fontWeight: '400', color: 'var(--text-muted)', marginLeft: '3px' }}>/ {l.unidad_simbolo}</span>
                          </div>
                          <div style={{ fontSize: '11.5px', color: 'var(--accent)', fontWeight: '600', marginTop: '2px' }}>
                            Total: Q {parseFloat(l.valor_lote || 0).toFixed(2)}
                          </div>
                        </td>
                        <td>
                          <div style={{ fontSize: '13px', fontWeight: '700', color: l.estado_vencimiento === 'VENCIDO' ? '#dc2626' : 'var(--text-main)' }}>
                            {formatDate(l.fecha_vencimiento)}
                          </div>
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                            Ingreso: {formatDate(l.fecha_ingreso)}
                          </div>
                        </td>
                        <td>
                          {renderSemaforoBadge(l)}
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <button
                            type="button"
                            className="btn btn-secondary"
                            style={{
                              fontSize: '12px',
                              padding: '5px 12px',
                              borderRadius: '8px',
                              color: l.estado_vencimiento === 'VENCIDO' ? '#dc2626' : 'var(--text-main)',
                              borderColor: l.estado_vencimiento === 'VENCIDO' ? 'rgba(220, 38, 38, 0.4)' : 'var(--card-border)',
                              background: l.estado_vencimiento === 'VENCIDO' ? 'rgba(220, 38, 38, 0.05)' : 'transparent',
                            }}
                            onClick={() => setSelectedLoteForMerma(l)}
                            disabled={isZero}
                            title={isZero ? 'El lote no tiene existencias disponibles' : 'Dar de baja unidades por vencimiento o rotura'}
                          >
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                              <IconTrash size={13} />
                              <span>Dar de Baja</span>
                            </span>
                          </button>
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

      {/* PESTAÑA 2: ALERTAS DE STOCK CRÍTICO */}
      {subTab === 'stock_critico' && (
        <div className="card p-0">
          <div style={{
            padding: '16px 20px',
            borderBottom: '1px solid var(--card-border)',
            display: 'flex',
            gap: '12px',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap'
          }}>
            <div className="search-box" style={{ flex: 1, minWidth: '260px', display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 14px' }}>
              <IconSearch size={15} style={{ color: 'var(--accent)', flexShrink: 0 }} />
              <input
                type="text"
                className="table-input"
                placeholder="Buscar producto con stock crítico..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ width: '100%', background: 'transparent', border: 'none', outline: 'none', fontSize: '13.5px', color: 'var(--text-main)' }}
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '0 4px', fontSize: '13px' }}
                  title="Limpiar búsqueda"
                >
                  ✕
                </button>
              )}
            </div>

            <select
              className="select-status-filter"
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              style={{ minWidth: '180px' }}
            >
              <option value="ALL">Todas las Categorías</option>
              {categories.map(c => (
                <option key={c.id_categoria} value={c.id_categoria}>{c.nombre}</option>
              ))}
            </select>
          </div>

          <div className="table-responsive">
            <table className="table">
              <thead>
                <tr>
                  <th>Producto</th>
                  <th>Categoría</th>
                  <th>Stock Actual</th>
                  <th>Stock Mínimo</th>
                  <th>Déficit para Óptimo</th>
                  <th>Estado</th>
                  <th style={{ textAlign: 'right' }}>Acción Sugerida</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="7" style={{ textAlign: 'center', padding: '36px', color: 'var(--text-muted)' }}>
                      Evaluando umbrales de existencias...
                    </td>
                  </tr>
                ) : stockCritico.length === 0 ? (
                  <tr>
                    <td colSpan="7" style={{ textAlign: 'center', padding: '36px', color: '#059669' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', fontWeight: '600' }}>
                        <IconCheck size={18} />
                        <span>Excelente: Todos los productos cuentan con existencias superiores a su stock mínimo.</span>
                      </span>
                    </td>
                  </tr>
                ) : (
                  stockCritico.map(p => {
                    const isZero = p.stock_total <= 0;
                    return (
                      <tr key={p.id_producto}>
                        <td>
                          <div style={{ fontWeight: '600', color: 'var(--text-main)', fontSize: '13.5px' }}>
                            {p.nombre}
                          </div>
                          <div style={{ marginTop: '3px' }}>
                            <span style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              background: 'rgba(0, 0, 0, 0.04)',
                              padding: '2px 7px',
                              borderRadius: '4px',
                              fontSize: '11px',
                              fontFamily: 'monospace',
                              color: 'var(--text-main)',
                              fontWeight: '600',
                              letterSpacing: '0.5px'
                            }}>
                              <IconBarcode size={12} style={{ color: 'var(--text-muted)' }} />
                              <span>{p.codigo_barras}</span>
                            </span>
                          </div>
                        </td>
                        <td>
                          <span className="category-badge" style={{ fontSize: '11.5px' }}>
                            {p.categoria_nombre}
                          </span>
                        </td>
                        <td>
                          <span
                            className={`stock-badge ${isZero ? 'stock-danger' : 'stock-warning'}`}
                            style={{ fontSize: '12px', padding: '3px 10px' }}
                          >
                            {isZero ? '○ Agotado (0)' : `● ${p.stock_total} ${p.unidad_simbolo}`}
                          </span>
                        </td>
                        <td style={{ fontWeight: '600' }}>
                          {p.stock_minimo} {p.unidad_simbolo}
                        </td>
                        <td style={{ color: '#dc2626', fontWeight: '700' }}>
                          +{p.deficit} {p.unidad_simbolo}
                        </td>
                        <td>
                          <span className={`status-badge ${isZero ? 'inactive' : 'active'}`} style={{ fontSize: '12px' }}>
                            {p.estado === 'AGOTADO' ? 'Sin Existencias' : 'Bajo Umbral Mínimo'}
                          </span>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <button
                            type="button"
                            className="btn btn-secondary"
                            style={{ fontSize: '12px', padding: '6px 14px', borderRadius: '8px' }}
                            onClick={onNavigateToPurchases}
                            title="Ir al módulo de Compras para reabastecer este producto"
                          >
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                              <IconPlus size={13} />
                              <span>Generar Compra</span>
                            </span>
                          </button>
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

      {/* PESTAÑA 3: HISTORIAL DE MERMAS Y BAJAS */}
      {subTab === 'mermas' && (
        <div className="card p-0">
          <div style={{
            padding: '16px 20px',
            borderBottom: '1px solid var(--card-border)',
            display: 'flex',
            gap: '12px',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap'
          }}>
            <div className="search-box" style={{ flex: 1, minWidth: '260px', display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 14px' }}>
              <IconSearch size={15} style={{ color: 'var(--accent)', flexShrink: 0 }} />
              <input
                type="text"
                placeholder="Buscar por lote, producto o motivo de baja..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ width: '100%', background: 'transparent', border: 'none', outline: 'none', fontSize: '13.5px', color: 'var(--text-main)' }}
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '0 4px', fontSize: '13px' }}
                  title="Limpiar búsqueda"
                >
                  ✕
                </button>
              )}
            </div>

            <select
              className="select-status-filter"
              value={filterTipoMerma}
              onChange={(e) => setFilterTipoMerma(e.target.value)}
              style={{ minWidth: '220px' }}
            >
              <option value="ALL">Todos los Tipos de Ajuste</option>
              <option value="VENCIMIENTO">Por Vencimiento / Caducidad</option>
              <option value="ROTURA">Por Daño / Rotura</option>
              <option value="AJUSTE_FISICO">Por Ajuste de Conteo Físico</option>
            </select>
          </div>

          <div className="table-responsive">
            <table className="table">
              <thead>
                <tr>
                  <th># Ajuste &amp; Fecha</th>
                  <th>Producto &amp; Lote Afectado</th>
                  <th>Tipo de Merma</th>
                  <th>Cantidad Retirada</th>
                  <th>Pérdida (GTQ)</th>
                  <th>Motivo / Justificación</th>
                  <th>Usuario Responsable</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="7" style={{ textAlign: 'center', padding: '36px', color: 'var(--text-muted)' }}>
                      Cargando historial de mermas...
                    </td>
                  </tr>
                ) : mermas.length === 0 ? (
                  <tr>
                    <td colSpan="7" style={{ textAlign: 'center', padding: '36px', color: 'var(--text-muted)' }}>
                      No se han registrado bajas de inventario ni mermas en el sistema.
                    </td>
                  </tr>
                ) : (
                  mermas.map(m => (
                    <tr key={m.id_ajuste}>
                      <td>
                        <div style={{ fontWeight: '700', color: 'var(--text-main)', fontSize: '13px' }}>
                          AJU-{String(m.id_ajuste).padStart(5, '0')}
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                          {formatDate(m.fecha_ajuste)} {String(m.fecha_ajuste).includes('T') ? String(m.fecha_ajuste).split('T')[1].substring(0, 5) : ''}
                        </div>
                      </td>
                      <td>
                        <div style={{ fontWeight: '600', color: 'var(--text-main)', fontSize: '13.5px' }}>
                          {m.producto_nombre}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '2px' }}>
                          <span style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>
                            Lote: <strong>{m.numero_lote}</strong>
                          </span>
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            background: 'rgba(0, 0, 0, 0.04)',
                            padding: '1px 5px',
                            borderRadius: '3px',
                            fontSize: '10.5px',
                            fontFamily: 'monospace',
                            color: 'var(--text-main)'
                          }}>
                            {m.producto_codigo}
                          </span>
                        </div>
                      </td>
                      <td>
                        <span
                          className="lot-badge"
                          style={{
                            background: m.tipo === 'VENCIMIENTO' ? 'rgba(239, 68, 68, 0.12)' : 'rgba(245, 158, 11, 0.12)',
                            color: m.tipo === 'VENCIMIENTO' ? '#dc2626' : '#d97706',
                            border: `1px solid ${m.tipo === 'VENCIMIENTO' ? 'rgba(239, 68, 68, 0.3)' : 'rgba(245, 158, 11, 0.3)'}`
                          }}
                        >
                          {m.tipo_display}
                        </span>
                      </td>
                      <td style={{ fontWeight: '700', fontSize: '13.5px' }}>
                        {m.cantidad} {m.unidad_simbolo}
                      </td>
                      <td style={{ fontWeight: '800', color: '#b91c1c', fontSize: '13.5px' }}>
                        Q {parseFloat(m.perdida_total || 0).toFixed(2)}
                      </td>
                      <td style={{ fontSize: '12.5px', color: 'var(--text-main)', maxWidth: '280px' }}>
                        {m.motivo}
                      </td>
                      <td>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '12.5px', color: 'var(--text-main)' }}>
                          <IconUser size={13} />
                          <span>{m.usuario_nombre}</span>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal de Registro de Merma */}
      <RegisterMermaModal
        isOpen={Boolean(selectedLoteForMerma)}
        onClose={() => setSelectedLoteForMerma(null)}
        lote={selectedLoteForMerma}
        onSuccess={() => {
          setToast({ type: 'success', message: 'Baja de inventario registrada y stock actualizado exitosamente.' });
          loadInventoryData();
        }}
      />

      <Toast toast={toast} onClose={() => setToast(null)} />
    </div>
  );
};


export default InventoryBatchesPage;

import React, { useState, useEffect, useCallback } from 'react';
import { NohemyApi } from '../../api/nohemyApi';
import { Toast } from '../../components/common';
import { IconAlertTriangle, IconBarChart, IconBarcode, IconCalendar, IconCreditCard, IconLayers, IconPrinter, IconQuetzal, IconShieldCheck, IconTrendingUp } from '../../components/icons/Icons';

/* ── COMPONENTE: MÓDULO DE REPORTES Y ANALÍTICAS (RF-07.2) ── */
export const ReportsAnalyticsPage = () => {
  const [activeSubTab, setActiveSubTab] = useState('financiero'); // 'financiero' | 'mermas_fifo'
  const [periodo, setPeriodo] = useState('mes'); // 'hoy' | 'semana' | 'mes' | 'anio' | 'todo'
  const [loading, setLoading] = useState(true);
  const [financieroData, setFinancieroData] = useState(null);
  const [fifoData, setFifoData] = useState(null);
  const [toast, setToast] = useState(null);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [finRes, fifoRes] = await Promise.all([
        NohemyApi.getReporteFinanciero({ periodo }),
        NohemyApi.getReporteMermasFIFO()
      ]);
      setFinancieroData(finRes);
      setFifoData(fifoRes);
    } catch (err) {
      console.error('Error cargando reportes:', err);
      setToast({ type: 'error', message: 'No se pudieron cargar los datos de reportes: ' + err.message });
    } finally {
      setLoading(false);
    }
  }, [periodo]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const kpis = financieroData?.kpis || {};
  const kpisFifo = fifoData?.kpis_fifo || {};
  const semaforo = fifoData?.semaforo_actual || {};
  const flujo = financieroData?.flujo_temporal || [];
  const categorias = financieroData?.ventas_por_categoria || [];
  const topProds = financieroData?.top_productos || [];
  const pagos = financieroData?.desglose_pagos || [];
  const historialFifo = fifoData?.historial_salidas_fifo || [];

  // Calcular escala máxima para gráfico SVG
  const maxVenta = Math.max(...flujo.map(f => f.ventas || 0), 10);

  return (
    <div className="page-container" style={{ padding: '24px' }}>
      {/* Barra de Controles y Sub-pestañas */}
      <div className="inv-control-bar no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '20px' }}>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button 
            type="button" 
            className={`inv-tab-btn ${activeSubTab === 'financiero' ? 'active' : ''}`}
            onClick={() => setActiveSubTab('financiero')}
          >
            <IconBarChart size={15} />
            <span>Financiero y Ventas</span>
          </button>
          <button 
            type="button" 
            className={`inv-tab-btn ${activeSubTab === 'mermas_fifo' ? 'active' : ''}`}
            onClick={() => setActiveSubTab('mermas_fifo')}
          >
            <IconLayers size={15} />
            <span>Rotación PEPS y Mermas Evitadas</span>
          </button>
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          {activeSubTab === 'financiero' && (
            <div style={{ display: 'inline-flex', background: 'rgba(0,0,0,0.03)', padding: '3px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
              {[
                { key: 'hoy', label: 'Hoy' },
                { key: 'semana', label: '7 Días' },
                { key: 'mes', label: 'Este Mes' },
                { key: 'anio', label: 'Este Año' },
                { key: 'todo', label: 'Histórico' },
              ].map(p => (
                <button
                  key={p.key}
                  type="button"
                  onClick={() => setPeriodo(p.key)}
                  style={{
                    padding: '5px 12px',
                    fontSize: '12px',
                    fontWeight: periodo === p.key ? 700 : 500,
                    borderRadius: '6px',
                    border: 'none',
                    background: periodo === p.key ? 'var(--accent)' : 'transparent',
                    color: periodo === p.key ? '#ffffff' : 'var(--text-muted)',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                  }}
                >
                  {p.label}
                </button>
              ))}
            </div>
          )}

          <button
            type="button"
            onClick={() => window.print()}
            className="btn-outline btn-print"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '6px 14px', fontSize: '12px', fontWeight: 600 }}
            title="Imprimir o Exportar PDF"
          >
            <IconPrinter size={15} />
            <span>Imprimir / PDF</span>
          </button>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
          <div className="spinner" style={{ margin: '0 auto 16px' }} />
          <p style={{ fontSize: '14px', fontWeight: 500 }}>Consolidando reportes e índices financieros...</p>
        </div>
      ) : activeSubTab === 'financiero' ? (
        <div>
          {/* Tarjetas KPI Financieras */}
          <div className="inv-kpi-grid" style={{ marginBottom: '24px' }}>
            <div className="inv-kpi-card kpi-total">
              <div className="kpi-header">
                <span>Ventas Totales</span>
                <IconQuetzal size={16} />
              </div>
              <div className="kpi-value" style={{ color: 'var(--accent)' }}>
                Q {parseFloat(kpis.total_ventas || 0).toFixed(2)}
              </div>
              <div className="kpi-subtext">
                {kpis.total_transacciones || 0} {(kpis.total_transacciones === 1) ? 'factura procesada' : 'facturas procesadas'}
              </div>
            </div>

            <div className="inv-kpi-card">
              <div className="kpi-header">
                <span>Costo de Mercancía (COGS)</span>
                <IconLayers size={16} />
              </div>
              <div className="kpi-value">
                Q {parseFloat(kpis.costo_total || 0).toFixed(2)}
              </div>
              <div className="kpi-subtext">
                Costo FIFO exacto de los lotes vendidos
              </div>
            </div>

            <div className="inv-kpi-card kpi-success">
              <div className="kpi-header">
                <span>Utilidad Bruta</span>
                <IconTrendingUp size={16} />
              </div>
              <div className="kpi-value" style={{ color: '#059669' }}>
                Q {parseFloat(kpis.utilidad_bruta || 0).toFixed(2)}
              </div>
              <div className="kpi-subtext" style={{ color: '#047857', fontWeight: 700 }}>
                {parseFloat(kpis.margen_porcentaje || 0).toFixed(1)}% margen de ganancia
              </div>
            </div>

            <div className="inv-kpi-card">
              <div className="kpi-header">
                <span>Ticket Promedio</span>
                <IconBarChart size={16} />
              </div>
              <div className="kpi-value">
                Q {parseFloat(kpis.ticket_promedio || 0).toFixed(2)}
              </div>
              <div className="kpi-subtext">
                Monto medio por transacción de venta
              </div>
            </div>
          </div>

          {/* Gráfico de Tendencia Temporal SVG */}
          <div className="report-panel" style={{ marginBottom: '24px' }}>
            <div className="report-panel-header">
              <span className="report-panel-title">
                <IconTrendingUp size={16} />
                <span>Flujo de Ventas en el Período ({financieroData?.periodo?.fecha_inicio} al {financieroData?.periodo?.fecha_fin})</span>
              </span>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                Total acumulado: <strong style={{ color: 'var(--accent)' }}>Q {parseFloat(kpis.total_ventas || 0).toFixed(2)}</strong>
              </span>
            </div>
            <div className="report-panel-body">
              {flujo.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
                  No hay transacciones registradas en este período.
                </div>
              ) : (
                <div className="chart-svg-container">
                  <svg width="100%" height="160" viewBox={`0 0 ${Math.max(flujo.length * 50, 400)} 160`} preserveAspectRatio="none">
                    <defs>
                      <linearGradient id="chartGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.4" />
                        <stop offset="100%" stopColor="var(--accent)" stopOpacity="0.02" />
                      </linearGradient>
                    </defs>

                    {/* Líneas horizontales de guía */}
                    <line x1="0" y1="30" x2="100%" y2="30" stroke="rgba(0,0,0,0.05)" strokeDasharray="3 3" />
                    <line x1="0" y1="80" x2="100%" y2="80" stroke="rgba(0,0,0,0.05)" strokeDasharray="3 3" />
                    <line x1="0" y1="130" x2="100%" y2="130" stroke="rgba(0,0,0,0.1)" strokeWidth="1" />

                    {/* Barras y Puntos de Datos */}
                    {flujo.map((d, idx) => {
                      const totalWidth = Math.max(flujo.length * 50, 400);
                      const colWidth = totalWidth / flujo.length;
                      const x = (idx * colWidth) + (colWidth / 2);
                      const barH = maxVenta > 0 ? (d.ventas / maxVenta) * 100 : 0;
                      const y = 130 - barH;

                      return (
                        <g key={d.fecha}>
                          {/* Barra estilizada */}
                          {d.ventas > 0 && (
                            <rect
                              x={x - 12}
                              y={y}
                              width="24"
                              height={barH}
                              rx="4"
                              fill="url(#chartGrad)"
                              stroke="var(--accent)"
                              strokeWidth="1.5"
                            />
                          )}
                          {/* Punto indicador */}
                          <circle
                            cx={x}
                            cy={y}
                            r={d.ventas > 0 ? 3.5 : 2}
                            fill={d.ventas > 0 ? 'var(--accent)' : 'rgba(0,0,0,0.2)'}
                          />
                          {/* Monto sobre la barra */}
                          {d.ventas > 0 && (
                            <text
                              x={x}
                              y={y - 6}
                              textAnchor="middle"
                              fill="var(--accent)"
                              fontSize="10"
                              fontWeight="700"
                            >
                              Q{d.ventas.toFixed(0)}
                            </text>
                          )}
                          {/* Etiqueta del día abajo */}
                          <text
                            x={x}
                            y="148"
                            textAnchor="middle"
                            fill="var(--text-muted)"
                            fontSize="10"
                          >
                            {d.dia_label}
                          </text>
                        </g>
                      );
                    })}
                  </svg>
                </div>
              )}
            </div>
          </div>

          {/* Paneles 2 Columnas: Ventas por Categoría & Métodos de Pago */}
          <div className="report-grid-2">
            {/* Categorías */}
            <div className="report-panel">
              <div className="report-panel-header">
                <span className="report-panel-title">
                  <IconLayers size={16} />
                  <span>Ventas por Categoría de Producto</span>
                </span>
                <span style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>
                  {categorias.length} {categorias.length === 1 ? 'categoría' : 'categorías'}
                </span>
              </div>
              <div className="report-panel-body">
                {categorias.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)' }}>
                    No hay ventas registradas por categoría en este período.
                  </div>
                ) : (
                  categorias.map(cat => (
                    <div key={cat.categoria} className="category-row">
                      <div className="category-row-header">
                        <span className="category-name">{cat.categoria}</span>
                        <span className="category-val">Q {cat.total.toFixed(2)} ({cat.porcentaje}%)</span>
                      </div>
                      <div className="category-progress-bg">
                        <div 
                          className="category-progress-fill" 
                          style={{ width: `${Math.min(cat.porcentaje, 100)}%` }}
                        />
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Métodos de Pago */}
            <div className="report-panel">
              <div className="report-panel-header">
                <span className="report-panel-title">
                  <IconCreditCard size={16} />
                  <span>Distribución por Método de Pago</span>
                </span>
                <span style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>
                  {pagos.length} {pagos.length === 1 ? 'modalidad' : 'modalidades'}
                </span>
              </div>
              <div className="report-panel-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {pagos.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)' }}>
                    No hay información de pagos en este período.
                  </div>
                ) : (
                  pagos.map(p => (
                    <div 
                      key={p.metodo} 
                      style={{ 
                        background: 'rgba(0,0,0,0.02)', 
                        border: '1px solid var(--border-color)', 
                        padding: '12px 16px', 
                        borderRadius: '8px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}
                    >
                      <div>
                        <div style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 700 }}>
                          {p.metodo === 'EFECTIVO' ? 'Efectivo en Caja' : p.metodo === 'TARJETA' ? 'Tarjeta de Débito/Crédito' : 'Transferencia Bancaria'}
                        </div>
                        <div style={{ fontSize: '17px', fontWeight: 800, color: 'var(--text-main)', marginTop: '2px' }}>
                          Q {Number(p.total || 0).toFixed(2)}
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <span style={{ 
                          background: 'rgba(184, 134, 11, 0.12)', 
                          color: 'var(--accent)', 
                          padding: '3px 8px', 
                          borderRadius: '6px', 
                          fontWeight: 800, 
                          fontSize: '13px' 
                        }}>
                          {Number(p.porcentaje || 0)}%
                        </span>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                          {p.conteo} {p.conteo === 1 ? 'operación' : 'operaciones'}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Top 10 Productos Más Vendidos */}
          <div className="report-panel">
            <div className="report-panel-header">
              <span className="report-panel-title">
                <IconBarChart size={16} />
                <span>Top 10 Productos con Mayor Rotación e Ingresos</span>
              </span>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                Ordenado por ingresos brutos generados
              </span>
            </div>
            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th className="rep-col-num" style={{ width: '5%', textAlign: 'center' }}>#</th>
                    <th className="rep-col-prod" style={{ width: '33%' }}>PRODUCTO</th>
                    <th className="rep-col-cat" style={{ width: '14%' }}>CATEGORÍA</th>
                    <th className="rep-col-qty" style={{ textAlign: 'center', width: '12%' }}>UNIDADES VENDIDAS</th>
                    <th className="rep-col-ing" style={{ textAlign: 'right', width: '12%' }}>INGRESOS</th>
                    <th className="rep-col-fifo" style={{ textAlign: 'right', width: '12%' }}>COSTO FIFO</th>
                    <th className="rep-col-uti" style={{ textAlign: 'right', width: '12%' }}>UTILIDAD</th>
                  </tr>
                </thead>
                <tbody>
                  {topProds.length === 0 ? (
                    <tr>
                      <td colSpan="7" style={{ textAlign: 'center', padding: '36px', color: 'var(--text-muted)' }}>
                        <IconBarChart size={28} style={{ opacity: 0.3, margin: '0 auto 8px', display: 'block' }} />
                        No se registran ventas para listar productos en este período.
                      </td>
                    </tr>
                  ) : (
                    topProds.map((prod, index) => (
                      <tr key={prod.id_producto}>
                        <td className="rep-col-num" style={{ textAlign: 'center', fontWeight: 800, color: index < 3 ? 'var(--accent)' : 'var(--text-muted)' }}>
                          {index + 1}
                        </td>
                        <td className="rep-col-prod">
                          <div style={{ fontWeight: 700, color: 'var(--text-main)' }}>{prod.nombre}</div>
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'monospace', marginTop: '2px' }}>
                            <IconBarcode size={12} style={{ color: 'var(--accent)' }} />
                            <span>{prod.codigo_barras}</span>
                          </div>
                        </td>
                        <td className="rep-col-cat">
                          <span style={{ 
                            fontSize: '11.5px', 
                            color: 'var(--text-muted)', 
                            background: 'rgba(0,0,0,0.03)', 
                            padding: '3px 8px', 
                            borderRadius: '4px',
                            border: '1px solid rgba(0,0,0,0.06)' 
                          }}>
                            {prod.categoria}
                          </span>
                        </td>
                        <td className="rep-col-qty" style={{ textAlign: 'center' }}>
                          <span style={{
                            display: 'inline-block',
                            padding: '3px 9px',
                            borderRadius: '12px',
                            background: 'rgba(184, 134, 11, 0.08)',
                            color: 'var(--accent)',
                            fontWeight: 700,
                            fontSize: '12px'
                          }}>
                            {prod.unidades_vendidas || 0} uds
                          </span>
                        </td>
                        <td className="rep-col-ing" style={{ textAlign: 'right', fontWeight: 700, color: 'var(--text-main)' }}>
                          Q {Number(prod.ingresos || 0).toFixed(2)}
                        </td>
                        <td className="rep-col-fifo" style={{ textAlign: 'right', color: 'var(--text-muted)' }}>
                          Q {Number(prod.costo || 0).toFixed(2)}
                        </td>
                        <td className="rep-col-uti" style={{ textAlign: 'right', fontWeight: 800, color: '#059669', fontSize: '14px' }}>
                          Q {Number(prod.ganancia || 0).toFixed(2)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        /* Sub-pestaña 2: Rotación PEPS y Mermas Evitadas (RF-07.2) */
        <div>
          {/* Tarjetas KPI de Prevención de Mermas */}
          <div className="inv-kpi-grid" style={{ marginBottom: '24px' }}>
            <div className="inv-kpi-card kpi-success">
              <div className="kpi-header">
                <span>Mermas Evitadas por PEPS</span>
                <IconShieldCheck size={16} />
              </div>
              <div className="kpi-value" style={{ color: '#059669' }}>
                Q {parseFloat(kpisFifo.valor_costo_salvado || 0).toFixed(2)}
              </div>
              <div className="kpi-subtext" style={{ color: '#047857', fontWeight: 600 }}>
                {kpisFifo.unidades_salvadas_fifo || 0} unidades despachadas oportunamente
              </div>
            </div>

            <div className="inv-kpi-card kpi-total">
              <div className="kpi-header">
                <span>Tasa de Eficiencia FIFO</span>
                <IconTrendingUp size={16} />
              </div>
              <div className="kpi-value" style={{ color: 'var(--accent)' }}>
                {parseFloat(kpisFifo.tasa_eficiencia_fifo || 100).toFixed(1)} %
              </div>
              <div className="kpi-subtext">
                Proporción de mercancía salvada vs merma real
              </div>
            </div>

            <div className="inv-kpi-card">
              <div className="kpi-header">
                <span>Lotes Rotados con Éxito</span>
                <IconLayers size={16} />
              </div>
              <div className="kpi-value">
                {kpisFifo.lotes_rotados_exitosamente || 0}
              </div>
              <div className="kpi-subtext">
                Lotes consumidos antes de su vencimiento
              </div>
            </div>

            <div className="inv-kpi-card" style={{ borderLeftColor: '#ef4444' }}>
              <div className="kpi-header">
                <span>Pérdidas Reales Registradas</span>
                <IconAlertTriangle size={16} />
              </div>
              <div className="kpi-value" style={{ color: '#dc2626' }}>
                Q {parseFloat(kpisFifo.perdida_total_real || 0).toFixed(2)}
              </div>
              <div className="kpi-subtext" style={{ color: '#b91c1c' }}>
                {kpisFifo.unidades_mermadas || 0} unidades dadas de baja en bodega
              </div>
            </div>
          </div>

          {/* Semáforo Operativo de Lotes en Almacén */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
            gap: '16px',
            marginBottom: '24px'
          }}>
            <div style={{
              background: 'var(--card-bg)',
              border: '1px solid var(--border-color)',
              borderLeft: '4px solid #10b981',
              borderRadius: '10px',
              padding: '14px 18px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              boxShadow: 'var(--shadow-sm)'
            }}>
              <div>
                <div style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.5px' }}>
                  Lotes Vigentes (&gt; 30 días)
                </div>
                <div style={{ fontSize: '20px', fontWeight: 800, color: '#047857', marginTop: '2px' }}>
                  {semaforo.vigentes?.lotes || 0} lotes
                </div>
                <div style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>
                  {semaforo.vigentes?.unidades || 0} unidades protegidas
                </div>
              </div>
              <div style={{ color: '#10b981' }}>
                <IconShieldCheck size={28} />
              </div>
            </div>

            <div style={{
              background: 'var(--card-bg)',
              border: '1px solid var(--border-color)',
              borderLeft: '4px solid #f59e0b',
              borderRadius: '10px',
              padding: '14px 18px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              boxShadow: 'var(--shadow-sm)'
            }}>
              <div>
                <div style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.5px' }}>
                  Próximos a Vencer (≤ 30 días)
                </div>
                <div style={{ fontSize: '20px', fontWeight: 800, color: '#b45309', marginTop: '2px' }}>
                  {semaforo.proximos?.lotes || 0} lotes
                </div>
                <div style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>
                  {semaforo.proximos?.unidades || 0} unidades en prioridad PEPS
                </div>
              </div>
              <div style={{ color: '#f59e0b' }}>
                <IconAlertTriangle size={28} />
              </div>
            </div>

            <div style={{
              background: 'var(--card-bg)',
              border: '1px solid var(--border-color)',
              borderLeft: '4px solid #ef4444',
              borderRadius: '10px',
              padding: '14px 18px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              boxShadow: 'var(--shadow-sm)'
            }}>
              <div>
                <div style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.5px' }}>
                  Lotes Vencidos en Bodega
                </div>
                <div style={{ fontSize: '20px', fontWeight: 800, color: '#b91c1c', marginTop: '2px' }}>
                  {semaforo.vencidos?.lotes || 0} lotes
                </div>
                <div style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>
                  {semaforo.vencidos?.unidades || 0} unidades bloqueadas para venta
                </div>
              </div>
              <div style={{ color: '#ef4444' }}>
                <IconAlertTriangle size={28} />
              </div>
            </div>
          </div>

          {/* Historial de Despachos FIFO Oportunos */}
          <div className="report-panel" style={{ marginBottom: '24px' }}>
            <div className="report-panel-header">
              <span className="report-panel-title">
                <IconLayers size={16} />
                <span>Historial de Despachos Oportunos por Priorización PEPS</span>
              </span>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600 }}>
                {historialFifo.length} {historialFifo.length === 1 ? 'salida registrada' : 'salidas registradas'}
              </span>
            </div>
            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th style={{ width: '130px' }}>FACTURA</th>
                    <th>PRODUCTO</th>
                    <th style={{ width: '130px' }}>LOTE FIFO</th>
                    <th style={{ width: '160px' }}>FECHA VENCIMIENTO</th>
                    <th style={{ width: '110px', textAlign: 'center' }}>CANTIDAD</th>
                    <th style={{ width: '120px', textAlign: 'right' }}>COSTO UNIT.</th>
                    <th style={{ width: '150px', textAlign: 'right' }}>VALOR PRESERVADO</th>
                  </tr>
                </thead>
                <tbody>
                  {historialFifo.length === 0 ? (
                    <tr>
                      <td colSpan="7" style={{ textAlign: 'center', padding: '36px', color: 'var(--text-muted)' }}>
                        <IconLayers size={28} style={{ opacity: 0.3, margin: '0 auto 8px', display: 'block' }} />
                        No se registran salidas de lotes en el historial.
                      </td>
                    </tr>
                  ) : (
                    historialFifo.map(s => (
                      <tr key={s.id_salida}>
                        <td>
                          <span style={{ 
                            display: 'inline-block',
                            fontWeight: 700, 
                            color: 'var(--accent)', 
                            fontFamily: 'monospace',
                            fontSize: '12px',
                            background: 'rgba(184, 134, 11, 0.08)',
                            padding: '3px 8px',
                            borderRadius: '6px',
                            border: '1px solid rgba(184, 134, 11, 0.2)'
                          }}>
                            #{s.factura_codigo}
                          </span>
                        </td>
                        <td>
                          <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>
                            {s.producto_nombre}
                          </div>
                          {s.fecha_salida && (
                            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                              Salida: {s.fecha_salida}
                            </div>
                          )}
                        </td>
                        <td>
                          <span style={{ 
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px',
                            fontFamily: 'monospace', 
                            fontSize: '12px', 
                            fontWeight: 600,
                            background: '#f8fafc', 
                            color: '#334155',
                            padding: '3px 8px', 
                            borderRadius: '6px',
                            border: '1px solid #e2e8f0'
                          }}>
                            <IconLayers size={12} style={{ color: '#64748b' }} />
                            <span>{s.lote_numero}</span>
                          </span>
                        </td>
                        <td>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '12.5px', color: 'var(--text-main)' }}>
                            <IconCalendar size={13} style={{ color: 'var(--accent)' }} />
                            <span>{s.fecha_vencimiento ? String(s.fecha_vencimiento).split('-').reverse().join('/') : '-'}</span>
                          </span>
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <span style={{
                            display: 'inline-block',
                            padding: '3px 9px',
                            borderRadius: '12px',
                            background: 'rgba(5, 150, 105, 0.08)',
                            color: '#047857',
                            fontWeight: 700,
                            fontSize: '12px'
                          }}>
                            {s.cantidad_descontada || 0} uds
                          </span>
                        </td>
                        <td style={{ textAlign: 'right', color: 'var(--text-muted)', fontWeight: 500 }}>
                          Q {Number(s.costo_unitario || 0).toFixed(2)}
                        </td>
                        <td style={{ textAlign: 'right', fontWeight: 800, color: '#059669', fontSize: '14px' }}>
                          Q {Number(s.valor_preservado || 0).toFixed(2)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      <Toast toast={toast} onClose={() => setToast(null)} />
    </div>
  );
};


export default ReportsAnalyticsPage;

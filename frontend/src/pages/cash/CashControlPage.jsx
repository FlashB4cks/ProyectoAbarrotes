import React, { useState, useEffect } from 'react';
import { NohemyApi } from '../../api/nohemyApi';
import { Toast } from '../../components/common';
import { IconBank, IconCalendar, IconCashRegister, IconCheck, IconLock, IconPlus, IconPrinter, IconReceipt, IconRefresh } from '../../components/icons/Icons';

import OpenCashModal from './OpenCashModal';
import CashMovementModal from './CashMovementModal';
import CloseCashModal from './CloseCashModal';
import CashTicketModal from './CashTicketModal';
/* ── COMPONENTE PRINCIPAL: CONTROL DE CAJA, ARQUEO Y TURNOS (RF-05 / CAJA) ── */
export const CashControlPage = ({ isEmbedded = false, onOpenScanner }) => {
  const [activeSubTab, setActiveSubTab] = useState('turno_actual'); // 'turno_actual' | 'historial'
  const [cajaData, setCajaData] = useState(null);
  const [historialCajas, setHistorialCajas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);

  // Modales
  const [isOpenCashModalOpen, setIsOpenCashModalOpen] = useState(false);
  const [isCashMovementModalOpen, setIsCashMovementModalOpen] = useState(false);
  const [movementInitialType, setMovementInitialType] = useState('INGRESO');
  const [isCloseCashModalOpen, setIsCloseCashModalOpen] = useState(false);
  const [selectedCorteTicket, setSelectedCorteTicket] = useState(null);

  const fetchCajaData = async () => {
    setLoading(true);
    try {
      const data = await NohemyApi.getCajaActiva();
      setCajaData(data);
      if (activeSubTab === 'historial') {
        const hist = await NohemyApi.getHistorialCajas();
        setHistorialCajas(Array.isArray(hist) ? hist : hist.results || []);
      }
    } catch (err) {
      setToast({ type: 'error', message: 'Error al consultar caja: ' + err.message });
    } finally {
      setLoading(false);
    }
  };

  const fetchHistorial = async () => {
    try {
      const hist = await NohemyApi.getHistorialCajas();
      setHistorialCajas(Array.isArray(hist) ? hist : hist.results || []);
    } catch (err) {
      setToast({ type: 'error', message: 'Error al cargar historial: ' + err.message });
    }
  };

  useEffect(() => {
    fetchCajaData();
  }, [activeSubTab]);

  const handleOpenSuccess = (nuevaSesion) => {
    setToast({ type: 'success', message: `Turno #${nuevaSesion.id_sesion} iniciado con éxito.` });
    fetchCajaData();
  };

  const handleMovementSuccess = (msg) => {
    setToast({ type: 'success', message: msg || 'Movimiento registrado con éxito.' });
    fetchCajaData();
  };

  const handleCloseSuccess = (sesionCerrada) => {
    setToast({ type: 'success', message: `Turno #${sesionCerrada.id_sesion} cerrado exitosamente.` });
    fetchCajaData();
    setSelectedCorteTicket(sesionCerrada);
  };

  const isAbierta = Boolean(cajaData?.abierta);
  const sesion = cajaData?.sesion;
  const metricas = cajaData?.metricas || {};
  const movimientos = cajaData?.movimientos || [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Sub-pestañas de control de caja */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
        <div style={{ display: 'inline-flex', background: 'var(--input-bg)', padding: '4px', borderRadius: '8px', border: '1px solid var(--card-border)' }}>
          <button
            type="button"
            className={`tab-pill ${activeSubTab === 'turno_actual' ? 'active' : ''}`}
            onClick={() => setActiveSubTab('turno_actual')}
            style={{ fontSize: '13px', padding: '6px 14px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          >
            <IconCashRegister size={15} />
            <span>Turno Actual y Gaveta</span>
            {isAbierta && (
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981', display: 'inline-block' }}></span>
            )}
          </button>
          <button
            type="button"
            className={`tab-pill ${activeSubTab === 'historial' ? 'active' : ''}`}
            onClick={() => { setActiveSubTab('historial'); fetchHistorial(); }}
            style={{ fontSize: '13px', padding: '6px 14px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          >
            <IconCalendar size={15} />
            <span>Historial de Cortes de Caja</span>
          </button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={fetchCajaData}
            style={{ fontSize: '12.5px', padding: '6px 12px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          >
            <IconRefresh size={14} />
            <span>Actualizar</span>
          </button>
        </div>
      </div>

      {loading && !cajaData ? (
        <div className="card p-4 text-center" style={{ padding: '36px', color: 'var(--text-muted)' }}>
          Consultando estado de caja y flujo financiero...
        </div>
      ) : activeSubTab === 'turno_actual' ? (
        <div>
          {isAbierta ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Barra de Estado del Turno */}
              <div style={{
                background: 'linear-gradient(135deg, rgba(184, 134, 11, 0.12) 0%, rgba(16, 185, 129, 0.08) 100%)',
                border: '1px solid rgba(184, 134, 11, 0.3)',
                borderRadius: '12px',
                padding: '16px 20px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '12px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{
                    width: '42px', height: '42px', borderRadius: '10px', background: '#10b981',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff'
                  }}>
                    <IconCashRegister size={24} />
                  </div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 800, color: 'var(--text-main)' }}>
                        Turno de Caja #{sesion?.id_sesion}
                      </h3>
                      <span className="status-badge active" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '11px', padding: '2px 8px' }}>
                        ● Turno en Curso
                      </span>
                    </div>
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                      Iniciado por <strong>{sesion?.usuario_apertura_nombre}</strong> el {sesion?.fecha_apertura ? new Date(sesion.fecha_apertura).toLocaleString('es-GT', { dateStyle: 'short', timeStyle: 'short' }) : ''} ({sesion?.tiempo_abierta})
                    </span>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    style={{ fontSize: '12.5px', padding: '8px 14px', fontWeight: 700, borderColor: '#10b981', color: '#10b981', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                    onClick={() => { setMovementInitialType('INGRESO'); setIsCashMovementModalOpen(true); }}
                  >
                    <IconPlus size={14} />
                    <span>Entrada Efectivo</span>
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    style={{ fontSize: '12.5px', padding: '8px 14px', fontWeight: 700, borderColor: '#ef4444', color: '#ef4444', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                    onClick={() => { setMovementInitialType('EGRESO'); setIsCashMovementModalOpen(true); }}
                  >
                    <span>- Gasto / Salida</span>
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary"
                    style={{ fontSize: '12.5px', padding: '8px 16px', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                    onClick={() => setIsCloseCashModalOpen(true)}
                  >
                    <IconLock size={15} />
                    <span>Arqueo y Cierre</span>
                  </button>
                </div>
              </div>

              {/* 4 Tarjetas KPI */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
                <div className="card" style={{ padding: '16px 20px', borderLeft: '4px solid #10b981' }}>
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>
                    Efectivo Teórico en Gaveta
                  </span>
                  <div style={{ fontSize: '28px', fontWeight: 900, color: '#10b981', marginTop: '4px' }}>
                    Q {Number(metricas.efectivo_esperado || 0).toLocaleString('es-GT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                  <span style={{ fontSize: '11.5px', color: 'var(--text-muted)', marginTop: '2px', display: 'block' }}>
                    Dinero físico calculado disponible
                  </span>
                </div>

                <div className="card" style={{ padding: '16px 20px', borderLeft: '4px solid var(--accent)' }}>
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>
                    Total Ventas del Turno
                  </span>
                  <div style={{ fontSize: '28px', fontWeight: 900, color: 'var(--accent)', marginTop: '4px' }}>
                    Q {Number(metricas.total_ventas || 0).toLocaleString('es-GT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                  <span style={{ fontSize: '11.5px', color: 'var(--text-muted)', marginTop: '2px', display: 'block' }}>
                    {metricas.conteo_ventas || 0} facturas cobradas
                  </span>
                </div>

                <div className="card" style={{ padding: '16px 20px', borderLeft: '4px solid #3b82f6' }}>
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>
                    Fondo Inicial de Apertura
                  </span>
                  <div style={{ fontSize: '26px', fontWeight: 900, color: '#3b82f6', marginTop: '4px' }}>
                    Q {Number(metricas.monto_inicial || 0).toLocaleString('es-GT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                  <span style={{ fontSize: '11.5px', color: 'var(--text-muted)', marginTop: '2px', display: 'block' }}>
                    Base para cambio / vuelto
                  </span>
                </div>

                <div className="card" style={{ padding: '16px 20px', borderLeft: '4px solid #8b5cf6' }}>
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>
                    Entradas / Salidas de Caja
                  </span>
                  <div style={{ fontSize: '22px', fontWeight: 900, marginTop: '6px' }}>
                    <span style={{ color: '#10b981' }}>+Q {Number(metricas.entradas_manuales || 0).toFixed(2)}</span>
                    <span style={{ color: 'var(--text-muted)', margin: '0 6px' }}>/</span>
                    <span style={{ color: '#ef4444' }}>-Q {Number(metricas.salidas_manuales || 0).toFixed(2)}</span>
                  </div>
                  <span style={{ fontSize: '11.5px', color: 'var(--text-muted)', marginTop: '2px', display: 'block' }}>
                    Movimientos y gastos menores
                  </span>
                </div>
              </div>

              {/* Desglose por Método de Pago */}
              <div className="card" style={{ padding: '16px 20px' }}>
                <h4 style={{ margin: '0 0 12px 0', fontSize: '14.5px', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <IconBank size={18} />
                  <span>Desglose de Cobros por Método de Pago</span>
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
                  <div style={{ background: 'var(--input-bg)', padding: '12px', borderRadius: '8px', borderLeft: '3px solid #10b981' }}>
                    <span style={{ fontSize: '11.5px', color: 'var(--text-muted)', display: 'block' }}>Efectivo (Entró a gaveta)</span>
                    <strong style={{ fontSize: '18px', color: '#10b981' }}>
                      Q {Number(metricas.ventas_efectivo || 0).toLocaleString('es-GT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </strong>
                  </div>
                  <div style={{ background: 'var(--input-bg)', padding: '12px', borderRadius: '8px', borderLeft: '3px solid #3b82f6' }}>
                    <span style={{ fontSize: '11.5px', color: 'var(--text-muted)', display: 'block' }}>Tarjeta (Vouchers POS)</span>
                    <strong style={{ fontSize: '18px', color: '#3b82f6' }}>
                      Q {Number(metricas.ventas_tarjeta || 0).toLocaleString('es-GT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </strong>
                  </div>
                  <div style={{ background: 'var(--input-bg)', padding: '12px', borderRadius: '8px', borderLeft: '3px solid #8b5cf6' }}>
                    <span style={{ fontSize: '11.5px', color: 'var(--text-muted)', display: 'block' }}>Transferencia / Depósito ACH</span>
                    <strong style={{ fontSize: '18px', color: '#8b5cf6' }}>
                      Q {Number(metricas.ventas_transferencia || 0).toLocaleString('es-GT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </strong>
                  </div>
                </div>
              </div>

              {/* Tabla de Movimientos de Caja del Turno */}
              <div className="card" style={{ padding: '16px 20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                  <h4 style={{ margin: 0, fontSize: '14.5px', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <IconReceipt size={18} />
                    <span>Flujo de Movimientos y Cobros del Turno</span>
                  </h4>
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                    {movimientos.length} registros en este turno
                  </span>
                </div>

                <div className="table-responsive">
                  <table className="table" style={{ fontSize: '12.5px' }}>
                    <thead>
                      <tr>
                        <th>FECHA Y HORA</th>
                        <th>TIPO</th>
                        <th>CONCEPTO / DESCRIPCIÓN</th>
                        <th>USUARIO</th>
                        <th className="text-right">MONTO</th>
                      </tr>
                    </thead>
                    <tbody>
                      {movimientos.length === 0 ? (
                        <tr>
                          <td colSpan="5" style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)' }}>
                            No hay movimientos registrados en este turno aún.
                          </td>
                        </tr>
                      ) : (
                        movimientos.map(m => {
                          const isIngreso = m.tipo === 'INGRESO';
                          const horaStr = m.fecha_hora 
                            ? new Date(m.fecha_hora).toLocaleTimeString('es-GT', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
                            : '';
                          return (
                            <tr key={m.id_movimiento}>
                              <td style={{ whiteSpace: 'nowrap' }}>{horaStr}</td>
                              <td>
                                <span style={{
                                  display: 'inline-block',
                                  fontSize: '10.5px',
                                  fontWeight: 700,
                                  padding: '2px 8px',
                                  borderRadius: '4px',
                                  background: isIngreso ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                                  color: isIngreso ? '#10b981' : '#ef4444'
                                }}>
                                  {isIngreso ? '▲ INGRESO' : '▼ EGRESO'}
                                </span>
                              </td>
                              <td>
                                <span style={{ color: 'var(--text-main)', fontWeight: 600 }}>{m.concepto}</span>
                                {m.codigo_factura && (
                                  <span style={{ fontSize: '11px', color: 'var(--accent)', marginLeft: '6px' }}>
                                    #{m.codigo_factura}
                                  </span>
                                )}
                              </td>
                              <td style={{ color: 'var(--text-muted)' }}>{m.usuario_nombre}</td>
                              <td className="text-right" style={{ fontWeight: 800, color: isIngreso ? '#10b981' : '#ef4444' }}>
                                {isIngreso ? '+' : '-'}Q {Number(m.monto || 0).toLocaleString('es-GT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : (
            /* Estado de Caja CERRADA: Bienvenida para Apertura */
            <div className="card" style={{ padding: '48px 24px', textAlign: 'center', maxWidth: '640px', margin: '20px auto' }}>
              <div style={{
                width: '72px', height: '72px', borderRadius: '50%', background: 'rgba(184, 134, 11, 0.15)',
                color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px auto'
              }}>
                <IconCashRegister size={36} />
              </div>
              <h3 style={{ margin: '0 0 8px 0', fontSize: '20px', fontWeight: 800, color: 'var(--text-main)' }}>
                La Caja se Encuentra Cerrada
              </h3>
              <p style={{ margin: '0 0 24px 0', fontSize: '13.5px', color: 'var(--text-muted)', lineHeight: '1.5' }}>
                Para comenzar a facturar y registrar ingresos, salidas y arqueos de dinero físico en gaveta, debe iniciar un nuevo turno de caja indicando el fondo inicial.
              </p>
              <button
                type="button"
                className="btn btn-primary"
                style={{ fontSize: '14px', padding: '12px 28px', fontWeight: 800, display: 'inline-flex', alignItems: 'center', gap: '8px' }}
                onClick={() => setIsOpenCashModalOpen(true)}
              >
                <IconCheck size={18} />
                <span>Iniciar Turno / Abrir Caja</span>
              </button>
            </div>
          )}
        </div>
      ) : (
        /* Pestaña: Historial de Cortes Anteriores */
        <div className="card" style={{ padding: '16px 20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <h4 style={{ margin: 0, fontSize: '15px', color: 'var(--text-main)' }}>
              Historial de Turnos y Cortes de Caja
            </h4>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              {historialCajas.length} turnos registrados
            </span>
          </div>

          <div className="table-responsive">
            <table className="table">
              <thead>
                <tr>
                  <th>TURNO #</th>
                  <th>FECHA APERTURA</th>
                  <th>FECHA CIERRE</th>
                  <th>CAJERO</th>
                  <th className="text-right">BASE INICIAL</th>
                  <th className="text-right">VENTAS EFECTIVO</th>
                  <th className="text-right">ESPERADO</th>
                  <th className="text-right">CONTADO</th>
                  <th style={{ textAlign: 'center' }}>ARQUEO / DIFERENCIA</th>
                  <th style={{ textAlign: 'center' }}>ESTADO</th>
                  <th className="text-right">COMPROBANTE</th>
                </tr>
              </thead>
              <tbody>
                {historialCajas.length === 0 ? (
                  <tr>
                    <td colSpan="11" style={{ textAlign: 'center', padding: '36px', color: 'var(--text-muted)' }}>
                      No hay historial de cortes de caja registrados en el sistema.
                    </td>
                  </tr>
                ) : (
                  historialCajas.map(c => {
                    const dif = parseFloat(c.diferencia || 0);
                    const isCuadrada = Math.abs(dif) < 0.01;
                    const isAbiertaCaja = c.estado === 'ABIERTA';

                    return (
                      <tr key={c.id_sesion}>
                        <td>
                          <strong>#{c.id_sesion}</strong>
                        </td>
                        <td style={{ fontSize: '12px', whiteSpace: 'nowrap' }}>
                          {c.fecha_apertura ? new Date(c.fecha_apertura).toLocaleString('es-GT', { dateStyle: 'short', timeStyle: 'short' }) : '-'}
                        </td>
                        <td style={{ fontSize: '12px', whiteSpace: 'nowrap' }}>
                          {c.fecha_cierre ? new Date(c.fecha_cierre).toLocaleString('es-GT', { dateStyle: 'short', timeStyle: 'short' }) : '—'}
                        </td>
                        <td>
                          <div style={{ fontSize: '12.5px', fontWeight: 600 }}>{c.usuario_apertura_nombre}</div>
                          {c.usuario_cierre_nombre && c.usuario_cierre_nombre !== c.usuario_apertura_nombre && (
                            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Cierre: {c.usuario_cierre_nombre}</span>
                          )}
                        </td>
                        <td className="text-right" style={{ fontSize: '12.5px' }}>
                          Q {Number(c.monto_inicial || 0).toFixed(2)}
                        </td>
                        <td className="text-right" style={{ fontSize: '12.5px', color: '#10b981', fontWeight: 700 }}>
                          Q {Number(c.total_ventas_efectivo || 0).toFixed(2)}
                        </td>
                        <td className="text-right" style={{ fontSize: '12.5px', fontWeight: 700 }}>
                          Q {Number(c.monto_esperado || 0).toFixed(2)}
                        </td>
                        <td className="text-right" style={{ fontSize: '12.5px', fontWeight: 800 }}>
                          {c.monto_real_efectivo !== null ? `Q ${Number(c.monto_real_efectivo).toFixed(2)}` : '—'}
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          {isAbiertaCaja ? (
                            <span style={{ fontSize: '11.5px', color: '#10b981', fontWeight: 600 }}>En curso</span>
                          ) : (
                            <span style={{
                              fontSize: '11px',
                              fontWeight: 700,
                              padding: '2px 8px',
                              borderRadius: '4px',
                              background: isCuadrada ? 'rgba(16, 185, 129, 0.15)' : dif > 0 ? 'rgba(245, 158, 11, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                              color: isCuadrada ? '#10b981' : dif > 0 ? '#b8860b' : '#ef4444'
                            }}>
                              {isCuadrada ? '✓ Cuadrada' : (dif > 0 ? `+Q ${dif.toFixed(2)}` : `-Q ${Math.abs(dif).toFixed(2)}`)}
                            </span>
                          )}
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <span className={`status-badge ${isAbiertaCaja ? 'active' : 'inactive'}`}>
                            {isAbiertaCaja ? '● Abierta' : '○ Cerrada'}
                          </span>
                        </td>
                        <td className="text-right">
                          <button
                            type="button"
                            className="btn btn-secondary"
                            style={{ fontSize: '11.5px', padding: '4px 8px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                            onClick={() => setSelectedCorteTicket(c)}
                          >
                            <IconPrinter size={13} />
                            <span>Ticket</span>
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

      {/* Modales de Control de Caja */}
      <OpenCashModal
        isOpen={isOpenCashModalOpen}
        onClose={() => setIsOpenCashModalOpen(false)}
        onSuccess={handleOpenSuccess}
      />

      <CashMovementModal
        isOpen={isCashMovementModalOpen}
        onClose={() => setIsCashMovementModalOpen(false)}
        onSuccess={handleMovementSuccess}
        initialType={movementInitialType}
      />

      <CloseCashModal
        isOpen={isCloseCashModalOpen}
        onClose={() => setIsCloseCashModalOpen(false)}
        onSuccess={handleCloseSuccess}
        metricas={metricas}
        sesion={sesion}
      />

      <CashTicketModal
        isOpen={Boolean(selectedCorteTicket)}
        onClose={() => setSelectedCorteTicket(null)}
        caja={selectedCorteTicket}
      />

      <Toast toast={toast} onClose={() => setToast(null)} />
    </div>
  );
};


export default CashControlPage;

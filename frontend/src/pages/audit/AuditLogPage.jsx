import React, { useState, useEffect, useCallback } from 'react';
import { NohemyApi } from '../../api/nohemyApi';
import { Toast } from '../../components/common';
import { IconAlertTriangle, IconBarChart, IconCalendar, IconLayers, IconPrinter, IconRefresh, IconSearch, IconShieldCheck, IconShoppingBag, IconUser } from '../../components/icons/Icons';

/* ── COMPONENTE: BITÁCORA DE AUDITORÍA DEL SISTEMA (RF-07.1) ── */
export const AuditLogPage = () => {
  const [logs, setLogs] = useState([]);
  const [resumen, setResumen] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [accion, setAccion] = useState('TODAS');
  const [periodo, setPeriodo] = useState('todo'); // 'hoy' | 'semana' | 'mes' | 'todo'
  const [toast, setToast] = useState(null);

  const loadAuditData = useCallback(async () => {
    try {
      setLoading(true);
      const params = {};
      if (search.trim()) params.search = search.trim();
      if (accion !== 'TODAS') params.accion = accion;

      const hoy = new Date().toISOString().split('T')[0];
      if (periodo === 'hoy') {
        params.fecha_inicio = hoy;
      } else if (periodo === 'semana') {
        const d = new Date();
        d.setDate(d.getDate() - 7);
        params.fecha_inicio = d.toISOString().split('T')[0];
      } else if (periodo === 'mes') {
        const d = new Date();
        d.setDate(d.getDate() - 30);
        params.fecha_inicio = d.toISOString().split('T')[0];
      }

      const [logsRes, resumenRes] = await Promise.all([
        NohemyApi.getBitacoraAuditoria(params),
        NohemyApi.getResumenAuditoria()
      ]);

      const logList = Array.isArray(logsRes) ? logsRes : (logsRes.results || []);
      setLogs(logList);
      setResumen(resumenRes);
    } catch (err) {
      console.error('Error cargando auditoría:', err);
      setToast({ type: 'error', message: 'Error cargando bitácora de auditoría: ' + err.message });
    } finally {
      setLoading(false);
    }
  }, [search, accion, periodo]);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadAuditData();
    }, 250);
    return () => clearTimeout(timer);
  }, [loadAuditData]);

  const getActionBadge = (act) => {
    const a = String(act).toUpperCase();
    if (a.includes('VENTA') && !a.includes('ANULAR')) {
      return (
        <span className="audit-badge audit-badge-venta">
          <IconShoppingBag size={11} />
          <span>VENTA</span>
        </span>
      );
    }
    if (a.includes('ANULAR')) {
      return (
        <span className="audit-badge audit-badge-anular">
          <IconAlertTriangle size={11} />
          <span>ANULACIÓN</span>
        </span>
      );
    }
    if (a.includes('COMPRA')) {
      return (
        <span className="audit-badge audit-badge-compra">
          <IconLayers size={11} />
          <span>COMPRA</span>
        </span>
      );
    }
    if (a.includes('MERMA') || a.includes('AJUSTE')) {
      return (
        <span className="audit-badge audit-badge-merma">
          <IconAlertTriangle size={11} />
          <span>MERMA</span>
        </span>
      );
    }
    if (a.includes('LOGIN')) {
      return (
        <span className="audit-badge audit-badge-login">
          <IconShieldCheck size={11} />
          <span>ACCESO</span>
        </span>
      );
    }
    return (
      <span className="audit-badge audit-badge-user">
        <IconUser size={11} />
        <span>{act}</span>
      </span>
    );
  };

  const formatLogDate = (dt) => {
    if (!dt) return { date: '-', time: '' };
    try {
      const d = new Date(dt);
      const pad = (n) => String(n).padStart(2, '0');
      return {
        date: `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`,
        time: `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
      };
    } catch {
      return { date: String(dt), time: '' };
    }
  };

  return (
    <div className="page-container" style={{ padding: '24px' }}>
      {/* Tarjetas KPI de Auditoría */}
      <div className="inv-kpi-grid" style={{ marginBottom: '24px' }}>
        <div className="inv-kpi-card kpi-total">
          <div className="kpi-header">
            <span>Total Transacciones</span>
            <IconShieldCheck size={16} />
          </div>
          <div className="kpi-value" style={{ color: 'var(--accent)' }}>
            {resumen?.total_eventos || logs.length}
          </div>
          <div className="kpi-subtext">
            Eventos inmutables registrados en bitácora
          </div>
        </div>

        <div className="inv-kpi-card kpi-success">
          <div className="kpi-header">
            <span>Eventos Hoy</span>
            <IconCalendar size={16} />
          </div>
          <div className="kpi-value" style={{ color: '#059669' }}>
            {resumen?.eventos_hoy || 0}
          </div>
          <div className="kpi-subtext">
            Actividades durante la jornada actual
          </div>
        </div>

        <div className="inv-kpi-card">
          <div className="kpi-header">
            <span>Usuarios Activos Hoy</span>
            <IconUser size={16} />
          </div>
          <div className="kpi-value">
            {resumen?.usuarios_activos_hoy || 1}
          </div>
          <div className="kpi-subtext">
            Operadores con acciones registradas
          </div>
        </div>

        <div className="inv-kpi-card">
          <div className="kpi-header">
            <span>Operación Principal</span>
            <IconBarChart size={16} />
          </div>
          <div className="kpi-value" style={{ fontSize: '18px', paddingTop: '4px' }}>
            {resumen?.por_accion?.[0]?.accion || 'VENTA'}
          </div>
          <div className="kpi-subtext">
            {resumen?.por_accion?.[0]?.total || 0} registros contabilizados
          </div>
        </div>
      </div>

      {/* Barra de Filtros y Búsqueda */}
      <div className="no-print" style={{
        background: 'var(--card-bg)',
        border: '1px solid var(--border-color)',
        borderRadius: '10px',
        padding: '12px 16px',
        marginBottom: '20px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '12px',
        boxShadow: 'var(--shadow-sm)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: '280px', flexWrap: 'wrap' }}>
          <div style={{ flex: '1 1 300px', maxWidth: '460px', position: 'relative' }}>
            <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', display: 'flex' }}>
              <IconSearch size={15} />
            </span>
            <input
              type="text"
              placeholder="Buscar por usuario, acción, descripción o IP..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                width: '100%',
                paddingLeft: '36px',
                paddingRight: search ? '30px' : '12px',
                height: '38px',
                borderRadius: '8px',
                border: '1px solid var(--border-color)',
                background: '#faf8f5',
                color: 'var(--text-main)',
                fontSize: '13px',
                outline: 'none',
                transition: 'border 0.2s ease'
              }}
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                style={{
                  position: 'absolute',
                  right: '10px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  fontSize: '14px'
                }}
              >
                ✕
              </button>
            )}
          </div>

          <select
            value={accion}
            onChange={(e) => setAccion(e.target.value)}
            style={{
              height: '38px',
              borderRadius: '8px',
              border: '1px solid var(--border-color)',
              background: '#faf8f5',
              color: 'var(--text-main)',
              padding: '0 12px',
              fontSize: '12.5px',
              fontWeight: 500,
              cursor: 'pointer',
              outline: 'none'
            }}
          >
            <option value="TODAS">Todas las Acciones</option>
            <option value="VENTA">Ventas Realizadas</option>
            <option value="ANULAR_VENTA">Anulaciones de Venta</option>
            <option value="COMPRA">Compras / Recepciones</option>
            <option value="MERMA">Bajas y Mermas de Lotes</option>
            <option value="LOGIN">Inicios de Sesión</option>
            <option value="USUARIO_CREAR">Creación de Empleados</option>
            <option value="USUARIO_ESTADO">Estados de Usuario</option>
          </select>

          <select
            value={periodo}
            onChange={(e) => setPeriodo(e.target.value)}
            style={{
              height: '38px',
              borderRadius: '8px',
              border: '1px solid var(--border-color)',
              background: '#faf8f5',
              color: 'var(--text-main)',
              padding: '0 12px',
              fontSize: '12.5px',
              fontWeight: 500,
              cursor: 'pointer',
              outline: 'none'
            }}
          >
            <option value="todo">Todo el Historial</option>
            <option value="hoy">Solo Hoy</option>
            <option value="semana">Últimos 7 Días</option>
            <option value="mes">Últimos 30 Días</option>
          </select>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            type="button"
            onClick={loadAuditData}
            className="btn-outline"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', height: '38px', padding: '0 14px', fontSize: '12.5px', fontWeight: 600 }}
            title="Refrescar Bitácora"
          >
            <IconRefresh size={14} />
            <span>Actualizar</span>
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="btn-outline btn-print"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', height: '38px', padding: '0 14px', fontSize: '12.5px', fontWeight: 600 }}
            title="Imprimir Bitácora"
          >
            <IconPrinter size={14} />
            <span>Imprimir</span>
          </button>
        </div>
      </div>

      {/* Tabla de Auditoría */}
      <div className="report-panel">
        <div className="report-panel-header">
          <span className="report-panel-title">
            <IconShieldCheck size={16} />
            <span>Registros de Bitácora</span>
          </span>
          <span style={{ 
            fontSize: '12px', 
            fontWeight: 600, 
            color: 'var(--accent)', 
            background: 'rgba(184, 134, 11, 0.08)', 
            padding: '3px 10px', 
            borderRadius: '12px',
            border: '1px solid rgba(184, 134, 11, 0.2)'
          }}>
            {logs.length} {logs.length === 1 ? 'evento registrado' : 'eventos registrados'}
          </span>
        </div>
        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th className="audit-col-fecha" style={{ width: '13%' }}>FECHA / HORA</th>
                <th className="audit-col-operador" style={{ width: '18%' }}>OPERADOR</th>
                <th className="audit-col-accion" style={{ width: '11%' }}>ACCIÓN</th>
                <th className="audit-col-modulo" style={{ width: '12%' }}>MÓDULO</th>
                <th className="audit-col-desc" style={{ width: '34%' }}>DESCRIPCIÓN</th>
                <th className="audit-col-ip" style={{ textAlign: 'center', width: '12%' }}>IP ORIGEN</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                    <div className="spinner" style={{ margin: '0 auto 12px' }} />
                    Cargando bitácora de auditoría...
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                    <IconShieldCheck size={32} style={{ opacity: 0.3, margin: '0 auto 8px', display: 'block' }} />
                    No se encontraron registros de auditoría con los filtros aplicados.
                  </td>
                </tr>
              ) : (
                logs.map(log => {
                  const logDt = formatLogDate(log.fecha_hora);
                  return (
                    <tr key={log.id_log}>
                      <td className="audit-col-fecha" style={{ fontSize: '11px', whiteSpace: 'nowrap' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                          <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>{logDt.date}</span>
                          <span style={{ color: 'var(--text-muted)', fontSize: '10px', fontFamily: 'monospace' }}>{logDt.time}</span>
                        </div>
                      </td>
                      <td className="audit-col-operador">
                        <div style={{ fontWeight: 700, color: 'var(--text-main)', fontSize: '12.5px', lineHeight: '1.2' }}>
                          {log.usuario_nombre}
                        </div>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '10.5px', marginTop: '2px' }}>
                          <span style={{ color: 'var(--accent)', fontWeight: 600 }}>@{log.usuario_username}</span>
                          <span style={{ color: 'var(--text-muted)' }}>•</span>
                          <span style={{ 
                            textTransform: 'uppercase', 
                            fontSize: '9px', 
                            fontWeight: 700,
                            color: 'var(--text-muted)',
                            background: 'rgba(0,0,0,0.04)',
                            padding: '1px 4px',
                            borderRadius: '3px'
                          }}>
                            {log.usuario_rol}
                          </span>
                        </div>
                      </td>
                      <td className="audit-col-accion">
                        {getActionBadge(log.accion)}
                      </td>
                      <td className="audit-col-modulo">
                        <span style={{ 
                          fontFamily: 'monospace', 
                          fontSize: '10.5px', 
                          fontWeight: 700,
                          background: '#f8fafc', 
                          color: '#475569', 
                          padding: '2px 6px', 
                          borderRadius: '4px',
                          border: '1px solid #e2e8f0',
                          textTransform: 'uppercase',
                          letterSpacing: '0.3px',
                          display: 'inline-block'
                        }}>
                          {log.tabla_afectada}
                        </span>
                      </td>
                      <td className="audit-col-desc" style={{ fontSize: '11.5px', color: 'var(--text-main)', lineHeight: '1.4', wordBreak: 'break-word' }}>
                        {log.descripcion}
                      </td>
                      <td className="audit-col-ip" style={{ textAlign: 'center' }}>
                        <span className="audit-ip-tag" style={{ fontSize: '10.5px', padding: '2px 6px' }}>
                          {log.ip_origen || '127.0.0.1'}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Toast toast={toast} onClose={() => setToast(null)} />
    </div>
  );
};


export default AuditLogPage;

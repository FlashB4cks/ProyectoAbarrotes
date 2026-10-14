import React, { useState, useEffect } from 'react';
import { NohemyApi } from '../../api/nohemyApi';
import { IconLock } from '../../components/icons/Icons';

/* ── MODAL: ARQUEO Y CIERRE DEFINITIVO DE CAJA ── */
export const CloseCashModal = ({ isOpen, onClose, onSuccess, metricas, sesion }) => {
  const [montoReal, setMontoReal] = useState('');
  const [observaciones, setObservaciones] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showDenomCalc, setShowDenomCalc] = useState(false);

  // Conteo por denominación en Quetzales
  const [denominaciones, setDenominaciones] = useState({
    b200: 0,
    b100: 0,
    b50: 0,
    b20: 0,
    b10: 0,
    b5: 0,
    m1: 0,
    m05: 0,
  });

  useEffect(() => {
    if (isOpen) {
      setMontoReal('');
      setObservaciones('');
      setError('');
      setShowDenomCalc(false);
      setDenominaciones({ b200: 0, b100: 0, b50: 0, b20: 0, b10: 0, b5: 0, m1: 0, m05: 0 });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const updateDenom = (field, qty) => {
    const q = Math.max(0, parseInt(qty, 10) || 0);
    const updated = { ...denominaciones, [field]: q };
    setDenominaciones(updated);
    const totalCalc = 
      updated.b200 * 200 +
      updated.b100 * 100 +
      updated.b50 * 50 +
      updated.b20 * 20 +
      updated.b10 * 10 +
      updated.b5 * 5 +
      updated.m1 * 1 +
      updated.m05 * 0.5;
    setMontoReal(totalCalc.toFixed(2));
  };

  const esperado = metricas?.efectivo_esperado || 0;
  const contadoNum = parseFloat(montoReal) || 0;
  const diferencia = contadoNum - esperado;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (montoReal === '' || isNaN(contadoNum) || contadoNum < 0) {
      setError('Debe ingresar el efectivo físico contado en la gaveta.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await NohemyApi.cerrarCaja({
        monto_real_efectivo: contadoNum,
        observaciones: observaciones.trim() || null,
      });
      if (onSuccess) onSuccess(res.sesion);
      onClose();
    } catch (err) {
      setError(err.message || 'Error al cerrar la caja.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={(e) => { if (e.target.className.includes('modal-backdrop')) onClose(); }}>
      <div className="modal-container" style={{ maxWidth: '640px' }}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ color: 'var(--accent)', display: 'flex' }}><IconLock size={22} /></span>
            <div>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700 }}>
                Arqueo y Cierre de Turno #{sesion?.id_sesion}
              </h3>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                Conciliación y balance físico de gaveta
              </span>
            </div>
          </div>
          <button className="btn-close" onClick={onClose}>✕</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px', maxHeight: '70vh', overflowY: 'auto' }}>
            {error && <div className="alert-message alert-danger">{error}</div>}

            {/* Desglose de cuadre esperado */}
            <div style={{ background: 'var(--input-bg)', padding: '14px', borderRadius: '10px', border: '1px solid var(--card-border)' }}>
              <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '8px' }}>
                Balance Teórico del Turno (Efectivo)
              </span>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px', fontSize: '13px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px dashed var(--card-border)' }}>
                  <span>Fondo Inicial:</span>
                  <strong>Q {Number(metricas?.monto_inicial || 0).toFixed(2)}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px dashed var(--card-border)' }}>
                  <span style={{ color: '#10b981' }}>(+) Ventas en Efectivo:</span>
                  <strong style={{ color: '#10b981' }}>Q {Number(metricas?.ventas_efectivo || 0).toFixed(2)}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px dashed var(--card-border)' }}>
                  <span style={{ color: '#10b981' }}>(+) Entradas Extras:</span>
                  <strong>Q {Number(metricas?.entradas_manuales || 0).toFixed(2)}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px dashed var(--card-border)' }}>
                  <span style={{ color: '#ef4444' }}>(-) Salidas / Gastos:</span>
                  <strong style={{ color: '#ef4444' }}>Q {Number(metricas?.salidas_manuales || 0).toFixed(2)}</strong>
                </div>
              </div>

              <div style={{ marginTop: '10px', paddingTop: '8px', borderTop: '2px solid var(--card-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-main)' }}>
                  Efectivo Teórico Esperado:
                </span>
                <span style={{ fontSize: '20px', fontWeight: 900, color: 'var(--accent)' }}>
                  Q {Number(esperado).toFixed(2)}
                </span>
              </div>
            </div>

            {/* Conciliación no efectivo */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '12px' }}>
              <div style={{ background: 'var(--input-bg)', padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--card-border)' }}>
                <span style={{ color: 'var(--text-muted)' }}>Ventas Tarjeta (Vouchers):</span>
                <div style={{ fontSize: '14px', fontWeight: 700, color: '#3b82f6' }}>Q {Number(metricas?.ventas_tarjeta || 0).toFixed(2)}</div>
              </div>
              <div style={{ background: 'var(--input-bg)', padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--card-border)' }}>
                <span style={{ color: 'var(--text-muted)' }}>Transferencias (Bancarias):</span>
                <div style={{ fontSize: '14px', fontWeight: 700, color: '#8b5cf6' }}>Q {Number(metricas?.ventas_transferencia || 0).toFixed(2)}</div>
              </div>
            </div>

            {/* Entrada de Efectivo Contado */}
            <div className="form-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <label style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-main)', margin: 0 }}>
                  Efectivo Físico Contado en Gaveta <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <button
                  type="button"
                  style={{ background: 'none', border: 'none', color: 'var(--accent)', fontSize: '12px', fontWeight: 600, cursor: 'pointer', textDecoration: 'underline' }}
                  onClick={() => setShowDenomCalc(!showDenomCalc)}
                >
                  {showDenomCalc ? 'Ocultar Desglose de Billetes' : 'Abrir Calculadora de Billetes'}
                </button>
              </div>

              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', fontWeight: 700, color: 'var(--accent)', fontSize: '18px' }}>Q</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  value={montoReal}
                  onChange={(e) => setMontoReal(e.target.value)}
                  style={{ paddingLeft: '34px', fontSize: '20px', fontWeight: 900 }}
                  className="form-control"
                  placeholder="0.00"
                  autoFocus
                />
              </div>
            </div>

            {/* Calculadora de denominaciones desplegable */}
            {showDenomCalc && (
              <div style={{ background: 'var(--input-bg)', padding: '12px', borderRadius: '8px', border: '1px solid var(--card-border)' }}>
                <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--accent)', display: 'block', marginBottom: '8px' }}>
                  Conteo por Denominación (Guatemala)
                </span>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
                  {[
                    { key: 'b200', label: 'Q200', val: 200 },
                    { key: 'b100', label: 'Q100', val: 100 },
                    { key: 'b50', label: 'Q50', val: 50 },
                    { key: 'b20', label: 'Q20', val: 20 },
                    { key: 'b10', label: 'Q10', val: 10 },
                    { key: 'b5', label: 'Q5', val: 5 },
                    { key: 'm1', label: 'Q1', val: 1 },
                    { key: 'm05', label: 'Q0.50', val: 0.5 },
                  ].map(d => (
                    <div key={d.key}>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{d.label}</span>
                      <input
                        type="number"
                        min="0"
                        value={denominaciones[d.key] || ''}
                        onChange={(e) => updateDenom(d.key, e.target.value)}
                        placeholder="0"
                        className="form-control"
                        style={{ padding: '4px 6px', fontSize: '12px', textAlign: 'center' }}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Indicador de Diferencia / Arqueo */}
            {montoReal !== '' && (
              <div style={{
                padding: '12px 16px',
                borderRadius: '8px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                background: Math.abs(diferencia) < 0.01 
                  ? 'rgba(16, 185, 129, 0.12)' 
                  : diferencia > 0 
                    ? 'rgba(245, 158, 11, 0.12)' 
                    : 'rgba(239, 68, 68, 0.12)',
                border: `1px solid ${Math.abs(diferencia) < 0.01 ? '#10b981' : diferencia > 0 ? '#f59e0b' : '#ef4444'}`
              }}>
                <div>
                  <span style={{ fontSize: '12px', fontWeight: 600, display: 'block', color: 'var(--text-main)' }}>
                    Resultado del Arqueo:
                  </span>
                  <strong style={{ fontSize: '13.5px', color: Math.abs(diferencia) < 0.01 ? '#10b981' : diferencia > 0 ? '#f59e0b' : '#ef4444' }}>
                    {Math.abs(diferencia) < 0.01 
                      ? '✓ Caja Cuadrada Exacta' 
                      : diferencia > 0 
                        ? `▲ Sobrante en Gaveta (+Q ${diferencia.toFixed(2)})` 
                        : `▼ Faltante en Gaveta (-Q ${Math.abs(diferencia).toFixed(2)})`}
                  </strong>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block' }}>Diferencia Neta:</span>
                  <span style={{ fontSize: '18px', fontWeight: 900, color: Math.abs(diferencia) < 0.01 ? '#10b981' : diferencia > 0 ? '#f59e0b' : '#ef4444' }}>
                    {diferencia >= 0 ? '+' : ''}Q {diferencia.toFixed(2)}
                  </span>
                </div>
              </div>
            )}

            <div className="form-group">
              <label style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--text-main)', marginBottom: '5px', display: 'block' }}>
                Observaciones del Cierre
              </label>
              <textarea
                rows="2"
                value={observaciones}
                onChange={(e) => setObservaciones(e.target.value)}
                placeholder="Ej. Turno entregado a cajero entrante sin incidencias..."
                className="form-control"
              />
            </div>
          </div>

          <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', padding: '12px 16px', borderTop: '1px solid var(--card-border)' }}>
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={loading}>
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading} style={{ background: '#b8860b', borderColor: '#b8860b' }}>
              {loading ? 'Cerrando caja...' : 'Confirmar Arqueo y Cerrar Turno'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};


export default CloseCashModal;

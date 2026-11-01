import React, { useState, useEffect } from 'react';
import { NohemyApi } from '../../api/nohemyApi';
import { IconAlertTriangle, IconCheck, IconTag } from '../../components/icons/Icons';

export const BatchDiscountModal = ({ isOpen, onClose, lote, onSuccess }) => {
  const [descuento, setDescuento] = useState('');
  const [motivo, setMotivo] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (isOpen && lote) {
      const currentDesc = parseFloat(lote.descuento_porcentaje) || 0;
      setDescuento(currentDesc > 0 ? String(currentDesc) : '');
      setMotivo(lote.motivo_descuento || (lote.estado_vencimiento === 'POR_VENCER' || lote.estado_vencimiento === 'ALERTA' ? 'Próximo a caducar' : ''));
      setErrorMsg('');
      setSubmitting(false);
    }
  }, [isOpen, lote]);

  if (!isOpen || !lote) return null;

  const precioBase = parseFloat(lote.precio_venta_regular) || 0;
  const costoUnitario = parseFloat(lote.costo_unitario) || 0;
  const pct = Math.max(0, Math.min(99, parseFloat(descuento) || 0));

  const factor = (100 - pct) / 100;
  const nuevoPrecio = Number((precioBase * factor).toFixed(2));
  const ahorroUnidad = Number((precioBase - nuevoPrecio).toFixed(2));
  const margenUnidad = Number((nuevoPrecio - costoUnitario).toFixed(2));
  const margenPorcentaje = nuevoPrecio > 0 ? Number(((margenUnidad / nuevoPrecio) * 100).toFixed(1)) : 0;
  const bajoCosto = nuevoPrecio < costoUnitario && pct > 0;

  const handleSubmit = async (e, forcedPct = null) => {
    if (e) e.preventDefault();
    const finalPct = forcedPct !== null ? forcedPct : pct;

    setSubmitting(true);
    setErrorMsg('');

    try {
      const res = await NohemyApi.aplicarDescuentoLote(lote.id_lote, {
        descuento_porcentaje: finalPct,
        motivo_descuento: motivo.trim()
      });
      onSuccess(res.lote || res);
      onClose();
    } catch (err) {
      setErrorMsg(err.message || 'Error al aplicar el descuento al lote.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemoveDiscount = () => {
    handleSubmit(null, 0);
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    const clean = String(dateStr).split('T')[0];
    const parts = clean.split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return clean;
  };

  const currentActiveDesc = parseFloat(lote.descuento_porcentaje) || 0;

  return (
    <div
      className="modal-backdrop"
      onClick={(e) => {
        if (e.target.className && e.target.className.includes('modal-backdrop')) {
          onClose();
        }
      }}
    >
      <div className="modal-container" style={{ maxWidth: '540px' }}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ display: 'flex', alignItems: 'center', color: 'var(--accent)' }}>
              <IconTag size={22} />
            </span>
            <div>
              <h3>Descuento Especial al Lote</h3>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                {lote.correlativo_lote} • Lote {lote.numero_lote}
              </span>
            </div>
          </div>
          <button className="btn-close" onClick={onClose} disabled={submitting}>
            ✕
          </button>
        </div>

        <form onSubmit={(e) => handleSubmit(e)}>
          <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {errorMsg && <div className="alert alert-danger">{errorMsg}</div>}

            <div
              style={{
                background: 'var(--input-bg)',
                border: '1px solid var(--card-border)',
                borderRadius: '10px',
                padding: '12px 14px',
                display: 'flex',
                flexDirection: 'column',
                gap: '6px'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <strong style={{ fontSize: '14px', color: 'var(--text-main)' }}>{lote.producto_nombre}</strong>
                <span style={{ fontSize: '11px', fontFamily: 'monospace', color: 'var(--text-muted)' }}>
                  {lote.producto_codigo}
                </span>
              </div>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                <span>
                  Existencia en lote: <strong style={{ color: 'var(--text-main)' }}>{lote.cantidad_actual} {lote.unidad_simbolo}</strong>
                </span>
                <span>
                  Vence: <strong style={{ color: lote.estado_vencimiento === 'VENCIDO' ? '#dc2626' : (lote.estado_vencimiento === 'POR_VENCER' ? '#ea580c' : 'var(--text-main)') }}>
                    {formatDate(lote.fecha_vencimiento)}
                  </strong>
                </span>
                {lote.dias_para_vencer !== null && lote.dias_para_vencer !== undefined && (
                  <span style={{ color: lote.dias_para_vencer <= 15 ? '#ea580c' : 'inherit', fontWeight: lote.dias_para_vencer <= 15 ? 700 : 400 }}>
                    {lote.dias_para_vencer <= 0 ? 'Vencido' : `Quedan ${lote.dias_para_vencer} días`}
                  </span>
                )}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div
                style={{
                  background: 'var(--input-bg)',
                  border: '1px solid var(--card-border)',
                  borderRadius: '8px',
                  padding: '10px 12px',
                  textAlign: 'center'
                }}
              >
                <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>
                  Precio Regular
                </span>
                <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-main)', marginTop: '2px' }}>
                  Q {precioBase.toFixed(2)}
                </div>
              </div>

              <div
                style={{
                  background: 'var(--input-bg)',
                  border: '1px solid var(--card-border)',
                  borderRadius: '8px',
                  padding: '10px 12px',
                  textAlign: 'center'
                }}
              >
                <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>
                  Costo de Compra
                </span>
                <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-main)', marginTop: '2px' }}>
                  Q {costoUnitario.toFixed(2)}
                </div>
              </div>
            </div>

            <div className="form-group">
              <label style={{ fontSize: '13px', fontWeight: 700, display: 'flex', justifyContent: 'space-between' }}>
                <span>Porcentaje de Descuento para este Lote</span>
                <span style={{ color: 'var(--accent)', fontWeight: 800 }}>{pct}%</span>
              </label>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px' }}>
                <input
                  type="number"
                  min="0"
                  max="99"
                  step="1"
                  required
                  value={descuento}
                  onChange={(e) => setDescuento(e.target.value)}
                  placeholder="0"
                  style={{
                    flex: 1,
                    fontSize: '18px',
                    fontWeight: 800,
                    padding: '8px 12px',
                    textAlign: 'center'
                  }}
                  autoFocus
                />
                <span style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text-muted)' }}>%</span>
              </div>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '8px' }}>
                {[10, 15, 20, 25, 30, 50].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    className="btn btn-secondary"
                    style={{
                      flex: 1,
                      minWidth: '55px',
                      fontSize: '12px',
                      padding: '4px 8px',
                      fontWeight: 700,
                      background: pct === preset ? 'var(--accent)' : 'var(--input-bg)',
                      color: pct === preset ? '#ffffff' : 'var(--text-main)',
                      borderColor: pct === preset ? 'var(--accent)' : 'var(--card-border)'
                    }}
                    onClick={() => setDescuento(String(preset))}
                  >
                    {preset}%
                  </button>
                ))}
              </div>
            </div>

            <div className="form-group">
              <label style={{ fontSize: '12.5px', fontWeight: 600 }}>
                Motivo o Justificación del Descuento
              </label>
              <input
                type="text"
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                placeholder="Por ejemplo: Próximo a vencer o Liquidación"
                maxLength={255}
                style={{ marginTop: '4px' }}
              />
            </div>

            <div
              style={{
                background: 'linear-gradient(135deg, rgba(184, 134, 11, 0.12), rgba(184, 134, 11, 0.04))',
                border: '1.5px solid var(--accent)',
                borderRadius: '10px',
                padding: '14px 16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>
                  Nuevo Precio de Venta
                </span>
                <span style={{ fontSize: '11px', background: 'var(--accent)', color: '#ffffff', padding: '2px 8px', borderRadius: '12px', fontWeight: 700 }}>
                  {pct > 0 ? `-${pct}% Aplicado` : 'Sin Descuento'}
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <div style={{ fontSize: '26px', fontWeight: 900, color: 'var(--accent)' }}>
                  Q {nuevoPrecio.toFixed(2)}
                </div>
                {pct > 0 && (
                  <div style={{ fontSize: '12.5px', color: '#16a34a', fontWeight: 700 }}>
                    Ahorro al cliente: Q {ahorroUnidad.toFixed(2)} por unidad
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--text-muted)', borderTop: '1px dashed var(--card-border)', paddingTop: '6px' }}>
                <span>Margen estimado: Q {margenUnidad.toFixed(2)}</span>
                <span>Rentabilidad: {margenPorcentaje}%</span>
              </div>
            </div>

            {bajoCosto && (
              <div
                style={{
                  background: '#fef2f2',
                  border: '1px solid #fecaca',
                  borderRadius: '8px',
                  padding: '10px 12px',
                  fontSize: '11.5px',
                  color: '#991b1b',
                  lineHeight: '1.4',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '8px'
                }}
              >
                <span style={{ display: 'inline-flex', alignItems: 'center', color: '#991b1b', flexShrink: 0, marginTop: '2px' }}>
                  <IconAlertTriangle size={15} />
                </span>
                <div>
                  <strong>Atención:</strong> El nuevo precio de venta de Q {nuevoPrecio.toFixed(2)} es menor al costo de adquisición de Q {costoUnitario.toFixed(2)}. Esta venta generará una recuperación de costo parcial para minimizar la pérdida por caducidad.
                </div>
              </div>
            )}
          </div>

          <div className="modal-footer" style={{ display: 'flex', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button type="button" className="btn btn-secondary" onClick={onClose} disabled={submitting}>
                Cancelar
              </button>
              {currentActiveDesc > 0 && (
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ color: '#ef4444', borderColor: '#fca5a5' }}
                  onClick={handleRemoveDiscount}
                  disabled={submitting}
                >
                  Quitar Descuento
                </button>
              )}
            </div>

            <button type="submit" className="btn btn-primary" disabled={submitting} style={{ fontWeight: 800 }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                <IconCheck size={16} />
                <span>{submitting ? 'Guardando...' : (pct > 0 ? 'Aplicar Descuento' : 'Guardar')}</span>
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default BatchDiscountModal;

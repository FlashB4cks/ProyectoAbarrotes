import React, { useState, useEffect } from 'react';
import { NohemyApi } from '../../api/nohemyApi';
import { playScannerBeep } from '../../utils/audio';
import { IconAlertTriangle } from '../../components/icons/Icons';

/* ── MODAL: REGISTRAR MERMA / BAJA DE INVENTARIO ── */
export const RegisterMermaModal = ({ isOpen, onClose, lote, onSuccess }) => {
  const [cantidad, setCantidad] = useState(1);
  const [tipo, setTipo] = useState('VENCIMIENTO');
  const [motivo, setMotivo] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isOpen && lote) {
      setCantidad(1);
      setTipo(lote.estado_vencimiento === 'VENCIDO' ? 'VENCIMIENTO' : 'ROTURA');
      setMotivo('');
      setError(null);
    }
  }, [isOpen, lote]);

  if (!isOpen || !lote) return null;

  const maxStock = lote.cantidad_actual || 0;
  const costoUnit = parseFloat(lote.costo_unitario) || 0;
  const numCantidad = parseInt(cantidad, 10) || 0;
  const perdidaEstimada = numCantidad * costoUnit;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (numCantidad <= 0) {
      setError('La cantidad a retirar debe ser mayor a 0.');
      return;
    }
    if (numCantidad > maxStock) {
      setError(`La cantidad no puede superar las existencias del lote (${maxStock} uds).`);
      return;
    }
    if (!motivo.trim()) {
      setError('Debe especificar un motivo o justificación clara.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await NohemyApi.registrarMermaLote(lote.id_lote, {
        cantidad: numCantidad,
        tipo,
        motivo: motivo.trim()
      });
      playScannerBeep(true);
      onSuccess?.();
      onClose();
    } catch (err) {
      playScannerBeep(false);
      setError(err.message || 'Error al procesar la baja de inventario.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-container" style={{ maxWidth: '480px' }}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ color: '#dc2626', display: 'flex', alignItems: 'center' }}>
              <IconAlertTriangle size={20} />
            </span>
            <h3 style={{ margin: 0, fontSize: '17px', color: 'var(--text-main)' }}>
              Registrar Merma / Baja de Inventario
            </h3>
          </div>
          <button type="button" className="btn-close" onClick={onClose}>✕</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body" style={{ padding: '16px 20px' }}>
            {error && (
              <div className="alert alert-danger" style={{ marginBottom: '14px', fontSize: '13px' }}>
                {error}
              </div>
            )}

            <div className="merma-modal-summary">
              <div style={{ fontSize: '13.5px', fontWeight: '700', color: 'var(--text-main)', marginBottom: '4px' }}>
                {lote.producto_nombre}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--text-muted)' }}>
                <span>Lote: <strong>{lote.numero_lote}</strong> ({lote.correlativo_lote})</span>
                <span>Disp: <strong style={{ color: 'var(--accent)' }}>{maxStock} {lote.unidad_simbolo}</strong></span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                <span>Costo Unit: Q {costoUnit.toFixed(2)}</span>
                <span>Vence: <strong>{lote.fecha_vencimiento}</strong></span>
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: '14px' }}>
              <label className="form-label" style={{ fontSize: '12.5px', fontWeight: '600' }}>
                Tipo de Ajuste o Merma:
              </label>
              <select
                className="form-control"
                value={tipo}
                onChange={(e) => setTipo(e.target.value)}
                style={{ fontSize: '13px' }}
              >
                <option value="VENCIMIENTO">Merma por Vencimiento / Caducidad</option>
                <option value="ROTURA">Merma por Daño Físico / Rotura / Deterioro</option>
                <option value="AJUSTE_FISICO">Ajuste de Conteo Físico / Faltante</option>
              </select>
            </div>

            <div className="form-group" style={{ marginBottom: '14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <label className="form-label" style={{ fontSize: '12.5px', fontWeight: '600', margin: 0 }}>
                  Cantidad a Retirar ({lote.unidad_simbolo}):
                </label>
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ padding: '2px 8px', fontSize: '11px', borderRadius: '4px' }}
                  onClick={() => setCantidad(maxStock)}
                >
                  Todo el lote ({maxStock})
                </button>
              </div>
              <input
                type="number"
                min="1"
                max={maxStock}
                className="form-control"
                value={cantidad}
                onChange={(e) => setCantidad(e.target.value)}
                required
                style={{ fontSize: '15px', fontWeight: '700' }}
              />
            </div>

            <div style={{
              background: 'rgba(239, 68, 68, 0.08)',
              border: '1px solid rgba(239, 68, 68, 0.25)',
              borderRadius: '8px',
              padding: '10px 14px',
              marginBottom: '14px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <span style={{ fontSize: '12px', fontWeight: '600', color: '#b91c1c' }}>
                Pérdida Monetaria Registrada:
              </span>
              <span style={{ fontSize: '15px', fontWeight: '800', color: '#b91c1c' }}>
                Q {perdidaEstimada.toFixed(2)}
              </span>
            </div>

            <div className="form-group" style={{ marginBottom: '0' }}>
              <label className="form-label" style={{ fontSize: '12.5px', fontWeight: '600' }}>
                Motivo / Justificación de la Baja:
              </label>
              <textarea
                className="form-control"
                rows="3"
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                placeholder="Ej. Producto superó fecha de caducidad en estantería..."
                required
                style={{ fontSize: '13px', resize: 'vertical' }}
              ></textarea>
            </div>
          </div>

          <div className="modal-footer" style={{ padding: '12px 20px', display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={loading}>
              Cancelar
            </button>
            <button
              type="submit"
              className="btn btn-danger"
              disabled={loading || numCantidad <= 0 || numCantidad > maxStock}
              style={{ background: '#dc2626', borderColor: '#dc2626', color: '#fff' }}
            >
              {loading ? 'Procesando...' : 'Confirmar Baja'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};


export default RegisterMermaModal;

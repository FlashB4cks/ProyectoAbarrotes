import React, { useState, useEffect } from 'react';
import { NohemyApi } from '../../api/nohemyApi';
import { IconCash } from '../../components/icons/Icons';

/* ── MODAL: ENTRADA / SALIDA DE EFECTIVO (GASTO MENOR) ── */
export const CashMovementModal = ({ isOpen, onClose, onSuccess, initialType = 'INGRESO' }) => {
  const [tipo, setTipo] = useState(initialType);
  const [monto, setMonto] = useState('');
  const [concepto, setConcepto] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setTipo(initialType);
      setMonto('');
      setConcepto('');
      setError('');
    }
  }, [isOpen, initialType]);

  if (!isOpen) return null;

  const presetsIngreso = [
    'Inyección de monedas / cambio adicional',
    'Depósito extraordinario a gaveta',
    'Devolución de flete o cambio',
  ];

  const presetsEgreso = [
    'Pago de garrafón de agua pura',
    'Compra de bolsas plásticas para empaque',
    'Pago de flete / repartidor local',
    'Compra de insumos de limpieza',
    'Retiro parcial de seguridad',
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    const val = parseFloat(monto);
    if (isNaN(val) || val <= 0) {
      setError('Ingrese un monto válido mayor a Q0.00.');
      return;
    }
    if (!concepto.trim()) {
      setError('Debe especificar el concepto o motivo del movimiento.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await NohemyApi.registrarMovimientoCaja({
        tipo,
        monto: val,
        concepto: concepto.trim(),
      });
      if (onSuccess) onSuccess(res.message);
      onClose();
    } catch (err) {
      setError(err.message || 'Error al registrar movimiento.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={(e) => { if (e.target.className.includes('modal-backdrop')) onClose(); }}>
      <div className="modal-container" style={{ maxWidth: '500px' }}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ color: tipo === 'INGRESO' ? '#10b981' : '#ef4444', display: 'flex' }}>
              <IconCash size={22} />
            </span>
            <div>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700 }}>
                {tipo === 'INGRESO' ? 'Entrada Manual de Efectivo' : 'Salida de Efectivo / Gasto Menor'}
              </h3>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Flujo de caja menor en gaveta</span>
            </div>
          </div>
          <button className="btn-close" onClick={onClose}>✕</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {error && <div className="alert-message alert-danger">{error}</div>}

            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                type="button"
                className={`btn ${tipo === 'INGRESO' ? 'btn-primary' : 'btn-secondary'}`}
                style={{ flex: 1, padding: '8px', fontSize: '12.5px', fontWeight: 700, borderColor: tipo === 'INGRESO' ? '#10b981' : 'var(--card-border)', background: tipo === 'INGRESO' ? '#10b981' : 'transparent', color: tipo === 'INGRESO' ? '#fff' : 'var(--text-main)' }}
                onClick={() => setTipo('INGRESO')}
              >
                + Entrada de Efectivo
              </button>
              <button
                type="button"
                className={`btn ${tipo === 'EGRESO' ? 'btn-danger-solid' : 'btn-secondary'}`}
                style={{ flex: 1, padding: '8px', fontSize: '12.5px', fontWeight: 700, borderColor: tipo === 'EGRESO' ? '#ef4444' : 'var(--card-border)', background: tipo === 'EGRESO' ? '#ef4444' : 'transparent', color: tipo === 'EGRESO' ? '#fff' : 'var(--text-main)' }}
                onClick={() => setTipo('EGRESO')}
              >
                - Salida / Gasto Menor
              </button>
            </div>

            <div className="form-group">
              <label style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--text-main)', marginBottom: '6px', display: 'block' }}>
                Monto del Movimiento (GTQ) <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', fontWeight: 700, color: tipo === 'INGRESO' ? '#10b981' : '#ef4444', fontSize: '16px' }}>Q</span>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  value={monto}
                  onChange={(e) => setMonto(e.target.value)}
                  style={{ paddingLeft: '32px', fontSize: '18px', fontWeight: 800 }}
                  className="form-control"
                  placeholder="0.00"
                  autoFocus
                />
              </div>
            </div>

            <div className="form-group">
              <label style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--text-main)', marginBottom: '6px', display: 'block' }}>
                Concepto o Motivo <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <input
                type="text"
                required
                value={concepto}
                onChange={(e) => setConcepto(e.target.value)}
                placeholder="Ej. Pago de garrafón de agua / Compra de bolsas"
                className="form-control"
              />
            </div>

            <div>
              <span style={{ fontSize: '11.5px', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>
                Motivos sugeridos frecuentes:
              </span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {(tipo === 'INGRESO' ? presetsIngreso : presetsEgreso).map(p => (
                  <button
                    key={p}
                    type="button"
                    style={{ textAlign: 'left', padding: '6px 10px', fontSize: '11.5px', borderRadius: '6px', border: '1px solid var(--card-border)', background: 'var(--input-bg)', color: 'var(--text-main)', cursor: 'pointer' }}
                    onClick={() => setConcepto(p)}
                  >
                    • {p}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', padding: '12px 16px', borderTop: '1px solid var(--card-border)' }}>
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={loading}>
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading} style={{ background: tipo === 'INGRESO' ? '#10b981' : '#ef4444', borderColor: tipo === 'INGRESO' ? '#10b981' : '#ef4444' }}>
              {loading ? 'Registrando...' : `Confirmar ${tipo === 'INGRESO' ? 'Entrada' : 'Salida'}`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};


export default CashMovementModal;

import React, { useState } from 'react';
import { NohemyApi } from '../../api/nohemyApi';
import { IconCashRegister, IconCheck } from '../../components/icons/Icons';

/* ── MODAL: APERTURA DE CAJA (INICIO DE TURNO) ── */
export const OpenCashModal = ({ isOpen, onClose, onSuccess }) => {
  const [montoInicial, setMontoInicial] = useState('150.00');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const quickAmounts = ['50.00', '100.00', '150.00', '200.00', '300.00'];

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    const val = parseFloat(montoInicial);
    if (isNaN(val) || val < 0) {
      setError('Ingrese un fondo inicial válido (mayor o igual a Q0.00).');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await NohemyApi.abrirCaja({ monto_inicial: val });
      if (onSuccess) onSuccess(res.sesion);
      onClose();
    } catch (err) {
      setError(err.message || 'Error al abrir la caja.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={(e) => { if (e.target.className.includes('modal-backdrop')) onClose(); }}>
      <div className="modal-container" style={{ maxWidth: '480px' }}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ color: 'var(--accent)', display: 'flex' }}><IconCashRegister size={22} /></span>
            <div>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700 }}>Apertura de Caja / Iniciar Turno</h3>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Fondo base en efectivo para cambio y vuelto</span>
            </div>
          </div>
          <button className="btn-close" onClick={onClose}>✕</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {error && <div className="alert-message alert-danger">{error}</div>}

            <div className="form-group">
              <label style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--text-main)', marginBottom: '6px', display: 'block' }}>
                Fondo Inicial en Gaveta (GTQ) <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', fontWeight: 700, color: 'var(--accent)', fontSize: '16px' }}>Q</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  value={montoInicial}
                  onChange={(e) => setMontoInicial(e.target.value)}
                  style={{ paddingLeft: '32px', fontSize: '18px', fontWeight: 800 }}
                  className="form-control"
                  placeholder="0.00"
                  autoFocus
                />
              </div>
            </div>

            <div>
              <span style={{ fontSize: '11.5px', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>
                Sugerencias rápidas de base inicial:
              </span>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {quickAmounts.map(amt => (
                  <button
                    key={amt}
                    type="button"
                    className="btn btn-secondary"
                    style={{ fontSize: '11.5px', padding: '4px 10px', borderColor: montoInicial === amt ? 'var(--accent)' : 'var(--card-border)', background: montoInicial === amt ? 'rgba(184, 134, 11, 0.15)' : 'transparent' }}
                    onClick={() => setMontoInicial(amt)}
                  >
                    Q {amt}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ background: 'var(--input-bg)', padding: '12px', borderRadius: '8px', border: '1px solid var(--card-border)', fontSize: '12px', color: 'var(--text-muted)', lineHeight: '1.4' }}>
              ℹ️ Al abrir la caja se iniciará un nuevo turno de ventas. Todos los cobros en efectivo y movimientos quedarán vinculados a este turno para el cuadre final.
            </div>
          </div>

          <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', padding: '12px 16px', borderTop: '1px solid var(--card-border)' }}>
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={loading}>
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              <IconCheck size={15} />
              <span>{loading ? 'Iniciando...' : 'Abrir Caja'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};


export default OpenCashModal;

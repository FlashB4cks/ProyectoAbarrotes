import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import NohemyApi from '../../api/nohemyApi';

/* ── MODAL: CAMBIO DE CONTRASEÑA ── */
export const ChangePasswordModal = ({ isOpen, user, onSuccess }) => {
  const { logout } = useAuth();
  const [passwordActual, setPasswordActual] = useState('');
  const [nuevaPassword, setNuevaPassword] = useState('');
  const [confirmarPassword, setConfirmarPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const hasMinLength = nuevaPassword.length >= 8;
  const hasUpperLower = /[A-Z]/.test(nuevaPassword) && /[a-z]/.test(nuevaPassword);
  const hasDigit = /\d/.test(nuevaPassword);
  const isNotOnlyDigits = !/^\d+$/.test(nuevaPassword);
  
  const firstNameClean = (user?.first_name || '').toLowerCase().trim();
  const lastNameClean = (user?.last_name || '').toLowerCase().trim();
  const usernameClean = (user?.username || '').toLowerCase().trim();
  const newLower = nuevaPassword.toLowerCase();

  const isNotSimilarToName = 
    (!usernameClean || !newLower.includes(usernameClean)) &&
    (!firstNameClean || firstNameClean.length < 3 || !newLower.includes(firstNameClean)) &&
    (!lastNameClean || lastNameClean.length < 3 || !newLower.includes(lastNameClean));

  const passwordsMatch = nuevaPassword.length > 0 && nuevaPassword === confirmarPassword;
  const isFormValid = hasMinLength && hasUpperLower && hasDigit && isNotOnlyDigits && isNotSimilarToName && passwordsMatch && passwordActual.length > 0;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isFormValid) return;
    setError('');
    setLoading(true);
    try {
      await NohemyApi.cambiarPassword(passwordActual, nuevaPassword, confirmarPassword);
      onSuccess();
    } catch (err) {
      setError(err.message || 'Error al cambiar contraseña.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-backdrop" style={{ zIndex: 100000 }}>
      <div className="modal-container" style={{ maxWidth: '600px', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
        <div className="modal-header" style={{ padding: '16px 24px' }}>
          <div>
            <h3 style={{ color: 'var(--accent)', fontSize: '18px', margin: 0 }}>Cambio de Contraseña Obligatorio</h3>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Primer inicio de sesión detectado en NohemySys</span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="modal-body" style={{ padding: '20px 24px', overflowY: 'auto' }}>
          <div className="info-banner" style={{ background: 'rgba(239, 68, 68, 0.1)', borderColor: 'rgba(239, 68, 68, 0.3)', padding: '10px 14px', marginBottom: '14px' }}>
            <strong style={{ color: 'var(--danger)', fontSize: '12.5px' }}>Seguridad de la Cuenta:</strong>
            <span style={{ color: 'var(--text-muted)', fontSize: '12px', marginLeft: '6px' }}>Debes cambiar tu contraseña temporal asignada antes de acceder al sistema.</span>
          </div>

          {error && <div className="alert alert-danger" style={{ marginBottom: '12px', background: 'rgba(239, 68, 68, 0.2)', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--danger)', color: '#fca5a5', fontSize: '12.5px' }}>{error}</div>}

          <div className="form-group" style={{ marginBottom: '12px' }}>
            <label style={{ fontSize: '12px' }}>Contraseña Temporal Actual <span className="req">*</span></label>
            <input 
              type="password"
              value={passwordActual}
              onChange={(e) => setPasswordActual(e.target.value)}
              placeholder="Ingresa la contraseña actual"
              style={{ padding: '9px 12px', fontSize: '13px' }}
              required
            />
          </div>

          <div className="form-grid" style={{ gap: '12px', marginBottom: '14px' }}>
            <div className="form-group">
              <label style={{ fontSize: '12px' }}>Nueva Contraseña <span className="req">*</span></label>
              <input 
                type="password"
                value={nuevaPassword}
                onChange={(e) => setNuevaPassword(e.target.value)}
                placeholder="Crea tu nueva contraseña"
                style={{ padding: '9px 12px', fontSize: '13px' }}
                required
              />
            </div>

            <div className="form-group">
              <label style={{ fontSize: '12px' }}>Confirmar Contraseña <span className="req">*</span></label>
              <input 
                type="password"
                value={confirmarPassword}
                onChange={(e) => setConfirmarPassword(e.target.value)}
                placeholder="Repite la contraseña"
                style={{ padding: '9px 12px', fontSize: '13px' }}
                required
              />
            </div>
          </div>

          <div className="password-rules-box" style={{ background: 'var(--input-bg)', padding: '12px 16px', borderRadius: '10px', border: '1px solid var(--card-border)', marginBottom: '14px' }}>
            <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: '8px', textTransform: 'uppercase' }}>Requisitos de Seguridad:</span>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '6px 12px', fontSize: '11.5px' }}>
              <li style={{ color: hasMinLength ? 'var(--success)' : 'var(--text-dim)' }}><span>{hasMinLength ? '✓' : '○'}</span> Mínimo 8 caracteres</li>
              <li style={{ color: hasUpperLower ? 'var(--success)' : 'var(--text-dim)' }}><span>{hasUpperLower ? '✓' : '○'}</span> Mayúsculas y minúsculas</li>
              <li style={{ color: hasDigit ? 'var(--success)' : 'var(--text-dim)' }}><span>{hasDigit ? '✓' : '○'}</span> Al menos un número</li>
              <li style={{ color: isNotOnlyDigits ? 'var(--success)' : 'var(--text-dim)' }}><span>{isNotOnlyDigits ? '✓' : '○'}</span> No ser solo números</li>
              <li style={{ color: isNotSimilarToName ? 'var(--success)' : 'var(--text-dim)', gridColumn: 'span 2' }}><span>{isNotSimilarToName ? '✓' : '○'}</span> Sin coincidencia con tu nombre</li>
              <li style={{ color: passwordsMatch ? 'var(--success)' : 'var(--text-dim)', gridColumn: 'span 2' }}><span>{passwordsMatch ? '✓' : '○'}</span> Las contraseñas coinciden</li>
            </ul>
          </div>

          <div className="modal-footer" style={{ borderTop: '1px solid var(--card-border)', paddingTop: '14px' }}>
            <button type="button" className="btn btn-secondary" onClick={logout} style={{ padding: '8px 16px', fontSize: '13px' }}>Cancelar y Salir</button>
            <button type="submit" className="btn btn-primary" disabled={!isFormValid || loading} style={{ padding: '8px 18px', fontSize: '13px' }}>{loading ? 'Actualizando...' : 'Establecer Contraseña'}</button>
          </div>
        </form>
      </div>
    </div>
  );
};


export default ChangePasswordModal;

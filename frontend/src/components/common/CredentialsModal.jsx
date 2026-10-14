import React, { useState } from 'react';

/* ── MODAL: EMPLEADO CREADO ── */
export const CredentialsModal = ({ isOpen, onClose, credentials }) => {
  const [copied, setCopied] = useState(false);
  if (!isOpen || !credentials) return null;

  const handleCopy = () => {
    const text = `Credenciales NohemySys:\nEmpleado: ${credentials.nombre}\nUsuario: ${credentials.username}\nContraseña Temporal: ${credentials.contrasena}\nRol: ${credentials.rol}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  return (
    <div className="modal-backdrop" onClick={(e) => { if (e.target.className.includes('modal-backdrop')) onClose(); }}>
      <div className="modal-container">
        <div className="modal-header">
          <h3>Empleado Creado Exitosamente</h3>
          <button className="btn-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          <p style={{ color: 'var(--text-muted)', fontSize: '13.5px', marginBottom: '16px' }}>Entregue estas credenciales de acceso al nuevo empleado:</p>
          <div className="credentials-box">
            <div className="credential-row"><span className="cred-label">Empleado:</span><span className="cred-value">{credentials.nombre}</span></div>
            <div className="credential-row"><span className="cred-label">Usuario:</span><code className="cred-value code-highlight">@{credentials.username}</code></div>
            <div className="credential-row"><span className="cred-label">Contraseña Temporal:</span><code className="cred-value password-highlight">{credentials.contrasena}</code></div>
            <div className="credential-row"><span className="cred-label">Puesto:</span><span className="cred-value role-badge">{credentials.rol}</span></div>
          </div>
          <div className="credentials-actions">
            <button className="btn btn-secondary" onClick={handleCopy}>{copied ? '¡Copiado!' : 'Copiar Credenciales'}</button>
            <button className="btn btn-primary" onClick={onClose}>Entendido</button>
          </div>
        </div>
      </div>
    </div>
  );
};


export default CredentialsModal;

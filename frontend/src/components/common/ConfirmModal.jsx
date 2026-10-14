import React from 'react';

/* ── MODAL: CONFIRMACIÓN GENÉRICO ── */
export const ConfirmModal = ({ isOpen, onClose, onConfirm, title, message, isDanger = false, confirmText = 'Confirmar' }) => {
  if (!isOpen) return null;

  return (
    <div className="modal-backdrop" onClick={(e) => { if (e.target.className.includes('modal-backdrop')) onClose(); }}>
      <div className="modal-container">
        <div className="modal-header">
          <h3>{title}</h3>
          <button className="btn-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          <p className="confirm-message">{message}</p>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancelar</button>
          <button className={`btn ${isDanger ? 'btn-danger-solid' : 'btn-primary'}`} onClick={onConfirm}>
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};


export default ConfirmModal;

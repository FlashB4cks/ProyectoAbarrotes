import React from 'react';
import { IconReceipt, IconUser } from '../../components/icons/Icons';

export const ClientTypePromptModal = ({ isOpen, onClose, onSelectCF, onSelectNIT }) => {
  if (!isOpen) return null;

  return (
    <div
      className="modal-backdrop"
      onClick={(e) => {
        if (e.target.className && e.target.className.includes('modal-backdrop')) {
          onClose();
        }
      }}
    >
      <div className="modal-container" style={{ maxWidth: '500px' }}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ display: 'flex', alignItems: 'center', color: 'var(--accent)' }}>
              <IconReceipt size={22} />
            </span>
            <div>
              <h3>Tipo de Facturación</h3>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                Primer producto agregado a la orden
              </span>
            </div>
          </div>
          <button className="btn-close" onClick={onClose} title="Cerrar y continuar como Consumidor Final">
            ✕
          </button>
        </div>

        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <p style={{ margin: 0, fontSize: '13.5px', color: 'var(--text-main)', lineHeight: 1.5 }}>
            Indique cómo desea registrar el comprobante para esta venta:
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <button
              type="button"
              onClick={onSelectCF}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '14px',
                padding: '16px 18px',
                borderRadius: '12px',
                border: '2px solid var(--card-border)',
                background: 'var(--input-bg)',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'var(--accent)';
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 6px 16px rgba(0,0,0,0.12)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'var(--card-border)';
                e.currentTarget.style.transform = 'none';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              <div
                style={{
                  width: '46px',
                  height: '46px',
                  borderRadius: '10px',
                  background: 'rgba(59, 130, 246, 0.12)',
                  color: '#3b82f6',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <IconUser size={24} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2px' }}>
                  <strong style={{ fontSize: '15px', color: 'var(--text-main)' }}>Consumidor Final</strong>
                  <span
                    style={{
                      fontSize: '11px',
                      background: 'rgba(59, 130, 246, 0.15)',
                      color: '#3b82f6',
                      padding: '2px 8px',
                      borderRadius: '12px',
                      fontWeight: 700,
                    }}
                  >
                    CF Directo
                  </span>
                </div>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: '1.4' }}>
                  Emisión rápida sin requerir NIT. Venta de mostrador directa.
                </span>
              </div>
            </button>

            <button
              type="button"
              onClick={onSelectNIT}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '14px',
                padding: '16px 18px',
                borderRadius: '12px',
                border: '2px solid var(--card-border)',
                background: 'var(--input-bg)',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'var(--accent)';
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 6px 16px rgba(0,0,0,0.12)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'var(--card-border)';
                e.currentTarget.style.transform = 'none';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              <div
                style={{
                  width: '46px',
                  height: '46px',
                  borderRadius: '10px',
                  background: 'rgba(184, 134, 11, 0.15)',
                  color: 'var(--accent)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <IconReceipt size={24} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2px' }}>
                  <strong style={{ fontSize: '15px', color: 'var(--text-main)' }}>Factura con NIT</strong>
                  <span
                    style={{
                      fontSize: '11px',
                      background: 'rgba(184, 134, 11, 0.18)',
                      color: 'var(--accent)',
                      padding: '2px 8px',
                      borderRadius: '12px',
                      fontWeight: 700,
                    }}
                  >
                    Cliente con NIT
                  </span>
                </div>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: '1.4' }}>
                  Buscar cliente por NIT o nombre, o registrar un cliente nuevo.
                </span>
              </div>
            </button>
          </div>

          <div
            style={{
              padding: '10px 12px',
              borderRadius: '8px',
              background: 'rgba(100, 116, 139, 0.08)',
              border: '1px dashed var(--card-border)',
              fontSize: '11.5px',
              color: 'var(--text-muted)',
              lineHeight: '1.4',
            }}
          >
            Si el cliente cambia de opinión más tarde, puedes cambiar los datos en cualquier momento usando el botón Cambiar en el mostrador o al momento de cobrar.
          </div>
        </div>

        <div className="modal-footer" style={{ display: 'flex', justifyContent: 'space-between' }}>
          <button type="button" className="btn btn-secondary" onClick={onClose} style={{ fontSize: '12px' }}>
            Continuar como Consumidor Final
          </button>
          <button type="button" className="btn btn-primary" onClick={onSelectNIT} style={{ fontSize: '12px', fontWeight: 700 }}>
            Ingresar NIT
          </button>
        </div>
      </div>
    </div>
  );
};

export default ClientTypePromptModal;

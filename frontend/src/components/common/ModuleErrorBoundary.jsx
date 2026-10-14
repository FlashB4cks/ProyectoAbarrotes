import React from 'react';

/* ── ERROR BOUNDARY PARA MÓDULOS INDEPENDIENTES ── */
export class ModuleErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, errorInfo) {
    console.error(`Error en módulo ${this.props.name || ''}:`, error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '48px 24px', textAlign: 'center' }}>
          <div style={{ color: '#ef4444', fontSize: '18px', fontWeight: 800, marginBottom: '8px' }}>
            No se pudo cargar {this.props.name || 'el módulo'}
          </div>
          <p style={{ color: 'var(--text-muted)', fontSize: '13px', maxWidth: '520px', margin: '0 auto 16px', lineHeight: '1.5' }}>
            {this.state.error?.message || 'Error inesperado durante la inicialización.'}
          </p>
          <button 
            type="button"
            onClick={() => this.setState({ hasError: false, error: null })}
            className="btn-outline"
            style={{ padding: '8px 20px', fontSize: '13px' }}
          >
            Reintentar Acceso
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ModuleErrorBoundary;

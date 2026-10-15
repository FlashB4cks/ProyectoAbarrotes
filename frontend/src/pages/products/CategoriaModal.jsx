import React, { useState, useEffect } from 'react';

/* ── MODAL: CREACIÓN / EDICIÓN DE CATEGORÍA ── */
export const CategoriaModal = ({ isOpen, onClose, onSave, editingCategoria }) => {
  const [formData, setFormData] = useState({ nombre: '', descripcion: '' });
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (editingCategoria) {
      setFormData({
        nombre: editingCategoria.nombre || '',
        descripcion: editingCategoria.descripcion || '',
      });
    } else {
      setFormData({ nombre: '', descripcion: '' });
    }
    setErrors({});
  }, [editingCategoria, isOpen]);

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: null }));
  };

  const validate = () => {
    const errs = {};
    if (!formData.nombre.trim()) errs.nombre = 'El nombre de la categoría es obligatorio.';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;
    onSave({
      nombre: formData.nombre.trim(),
      descripcion: formData.descripcion.trim(),
    });
  };

  return (
    <div className="modal-backdrop" onClick={(e) => { if (e.target.className.includes('modal-backdrop')) onClose(); }}>
      <div className="modal-container">
        <div className="modal-header">
          <h3>{editingCategoria ? 'Editar Categoría' : 'Registrar Nueva Categoría'}</h3>
          <button className="btn-close" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmit} className="modal-body">
          <div className="form-group" style={{ marginBottom: '14px' }}>
            <label>Nombre de la Categoría <span className="req">*</span></label>
            <input 
              type="text" 
              name="nombre" 
              value={formData.nombre} 
              onChange={handleChange} 
              placeholder="Ej. Bebidas, Granos Básicos, Lácteos, Limpieza..."
              className={errors.nombre ? 'input-error' : ''}
              autoFocus
            />
            {errors.nombre && <span className="error-text">{errors.nombre}</span>}
          </div>
          <div className="form-group" style={{ marginBottom: '14px' }}>
            <label>Descripción / Observaciones</label>
            <textarea 
              name="descripcion" 
              rows="3" 
              value={formData.descripcion} 
              onChange={handleChange} 
              placeholder="Descripción del tipo de productos en esta categoría..."
              style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--input-border)', background: 'var(--input-bg)', color: 'var(--text-main)', fontSize: '13.5px', resize: 'vertical' }}
            />
          </div>
          <div className="modal-footer" style={{ marginTop: '20px' }}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn btn-primary">{editingCategoria ? 'Guardar Cambios' : 'Registrar Categoría'}</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CategoriaModal;

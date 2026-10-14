import React, { useState, useEffect } from 'react';

/* ── MODAL: CREACIÓN / EDICIÓN DE ROLES ── */
export const RolModal = ({ isOpen, onClose, onSave, editingRol }) => {
  const [formData, setFormData] = useState({
    codigo: '',
    nombre: '',
    descripcion: '',
    permisos: ''
  });
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (editingRol) {
      setFormData({
        codigo: editingRol.codigo || '',
        nombre: editingRol.nombre || '',
        descripcion: editingRol.descripcion || '',
        permisos: editingRol.permisos || ''
      });
    } else {
      setFormData({ codigo: '', nombre: '', descripcion: '', permisos: '' });
    }
    setErrors({});
  }, [editingRol, isOpen]);

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: null }));
  };

  const validate = () => {
    const errs = {};
    if (!formData.codigo.trim()) errs.codigo = 'El código del rol es obligatorio.';
    if (!formData.nombre.trim()) errs.nombre = 'El nombre del rol es obligatorio.';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;
    onSave({
      codigo: formData.codigo.trim().toUpperCase(),
      nombre: formData.nombre.trim(),
      descripcion: formData.descripcion.trim(),
      permisos: formData.permisos.trim()
    });
  };

  return (
    <div className="modal-backdrop" onClick={(e) => { if (e.target.className.includes('modal-backdrop')) onClose(); }}>
      <div className="modal-container">
        <div className="modal-header">
          <h3>{editingRol ? 'Editar Rol del Sistema' : 'Crear Nuevo Rol'}</h3>
          <button className="btn-close" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmit} className="modal-body">
          <div className="form-group" style={{ marginBottom: '14px' }}>
            <label>Código Identificador <span className="req">*</span></label>
            <input 
              type="text" 
              name="codigo" 
              value={formData.codigo} 
              onChange={handleChange} 
              placeholder="Ej. SUPERVISOR, CAJERO..."
              disabled={Boolean(editingRol)}
              className={errors.codigo ? 'input-error' : ''}
              style={{ textTransform: 'uppercase' }}
            />
            {errors.codigo && <span className="error-text">{errors.codigo}</span>}
          </div>
          <div className="form-group" style={{ marginBottom: '14px' }}>
            <label>Nombre del Rol <span className="req">*</span></label>
            <input 
              type="text" 
              name="nombre" 
              value={formData.nombre} 
              onChange={handleChange} 
              placeholder="Ej. Supervisor de Sucursal"
              className={errors.nombre ? 'input-error' : ''}
            />
            {errors.nombre && <span className="error-text">{errors.nombre}</span>}
          </div>
          <div className="form-group" style={{ marginBottom: '14px' }}>
            <label>Descripción de Funciones</label>
            <textarea 
              name="descripcion" 
              rows="3" 
              value={formData.descripcion} 
              onChange={handleChange} 
              placeholder="Responsabilidades y alcance en el negocio..."
              style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--input-border)', background: 'var(--input-bg)', color: 'var(--text-main)', fontSize: '13.5px', resize: 'vertical' }}
            />
          </div>
          <div className="form-group" style={{ marginBottom: '14px' }}>
            <label>Permisos / Alcance Técnico</label>
            <input 
              type="text" 
              name="permisos" 
              value={formData.permisos} 
              onChange={handleChange} 
              placeholder="Ej. POS, Ventas, Reportes, Cierre de Caja"
            />
          </div>
          <div className="modal-footer" style={{ marginTop: '20px' }}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn btn-primary">{editingRol ? 'Guardar Cambios' : 'Crear Rol'}</button>
          </div>
        </form>
      </div>
    </div>
  );
};


export default RolModal;

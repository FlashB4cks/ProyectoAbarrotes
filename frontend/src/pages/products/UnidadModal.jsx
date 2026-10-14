import React, { useState, useEffect } from 'react';

/* ── MODAL: CREACIÓN / EDICIÓN DE UNIDAD DE MEDIDA ── */
export const UnidadModal = ({ isOpen, onClose, onSave, editingUnidad }) => {
  const [formData, setFormData] = useState({ nombre: '', simbolo: '' });
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (editingUnidad) {
      setFormData({
        nombre: editingUnidad.nombre || '',
        simbolo: editingUnidad.simbolo || '',
      });
    } else {
      setFormData({ nombre: '', simbolo: '' });
    }
    setErrors({});
  }, [editingUnidad, isOpen]);

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: null }));
  };

  const validate = () => {
    const errs = {};
    if (!formData.nombre.trim()) errs.nombre = 'El nombre de la unidad es obligatorio.';
    if (!formData.simbolo.trim()) errs.simbolo = 'El símbolo es obligatorio.';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;
    onSave({
      nombre: formData.nombre.trim(),
      simbolo: formData.simbolo.trim(),
    });
  };

  return (
    <div className="modal-backdrop" onClick={(e) => { if (e.target.className.includes('modal-backdrop')) onClose(); }}>
      <div className="modal-container">
        <div className="modal-header">
          <h3>{editingUnidad ? 'Editar Unidad de Medida' : 'Registrar Unidad de Medida'}</h3>
          <button className="btn-close" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmit} className="modal-body">
          <div className="form-group" style={{ marginBottom: '14px' }}>
            <label>Nombre de la Unidad <span className="req">*</span></label>
            <input 
              type="text" 
              name="nombre" 
              value={formData.nombre} 
              onChange={handleChange} 
              placeholder="Ej. Kilogramo, Unidad, Litro, Libra..."
              className={errors.nombre ? 'input-error' : ''}
            />
            {errors.nombre && <span className="error-text">{errors.nombre}</span>}
          </div>
          <div className="form-group" style={{ marginBottom: '14px' }}>
            <label>Símbolo / Abreviatura <span className="req">*</span></label>
            <input 
              type="text" 
              name="simbolo" 
              value={formData.simbolo} 
              onChange={handleChange} 
              placeholder="Ej. kg, unid, lt, lb..."
              className={errors.simbolo ? 'input-error' : ''}
            />
            {errors.simbolo && <span className="error-text">{errors.simbolo}</span>}
          </div>
          <div className="modal-footer" style={{ marginTop: '20px' }}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn btn-primary">{editingUnidad ? 'Guardar Cambios' : 'Registrar Unidad'}</button>
          </div>
        </form>
      </div>
    </div>
  );
};


export default UnidadModal;

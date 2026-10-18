import React, { useState, useEffect } from 'react';

/* ── MODAL: CREACIÓN / EDICIÓN DE USUARIOS ── */
export const UserModal = ({ isOpen, onClose, onSave, editingUser, users = [], roles = [] }) => {
  const [formData, setFormData] = useState({ first_name: '', last_name: '', dpi: '', nit: '', telefono: '', direccion: '', rol: 'VENDEDOR' });
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (editingUser) {
      setFormData({
        first_name: editingUser.first_name || '',
        last_name: editingUser.last_name || '',
        dpi: editingUser.dpi || '',
        nit: editingUser.nit || '',
        telefono: editingUser.telefono || '',
        direccion: editingUser.direccion || '',
        rol: editingUser.rol || 'VENDEDOR',
      });
    } else {
      setFormData({ first_name: '', last_name: '', dpi: '', nit: '', telefono: '', direccion: '', rol: 'VENDEDOR' });
    }
    setErrors({});
  }, [editingUser, isOpen]);

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    let newValue = value;
    if (name === 'telefono') newValue = value.replace(/\D/g, '').slice(0, 8);
    else if (name === 'dpi') newValue = value.replace(/\D/g, '').slice(0, 13);
    setFormData(prev => ({ ...prev, [name]: newValue }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: null }));
  };

  const validateForm = () => {
    const errs = {};
    const fName = formData.first_name.trim();
    const lName = formData.last_name.trim();

    if (!fName) {
      errs.first_name = 'El nombre es obligatorio.';
    }
    if (!lName) {
      errs.last_name = 'El apellido es obligatorio.';
    }

    // Regla de negocio: El apellido no puede ser idéntico al nombre
    if (fName && lName && fName.toLowerCase() === lName.toLowerCase()) {
      errs.last_name = 'El apellido no puede ser idéntico al nombre del usuario.';
    }

    // Validación de nombres y apellidos duplicados en el sistema
    if (fName && lName && users && users.length > 0) {
      const isDuplicate = users.some(u => 
        (!editingUser || u.id !== editingUser.id) &&
        u.first_name && u.first_name.trim().toLowerCase() === fName.toLowerCase() &&
        u.last_name && u.last_name.trim().toLowerCase() === lName.toLowerCase()
      );
      if (isDuplicate) {
        errs.first_name = 'Ya existe un empleado registrado con este nombre y apellido exactos.';
      }
    }

    if (!editingUser) {
      if (!formData.dpi.trim()) errs.dpi = 'El DPI es obligatorio.';
      else if (formData.dpi.trim().length !== 13) errs.dpi = 'El DPI debe contener exactamente 13 dígitos.';
    } else if (formData.dpi && formData.dpi.trim().length > 0 && formData.dpi.trim().length !== 13) {
      errs.dpi = 'El DPI debe contener exactamente 13 dígitos.';
    }
    if (formData.telefono && formData.telefono.trim().length > 0 && formData.telefono.trim().length > 8) {
      errs.telefono = 'El teléfono no puede tener más de 8 dígitos.';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validateForm()) return;
    onSave(formData);
  };

  return (
    <div className="modal-backdrop" onClick={(e) => { if (e.target.className.includes('modal-backdrop')) onClose(); }}>
      <div className="modal-container">
        <div className="modal-header">
          <h3>{editingUser ? 'Editar Empleado' : 'Registrar Nuevo Empleado'}</h3>
          <button className="btn-close" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmit} className="modal-body">
          {!editingUser && (
            <div className="info-banner">
              <strong>Generación Automática de Credenciales</strong>
              <p>El nombre de usuario y una contraseña aleatoria de 12 caracteres se crearán automáticamente.</p>
            </div>
          )}
          <div className="form-grid">
            <div className="form-group">
              <label>Nombre(s) <span className="req">*</span></label>
              <input type="text" name="first_name" value={formData.first_name} onChange={handleChange} className={errors.first_name ? 'input-error' : ''} />
              {errors.first_name && <span className="error-text">{errors.first_name}</span>}
            </div>
            <div className="form-group">
              <label>Apellido(s) <span className="req">*</span></label>
              <input type="text" name="last_name" value={formData.last_name} onChange={handleChange} className={errors.last_name ? 'input-error' : ''} />
              {errors.last_name && <span className="error-text">{errors.last_name}</span>}
            </div>
            <div className="form-group">
              <label>DPI {!editingUser && <span className="req">*</span>}</label>
              <input type="text" name="dpi" maxLength="13" value={formData.dpi} onChange={handleChange} className={errors.dpi ? 'input-error' : ''} />
              {errors.dpi && <span className="error-text">{errors.dpi}</span>}
            </div>
            <div className="form-group">
              <label>NIT</label>
              <input type="text" name="nit" value={formData.nit} onChange={handleChange} />
            </div>
            <div className="form-group">
              <label>Teléfono</label>
              <input type="text" name="telefono" maxLength="8" value={formData.telefono} onChange={handleChange} className={errors.telefono ? 'input-error' : ''} />
              {errors.telefono && <span className="error-text">{errors.telefono}</span>}
            </div>
            <div className="form-group">
              <label>Puesto / Rol <span className="req">*</span></label>
              <select name="rol" value={formData.rol} onChange={handleChange}>
                {roles && roles.length > 0 ? (
                  roles.filter(r => r.is_active || r.codigo === formData.rol).map(r => (
                    <option key={r.id_rol} value={r.codigo}>{r.nombre}</option>
                  ))
                ) : (
                  <>
                    <option value="VENDEDOR">Vendedor</option>
                    <option value="ALMACENERO">Almacenero</option>
                    <option value="ADMINISTRADOR">Administrador</option>
                  </>
                )}
              </select>
            </div>
          </div>
          <div className="form-group full-width" style={{ marginTop: '16px' }}>
            <label>Dirección de Residencia</label>
            <input type="text" name="direccion" value={formData.direccion} onChange={handleChange} />
          </div>
          <div className="modal-footer" style={{ marginTop: '24px' }}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn btn-primary">{editingUser ? 'Guardar Cambios' : 'Generar Empleado'}</button>
          </div>
        </form>
      </div>
    </div>
  );
};


export default UserModal;

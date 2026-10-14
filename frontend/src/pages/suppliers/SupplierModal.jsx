import React, { useState, useEffect } from 'react';
import { IconTruck } from '../../components/icons/Icons';

/* ── MODAL: CREACIÓN / EDICIÓN DE PROVEEDORES ── */
export const SupplierModal = ({ isOpen, onClose, onSave, editingSupplier }) => {
  const [formData, setFormData] = useState({
    nombre_empresa: '',
    contacto: '',
    telefono: '',
    email: '',
    nit: '',
    direccion: '',
  });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (editingSupplier) {
      setFormData({
        nombre_empresa: editingSupplier.nombre_empresa || '',
        contacto: editingSupplier.contacto || '',
        telefono: editingSupplier.telefono || '',
        email: editingSupplier.email || '',
        nit: editingSupplier.nit || '',
        direccion: editingSupplier.direccion || '',
      });
    } else {
      setFormData({
        nombre_empresa: '',
        contacto: '',
        telefono: '',
        email: '',
        nit: '',
        direccion: '',
      });
    }
    setErrors({});
    setSubmitting(false);
  }, [editingSupplier, isOpen]);

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    let newValue = value;
    if (name === 'nit') {
      const clean = value.replace(/[^a-zA-Z0-9-]/g, '').toUpperCase().slice(0, 9);
      const isOnlyDigits = /^\d+$/.test(clean);
      newValue = isOnlyDigits ? clean.slice(0, 8) : clean.slice(0, 9);
    } else if (name === 'telefono') {
      newValue = value.replace(/\D/g, '').slice(0, 8);
    }
    setFormData(prev => ({ ...prev, [name]: newValue }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: null }));
  };

  const validateForm = () => {
    const errs = {};
    if (!formData.nombre_empresa.trim()) {
      errs.nombre_empresa = 'El nombre o razón social de la empresa es obligatorio.';
    }
    if (formData.nit && formData.nit.trim()) {
      const cleanNit = formData.nit.trim().toUpperCase();
      if (/^\d+$/.test(cleanNit) && cleanNit.length > 8) {
        errs.nit = 'El NIT numérico no puede exceder los 8 dígitos.';
      } else if (cleanNit.length > 9) {
        errs.nit = 'El NIT no puede exceder los 9 caracteres.';
      }
    }
    if (formData.telefono.trim()) {
      const cleanTel = formData.telefono.trim().replace(/\D/g, '');
      if (cleanTel.length !== 8) {
        errs.telefono = 'El teléfono debe contener exactamente 8 dígitos numéricos.';
      }
    }
    if (formData.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
      errs.email = 'Ingrese un formato de correo electrónico válido.';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;
    setSubmitting(true);
    try {
      await onSave({
        nombre_empresa: formData.nombre_empresa.trim(),
        contacto: formData.contacto.trim() || null,
        telefono: formData.telefono.trim().replace(/\D/g, '') || null,
        email: formData.email.trim() || null,
        nit: formData.nit.trim() || null,
        direccion: formData.direccion.trim() || null,
      });
      onClose();
    } catch (err) {
      setErrors({ form: err.message || 'Error al guardar el proveedor.' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={(e) => { if (e.target.className.includes('modal-backdrop')) onClose(); }}>
      <div className="modal-container" style={{ maxWidth: '580px' }}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ color: 'var(--accent)', display: 'flex' }}><IconTruck size={20} /></span>
            <div>
              <h3 style={{ margin: 0 }}>{editingSupplier ? 'Editar Proveedor' : 'Registrar Nuevo Proveedor'}</h3>
            </div>
          </div>
          <button className="btn-close" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmit} className="modal-body">
          {errors.form && (
            <div className="alert-box alert-error" style={{ marginBottom: '14px' }}>
              {errors.form}
            </div>
          )}
          <div className="form-grid">
            <div className="form-group full-width">
              <label>Nombre de la Empresa / Razón Social <span className="req">*</span></label>
              <input 
                type="text" 
                name="nombre_empresa" 
                value={formData.nombre_empresa} 
                onChange={handleChange}
                placeholder="Ej. Cervecería Centro Americana, S.A., Omnilife o Malher"
                className={errors.nombre_empresa ? 'input-error' : ''}
                autoFocus
              />
              {errors.nombre_empresa && <span className="error-text">{errors.nombre_empresa}</span>}
            </div>

            <div className="form-group">
              <label>NIT Comercial</label>
              <input 
                type="text" 
                name="nit" 
                value={formData.nit} 
                onChange={handleChange}
                placeholder="Ej. 1234567-8 o 12345678"
                maxLength={9}
                className={errors.nit ? 'input-error' : ''}
              />
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                Máx 9 caracteres con letras/guión o 8 números.
              </span>
              {errors.nit && <span className="error-text">{errors.nit}</span>}
            </div>

            <div className="form-group">
              <label>Persona o Asesor de Contacto</label>
              <input 
                type="text" 
                name="contacto" 
                value={formData.contacto} 
                onChange={handleChange}
                placeholder="Ej. Lic. Carlos Gómez / Ventas"
              />
            </div>

            <div className="form-group">
              <label>Teléfono de Contacto (8 dígitos)</label>
              <input 
                type="text" 
                name="telefono" 
                value={formData.telefono} 
                onChange={handleChange}
                placeholder="Ej. 23456789 o 55443322"
                maxLength={8}
                className={errors.telefono ? 'input-error' : ''}
              />
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                Exactamente 8 dígitos numéricos.
              </span>
              {errors.telefono && <span className="error-text">{errors.telefono}</span>}
            </div>

            <div className="form-group">
              <label>Correo Electrónico</label>
              <input 
                type="email" 
                name="email" 
                value={formData.email} 
                onChange={handleChange}
                placeholder="Ej. pedidos@proveedor.com"
                className={errors.email ? 'input-error' : ''}
              />
              {errors.email && <span className="error-text">{errors.email}</span>}
            </div>

            <div className="form-group full-width">
              <label>Dirección Comercial / Bodega</label>
              <input 
                type="text" 
                name="direccion" 
                value={formData.direccion} 
                onChange={handleChange}
                placeholder="Ej. Calzada Roosevelt 15-40 Zona 11, Bodega 4"
              />
            </div>
          </div>

          <div className="modal-footer" style={{ marginTop: '20px' }}>
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={submitting}>
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? 'Guardando...' : editingSupplier ? 'Guardar Cambios' : 'Registrar Proveedor'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};


export default SupplierModal;

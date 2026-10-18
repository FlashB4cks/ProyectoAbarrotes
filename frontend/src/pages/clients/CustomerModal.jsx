import React, { useState, useEffect } from 'react';
import { IconUser } from '../../components/icons/Icons';

/* ── MODAL: CREAR / EDITAR CLIENTE (DIRECTORIO COMERCIAL) ── */
export const CustomerModal = ({ isOpen, onClose, onSave, editingCustomer }) => {
  const [formData, setFormData] = useState({
    nombre_completo: '',
    nit: '',
    dpi: '',
    telefono: '',
    direccion: '',
  });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (editingCustomer) {
      setFormData({
        nombre_completo: editingCustomer.nombre_completo || '',
        nit: editingCustomer.nit && editingCustomer.nit !== 'C/F' ? editingCustomer.nit : '',
        dpi: editingCustomer.dpi || '',
        telefono: editingCustomer.telefono || '',
        direccion: editingCustomer.direccion || '',
      });
    } else {
      setFormData({
        nombre_completo: '',
        nit: '',
        dpi: '',
        telefono: '',
        direccion: '',
      });
    }
    setErrors({});
    setSubmitting(false);
  }, [editingCustomer, isOpen]);

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    let val = value;
    if (name === 'nit') {
      // Limitar a 9 caracteres con letras o guion, y si son solo dígitos limitar a 8 números
      const clean = value.replace(/[^a-zA-Z0-9-]/g, '').toUpperCase().slice(0, 9);
      const isOnlyDigits = /^\d+$/.test(clean);
      val = isOnlyDigits ? clean.slice(0, 8) : clean.slice(0, 9);
    } else if (name === 'telefono') {
      // Límite de 8 dígitos numéricos (estándar Guatemala)
      val = value.replace(/\D/g, '').slice(0, 8);
    } else if (name === 'dpi') {
      val = value.replace(/\D/g, '').slice(0, 13);
    }
    setFormData(prev => ({ ...prev, [name]: val }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: null }));
  };

  const validate = () => {
    const errs = {};
    if (!formData.nombre_completo.trim()) {
      errs.nombre_completo = 'El nombre completo o razón social es obligatorio.';
    }
    if (formData.nit && formData.nit.trim()) {
      const cleanNit = formData.nit.trim().toUpperCase();
      if (cleanNit === 'C/F' || cleanNit === 'CF') {
        errs.nit = 'C/F es una opción reservada del Punto de Venta (POS). Registre aquí únicamente clientes con su NIT propio o deje el campo en blanco.';
      } else if (/^\d+$/.test(cleanNit) && cleanNit.length > 8) {
        errs.nit = 'El NIT numérico no puede exceder los 8 dígitos.';
      } else if (cleanNit.length > 9) {
        errs.nit = 'El NIT no puede exceder los 9 caracteres.';
      }
    }
    if (formData.telefono && formData.telefono.trim()) {
      if (formData.telefono.trim().length !== 8) {
        errs.telefono = 'El número de teléfono debe contener exactamente 8 dígitos.';
      }
    }
    if (formData.dpi && formData.dpi.length > 0 && formData.dpi.length < 13) {
      errs.dpi = 'El DPI debe contener exactamente 13 dígitos numéricos.';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    try {
      await onSave({
        ...formData,
        nombre_completo: formData.nombre_completo.trim(),
        nit: formData.nit.trim().toUpperCase() || 'S/N',
        dpi: formData.dpi.trim() || null,
        telefono: formData.telefono.trim() || null,
        direccion: formData.direccion.trim() || null,
      });
      onClose();
    } catch (err) {
      const errMap = { submit: err.message || 'Error al guardar cliente.' };
      if (err.details && typeof err.details === 'object') {
        if (err.details.dpi) errMap.dpi = Array.isArray(err.details.dpi) ? err.details.dpi[0] : err.details.dpi;
        if (err.details.nit) errMap.nit = Array.isArray(err.details.nit) ? err.details.nit[0] : err.details.nit;
        if (err.details.nombre_completo) errMap.nombre_completo = Array.isArray(err.details.nombre_completo) ? err.details.nombre_completo[0] : err.details.nombre_completo;
        if (err.details.telefono) errMap.telefono = Array.isArray(err.details.telefono) ? err.details.telefono[0] : err.details.telefono;
      }
      setErrors(errMap);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={(e) => { if (e.target.className.includes('modal-backdrop')) onClose(); }}>
      <div className="modal-container" style={{ maxWidth: '580px' }}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '36px', height: '36px', borderRadius: '8px', background: 'rgba(184, 134, 11, 0.1)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent)'
            }}>
              <IconUser size={20} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: 'var(--text-main)' }}>
                {editingCustomer ? 'Editar Ficha de Cliente' : 'Registrar Nuevo Cliente'}
              </h3>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                Directorio comercial de compradores para el Punto de Venta (POS)
              </span>
            </div>
          </div>
          <button className="btn-close" onClick={onClose}>✕</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {errors.submit && (
              <div className="alert-message alert-danger">
                {errors.submit}
              </div>
            )}

            <div className="form-group">
              <label style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--text-main)', marginBottom: '5px', display: 'block' }}>
                Nombre Completo / Razón Social <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <input 
                type="text"
                name="nombre_completo"
                value={formData.nombre_completo}
                onChange={handleChange}
                placeholder=""
                className={`form-control ${errors.nombre_completo ? 'input-error' : ''}`}
                autoFocus
              />
              {errors.nombre_completo && <span className="field-error">{errors.nombre_completo}</span>}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div className="form-group">
                <label style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--text-main)', marginBottom: '5px', display: 'block' }}>
                  NIT
                </label>
                <input 
                  type="text"
                  name="nit"
                  value={formData.nit}
                  onChange={handleChange}
                  placeholder=""
                  className={`form-control ${errors.nit ? 'input-error' : ''}`}
                  maxLength={9}
                />
                {errors.nit && <span className="field-error">{errors.nit}</span>}
              </div>

              <div className="form-group">
                <label style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--text-main)', marginBottom: '5px', display: 'block' }}>
                  DPI
                </label>
                <input 
                  type="text"
                  name="dpi"
                  value={formData.dpi}
                  onChange={handleChange}
                  placeholder=""
                  className={`form-control ${errors.dpi ? 'input-error' : ''}`}
                  maxLength="13"
                />
                {errors.dpi && <span className="field-error">{errors.dpi}</span>}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div className="form-group">
                <label style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--text-main)', marginBottom: '5px', display: 'block' }}>
                  Teléfono
                </label>
                <input 
                  type="text"
                  name="telefono"
                  value={formData.telefono}
                  onChange={handleChange}
                  placeholder=""
                  className={`form-control ${errors.telefono ? 'input-error' : ''}`}
                  maxLength={8}
                />
                {errors.telefono && <span className="field-error">{errors.telefono}</span>}
              </div>

              <div className="form-group">
                <label style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--text-main)', marginBottom: '5px', display: 'block' }}>
                  Dirección o Zona
                </label>
                <input 
                  type="text"
                  name="direccion"
                  value={formData.direccion}
                  onChange={handleChange}
                  placeholder=""
                  className="form-control"
                />
              </div>
            </div>
          </div>

          <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={submitting}>
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? 'Guardando...' : (editingCustomer ? 'Actualizar Cliente' : 'Registrar Cliente')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};


export default CustomerModal;

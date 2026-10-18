import React, { useState, useEffect } from 'react';
import { NohemyApi } from '../../api/nohemyApi';
import { playScannerBeep } from '../../utils/audio';

import MarcaModal from './MarcaModal';
import UnidadModal from './UnidadModal';
import SupplierModal from '../suppliers/SupplierModal';
/* ── MODAL: CREACIÓN / EDICIÓN DE PRODUCTO ── */
export const ProductModal = ({ isOpen, onClose, onSave, editingProduct, categorias, unidades, marcas = [], proveedores, onOpenScanner, onRefreshProveedores }) => {
  const [formData, setFormData] = useState({
    codigo_barras: '',
    nombre: '',
    descripcion: '',
    categoria: '',
    marca: '',
    unidad_medida: '',
    proveedor: '',
    precio_venta: '',
    stock_minimo: 10,
  });

  const [errors, setErrors] = useState({});
  const [isQuickSupplierOpen, setIsQuickSupplierOpen] = useState(false);

  const handleQuickSupplierSave = async (supplierData) => {
    const newSupp = await NohemyApi.createProveedor(supplierData);
    if (onRefreshProveedores) {
      await onRefreshProveedores();
    }
    setFormData(prev => ({ ...prev, proveedor: newSupp.id_proveedor }));
    setIsQuickSupplierOpen(false);
  };

  useEffect(() => {
    if (editingProduct) {
      setFormData({
        codigo_barras: editingProduct.codigo_barras || '',
        nombre: editingProduct.nombre || '',
        descripcion: editingProduct.descripcion || '',
        categoria: editingProduct.categoria || '',
        marca: editingProduct.marca || '',
        unidad_medida: editingProduct.unidad_medida || '',
        proveedor: editingProduct.proveedor || '',
        precio_venta: editingProduct.precio_venta || '',
        stock_minimo: editingProduct.stock_minimo ?? 10,
      });
    } else {
      setFormData({
        codigo_barras: '',
        nombre: '',
        descripcion: '',
        categoria: categorias[0]?.id_categoria || '',
        marca: '',
        unidad_medida: unidades[0]?.id_unidad || '',
        proveedor: proveedores[0]?.id_proveedor || '',
        precio_venta: '',
        stock_minimo: 10,
      });
    }
    setErrors({});
  }, [editingProduct, isOpen, categorias, unidades, marcas, proveedores]);

  // Escuchar código de barras transmitido desde celular o escáner mientras el modal está abierto
  useEffect(() => {
    const handleBarcodeEvent = (e) => {
      if (isOpen && e.detail?.code) {
        setFormData(prev => ({ ...prev, codigo_barras: e.detail.code }));
        if (errors.codigo_barras) setErrors(prev => ({ ...prev, codigo_barras: null }));
      }
    };
    window.addEventListener('nohemysys:barcode', handleBarcodeEvent);
    return () => window.removeEventListener('nohemysys:barcode', handleBarcodeEvent);
  }, [isOpen, errors]);

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: null }));
  };

  const validateForm = () => {
    const errs = {};
    if (!formData.codigo_barras.trim()) errs.codigo_barras = 'El código de barras es obligatorio.';
    if (!formData.nombre.trim()) errs.nombre = 'El nombre del producto es obligatorio.';
    if (!formData.categoria) errs.categoria = 'Seleccione una categoría.';
    if (!formData.precio_venta || parseFloat(formData.precio_venta) <= 0) errs.precio_venta = 'Ingrese un precio válido (mayor a Q 0.00).';
    if (formData.stock_minimo === '' || parseInt(formData.stock_minimo) < 0) errs.stock_minimo = 'El stock mínimo debe ser igual o mayor a 0.';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validateForm()) return;
    onSave({
      ...formData,
      precio_venta: parseFloat(formData.precio_venta),
      stock_minimo: parseInt(formData.stock_minimo),
      categoria: parseInt(formData.categoria),
      marca: formData.marca ? parseInt(formData.marca) : null,
      unidad_medida: formData.unidad_medida ? parseInt(formData.unidad_medida) : null,
      proveedor: formData.proveedor ? parseInt(formData.proveedor) : null,
    });
  };

  return (
    <div className="modal-backdrop" onClick={(e) => { if (e.target.className.includes('modal-backdrop')) onClose(); }}>
      <div className="modal-container modal-product">
        <div className="modal-header">
          <h3>{editingProduct ? 'Editar Producto' : 'Registrar Nuevo Producto'}</h3>
          <button className="btn-close" onClick={onClose}>✕</button>
        </div>

        <form onSubmit={handleSubmit} className="modal-body">
          <div className="form-grid">
            <div className="form-group" style={{ gridColumn: 'span 2' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px', flexWrap: 'wrap', gap: '6px' }}>
                <label style={{ margin: 0 }}>Código de Barras <span className="req">*</span></label>
                {onOpenScanner && (
                  <button 
                    type="button" 
                    onClick={onOpenScanner}
                    className="btn-scanner-pill"
                    style={{ padding: '2px 10px', fontSize: '11.5px', whiteSpace: 'nowrap' }}
                    title="Configuración y prueba de lector de códigos de barras"
                  >
                    Lector USB / Probar
                  </button>
                )}
              </div>
              <input 
                type="text" 
                name="codigo_barras" 
                value={formData.codigo_barras} 
                onChange={handleChange}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    if (formData.codigo_barras.trim().length >= 2) {
                      playScannerBeep(true);
                      document.querySelector('input[name="nombre"]')?.focus();
                    }
                  }
                }}
                placeholder="Dispare con lector de cable USB o escriba manualmente"
                className={errors.codigo_barras ? 'input-error' : ''}
                autoFocus
              />
              <span style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>
                Dispare con su lector USB por cable o escriba manualmente. Al presionar Enter avanzará automáticamente al nombre.
              </span>
              {errors.codigo_barras && <span className="error-text">{errors.codigo_barras}</span>}
            </div>

            <div className="form-group" style={{ gridColumn: 'span 2' }}>
              <label>Nombre del Producto <span className="req">*</span></label>
              <input 
                type="text" 
                name="nombre" 
                value={formData.nombre} 
                onChange={handleChange}
                className={errors.nombre ? 'input-error' : ''}
              />
              {errors.nombre && <span className="error-text">{errors.nombre}</span>}
            </div>

            <div className="form-group">
              <label>Categoría <span className="req">*</span></label>
              <select name="categoria" value={formData.categoria} onChange={handleChange} className={errors.categoria ? 'input-error' : ''}>
                <option value="">-- Seleccionar --</option>
                {categorias.map(c => <option key={c.id_categoria} value={c.id_categoria}>{c.nombre}</option>)}
              </select>
              {errors.categoria && <span className="error-text">{errors.categoria}</span>}
            </div>

            <div className="form-group">
              <label>Marca de Producto</label>
              <select name="marca" value={formData.marca} onChange={handleChange}>
                <option value="">-- Sin Marca / Genérico --</option>
                {marcas.filter(m => m.is_active || String(m.id_marca) === String(formData.marca)).map(m => (
                  <option key={m.id_marca} value={m.id_marca}>{m.nombre}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Unidad de Medida</label>
              <select name="unidad_medida" value={formData.unidad_medida} onChange={handleChange}>
                <option value="">-- Ninguna --</option>
                {unidades.map(u => <option key={u.id_unidad} value={u.id_unidad}>{u.nombre} ({u.simbolo})</option>)}
              </select>
            </div>

            <div className="form-group">
              <label>Precio Venta (GTQ Q) <span className="req">*</span></label>
              <input 
                type="number" 
                step="0.01"
                name="precio_venta" 
                value={formData.precio_venta} 
                onChange={handleChange} 
                placeholder="0.00"
                className={errors.precio_venta ? 'input-error' : ''}
              />
              {errors.precio_venta && <span className="error-text">{errors.precio_venta}</span>}
            </div>

            <div className="form-group">
              <label>Stock Mínimo para Alerta <span className="req">*</span></label>
              <input 
                type="number" 
                name="stock_minimo" 
                value={formData.stock_minimo} 
                onChange={handleChange} 
                placeholder="10"
                className={errors.stock_minimo ? 'input-error' : ''}
              />
              {errors.stock_minimo && <span className="error-text">{errors.stock_minimo}</span>}
            </div>

            <div className="form-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px', flexWrap: 'wrap', gap: '6px' }}>
                <label style={{ margin: 0 }}>Proveedor Principal</label>
                <button
                  type="button"
                  onClick={() => setIsQuickSupplierOpen(true)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--accent)',
                    fontSize: '11.5px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    padding: 0,
                    textDecoration: 'underline',
                    whiteSpace: 'nowrap'
                  }}
                >
                  + Nuevo Proveedor
                </button>
              </div>
              <select name="proveedor" value={formData.proveedor} onChange={handleChange}>
                <option value="">-- Seleccionar Proveedor --</option>
                {proveedores.map(p => <option key={p.id_proveedor} value={p.id_proveedor}>{p.nombre_empresa}</option>)}
              </select>
            </div>

            <div className="form-group" style={{ gridColumn: 'span 2' }}>
              <label>Descripción Corta / Detalles</label>
              <input 
                type="text" 
                name="descripcion" 
                value={formData.descripcion} 
                onChange={handleChange} 
                placeholder="Presentación, características o sabor"
              />
            </div>
          </div>

          <div className="modal-footer" style={{ marginTop: '24px' }}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn btn-primary">{editingProduct ? 'Guardar Cambios' : 'Guardar Producto'}</button>
          </div>
        </form>

        <SupplierModal
          isOpen={isQuickSupplierOpen}
          onClose={() => setIsQuickSupplierOpen(false)}
          onSave={handleQuickSupplierSave}
          editingSupplier={null}
        />
      </div>
    </div>
  );
};


export default ProductModal;

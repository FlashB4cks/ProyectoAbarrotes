import React, { useState, useEffect } from 'react';
import { NohemyApi } from '../../api/nohemyApi';
import { playScannerBeep } from '../../utils/audio';

import SupplierModal from '../suppliers/SupplierModal';
/* ── MODAL: REGISTRO DE COMPRA / INGRESO DE MERCADERÍA ── */
export const NewPurchaseModal = ({ isOpen, onClose, onSuccess, proveedores, productos, onRefreshProveedores }) => {
  const [numeroComprobante, setNumeroComprobante] = useState('');
  const [proveedor, setProveedor] = useState('');
  const [items, setItems] = useState([
    { producto: '', cantidad: 1, costo_unitario: '', numero_lote: '', fecha_vencimiento: '' }
  ]);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [scanPurchaseInput, setScanPurchaseInput] = useState('');
  const [scanPurchaseMsg, setScanPurchaseMsg] = useState(null);
  const [isQuickSupplierOpen, setIsQuickSupplierOpen] = useState(false);

  const handleQuickSupplierSave = async (supplierData) => {
    const newSupp = await NohemyApi.createProveedor(supplierData);
    if (onRefreshProveedores) {
      await onRefreshProveedores();
    }
    setProveedor(String(newSupp.id_proveedor));
    setIsQuickSupplierOpen(false);
  };

  useEffect(() => {
    if (isOpen) {
      setNumeroComprobante('');
      setProveedor('');
      setItems([{ producto: '', cantidad: 1, costo_unitario: '', numero_lote: '', fecha_vencimiento: '' }]);
      setErrors({});
      setSubmitting(false);
      setScanPurchaseInput('');
      setScanPurchaseMsg(null);
    }
  }, [isOpen]);

  // Escuchar códigos de barras escaneados desde el celular por cable USB o Wi-Fi mientras el modal de compra está abierto
  useEffect(() => {
    const handleBarcodeEvent = (e) => {
      if (isOpen && e.detail?.code) {
        const code = e.detail.code.trim();
        processScannedCode(code);
      }
    };
    window.addEventListener('nohemysys:barcode', handleBarcodeEvent);
    return () => window.removeEventListener('nohemysys:barcode', handleBarcodeEvent);
  }, [isOpen, productos]);

  const processScannedCode = (code) => {
    if (!code) return;
    const found = productos.find(p => p.is_active && (p.codigo_barras === code || p.nombre.toLowerCase().includes(code.toLowerCase())));
    if (found) {
      playScannerBeep(true);
      setItems(prev => {
        const lastIdx = prev.length - 1;
        if (lastIdx >= 0 && !prev[lastIdx].producto) {
          const copy = [...prev];
          copy[lastIdx] = { ...copy[lastIdx], producto: found.id_producto };
          return copy;
        }
        return [...prev, { producto: found.id_producto, cantidad: 1, costo_unitario: '', numero_lote: '', fecha_vencimiento: '' }];
      });
      setScanPurchaseMsg({ success: true, text: `✓ Producto detectado: ${found.nombre}` });
      setScanPurchaseInput('');
      setTimeout(() => setScanPurchaseMsg(null), 2500);
    } else {
      playScannerBeep(false);
      setScanPurchaseMsg({ success: false, text: `Código "${code}" no encontrado en catálogo.` });
      setTimeout(() => setScanPurchaseMsg(null), 3500);
    }
  };

  if (!isOpen) return null;

  const handleScanPurchaseKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const code = scanPurchaseInput.trim();
      processScannedCode(code);
    }
  };

  const handleAddItem = () => {
    setItems(prev => [
      ...prev,
      { producto: '', cantidad: 1, costo_unitario: '', numero_lote: '', fecha_vencimiento: '' }
    ]);
  };

  const handleRemoveItem = (index) => {
    if (items.length <= 1) return;
    setItems(prev => prev.filter((_, idx) => idx !== index));
  };

  const handleItemChange = (index, field, value) => {
    setItems(prev => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
    if (errors[`item_${index}_${field}`]) {
      setErrors(prev => ({ ...prev, [`item_${index}_${field}`]: null }));
    }
  };

  const totalCalculado = items.reduce((acc, it) => {
    const cant = parseFloat(it.cantidad) || 0;
    const costo = parseFloat(it.costo_unitario) || 0;
    return acc + (cant * costo);
  }, 0);

  const totalUnidades = items.reduce((acc, it) => acc + (parseInt(it.cantidad) || 0), 0);

  const validate = () => {
    const errs = {};
    if (!numeroComprobante.trim()) {
      errs.numeroComprobante = 'El número de comprobante o factura es obligatorio.';
    }
    if (!proveedor) {
      errs.proveedor = 'Debe seleccionar un proveedor.';
    }
    if (items.length === 0) {
      errs.general = 'Debe agregar al menos un producto a la compra.';
    }

    items.forEach((it, idx) => {
      if (!it.producto) {
        errs[`item_${idx}_producto`] = 'Seleccione un producto.';
      }
      const cant = parseInt(it.cantidad);
      if (!cant || cant < 1) {
        errs[`item_${idx}_cantidad`] = 'Mín. 1.';
      }
      const costo = parseFloat(it.costo_unitario);
      if (isNaN(costo) || costo <= 0) {
        errs[`item_${idx}_costo_unitario`] = 'Costo > 0.';
      }
    });

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setSubmitting(true);
    try {
      const payload = {
        numero_comprobante: numeroComprobante.trim(),
        proveedor: parseInt(proveedor),
        items: items.map(it => {
          const itemData = {
            producto: parseInt(it.producto),
            cantidad: parseInt(it.cantidad),
            costo_unitario: parseFloat(it.costo_unitario).toFixed(2),
          };
          if (it.numero_lote && it.numero_lote.trim()) {
            itemData.numero_lote = it.numero_lote.trim();
          }
          if (it.fecha_vencimiento) {
            itemData.fecha_vencimiento = it.fecha_vencimiento;
          }
          return itemData;
        })
      };

      await NohemyApi.createCompra(payload);
      onSuccess(`Compra #${numeroComprobante.trim()} registrada exitosamente.`);
      onClose();
    } catch (err) {
      setErrors(prev => ({ ...prev, submit: err.message }));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={(e) => { if (e.target.className.includes('modal-backdrop')) onClose(); }}>
      <div className="modal-container modal-xl">
        <div className="modal-header">
          <div>
            <h3>Registrar Nueva Compra / Ingreso de Mercadería</h3>
            <span style={{ fontSize: '12.5px', color: 'var(--text-muted)' }}>
              El inventario y lotes se incrementarán automáticamente
            </span>
          </div>
          <button className="btn-close" onClick={onClose}>✕</button>
        </div>

        <form onSubmit={handleSubmit} className="modal-body" style={{ maxHeight: '80vh', overflowY: 'auto' }}>
          {errors.submit && <div className="alert alert-danger" style={{ marginBottom: '16px' }}>{errors.submit}</div>}

          <div className="form-grid" style={{ gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px', marginBottom: '20px' }}>
            <div className="form-group">
              <label>No. de Comprobante / Factura <span className="req">*</span></label>
              <input 
                type="text"
                placeholder="Ej. FAC-2024-00129"
                value={numeroComprobante}
                onChange={(e) => {
                  setNumeroComprobante(e.target.value);
                  if (errors.numeroComprobante) setErrors(prev => ({ ...prev, numeroComprobante: null }));
                }}
                className={errors.numeroComprobante ? 'input-error' : ''}
              />
              {errors.numeroComprobante && <span className="error-text">{errors.numeroComprobante}</span>}
            </div>

            <div className="form-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <label style={{ margin: 0 }}>Proveedor <span className="req">*</span></label>
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
                    textDecoration: 'underline'
                  }}
                >
                  + Nuevo Proveedor
                </button>
              </div>
              <select 
                value={proveedor}
                onChange={(e) => {
                  setProveedor(e.target.value);
                  if (errors.proveedor) setErrors(prev => ({ ...prev, proveedor: null }));
                }}
                className={errors.proveedor ? 'input-error' : ''}
              >
                <option value="">-- Seleccionar Proveedor --</option>
                {proveedores.map(p => (
                  <option key={p.id_proveedor} value={p.id_proveedor}>
                    {p.nombre_empresa} {p.nit ? `(NIT: ${p.nit})` : ''}
                  </option>
                ))}
              </select>
              {errors.proveedor && <span className="error-text">{errors.proveedor}</span>}
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', flexWrap: 'wrap', gap: '8px' }}>
            <h4 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-main)', margin: 0 }}>
              Detalle de Productos a Ingresar
            </h4>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <div style={{ position: 'relative' }}>
                <input 
                  type="text" 
                  value={scanPurchaseInput} 
                  onChange={(e) => setScanPurchaseInput(e.target.value)}
                  onKeyDown={handleScanPurchaseKeyDown}
                  placeholder="Disparar código con lector USB..."
                  style={{
                    padding: '6px 12px',
                    fontSize: '12.5px',
                    borderRadius: '8px',
                    border: '1px solid var(--accent)',
                    background: 'var(--input-bg)',
                    width: '260px'
                  }}
                />
              </div>
              <button type="button" className="btn btn-secondary" onClick={handleAddItem} style={{ fontSize: '12px', padding: '6px 12px' }}>
                + Agregar Fila
              </button>
            </div>
          </div>

          {scanPurchaseMsg && (
            <div style={{
              padding: '6px 12px',
              borderRadius: '6px',
              fontSize: '12px',
              fontWeight: 600,
              marginBottom: '10px',
              background: scanPurchaseMsg.success ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
              color: scanPurchaseMsg.success ? '#059669' : '#dc2626',
              border: `1px solid ${scanPurchaseMsg.success ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`
            }}>
              {scanPurchaseMsg.text}
            </div>
          )}

          <div className="purchase-table-container">
            <table className="table" style={{ margin: 0 }}>
              <thead>
                <tr>
                  <th style={{ minWidth: '220px' }}>Producto <span className="req">*</span></th>
                  <th style={{ width: '100px' }}>Cantidad <span className="req">*</span></th>
                  <th style={{ width: '130px' }}>Costo Unit. (Q) <span className="req">*</span></th>
                  <th style={{ width: '140px' }}>No. Lote</th>
                  <th style={{ width: '150px' }}>Vencimiento</th>
                  <th style={{ width: '120px', textAlign: 'right' }}>Subtotal</th>
                  <th style={{ width: '50px' }}></th>
                </tr>
              </thead>
              <tbody>
                {items.map((it, idx) => {
                  const cant = parseFloat(it.cantidad) || 0;
                  const costo = parseFloat(it.costo_unitario) || 0;
                  const subtotal = cant * costo;

                  return (
                    <tr key={idx}>
                      <td>
                        <select 
                          className={`table-select ${errors[`item_${idx}_producto`] ? 'input-error' : ''}`}
                          value={it.producto}
                          onChange={(e) => handleItemChange(idx, 'producto', e.target.value)}
                        >
                          <option value="">-- Seleccionar Producto --</option>
                          {productos.filter(p => p.is_active).map(p => (
                            <option key={p.id_producto} value={p.id_producto}>
                              {p.nombre} ({p.codigo_barras}) - Stock: {p.stock_total}
                            </option>
                          ))}
                        </select>
                        {errors[`item_${idx}_producto`] && <span className="error-text" style={{ fontSize: '11px' }}>{errors[`item_${idx}_producto`]}</span>}
                      </td>
                      <td>
                        <input 
                          type="number"
                          min="1"
                          className={`table-input ${errors[`item_${idx}_cantidad`] ? 'input-error' : ''}`}
                          value={it.cantidad}
                          onChange={(e) => handleItemChange(idx, 'cantidad', e.target.value)}
                        />
                      </td>
                      <td>
                        <input 
                          type="number"
                          step="0.01"
                          min="0.01"
                          placeholder="0.00"
                          className={`table-input ${errors[`item_${idx}_costo_unitario`] ? 'input-error' : ''}`}
                          value={it.costo_unitario}
                          onChange={(e) => handleItemChange(idx, 'costo_unitario', e.target.value)}
                        />
                      </td>
                      <td>
                        <input 
                          type="text"
                          placeholder="LOT-XXXXX (Auto)"
                          className="table-input"
                          value={it.numero_lote}
                          onChange={(e) => handleItemChange(idx, 'numero_lote', e.target.value)}
                          title="Si se deja vacío, el sistema asignará el correlativo secuencial de la base de datos (LOT-XXXXX)"
                        />
                      </td>
                      <td>
                        <input 
                          type="date"
                          className="table-input"
                          value={it.fecha_vencimiento}
                          onChange={(e) => handleItemChange(idx, 'fecha_vencimiento', e.target.value)}
                        />
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--accent)', fontSize: '14px' }}>
                        Q {subtotal.toFixed(2)}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        {items.length > 1 && (
                          <button 
                            type="button" 
                            className="btn-remove-row" 
                            onClick={() => handleRemoveItem(idx)}
                            title="Eliminar fila"
                          >
                            ✕
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="purchase-summary-box">
            <div>
              <span className="purchase-total-label">
                Ítems: <strong>{items.length}</strong> | Unidades Totales: <strong>{totalUnidades}</strong>
              </span>
            </div>
            <div>
              <span className="purchase-total-label" style={{ marginRight: '10px' }}>Total de la Compra:</span>
              <span className="purchase-total-amount">Q {totalCalculado.toFixed(2)}</span>
            </div>
          </div>

          <div className="modal-footer" style={{ marginTop: '24px' }}>
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={submitting}>
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? 'Procesando e Ingresando...' : 'Confirmar e Ingresar a Inventario'}
            </button>
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


export default NewPurchaseModal;

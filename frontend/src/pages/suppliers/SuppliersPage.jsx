import React, { useState, useEffect, useMemo } from 'react';
import { NohemyApi } from '../../api/nohemyApi';
import { Toast, ConfirmModal } from '../../components/common';
import { IconCheck, IconTruck } from '../../components/icons/Icons';

import SupplierModal from './SupplierModal';
/* ── COMPONENTE: GESTIÓN DE PROVEEDORES (RF-06 / MÓDULO 3) ── */
export const SuppliersContent = ({ onSupplierChanged }) => {
  const [proveedores, setProveedores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL'); // ALL, ACTIVE, INACTIVE

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState(null);
  const [confirmSupplier, setConfirmSupplier] = useState(null);
  const [toast, setToast] = useState(null);

  const fetchProveedores = async () => {
    try {
      setLoading(true);
      const data = await NohemyApi.getProveedores();
      const list = Array.isArray(data) ? data : data.results || [];
      setProveedores(list);
      if (onSupplierChanged) onSupplierChanged();
    } catch (err) {
      setToast({ type: 'error', message: 'Error al cargar proveedores: ' + err.message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProveedores();
  }, []);

  const handleSaveSupplier = async (supplierData) => {
    if (editingSupplier) {
      await NohemyApi.updateProveedor(editingSupplier.id_proveedor, supplierData);
      setToast({ type: 'success', message: `Proveedor "${supplierData.nombre_empresa}" actualizado exitosamente.` });
    } else {
      await NohemyApi.createProveedor(supplierData);
      setToast({ type: 'success', message: `Proveedor "${supplierData.nombre_empresa}" registrado exitosamente.` });
    }
    fetchProveedores();
  };

  const handleConfirmToggle = async () => {
    if (!confirmSupplier) return;
    try {
      const res = await NohemyApi.toggleProveedorStatus(confirmSupplier.id_proveedor);
      setToast({ type: 'success', message: res.message || 'Estado del proveedor actualizado exitosamente.' });
      setConfirmSupplier(null);
      fetchProveedores();
    } catch (err) {
      setToast({ type: 'error', message: 'Error: ' + err.message });
      setConfirmSupplier(null);
    }
  };

  const filteredProveedores = useMemo(() => {
    let result = [...proveedores];

    if (statusFilter === 'ACTIVE') {
      result = result.filter(p => p.is_active);
    } else if (statusFilter === 'INACTIVE') {
      result = result.filter(p => !p.is_active);
    }

    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      result = result.filter(p =>
        (p.nombre_empresa && p.nombre_empresa.toLowerCase().includes(term)) ||
        (p.contacto && p.contacto.toLowerCase().includes(term)) ||
        (p.nit && p.nit.toLowerCase().includes(term)) ||
        (p.telefono && p.telefono.includes(term)) ||
        (p.direccion && p.direccion.toLowerCase().includes(term))
      );
    }

    return result.sort((a, b) => {
      if (a.is_active === b.is_active) {
        return a.nombre_empresa.localeCompare(b.nombre_empresa);
      }
      return a.is_active ? -1 : 1;
    });
  }, [proveedores, searchTerm, statusFilter]);

  const totalProveedores = proveedores.length;
  const activosCount = proveedores.filter(p => p.is_active).length;
  const inactivosCount = proveedores.filter(p => !p.is_active).length;

  return (
    <div>
      {/* Tarjetas KPI de Proveedores */}
      <div className="inv-kpi-grid">
        <div className="inv-kpi-card kpi-total">
          <div className="kpi-header">
            <span>Total Proveedores</span>
            <span style={{ color: 'var(--accent)', display: 'flex' }}><IconTruck size={18} /></span>
          </div>
          <div className="kpi-value">{totalProveedores}</div>
          <div className="kpi-subtext">Directorio comercial registrado</div>
        </div>

        <div className="inv-kpi-card kpi-success">
          <div className="kpi-header">
            <span>Proveedores Activos</span>
            <span style={{ color: '#059669', display: 'flex' }}><IconCheck size={18} /></span>
          </div>
          <div className="kpi-value" style={{ color: '#059669' }}>{activosCount}</div>
          <div className="kpi-subtext">Habilitados para compras y catálogo</div>
        </div>

        <div className="inv-kpi-card kpi-danger">
          <div className="kpi-header">
            <span>Dados de Baja (Soft Delete)</span>
            <span style={{ color: inactivosCount > 0 ? '#dc2626' : 'var(--text-muted)', display: 'flex' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="15" y1="9" x2="9" y2="15" />
                <line x1="9" y1="9" x2="15" y2="15" />
              </svg>
            </span>
          </div>
          <div className="kpi-value" style={{ color: inactivosCount > 0 ? '#dc2626' : 'var(--text-muted)' }}>{inactivosCount}</div>
          <div className="kpi-subtext">Historial protegido en base de datos</div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <div className="search-and-filter-group">
            <div className="search-box">
              <input 
                type="text" 
                placeholder="Buscar por Empresa, Contacto, NIT o Teléfono..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <select 
              value={statusFilter} 
              onChange={(e) => setStatusFilter(e.target.value)}
              className="select-status-filter"
            >
              <option value="ALL">Todos los Estados</option>
              <option value="ACTIVE">Solo Activos (Ocultar dados de baja)</option>
              <option value="INACTIVE">Solo Dados de Baja</option>
            </select>
          </div>

          <button 
            className="btn btn-primary" 
            onClick={() => { setEditingSupplier(null); setIsModalOpen(true); }}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', whiteSpace: 'nowrap' }}
          >
            <IconTruck size={16} />
            + Nuevo Proveedor
          </button>
        </div>

        <div className="table-responsive">
          <table className="table">
            <thead>
              <tr>
                <th style={{ width: '26%' }}>EMPRESA / RAZÓN SOCIAL</th>
                <th style={{ width: '20%' }}>CONTACTO PRINCIPAL</th>
                <th style={{ width: '17%' }}>TELÉFONO & NIT</th>
                <th style={{ width: '21%' }}>DIRECCIÓN COMERCIAL</th>
                <th style={{ width: '8%', textAlign: 'center' }}>ESTADO</th>
                <th className="text-right" style={{ width: '8%' }}>ACCIONES</th>
              </tr>
            </thead>
            <tbody>
              {loading && proveedores.length === 0 ? (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center', padding: '36px', color: 'var(--text-muted)' }}>
                    Cargando directorio de proveedores...
                  </td>
                </tr>
              ) : filteredProveedores.length === 0 ? (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center', padding: '36px', color: 'var(--text-muted)' }}>
                    No se encontraron proveedores con los criterios de búsqueda.
                  </td>
                </tr>
              ) : (
                filteredProveedores.map((p) => {
                  const fechaStr = p.fecha_registro 
                    ? new Date(p.fecha_registro).toLocaleDateString('es-GT', { year: 'numeric', month: 'short', day: 'numeric' })
                    : '';

                  return (
                    <tr key={p.id_proveedor} className={!p.is_active ? 'row-disabled' : ''}>
                      <td>
                        <div className="user-name-cell">
                          <span className="name-bold" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ color: 'var(--accent)', display: 'flex' }}><IconTruck size={16} /></span>
                            {p.nombre_empresa}
                          </span>
                          {fechaStr && (
                            <span className="email-sub" style={{ fontSize: '11.5px' }}>
                              Registrado: {fechaStr}
                            </span>
                          )}
                        </div>
                      </td>
                      <td>
                        <div className="user-name-cell">
                          <span style={{ fontWeight: 600, color: 'var(--text-main)', fontSize: '13.5px' }}>
                            {p.contacto || '—'}
                          </span>
                          {p.email && (
                            <span className="email-sub" style={{ fontSize: '12px' }}>
                              {p.email}
                            </span>
                          )}
                        </div>
                      </td>
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-main)' }}>
                            {p.telefono ? `Tel: ${p.telefono}` : '—'}
                          </span>
                          <span style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>
                            NIT: <code className="user-code" style={{ fontSize: '11px', padding: '1px 6px' }}>{p.nit || 'C/F'}</code>
                          </span>
                        </div>
                      </td>
                      <td>
                        <span style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: '1.4', display: 'block' }}>
                          {p.direccion || 'No especificada'}
                        </span>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <span className={`status-badge ${p.is_active ? 'active' : 'inactive'}`}>
                          {p.is_active ? '● Activo' : '○ Dado de Baja'}
                        </span>
                      </td>
                      <td>
                        <div className="actions-cell">
                          <button
                            type="button"
                            className="btn-icon-btn btn-edit"
                            onClick={() => { setEditingSupplier(p); setIsModalOpen(true); }}
                          >
                            Editar
                          </button>
                          <button
                            type="button"
                            className={`btn-icon-btn ${p.is_active ? 'btn-danger-solid' : 'btn-success-solid'}`}
                            onClick={() => setConfirmSupplier(p)}
                          >
                            {p.is_active ? 'Dar de Baja' : 'Reactivar'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <SupplierModal
        isOpen={isModalOpen}
        onClose={() => { setIsModalOpen(false); setEditingSupplier(null); }}
        onSave={handleSaveSupplier}
        editingSupplier={editingSupplier}
      />

      <ConfirmModal
        isOpen={Boolean(confirmSupplier)}
        onClose={() => setConfirmSupplier(null)}
        onConfirm={handleConfirmToggle}
        title={confirmSupplier?.is_active ? 'Dar de Baja Proveedor' : 'Activar Proveedor'}
        message={`¿Está seguro de ${confirmSupplier?.is_active ? 'dar de baja' : 'activar'} al proveedor "${confirmSupplier?.nombre_empresa}"? Esta acción aplica borrado lógico preservando el historial de compras.`}
        isDanger={confirmSupplier?.is_active}
        confirmText={confirmSupplier?.is_active ? 'Dar de Baja' : 'Activar'}
      />

      <Toast toast={toast} onClose={() => setToast(null)} />
    </div>
  );
};


export const SuppliersPage = ({ onSupplierChanged }) => {
  return (
    <div className="view-panel">
      <SuppliersContent onSupplierChanged={onSupplierChanged} />
    </div>
  );
};


export default SuppliersPage;

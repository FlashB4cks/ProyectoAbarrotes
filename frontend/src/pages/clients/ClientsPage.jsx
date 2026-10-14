import React, { useState, useEffect, useMemo } from 'react';
import { NohemyApi } from '../../api/nohemyApi';
import { Toast, ConfirmModal } from '../../components/common';
import { IconCheck, IconEdit, IconTag, IconUser } from '../../components/icons/Icons';

import CustomerModal from './CustomerModal';
/* ── COMPONENTE: GESTIÓN DE CLIENTES (DIRECTORIO COMERCIAL / RF-05) ── */
export const ClientsContent = () => {
  const [clientes, setClientes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL'); // ALL, ACTIVE, INACTIVE

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [confirmCustomer, setConfirmCustomer] = useState(null);
  const [toast, setToast] = useState(null);

  const fetchClientes = async () => {
    try {
      setLoading(true);
      const data = await NohemyApi.getClientes();
      const list = Array.isArray(data) ? data : data.results || [];
      setClientes(list);
    } catch (err) {
      setToast({ type: 'error', message: 'Error al cargar clientes: ' + err.message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClientes();
  }, []);

  const handleSaveCustomer = async (customerData) => {
    if (editingCustomer) {
      await NohemyApi.updateCliente(editingCustomer.id_cliente, customerData);
      setToast({ type: 'success', message: `Cliente "${customerData.nombre_completo}" actualizado exitosamente.` });
    } else {
      await NohemyApi.createCliente(customerData);
      setToast({ type: 'success', message: `Cliente "${customerData.nombre_completo}" registrado exitosamente.` });
    }
    fetchClientes();
  };

  const handleConfirmToggle = async () => {
    if (!confirmCustomer) return;
    try {
      const res = await NohemyApi.toggleClienteStatus(confirmCustomer.id_cliente);
      setToast({ type: 'success', message: res.message || 'Estado del cliente actualizado exitosamente.' });
      setConfirmCustomer(null);
      fetchClientes();
    } catch (err) {
      setToast({ type: 'error', message: 'Error: ' + err.message });
      setConfirmCustomer(null);
    }
  };

  // Excluir Consumidor Final (C/F) del listado de la tabla para que sea solo una opción genérica no editable
  const cfClient = useMemo(() => clientes.find(c => c.id_cliente === 1 || c.nombre_completo === 'Consumidor Final' || (c.nit === 'C/F' && c.nombre_completo.toLowerCase().includes('consumidor'))), [clientes]);
  const regularClientes = useMemo(() => clientes.filter(c => !(c.id_cliente === 1 || c.nombre_completo === 'Consumidor Final' || (c.nit === 'C/F' && c.nombre_completo.toLowerCase().includes('consumidor')))), [clientes]);

  const filteredClientes = useMemo(() => {
    let result = [...regularClientes];

    if (statusFilter === 'ACTIVE') {
      result = result.filter(c => c.is_active);
    } else if (statusFilter === 'INACTIVE') {
      result = result.filter(c => !c.is_active);
    }

    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      result = result.filter(c =>
        (c.nombre_completo && c.nombre_completo.toLowerCase().includes(term)) ||
        (c.nit && c.nit.toLowerCase().includes(term)) ||
        (c.dpi && c.dpi.includes(term)) ||
        (c.telefono && c.telefono.includes(term)) ||
        (c.direccion && c.direccion.toLowerCase().includes(term))
      );
    }

    return result.sort((a, b) => {
      if (a.is_active === b.is_active) {
        return a.nombre_completo.localeCompare(b.nombre_completo);
      }
      return a.is_active ? -1 : 1;
    });
  }, [regularClientes, searchTerm, statusFilter]);

  const totalClientes = regularClientes.length;
  const activosCount = regularClientes.filter(c => c.is_active).length;
  const inactivosCount = regularClientes.filter(c => !c.is_active).length;

  return (
    <div>
      {/* Tarjetas KPI de Clientes */}
      <div className="inv-kpi-grid">
        <div className="inv-kpi-card kpi-total">
          <div className="kpi-header">
            <span>Clientes Registrados</span>
            <span style={{ color: 'var(--accent)', display: 'flex' }}><IconUser size={18} /></span>
          </div>
          <div className="kpi-value">{totalClientes}</div>
          <div className="kpi-subtext">Directorio nominal con ficha individual</div>
        </div>

        <div className="inv-kpi-card kpi-success">
          <div className="kpi-header">
            <span>Clientes Activos</span>
            <span style={{ color: '#059669', display: 'flex' }}><IconCheck size={18} /></span>
          </div>
          <div className="kpi-value" style={{ color: '#059669' }}>{activosCount}</div>
          <div className="kpi-subtext">Habilitados para facturar en caja</div>
        </div>

        <div className="inv-kpi-card kpi-warning">
          <div className="kpi-header">
            <span>Opción Consumidor Final</span>
            <span style={{ color: 'var(--accent)', display: 'flex' }}><IconTag size={18} /></span>
          </div>
          <div className="kpi-value" style={{ fontSize: '18px', fontWeight: 800 }}>NIT: C/F</div>
          <div className="kpi-subtext">
            {cfClient ? `${cfClient.total_compras || 0} compras de mostrador (No editable)` : 'Opción fija en POS'}
          </div>
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
                placeholder="Buscar por Nombre, NIT, DPI, Teléfono o Dirección..." 
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
            onClick={() => { setEditingCustomer(null); setIsModalOpen(true); }}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', whiteSpace: 'nowrap' }}
          >
            <IconUser size={16} />
            + Nuevo Cliente
          </button>
        </div>

        <div className="table-responsive">
          <table className="table">
            <thead>
              <tr>
                <th style={{ width: '28%' }}>CLIENTE / RAZÓN SOCIAL</th>
                <th style={{ width: '18%' }}>NIT & DPI</th>
                <th style={{ width: '20%' }}>CONTACTO & DIRECCIÓN</th>
                <th style={{ width: '16%' }}>HISTORIAL DE COMPRAS</th>
                <th style={{ width: '9%', textAlign: 'center' }}>ESTADO</th>
                <th className="text-right" style={{ width: '9%' }}>ACCIONES</th>
              </tr>
            </thead>
            <tbody>
              {loading && clientes.length === 0 ? (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center', padding: '36px', color: 'var(--text-muted)' }}>
                    Cargando directorio de clientes...
                  </td>
                </tr>
              ) : filteredClientes.length === 0 ? (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center', padding: '36px', color: 'var(--text-muted)' }}>
                    No se encontraron clientes con los criterios de búsqueda.
                  </td>
                </tr>
              ) : (
                filteredClientes.map((c) => {
                  const fechaStr = c.fecha_registro 
                    ? new Date(c.fecha_registro).toLocaleDateString('es-GT', { year: 'numeric', month: 'short', day: 'numeric' })
                    : '';

                  return (
                    <tr key={c.id_cliente} className={!c.is_active ? 'row-disabled' : ''}>
                      <td>
                        <div className="user-name-cell">
                          <span className="name-bold" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ color: 'var(--accent)', display: 'flex' }}><IconUser size={16} /></span>
                            {c.nombre_completo}
                            {c.nit === 'C/F' && (
                              <span style={{ fontSize: '10.5px', background: 'rgba(184, 134, 11, 0.15)', color: 'var(--accent)', padding: '1px 6px', borderRadius: '4px', fontWeight: 700 }}>
                                Predeterminado
                              </span>
                            )}
                          </span>
                          {fechaStr && (
                            <span className="email-sub" style={{ fontSize: '11.5px' }}>
                              Registrado: {fechaStr}
                            </span>
                          )}
                        </div>
                      </td>
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>NIT:</span>
                            <code className="user-code" style={{ fontSize: '12px', padding: '2px 6px' }}>{c.nit || 'C/F'}</code>
                          </span>
                          {c.dpi && (
                            <span style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>
                              DPI: {c.dpi}
                            </span>
                          )}
                        </div>
                      </td>
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                          <span style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--text-main)' }}>
                            {c.telefono ? `Tel: ${c.telefono}` : 'Sin teléfono'}
                          </span>
                          <span style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>
                            {c.direccion || 'Sin dirección'}
                          </span>
                        </div>
                      </td>
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                          <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--accent)' }}>
                            Q {Number(c.total_gastado || 0).toLocaleString('es-GT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                            {c.total_compras || 0} compras realizadas
                          </span>
                        </div>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <span className={`status-badge ${c.is_active ? 'active' : 'inactive'}`}>
                          {c.is_active ? '● Activo' : '○ Inactivo'}
                        </span>
                      </td>
                      <td className="text-right">
                        <div className="action-buttons-cell" style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px' }}>
                          <button 
                            type="button"
                            className="btn-icon-btn btn-edit"
                            onClick={() => { setEditingCustomer(c); setIsModalOpen(true); }}
                            title="Editar Cliente"
                          >
                            <IconEdit size={14} />
                            <span>Editar</span>
                          </button>

                          {c.nit !== 'C/F' && (
                            <button 
                              type="button"
                              className={c.is_active ? "btn-icon-btn btn-danger-solid" : "btn-icon-btn btn-success-solid"}
                              onClick={() => setConfirmCustomer(c)}
                              title={c.is_active ? "Dar de Baja (Borrado Lógico)" : "Reactivar Cliente"}
                            >
                              <span>{c.is_active ? 'Dar de baja' : 'Reactivar'}</span>
                            </button>
                          )}
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

      <CustomerModal 
        isOpen={isModalOpen}
        onClose={() => { setIsModalOpen(false); setEditingCustomer(null); }}
        onSave={handleSaveCustomer}
        editingCustomer={editingCustomer}
      />

      <ConfirmModal 
        isOpen={!!confirmCustomer}
        onClose={() => setConfirmCustomer(null)}
        onConfirm={handleConfirmToggle}
        title={confirmCustomer?.is_active ? "Dar de Baja Cliente" : "Reactivar Cliente"}
        message={
          confirmCustomer?.is_active 
            ? `¿Está seguro de dar de baja al cliente "${confirmCustomer?.nombre_completo}"? El historial de facturas se mantendrá protegido bajo borrado lógico.`
            : `¿Desea reactivar al cliente "${confirmCustomer?.nombre_completo}" para permitir facturar a su nombre en el Punto de Venta?`
        }
        isDanger={confirmCustomer?.is_active}
        confirmText={confirmCustomer?.is_active ? "Sí, dar de baja" : "Sí, reactivar"}
      />

      <Toast toast={toast} onClose={() => setToast(null)} />
    </div>
  );
};


export const ClientsPage = () => {
  return (
    <div className="view-panel">
      <ClientsContent />
    </div>
  );
};


export default ClientsPage;

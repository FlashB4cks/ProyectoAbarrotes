import React, { useState, useEffect } from 'react';
import { NohemyApi } from '../../api/nohemyApi';
import { IconPlus, IconSearch, IconUser } from '../../components/icons/Icons';

/* ── COMPONENTE: MODAL PARA SELECCIONAR O CREAR CLIENTE (POS) ── */
export const ClientSelectModal = ({ isOpen, onClose, onSelectClient, selectedClient }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [clientes, setClientes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showNewForm, setShowNewForm] = useState(false);
  const [newClient, setNewClient] = useState({
    nombre_completo: '',
    nit: 'C/F',
    dpi: '',
    telefono: '',
    direccion: ''
  });
  const [savingNew, setSavingNew] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const fetchClientes = async (search = '') => {
    setLoading(true);
    try {
      const data = await NohemyApi.getClientes(search);
      setClientes(Array.isArray(data) ? data : data.results || []);
    } catch {
      // Ignorar
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchClientes(searchTerm);
      setShowNewForm(false);
      setErrorMsg('');
    }
  }, [isOpen]);

  const handleSearch = (e) => {
    const val = e.target.value;
    setSearchTerm(val);
    fetchClientes(val);
  };

  const handleUseCF = async () => {
    try {
      const cf = await NohemyApi.getConsumidorFinal();
      onSelectClient(cf);
      onClose();
    } catch {
      onSelectClient({ id_cliente: null, nombre_completo: 'Consumidor Final', nit: 'C/F' });
      onClose();
    }
  };

  const handleCreateClient = async (e) => {
    e.preventDefault();
    if (!newClient.nombre_completo.trim()) {
      setErrorMsg('El nombre completo o razón social es obligatorio.');
      return;
    }
    const cleanNit = (newClient.nit || '').trim().toUpperCase();
    if (cleanNit === 'C/F' || cleanNit === 'CF') {
      setErrorMsg('Para facturar a Consumidor Final use el botón superior "Usar Consumidor Final (C/F)".');
      return;
    }
    if (cleanNit && /^\d+$/.test(cleanNit) && cleanNit.length > 8) {
      setErrorMsg('El NIT numérico no puede exceder los 8 dígitos.');
      return;
    }
    if (cleanNit && cleanNit.length > 9) {
      setErrorMsg('El NIT no puede exceder los 9 caracteres.');
      return;
    }
    const cleanTel = (newClient.telefono || '').trim().replace(/\D/g, '');
    if (cleanTel && cleanTel.length !== 8) {
      setErrorMsg('El teléfono debe contener exactamente 8 dígitos numéricos.');
      return;
    }
    setSavingNew(true);
    setErrorMsg('');
    try {
      const created = await NohemyApi.createCliente({
        ...newClient,
        nombre_completo: newClient.nombre_completo.trim(),
        nit: cleanNit || 'S/N',
        dpi: (newClient.dpi || '').trim() || null,
        telefono: cleanTel || null,
        direccion: (newClient.direccion || '').trim() || null,
      });
      onSelectClient(created);
      onClose();
    } catch (err) {
      setErrorMsg(err.message || 'Error al guardar cliente.');
    } finally {
      setSavingNew(false);
    }
  };

  if (!isOpen) return null;

  const visibleClientes = clientes.filter(c => !(c.id_cliente === 1 || c.nombre_completo === 'Consumidor Final' || (c.nit === 'C/F' && c.nombre_completo.toLowerCase().includes('consumidor'))));

  return (
    <div className="modal-backdrop" onClick={(e) => { if (e.target.className.includes('modal-backdrop')) onClose(); }}>
      <div className="modal-container" style={{ maxWidth: '620px' }}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ display: 'flex', alignItems: 'center', color: 'var(--accent)' }}>
              <IconUser size={22} />
            </span>
            <div>
              <h3>Seleccionar Cliente</h3>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Asignar comprobante a cliente registrado o nuevo</span>
            </div>
          </div>
          <button className="btn-close" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body">
          <div style={{ display: 'flex', gap: '8px', marginBottom: '14px' }}>
            <button
              type="button"
              className="btn btn-secondary"
              style={{ flex: 1, padding: '10px', fontSize: '13px', fontWeight: 700, borderColor: 'var(--accent)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
              onClick={handleUseCF}
            >
              <IconUser size={15} />
              <span>Usar "Consumidor Final" (C/F)</span>
            </button>
            <button
              type="button"
              className={`btn ${showNewForm ? 'btn-secondary' : 'btn-primary'}`}
              style={{ fontSize: '13px', fontWeight: 700, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
              onClick={() => { setShowNewForm(!showNewForm); setErrorMsg(''); }}
            >
              {showNewForm ? (
                <>
                  <IconSearch size={14} />
                  <span>Buscar Existente</span>
                </>
              ) : (
                <>
                  <IconPlus size={14} />
                  <span>Registrar Nuevo</span>
                </>
              )}
            </button>
          </div>

          {errorMsg && <div className="alert alert-danger" style={{ marginBottom: '12px' }}>{errorMsg}</div>}

          {showNewForm ? (
            <form onSubmit={handleCreateClient} style={{ background: 'var(--input-bg)', padding: '16px', borderRadius: '10px', border: '1px solid var(--card-border)' }}>
              <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', color: 'var(--accent)' }}>Nuevo Cliente Rápido</h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                  <label>Nombre Completo / Razón Social <span className="req">*</span></label>
                  <input
                    type="text"
                    required
                    value={newClient.nombre_completo}
                    onChange={(e) => setNewClient({ ...newClient, nombre_completo: e.target.value })}
                    placeholder="Ej. Juan Pérez / Abarrotes La Bendición"
                    autoFocus
                  />
                </div>
                <div className="form-group">
                  <label>NIT (Máx 9 car. / 8 núm.)</label>
                  <input
                    type="text"
                    value={newClient.nit}
                    onChange={(e) => {
                      const clean = e.target.value.replace(/[^a-zA-Z0-9-]/g, '').toUpperCase().slice(0, 9);
                      const isDigits = /^\d+$/.test(clean);
                      setNewClient({ ...newClient, nit: isDigits ? clean.slice(0, 8) : clean.slice(0, 9) });
                    }}
                    placeholder="Ej. 1234567-8 o 12345678"
                    maxLength={9}
                  />
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    Máx 9 car. con letras o 8 números.
                  </span>
                </div>
                <div className="form-group">
                  <label>DPI / Documento (13 dígitos)</label>
                  <input
                    type="text"
                    value={newClient.dpi}
                    onChange={(e) => setNewClient({ ...newClient, dpi: e.target.value.replace(/\D/g, '').slice(0, 13) })}
                    placeholder="Ej. 2450123450101"
                    maxLength={13}
                  />
                </div>
                <div className="form-group">
                  <label>Teléfono (8 dígitos)</label>
                  <input
                    type="tel"
                    value={newClient.telefono}
                    onChange={(e) => setNewClient({ ...newClient, telefono: e.target.value.replace(/\D/g, '').slice(0, 8) })}
                    placeholder="Ej. 55551234"
                    maxLength={8}
                  />
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    Exactamente 8 dígitos numéricos.
                  </span>
                </div>
                <div className="form-group">
                  <label>Dirección</label>
                  <input
                    type="text"
                    value={newClient.direccion}
                    onChange={(e) => setNewClient({ ...newClient, direccion: e.target.value })}
                    placeholder="Ej. Ciudad de Guatemala"
                  />
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '14px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowNewForm(false)}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary" disabled={savingNew}>
                  {savingNew ? 'Guardando...' : 'Guardar y Asignar'}
                </button>
              </div>
            </form>
          ) : (
            <div>
              <div className="search-box" style={{ marginBottom: '12px' }}>
                <input
                  type="text"
                  placeholder="Buscar por Nombre, NIT o Teléfono..."
                  value={searchTerm}
                  onChange={handleSearch}
                  autoFocus
                />
              </div>

              <div style={{ maxHeight: '280px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {loading ? (
                  <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>Buscando clientes...</div>
                ) : visibleClientes.length === 0 ? (
                  <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>
                    No se encontraron clientes registrados. Puedes registrar uno con "Registrar Nuevo" o usar el botón "Consumidor Final" de arriba.
                  </div>
                ) : (
                  visibleClientes.map(c => {
                    const isSelected = selectedClient?.id_cliente === c.id_cliente;
                    return (
                      <div
                        key={c.id_cliente}
                        onClick={() => { onSelectClient(c); onClose(); }}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '10px 14px',
                          borderRadius: '8px',
                          border: isSelected ? '2px solid var(--accent)' : '1px solid var(--card-border)',
                          background: isSelected ? 'rgba(184, 134, 11, 0.12)' : 'var(--input-bg)',
                          cursor: 'pointer',
                          transition: 'var(--transition)'
                        }}
                      >
                        <div>
                          <strong style={{ fontSize: '13.5px', color: 'var(--text-main)', display: 'block' }}>
                            {c.nombre_completo}
                          </strong>
                          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                            NIT: <code className="user-code" style={{ fontSize: '11px', padding: '1px 5px' }}>{c.nit}</code>
                            {c.telefono ? ` • Tel: ${c.telefono}` : ''}
                            {c.dpi ? ` • DPI: ${c.dpi}` : ''}
                          </span>
                        </div>
                        <button
                          type="button"
                          className="btn btn-secondary"
                          style={{ fontSize: '12px', padding: '4px 10px' }}
                          onClick={(e) => { e.stopPropagation(); onSelectClient(c); onClose(); }}
                        >
                          {isSelected ? '✓ Actual' : 'Seleccionar'}
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};


export default ClientSelectModal;

import React, { useState, useEffect, useMemo } from 'react';
import { NohemyApi } from '../../api/nohemyApi';
import { Toast, ConfirmModal, CredentialsModal } from '../../components/common';

import UserModal from './UserModal';
import RolModal from './RolModal';
/* ── COMPONENTE: GESTIÓN DE USUARIOS ── */
export const UserTable = ({ users, onEdit, onToggleStatus, onNewUser }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const filteredUsers = useMemo(() => {
    let result = [...users];
    if (statusFilter === 'ACTIVE') result = result.filter(u => u.is_active);
    else if (statusFilter === 'INACTIVE') result = result.filter(u => !u.is_active);

    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      result = result.filter(u => 
        (u.username && u.username.toLowerCase().includes(term)) ||
        (u.first_name && u.first_name.toLowerCase().includes(term)) ||
        (u.last_name && u.last_name.toLowerCase().includes(term)) ||
        (u.email && u.email.toLowerCase().includes(term))
      );
    }

    // Prioridad a usuarios activos: los dados de baja van hasta abajo
    return result.sort((a, b) => {
      if (a.is_active === b.is_active) return 0;
      return a.is_active ? -1 : 1;
    });
  }, [users, searchTerm, statusFilter]);

  return (
    <div className="card">
      <div className="card-header">
        <div className="search-and-filter-group">
          <div className="search-box">
            <input type="text" placeholder="Buscar por Nombre, Usuario o Correo..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
          </div>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="select-status-filter">
            <option value="ALL">Todos los Estados</option>
            <option value="ACTIVE">Solo Activos (Ocultar dados de baja)</option>
            <option value="INACTIVE">Solo Dados de Baja</option>
          </select>
        </div>
        <button className="btn btn-primary" onClick={onNewUser}>Nuevo Empleado</button>
      </div>

      <div className="table-responsive">
        <table className="table">
          <thead>
            <tr>
              <th>Nombre Completo</th>
              <th>Usuario</th>
              <th>Puesto / Rol</th>
              <th>Estado</th>
              <th className="text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.length === 0 ? (
              <tr><td colSpan="5" style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>No se encontraron empleados.</td></tr>
            ) : (
              filteredUsers.map((user) => (
                <tr key={user.id} className={!user.is_active ? 'row-disabled' : ''}>
                  <td><div className="user-name-cell"><span className="name-bold">{user.first_name} {user.last_name}</span><span className="email-sub">{user.email}</span></div></td>
                  <td><code className="user-code">@{user.username}</code></td>
                  <td><span className={`role-badge role-${user.rol?.toLowerCase()}`}>{user.rol_display || user.rol}</span></td>
                  <td><span className={`status-badge ${user.is_active ? 'active' : 'inactive'}`}>{user.is_active ? '● Activo' : '○ Dado de Baja'}</span></td>
                  <td>
                    <div className="actions-cell">
                      <button className="btn-icon-btn btn-edit" onClick={() => onEdit(user)}>Editar</button>
                      <button className={`btn-icon-btn ${user.is_active ? 'btn-danger-solid' : 'btn-success-solid'}`} onClick={() => onToggleStatus(user)}>
                        {user.is_active ? 'Dar de Baja' : 'Reactivar'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};


export const UsersPage = () => {
  const [activeSubTab, setActiveSubTab] = useState('usuarios'); // 'usuarios' | 'roles'
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modals de Usuarios
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [confirmUser, setConfirmUser] = useState(null);
  const [newCredentials, setNewCredentials] = useState(null);

  // Modals de Roles
  const [isRolModalOpen, setIsRolModalOpen] = useState(false);
  const [editingRol, setEditingRol] = useState(null);
  const [confirmRol, setConfirmRol] = useState(null);
  const [rolSearchTerm, setRolSearchTerm] = useState('');

  const [toast, setToast] = useState(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [uData, rData] = await Promise.all([
        NohemyApi.getUsers(),
        NohemyApi.getRoles(),
      ]);
      setUsers(Array.isArray(uData) ? uData : uData.results || []);
      setRoles(Array.isArray(rData) ? rData : rData.results || []);
    } catch (err) {
      setToast({ type: 'error', message: 'Error al cargar empleados y roles: ' + err.message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { 
    fetchData(); 
  }, []);

  /* ── GESTIÓN DE USUARIOS ── */
  const handleSaveUser = async (formData) => {
    try {
      if (editingUser) {
        await NohemyApi.updateUser(editingUser.id, formData);
        setToast({ type: 'success', message: 'Datos del empleado actualizados correctamente.' });
        setIsModalOpen(false);
      } else {
        const createdUser = await NohemyApi.createUser(formData);
        setIsModalOpen(false);
        setNewCredentials({
          nombre: `${createdUser.first_name} ${createdUser.last_name}`,
          username: createdUser.username,
          contrasena: createdUser.contrasena_generada || 'N/A',
          rol: createdUser.rol_display || createdUser.rol
        });
        setToast({ type: 'success', message: `Empleado @${createdUser.username} creado exitosamente.` });
      }
      fetchData();
    } catch (err) {
      setToast({ type: 'error', message: err.message });
    }
  };

  const handleConfirmToggleStatus = async () => {
    if (!confirmUser) return;
    try {
      const res = await NohemyApi.toggleUserStatus(confirmUser.id);
      setToast({ type: 'success', message: res.message });
      setConfirmUser(null);
      fetchData();
    } catch (err) {
      setToast({ type: 'error', message: 'Error al cambiar estado: ' + err.message });
    }
  };

  /* ── GESTIÓN DE ROLES ── */
  const filteredRoles = useMemo(() => {
    let result = [...roles];
    if (rolSearchTerm.trim()) {
      const term = rolSearchTerm.toLowerCase();
      result = result.filter(r => 
        (r.codigo && r.codigo.toLowerCase().includes(term)) ||
        (r.nombre && r.nombre.toLowerCase().includes(term)) ||
        (r.descripcion && r.descripcion.toLowerCase().includes(term)) ||
        (r.permisos && r.permisos.toLowerCase().includes(term))
      );
    }
    return result.sort((a, b) => {
      if (a.is_active === b.is_active) return a.nombre.localeCompare(b.nombre);
      return a.is_active ? -1 : 1;
    });
  }, [roles, rolSearchTerm]);

  const handleSaveRol = async (formData) => {
    try {
      if (editingRol) {
        await NohemyApi.updateRol(editingRol.id_rol, formData);
        setToast({ type: 'success', message: `Rol "${formData.nombre}" actualizado con éxito.` });
      } else {
        await NohemyApi.createRol(formData);
        setToast({ type: 'success', message: `Rol "${formData.nombre}" creado exitosamente.` });
      }
      setIsRolModalOpen(false);
      fetchData();
    } catch (err) {
      setToast({ type: 'error', message: err.message });
    }
  };

  const handleConfirmToggleRol = async () => {
    if (!confirmRol) return;
    try {
      const res = await NohemyApi.toggleRolStatus(confirmRol.id_rol);
      setToast({ type: 'success', message: res.message });
      setConfirmRol(null);
      fetchData();
    } catch (err) {
      setToast({ type: 'error', message: err.message });
    }
  };

  return (
    <div className="view-panel">
      {/* Sub-tabs de Empleados vs Roles */}
      <div className="tab-pill-group">
        <button 
          className={`tab-pill ${activeSubTab === 'usuarios' ? 'active' : ''}`}
          onClick={() => setActiveSubTab('usuarios')}
        >
          Directorio de Empleados ({users.length})
        </button>
        <button 
          className={`tab-pill ${activeSubTab === 'roles' ? 'active' : ''}`}
          onClick={() => setActiveSubTab('roles')}
        >
          Mantenimiento de Roles ({roles.length})
        </button>
      </div>

      {activeSubTab === 'usuarios' && (
        <UserTable 
          users={users}
          onEdit={(u) => { setEditingUser(u); setIsModalOpen(true); }}
          onToggleStatus={(u) => setConfirmUser(u)}
          onNewUser={() => { setEditingUser(null); setIsModalOpen(true); }}
        />
      )}

      {activeSubTab === 'roles' && (
        <div className="card">
          <div className="card-header">
            <div className="search-and-filter-group">
              <div className="search-box">
                <input 
                  type="text" 
                  placeholder="Buscar roles por código, nombre o descripción..." 
                  value={rolSearchTerm} 
                  onChange={(e) => setRolSearchTerm(e.target.value)} 
                />
              </div>
            </div>
            <button className="btn btn-primary" onClick={() => { setEditingRol(null); setIsRolModalOpen(true); }}>
              + Nuevo Rol
            </button>
          </div>

          <div className="table-responsive">
            <table className="table">
              <thead>
                <tr>
                  <th>Código de Rol</th>
                  <th>Nombre del Rol</th>
                  <th>Descripción y Alcance</th>
                  <th>Permisos / Funciones</th>
                  <th>Empleados</th>
                  <th>Estado</th>
                  <th className="text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {loading && roles.length === 0 ? (
                  <tr><td colSpan="7" style={{ textAlign: 'center', padding: '32px' }}>Cargando roles del sistema...</td></tr>
                ) : filteredRoles.length === 0 ? (
                  <tr><td colSpan="7" style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>No se encontraron roles registrados.</td></tr>
                ) : (
                  filteredRoles.map((r) => (
                    <tr key={r.id_rol} className={!r.is_active ? 'row-disabled' : ''}>
                      <td>
                        <span className={`role-badge role-${r.codigo?.toLowerCase()}`}>
                          {r.codigo}
                        </span>
                      </td>
                      <td>
                        <strong style={{ fontSize: '14.5px', color: 'var(--text-main)' }}>{r.nombre}</strong>
                      </td>
                      <td>
                        <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{r.descripcion || '—'}</span>
                      </td>
                      <td>
                        <span style={{ fontSize: '12.5px', color: 'var(--text-main)' }}>{r.permisos || 'Estándar'}</span>
                      </td>
                      <td>
                        <strong style={{ color: 'var(--accent)', fontSize: '14px' }}>
                          {r.usuarios_asignados ?? 0}
                        </strong>
                      </td>
                      <td>
                        <span className={`status-badge ${r.is_active ? 'active' : 'inactive'}`}>
                          {r.is_active ? '● Activo' : '○ Inactivo'}
                        </span>
                      </td>
                      <td>
                        <div className="actions-cell">
                          <button className="btn-icon-btn btn-edit" onClick={() => { setEditingRol(r); setIsRolModalOpen(true); }}>
                            Editar
                          </button>
                          <button 
                            className={`btn-icon-btn ${r.is_active ? 'btn-danger-solid' : 'btn-success-solid'}`} 
                            onClick={() => setConfirmRol(r)}
                          >
                            {r.is_active ? 'Desactivar' : 'Activar'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modals de Usuario */}
      <UserModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onSave={handleSaveUser} 
        editingUser={editingUser} 
        users={users}
        roles={roles}
      />
      <CredentialsModal isOpen={Boolean(newCredentials)} onClose={() => setNewCredentials(null)} credentials={newCredentials} />
      <ConfirmModal 
        isOpen={Boolean(confirmUser)} 
        onClose={() => setConfirmUser(null)} 
        onConfirm={handleConfirmToggleStatus} 
        title={confirmUser?.is_active ? 'Dar de Baja' : 'Reactivar Empleado'}
        message={`¿Está seguro de ${confirmUser?.is_active ? 'dar de baja' : 'reactivar'} a @${confirmUser?.username}?`}
        isDanger={confirmUser?.is_active}
        confirmText={confirmUser?.is_active ? 'Dar de Baja' : 'Reactivar'}
      />

      {/* Modals de Rol */}
      <RolModal 
        isOpen={isRolModalOpen} 
        onClose={() => setIsRolModalOpen(false)} 
        onSave={handleSaveRol} 
        editingRol={editingRol} 
      />
      <ConfirmModal 
        isOpen={Boolean(confirmRol)} 
        onClose={() => setConfirmRol(null)} 
        onConfirm={handleConfirmToggleRol} 
        title={confirmRol?.is_active ? 'Desactivar Rol' : 'Activar Rol'}
        message={`¿Está seguro de ${confirmRol?.is_active ? 'desactivar' : 'activar'} el rol "${confirmRol?.nombre}"?`}
        isDanger={confirmRol?.is_active}
        confirmText={confirmRol?.is_active ? 'Desactivar' : 'Activar'}
      />

      <Toast toast={toast} onClose={() => setToast(null)} />
    </div>
  );
};


export default UsersPage;

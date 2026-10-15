import React, { useState, useEffect, useMemo } from 'react';
import { NohemyApi } from '../../api/nohemyApi';
import { Toast, ConfirmModal } from '../../components/common';

import ProductModal from './ProductModal';
import MarcaModal from './MarcaModal';
import UnidadModal from './UnidadModal';
import CategoriaModal from './CategoriaModal';
import SupplierModal from '../suppliers/SupplierModal';
/* ── COMPONENTE: GESTIÓN DE PRODUCTOS, MARCAS Y UNIDADES ── */
export const ProductsPage = ({ onOpenScanner }) => {
  const [activeSubTab, setActiveSubTab] = useState('productos'); // 'productos' | 'marcas' | 'unidades'
  const [products, setProducts] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [unidades, setUnidades] = useState([]);
  const [marcas, setMarcas] = useState([]);
  const [proveedores, setProveedores] = useState([]);

  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [marcaFilter, setMarcaFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ACTIVE');
  const [stockFilter, setStockFilter] = useState('ALL');

  // Modals de Productos
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [confirmProduct, setConfirmProduct] = useState(null);

  // Modals de Marcas
  const [isMarcaModalOpen, setIsMarcaModalOpen] = useState(false);
  const [editingMarca, setEditingMarca] = useState(null);
  const [confirmMarca, setConfirmMarca] = useState(null);
  const [marcaSearchTerm, setMarcaSearchTerm] = useState('');

  // Modals de Categorías
  const [isCategoriaModalOpen, setIsCategoriaModalOpen] = useState(false);
  const [editingCategoria, setEditingCategoria] = useState(null);
  const [confirmCategoria, setConfirmCategoria] = useState(null);
  const [categoriaSearchTerm, setCategoriaSearchTerm] = useState('');

  // Modals de Unidades
  const [isUnidadModalOpen, setIsUnidadModalOpen] = useState(false);
  const [editingUnidad, setEditingUnidad] = useState(null);
  const [confirmUnidad, setConfirmUnidad] = useState(null);
  const [unidadSearchTerm, setUnidadSearchTerm] = useState('');

  const [toast, setToast] = useState(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [pData, cData, uData, prData, mData] = await Promise.all([
        NohemyApi.getProductos(),
        NohemyApi.getCategorias(),
        NohemyApi.getUnidades(),
        NohemyApi.getProveedores(),
        NohemyApi.getMarcas(),
      ]);
      setProducts(Array.isArray(pData) ? pData : pData.results || []);
      setCategorias(Array.isArray(cData) ? cData : cData.results || []);
      setUnidades(Array.isArray(uData) ? uData : uData.results || []);
      setProveedores(Array.isArray(prData) ? prData : prData.results || []);
      setMarcas(Array.isArray(mData) ? mData : mData.results || []);
    } catch (err) {
      setToast({ type: 'error', message: 'Error al cargar inventario: ' + err.message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Si se escanea un código de barras en la vista de productos sin ningún modal abierto, filtra el producto al instante
  useEffect(() => {
    const handleBarcodeEvent = (e) => {
      if (!isModalOpen && !isMarcaModalOpen && !isUnidadModalOpen && e.detail?.code) {
        setSearchTerm(e.detail.code);
        setActiveSubTab('productos');
      }
    };
    window.addEventListener('nohemysys:barcode', handleBarcodeEvent);
    return () => window.removeEventListener('nohemysys:barcode', handleBarcodeEvent);
  }, [isModalOpen, isMarcaModalOpen, isUnidadModalOpen]);

  // Búsqueda concatenada de productos (nombre, código de barras, marca, descripción, categoría, proveedor)
  const filteredProducts = useMemo(() => {
    let result = [...products];

    if (statusFilter === 'ACTIVE') result = result.filter(p => p.is_active);
    else if (statusFilter === 'INACTIVE') result = result.filter(p => !p.is_active);

    if (categoryFilter !== 'ALL') {
      result = result.filter(p => String(p.categoria) === String(categoryFilter));
    }

    if (marcaFilter !== 'ALL') {
      result = result.filter(p => String(p.marca) === String(marcaFilter));
    }

    if (stockFilter === 'LOW') {
      result = result.filter(p => p.stock_total <= p.stock_minimo);
    } else if (stockFilter === 'OUT') {
      result = result.filter(p => p.stock_total === 0);
    }

    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      result = result.filter(p => 
        (p.nombre && p.nombre.toLowerCase().includes(term)) ||
        (p.codigo_barras && p.codigo_barras.toLowerCase().includes(term)) ||
        (p.descripcion && p.descripcion.toLowerCase().includes(term)) ||
        (p.marca_nombre && p.marca_nombre.toLowerCase().includes(term)) ||
        (p.categoria_nombre && p.categoria_nombre.toLowerCase().includes(term)) ||
        (p.proveedor_empresa && p.proveedor_empresa.toLowerCase().includes(term))
      );
    }

    // Prioridad a productos activos: los dados de baja van hasta abajo
    return result.sort((a, b) => {
      if (a.is_active === b.is_active) return 0;
      return a.is_active ? -1 : 1;
    });
  }, [products, searchTerm, categoryFilter, marcaFilter, statusFilter, stockFilter]);

  // Filtro de Marcas
  const filteredMarcas = useMemo(() => {
    let result = [...marcas];
    if (marcaSearchTerm.trim()) {
      const term = marcaSearchTerm.toLowerCase();
      result = result.filter(m => 
        (m.nombre && m.nombre.toLowerCase().includes(term)) ||
        (m.descripcion && m.descripcion.toLowerCase().includes(term))
      );
    }
    return result.sort((a, b) => {
      if (a.is_active === b.is_active) return a.nombre.localeCompare(b.nombre);
      return a.is_active ? -1 : 1;
    });
  }, [marcas, marcaSearchTerm]);

  // Filtro de Categorías
  const filteredCategorias = useMemo(() => {
    let result = [...categorias];
    if (categoriaSearchTerm.trim()) {
      const term = categoriaSearchTerm.toLowerCase();
      result = result.filter(c => 
        (c.nombre && c.nombre.toLowerCase().includes(term)) ||
        (c.descripcion && c.descripcion.toLowerCase().includes(term))
      );
    }
    return result.sort((a, b) => {
      if (a.is_active === b.is_active) return a.nombre.localeCompare(b.nombre);
      return a.is_active ? -1 : 1;
    });
  }, [categorias, categoriaSearchTerm]);

  // Filtro de Unidades
  const filteredUnidades = useMemo(() => {
    let result = [...unidades];
    if (unidadSearchTerm.trim()) {
      const term = unidadSearchTerm.toLowerCase();
      result = result.filter(u => 
        (u.nombre && u.nombre.toLowerCase().includes(term)) ||
        (u.simbolo && u.simbolo.toLowerCase().includes(term))
      );
    }
    return result.sort((a, b) => {
      if (a.is_active === b.is_active) return a.nombre.localeCompare(b.nombre);
      return a.is_active ? -1 : 1;
    });
  }, [unidades, unidadSearchTerm]);

  /* ── OPERACIONES DE PRODUCTOS ── */
  const handleNewProduct = () => {
    setEditingProduct(null);
    setIsModalOpen(true);
  };

  const handleEditProduct = (prod) => {
    setEditingProduct(prod);
    setIsModalOpen(true);
  };

  const handleSaveProduct = async (data) => {
    try {
      if (editingProduct) {
        await NohemyApi.updateProducto(editingProduct.id_producto, data);
        setToast({ type: 'success', message: `Producto "${data.nombre}" actualizado correctamente.` });
      } else {
        await NohemyApi.createProducto(data);
        setToast({ type: 'success', message: `Producto "${data.nombre}" registrado exitosamente.` });
      }
      setIsModalOpen(false);
      fetchData();
    } catch (err) {
      setToast({ type: 'error', message: err.message });
    }
  };

  const handleConfirmToggleStatus = async () => {
    if (!confirmProduct) return;
    try {
      const res = await NohemyApi.toggleProductoStatus(confirmProduct.id_producto);
      setToast({ type: 'success', message: res.message });
      setConfirmProduct(null);
      fetchData();
    } catch (err) {
      setToast({ type: 'error', message: err.message });
    }
  };

  /* ── OPERACIONES DE MARCAS ── */
  const handleSaveMarca = async (data) => {
    try {
      if (editingMarca) {
        await NohemyApi.updateMarca(editingMarca.id_marca, data);
        setToast({ type: 'success', message: `Marca "${data.nombre}" actualizada exitosamente.` });
      } else {
        await NohemyApi.createMarca(data);
        setToast({ type: 'success', message: `Marca "${data.nombre}" creada exitosamente.` });
      }
      setIsMarcaModalOpen(false);
      fetchData();
    } catch (err) {
      setToast({ type: 'error', message: err.message });
    }
  };

  const handleToggleMarca = async () => {
    if (!confirmMarca) return;
    try {
      const res = await NohemyApi.toggleMarcaStatus(confirmMarca.id_marca);
      setToast({ type: 'success', message: res.message });
      setConfirmMarca(null);
      fetchData();
    } catch (err) {
      setToast({ type: 'error', message: err.message });
    }
  };

  /* ── OPERACIONES DE CATEGORÍAS ── */
  const handleSaveCategoria = async (data) => {
    try {
      if (editingCategoria) {
        await NohemyApi.updateCategoria(editingCategoria.id_categoria, data);
        setToast({ type: 'success', message: `Categoría "${data.nombre}" actualizada exitosamente.` });
      } else {
        await NohemyApi.createCategoria(data);
        setToast({ type: 'success', message: `Categoría "${data.nombre}" creada exitosamente.` });
      }
      setIsCategoriaModalOpen(false);
      fetchData();
    } catch (err) {
      setToast({ type: 'error', message: err.message });
    }
  };

  const handleToggleCategoria = async () => {
    if (!confirmCategoria) return;
    try {
      const res = await NohemyApi.toggleCategoriaStatus(confirmCategoria.id_categoria);
      setToast({ type: 'success', message: res.message });
      setConfirmCategoria(null);
      fetchData();
    } catch (err) {
      setToast({ type: 'error', message: err.message });
    }
  };

  /* ── OPERACIONES DE UNIDADES ── */
  const handleSaveUnidad = async (data) => {
    try {
      if (editingUnidad) {
        await NohemyApi.updateUnidad(editingUnidad.id_unidad, data);
        setToast({ type: 'success', message: `Unidad "${data.nombre}" actualizada exitosamente.` });
      } else {
        await NohemyApi.createUnidad(data);
        setToast({ type: 'success', message: `Unidad "${data.nombre}" registrada exitosamente.` });
      }
      setIsUnidadModalOpen(false);
      fetchData();
    } catch (err) {
      setToast({ type: 'error', message: err.message });
    }
  };

  const handleToggleUnidad = async () => {
    if (!confirmUnidad) return;
    try {
      const res = await NohemyApi.toggleUnidadStatus(confirmUnidad.id_unidad);
      setToast({ type: 'success', message: res.message });
      setConfirmUnidad(null);
      fetchData();
    } catch (err) {
      setToast({ type: 'error', message: err.message });
    }
  };

  return (
    <div className="view-panel">
      {/* Pestañas secundarias de catálogo */}
      <div className="tab-pill-group">
        <button 
          className={`tab-pill ${activeSubTab === 'productos' ? 'active' : ''}`}
          onClick={() => setActiveSubTab('productos')}
        >
          Catálogo de Productos ({products.length})
        </button>
        <button 
          className={`tab-pill ${activeSubTab === 'categorias' ? 'active' : ''}`}
          onClick={() => setActiveSubTab('categorias')}
        >
          Gestión de Categorías ({categorias.length})
        </button>
        <button 
          className={`tab-pill ${activeSubTab === 'marcas' ? 'active' : ''}`}
          onClick={() => setActiveSubTab('marcas')}
        >
          Gestión de Marcas ({marcas.length})
        </button>
        <button 
          className={`tab-pill ${activeSubTab === 'unidades' ? 'active' : ''}`}
          onClick={() => setActiveSubTab('unidades')}
        >
          Catálogo de Unidades ({unidades.length})
        </button>
      </div>

      {/* SUBTAB: PRODUCTOS */}
      {activeSubTab === 'productos' && (
        <div className="card">
          <div className="card-header" style={{ flexWrap: 'wrap' }}>
            <div className="search-and-filter-group" style={{ maxWidth: '100%' }}>
              <div className="search-box">
                <input 
                  type="text" 
                  placeholder="Buscar por Marca, Producto, Código, Descripción, Proveedor..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              <select 
                value={categoryFilter} 
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="select-status-filter"
              >
                <option value="ALL">Todas las Categorías</option>
                {categorias.map(c => <option key={c.id_categoria} value={c.id_categoria}>{c.nombre}</option>)}
              </select>

              <select 
                value={marcaFilter} 
                onChange={(e) => setMarcaFilter(e.target.value)}
                className="select-status-filter"
              >
                <option value="ALL">Todas las Marcas</option>
                {marcas.map(m => <option key={m.id_marca} value={m.id_marca}>{m.nombre}</option>)}
              </select>

              <select 
                value={stockFilter} 
                onChange={(e) => setStockFilter(e.target.value)}
                className="select-status-filter"
              >
                <option value="ALL">Todos los Niveles de Stock</option>
                <option value="LOW">Solo Stock Bajo</option>
                <option value="OUT">Solo Agotados</option>
              </select>

              <select 
                value={statusFilter} 
                onChange={(e) => setStatusFilter(e.target.value)}
                className="select-status-filter"
              >
                <option value="ACTIVE">Solo Activos</option>
                <option value="INACTIVE">Solo Dados de Baja</option>
                <option value="ALL">Todos los Estados</option>
              </select>
            </div>

            <button className="btn btn-primary" onClick={handleNewProduct}>
              Nuevo Producto
            </button>
          </div>

          <div className="table-responsive">
            <table className="table">
              <thead>
                <tr>
                  <th>Código de Barras</th>
                  <th>Producto / Marca</th>
                  <th>Categoría</th>
                  <th>Precio Venta</th>
                  <th>Stock Actual</th>
                  <th>Estado Stock</th>
                  <th className="text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {loading && products.length === 0 ? (
                  <tr><td colSpan="7" style={{ textAlign: 'center', padding: '32px' }}>Cargando catálogo de productos...</td></tr>
                ) : filteredProducts.length === 0 ? (
                  <tr><td colSpan="7" style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>No se encontraron productos con los filtros aplicados.</td></tr>
                ) : (
                  filteredProducts.map((p) => {
                    const isStockLow = p.stock_total <= p.stock_minimo && p.stock_total > 0;
                    const isOut = p.stock_total === 0;

                    return (
                      <tr key={p.id_producto} className={!p.is_active ? 'row-disabled' : ''}>
                        <td>
                          <code className="user-code">{p.codigo_barras}</code>
                        </td>
                        <td>
                          <div className="user-name-cell">
                            <span className="name-bold">{p.nombre}</span>
                            <span className="email-sub">
                              {p.marca_nombre ? <strong style={{ color: 'var(--accent)' }}>{p.marca_nombre} • </strong> : ''}
                              {p.unidad_simbolo ? `${p.unidad_simbolo} • ` : ''}
                              {p.proveedor_empresa || 'Sin proveedor'}
                            </span>
                          </div>
                        </td>
                        <td>
                          <span className="category-badge">
                            {p.categoria_nombre || 'General'}
                          </span>
                        </td>
                        <td>
                          <strong style={{ color: 'var(--accent)', fontSize: '15px' }}>
                            Q {parseFloat(p.precio_venta).toFixed(2)}
                          </strong>
                        </td>
                        <td>
                          <span style={{ fontWeight: 700, fontSize: '14px' }}>
                            {p.stock_total} {p.unidad_simbolo || 'unidades'}
                          </span>
                        </td>
                        <td>
                          {isOut ? (
                            <span className="stock-badge stock-danger">○ Agotado</span>
                          ) : isStockLow ? (
                            <span className="stock-badge stock-warning">● Stock Bajo (Mín: {p.stock_minimo})</span>
                          ) : (
                            <span className="stock-badge stock-success">● Stock Normal</span>
                          )}
                        </td>
                        <td>
                          <div className="actions-cell">
                            <button className="btn-icon-btn btn-edit" onClick={() => handleEditProduct(p)}>Editar</button>
                            <button 
                              className={`btn-icon-btn ${p.is_active ? 'btn-danger-solid' : 'btn-success-solid'}`} 
                              onClick={() => setConfirmProduct(p)}
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
      )}

      {/* SUBTAB: CATEGORIAS */}
      {activeSubTab === 'categorias' && (
        <div className="card">
          <div className="card-header">
            <div className="search-and-filter-group">
              <div className="search-box">
                <input 
                  type="text" 
                  placeholder="Buscar categorías por nombre o descripción..." 
                  value={categoriaSearchTerm}
                  onChange={(e) => setCategoriaSearchTerm(e.target.value)}
                />
              </div>
            </div>
            <button className="btn btn-primary" onClick={() => { setEditingCategoria(null); setIsCategoriaModalOpen(true); }}>
              + Nueva Categoría
            </button>
          </div>

          <div className="table-responsive">
            <table className="table">
              <thead>
                <tr>
                  <th>Nombre de Categoría</th>
                  <th>Descripción</th>
                  <th>Estado</th>
                  <th className="text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filteredCategorias.length === 0 ? (
                  <tr><td colSpan="4" style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>No se encontraron categorías registradas.</td></tr>
                ) : (
                  filteredCategorias.map((c) => (
                    <tr key={c.id_categoria} className={!c.is_active ? 'row-disabled' : ''}>
                      <td>
                        <strong style={{ fontSize: '14.5px', color: 'var(--text-main)' }}>{c.nombre}</strong>
                      </td>
                      <td>
                        <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{c.descripcion || '—'}</span>
                      </td>
                      <td>
                        <span className={`status-badge ${c.is_active ? 'active' : 'inactive'}`}>
                          {c.is_active ? '● Activa' : '○ Dada de Baja'}
                        </span>
                      </td>
                      <td>
                        <div className="actions-cell">
                          <button className="btn-icon-btn btn-edit" onClick={() => { setEditingCategoria(c); setIsCategoriaModalOpen(true); }}>
                            Editar
                          </button>
                          <button 
                            className={`btn-icon-btn ${c.is_active ? 'btn-danger-solid' : 'btn-success-solid'}`}
                            onClick={() => setConfirmCategoria(c)}
                          >
                            {c.is_active ? 'Dar de Baja' : 'Reactivar'}
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

      {/* SUBTAB: MARCAS */}
      {activeSubTab === 'marcas' && (
        <div className="card">
          <div className="card-header">
            <div className="search-and-filter-group">
              <div className="search-box">
                <input 
                  type="text" 
                  placeholder="Buscar marcas por nombre o descripción..." 
                  value={marcaSearchTerm}
                  onChange={(e) => setMarcaSearchTerm(e.target.value)}
                />
              </div>
            </div>
            <button className="btn btn-primary" onClick={() => { setEditingMarca(null); setIsMarcaModalOpen(true); }}>
              + Nueva Marca
            </button>
          </div>

          <div className="table-responsive">
            <table className="table">
              <thead>
                <tr>
                  <th>Nombre de Marca</th>
                  <th>Descripción</th>
                  <th>Estado</th>
                  <th className="text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filteredMarcas.length === 0 ? (
                  <tr><td colSpan="4" style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>No se encontraron marcas registradas.</td></tr>
                ) : (
                  filteredMarcas.map((m) => (
                    <tr key={m.id_marca} className={!m.is_active ? 'row-disabled' : ''}>
                      <td>
                        <strong style={{ fontSize: '14.5px', color: 'var(--text-main)' }}>{m.nombre}</strong>
                      </td>
                      <td>
                        <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{m.descripcion || '—'}</span>
                      </td>
                      <td>
                        <span className={`status-badge ${m.is_active ? 'active' : 'inactive'}`}>
                          {m.is_active ? '● Activa' : '○ Dada de Baja'}
                        </span>
                      </td>
                      <td>
                        <div className="actions-cell">
                          <button className="btn-icon-btn btn-edit" onClick={() => { setEditingMarca(m); setIsMarcaModalOpen(true); }}>
                            Editar
                          </button>
                          <button 
                            className={`btn-icon-btn ${m.is_active ? 'btn-danger-solid' : 'btn-success-solid'}`}
                            onClick={() => setConfirmMarca(m)}
                          >
                            {m.is_active ? 'Dar de Baja' : 'Reactivar'}
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

      {/* SUBTAB: UNIDADES DE MEDIDA */}
      {activeSubTab === 'unidades' && (
        <div className="card">
          <div className="card-header">
            <div className="search-and-filter-group">
              <div className="search-box">
                <input 
                  type="text" 
                  placeholder="Buscar unidad por nombre o símbolo..." 
                  value={unidadSearchTerm}
                  onChange={(e) => setUnidadSearchTerm(e.target.value)}
                />
              </div>
            </div>
            <button className="btn btn-primary" onClick={() => { setEditingUnidad(null); setIsUnidadModalOpen(true); }}>
              + Nueva Unidad
            </button>
          </div>

          <div className="table-responsive">
            <table className="table">
              <thead>
                <tr>
                  <th>Nombre de la Unidad</th>
                  <th>Símbolo / Abreviatura</th>
                  <th>Estado</th>
                  <th className="text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filteredUnidades.length === 0 ? (
                  <tr><td colSpan="4" style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>No se encontraron unidades de medida.</td></tr>
                ) : (
                  filteredUnidades.map((u) => (
                    <tr key={u.id_unidad} className={!u.is_active ? 'row-disabled' : ''}>
                      <td>
                        <strong style={{ fontSize: '14.5px', color: 'var(--text-main)' }}>{u.nombre}</strong>
                      </td>
                      <td>
                        <code className="user-code" style={{ fontSize: '13px', fontWeight: 700 }}>{u.simbolo}</code>
                      </td>
                      <td>
                        <span className={`status-badge ${u.is_active ? 'active' : 'inactive'}`}>
                          {u.is_active ? '● Activa' : '○ Dada de Baja'}
                        </span>
                      </td>
                      <td>
                        <div className="actions-cell">
                          <button className="btn-icon-btn btn-edit" onClick={() => { setEditingUnidad(u); setIsUnidadModalOpen(true); }}>
                            Editar
                          </button>
                          <button 
                            className={`btn-icon-btn ${u.is_active ? 'btn-danger-solid' : 'btn-success-solid'}`}
                            onClick={() => setConfirmUnidad(u)}
                          >
                            {u.is_active ? 'Dar de Baja' : 'Reactivar'}
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

      {/* Modals de Producto */}
      <ProductModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveProduct}
        editingProduct={editingProduct}
        categorias={categorias}
        unidades={unidades}
        marcas={marcas}
        proveedores={proveedores}
        onOpenScanner={onOpenScanner}
        onRefreshProveedores={fetchData}
      />

      <ConfirmModal 
        isOpen={Boolean(confirmProduct)}
        onClose={() => setConfirmProduct(null)}
        onConfirm={handleConfirmToggleStatus}
        title={confirmProduct?.is_active ? 'Dar de Baja Producto' : 'Reactivar Producto'}
        message={`¿Está seguro de ${confirmProduct?.is_active ? 'dar de baja' : 'reactivar'} el producto "${confirmProduct?.nombre}"?`}
        isDanger={confirmProduct?.is_active}
        confirmText={confirmProduct?.is_active ? 'Dar de Baja' : 'Reactivar'}
      />

      {/* Modals de Categoría */}
      <CategoriaModal 
        isOpen={isCategoriaModalOpen}
        onClose={() => setIsCategoriaModalOpen(false)}
        onSave={handleSaveCategoria}
        editingCategoria={editingCategoria}
      />

      <ConfirmModal 
        isOpen={Boolean(confirmCategoria)}
        onClose={() => setConfirmCategoria(null)}
        onConfirm={handleToggleCategoria}
        title={confirmCategoria?.is_active ? 'Dar de Baja Categoría' : 'Reactivar Categoría'}
        message={`¿Está seguro de ${confirmCategoria?.is_active ? 'dar de baja' : 'reactivar'} la categoría "${confirmCategoria?.nombre}"?`}
        isDanger={confirmCategoria?.is_active}
        confirmText={confirmCategoria?.is_active ? 'Dar de Baja' : 'Reactivar'}
      />

      {/* Modals de Marca */}
      <MarcaModal 
        isOpen={isMarcaModalOpen}
        onClose={() => setIsMarcaModalOpen(false)}
        onSave={handleSaveMarca}
        editingMarca={editingMarca}
      />

      <ConfirmModal 
        isOpen={Boolean(confirmMarca)}
        onClose={() => setConfirmMarca(null)}
        onConfirm={handleToggleMarca}
        title={confirmMarca?.is_active ? 'Dar de Baja Marca' : 'Reactivar Marca'}
        message={`¿Está seguro de ${confirmMarca?.is_active ? 'dar de baja' : 'reactivar'} la marca "${confirmMarca?.nombre}"?`}
        isDanger={confirmMarca?.is_active}
        confirmText={confirmMarca?.is_active ? 'Dar de Baja' : 'Reactivar'}
      />

      {/* Modals de Unidad de Medida */}
      <UnidadModal 
        isOpen={isUnidadModalOpen}
        onClose={() => setIsUnidadModalOpen(false)}
        onSave={handleSaveUnidad}
        editingUnidad={editingUnidad}
      />

      <ConfirmModal 
        isOpen={Boolean(confirmUnidad)}
        onClose={() => setConfirmUnidad(null)}
        onConfirm={handleToggleUnidad}
        title={confirmUnidad?.is_active ? 'Dar de Baja Unidad' : 'Reactivar Unidad'}
        message={`¿Está seguro de ${confirmUnidad?.is_active ? 'dar de baja' : 'reactivar'} la unidad "${confirmUnidad?.nombre}"?`}
        isDanger={confirmUnidad?.is_active}
        confirmText={confirmUnidad?.is_active ? 'Dar de Baja' : 'Reactivar'}
      />

      <Toast toast={toast} onClose={() => setToast(null)} />
    </div>
  );
};


export default ProductsPage;

import React, { useState, useEffect, useMemo } from 'react';
import { NohemyApi } from '../../api/nohemyApi';
import { playScannerBeep } from '../../utils/audio';
import { Toast } from '../../components/common';
import { CategorySilhouetteIcon, IconBarcode, IconCart, IconCash, IconCashRegister, IconEdit, IconReceipt, IconRefresh, IconSearch, IconSmartphone, IconTag, IconTrash } from '../../components/icons/Icons';

import ClientSelectModal from './ClientSelectModal';
import CheckoutModal from './CheckoutModal';
import InvoiceTicketModal from './InvoiceTicketModal';
import SalesHistoryView from './SalesHistoryView';
import CashControlPage from '../cash/CashControlPage';
import OpenCashModal from '../cash/OpenCashModal';
/* ── COMPONENTE ALIAS PARA RETROCOMPATIBILIDAD CON POS ── */
export const SalesDailySummaryView = (props) => <CashControlPage isEmbedded={true} {...props} />;


/* ── COMPONENTE: PÁGINA PRINCIPAL DE PUNTO DE VENTA (POS) ── */
export const POSPage = ({ onOpenScanner }) => {
  const [posTab, setPosTab] = useState('mostrador'); // 'mostrador' | 'historial' | 'resumen'
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');

  // Control de Turno de Caja (RF-05)
  const [cashStatus, setCashStatus] = useState(null);
  const [isOpenCashModalOpen, setIsOpenCashModalOpen] = useState(false);

  // Estado del Carrito
  const [cart, setCart] = useState([]);
  const [client, setClient] = useState({ id_cliente: null, nombre_completo: 'Consumidor Final', nit: 'C/F' });
  const [discount, setDiscount] = useState(0);

  // Modales
  const [isClientModalOpen, setIsClientModalOpen] = useState(false);
  const [isCheckoutModalOpen, setIsCheckoutModalOpen] = useState(false);
  const [completedSale, setCompletedSale] = useState(null);
  const [toast, setToast] = useState(null);

  // Consultar estado actual de caja
  const fetchCashStatus = async () => {
    try {
      const data = await NohemyApi.getCajaActiva();
      setCashStatus(data);
      return data;
    } catch (err) {
      console.error('Error al consultar estado de caja:', err);
    }
  };

  // Cargar catálogo de productos y categorías
  const loadCatalog = async () => {
    setLoading(true);
    try {
      const [prodData, catData] = await Promise.all([
        NohemyApi.getProductos({ is_active: true }),
        NohemyApi.getCategorias()
      ]);
      setProducts(Array.isArray(prodData) ? prodData : prodData.results || []);
      setCategories(Array.isArray(catData) ? catData : catData.results || []);
    } catch (err) {
      setToast({ type: 'error', message: 'Error al cargar catálogo de productos: ' + err.message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCatalog();
    fetchCashStatus();
    NohemyApi.getConsumidorFinal().then(cf => setClient(cf)).catch(() => {});
  }, []);

  useEffect(() => {
    if (posTab === 'mostrador') {
      fetchCashStatus();
    }
  }, [posTab]);

  // Agregar producto al carrito
  const addToCart = (product, qtyToAdd = 1) => {
    const stockDisp = parseInt(product.stock_total, 10) || 0;
    if (stockDisp <= 0) {
      playScannerBeep(false);
      setToast({ type: 'warning', message: `El producto "${product.nombre}" no tiene existencias disponibles en inventario.` });
      return;
    }

    setCart(prevCart => {
      const existingIndex = prevCart.findIndex(item => item.producto.id_producto === product.id_producto);
      if (existingIndex > -1) {
        const item = prevCart[existingIndex];
        const newQty = item.cantidad + qtyToAdd;
        if (newQty > stockDisp) {
          playScannerBeep(false);
          setToast({ type: 'warning', message: `Stock máximo disponible para "${product.nombre}": ${stockDisp} unidades.` });
          return prevCart;
        }
        playScannerBeep(true);
        const updated = [...prevCart];
        const pUnit = parseFloat(product.precio_venta) || 0;
        updated[existingIndex] = {
          ...item,
          cantidad: newQty,
          subtotal: newQty * pUnit
        };
        return updated;
      } else {
        if (qtyToAdd > stockDisp) {
          playScannerBeep(false);
          setToast({ type: 'warning', message: `Stock disponible insuficiente (${stockDisp}).` });
          return prevCart;
        }
        playScannerBeep(true);
        const pUnit = parseFloat(product.precio_venta) || 0;
        return [
          ...prevCart,
          {
            producto: product,
            cantidad: qtyToAdd,
            precio_unitario: pUnit,
            subtotal: qtyToAdd * pUnit
          }
        ];
      }
    });
  };

  // Modificar cantidad de un producto
  const updateCartQty = (productoId, newQty) => {
    if (newQty <= 0) {
      removeFromCart(productoId);
      return;
    }
    setCart(prevCart => {
      return prevCart.map(item => {
        if (item.producto.id_producto === productoId) {
          const maxStock = parseInt(item.producto.stock_total, 10) || 0;
          const finalQty = Math.min(newQty, maxStock);
          if (newQty > maxStock) {
            setToast({ type: 'warning', message: `Stock máximo para este producto: ${maxStock} unidades.` });
          }
          return {
            ...item,
            cantidad: finalQty,
            subtotal: finalQty * item.precio_unitario
          };
        }
        return item;
      });
    });
  };

  // Eliminar producto del carrito
  const removeFromCart = (productoId) => {
    setCart(prevCart => prevCart.filter(item => item.producto.id_producto !== productoId));
  };

  // Vaciar carrito
  const clearCart = () => {
    setCart([]);
    setDiscount(0);
  };

  // Manejador de cambio en el campo de búsqueda (detección automática de código de barras)
  const handleSearchChange = (val) => {
    const trimmed = val.trim();

    // Detección si se completó un código de barras exacto de catálogo (mínimo 6 caracteres)
    if (trimmed.length >= 6) {
      const exactMatch = products.find(
        p => p.codigo_barras && p.codigo_barras.trim().toLowerCase() === trimmed.toLowerCase()
      );
      if (exactMatch) {
        addToCart(exactMatch, 1);
        setToast({ type: 'success', message: `+1 ${exactMatch.nombre}` });
        setSearchTerm('');
        return;
      }

      // Si por alguna razón se pegó o escaneó una cadena con códigos repetidos/concatenados
      for (const p of products) {
        const pCode = (p.codigo_barras || '').trim().toLowerCase();
        if (pCode && pCode.length >= 6 && trimmed.toLowerCase().includes(pCode)) {
          const matches = trimmed.toLowerCase().match(new RegExp(pCode, 'g'));
          if (matches && matches.length > 0) {
            addToCart(p, matches.length);
            setToast({ type: 'success', message: `+${matches.length} ${p.nombre}` });
            setSearchTerm('');
            return;
          }
        }
      }
    }

    setSearchTerm(val);
  };

  // Manejador de teclas en el buscador (Enter, Escape)
  const handleSearchKeyDown = (e) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      setSearchTerm('');
      return;
    }

    if (e.key === 'Enter') {
      e.preventDefault();
      const term = searchTerm.trim();
      if (!term) return;

      const termLower = term.toLowerCase();

      // 1. Coincidencia exacta por código de barras
      const byBarcode = products.find(
        p => p.codigo_barras && p.codigo_barras.trim().toLowerCase() === termLower
      );
      if (byBarcode) {
        addToCart(byBarcode, 1);
        setToast({ type: 'success', message: `+1 ${byBarcode.nombre}` });
        setSearchTerm('');
        return;
      }

      // 2. Si hay exactamente 1 producto visible en la lista filtrada
      if (filteredProducts.length === 1) {
        const single = filteredProducts[0];
        addToCart(single, 1);
        setToast({ type: 'success', message: `+1 ${single.nombre}` });
        setSearchTerm('');
        return;
      }

      // 3. Si parece un código numérico (>= 4 dígitos) y no fue registrado
      if (/^\d{4,}$/.test(term)) {
        playScannerBeep(false);
        setToast({ type: 'warning', message: `Código de barras no registrado: ${term}` });
        setSearchTerm(''); // Se limpia para que el siguiente escaneo no se concatene
        return;
      }
    }
  };

  // Escuchar escáner de código de barras global
  useEffect(() => {
    const handleBarcode = (e) => {
      const code = e.detail?.code;
      if (!code || isCheckoutModalOpen || Boolean(completedSale)) return;

      // Limpiar inmediatamente el buscador para que nunca se acumulen números
      setSearchTerm('');

      const cleanCode = String(code).trim().toLowerCase();
      let found = products.find(p => p.codigo_barras && p.codigo_barras.trim().toLowerCase() === cleanCode);
      let countToAdd = 1;

      // Protección contra códigos concatenados si se leyeron varios juntos
      if (!found && cleanCode.length > 8) {
        for (const p of products) {
          const pCode = (p.codigo_barras || '').trim().toLowerCase();
          if (pCode && pCode.length >= 6 && cleanCode.includes(pCode)) {
            const matches = cleanCode.match(new RegExp(pCode, 'g'));
            if (matches && matches.length > 0) {
              found = p;
              countToAdd = matches.length;
              break;
            }
          }
        }
      }

      if (found) {
        addToCart(found, countToAdd);
        setToast({ type: 'success', message: `+${countToAdd} ${found.nombre}` });
      } else {
        playScannerBeep(false);
        setToast({ type: 'warning', message: `Producto no encontrado para el código: ${code}` });
      }
    };

    window.addEventListener('nohemysys:barcode', handleBarcode);
    return () => window.removeEventListener('nohemysys:barcode', handleBarcode);
  }, [products, isCheckoutModalOpen, completedSale]);

  // Atajos de teclado: F4 para Cobrar
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'F4') {
        e.preventDefault();
        if (cart.length > 0 && !isCheckoutModalOpen) {
          if (cashStatus && !cashStatus.abierta) {
            setToast({ type: 'warning', message: 'No se puede cobrar: Debe aperturar un turno en Control de Caja antes de facturar.' });
            setIsOpenCashModalOpen(true);
            return;
          }
          setIsCheckoutModalOpen(true);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [cart, isCheckoutModalOpen, cashStatus]);

  // Cálculos totales
  const subtotal = useMemo(() => {
    return cart.reduce((acc, item) => acc + item.subtotal, 0);
  }, [cart]);

  const total = useMemo(() => {
    const disc = parseFloat(discount) || 0;
    return Math.max(0, subtotal - disc);
  }, [subtotal, discount]);

  // Filtro de productos
  const filteredProducts = useMemo(() => {
    let result = [...products];
    if (selectedCategory !== 'ALL') {
      result = result.filter(p => String(p.categoria) === String(selectedCategory));
    }
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      result = result.filter(p =>
        (p.nombre && p.nombre.toLowerCase().includes(term)) ||
        (p.codigo_barras && p.codigo_barras.toLowerCase().includes(term)) ||
        (p.marca_nombre && p.marca_nombre.toLowerCase().includes(term)) ||
        (p.descripcion && p.descripcion.toLowerCase().includes(term))
      );
    }
    return result;
  }, [products, selectedCategory, searchTerm]);

  // Finalizar venta con éxito
  const handleSaleSuccess = (saleResult) => {
    setIsCheckoutModalOpen(false);
    clearCart();
    const actualSale = saleResult?.venta || saleResult;
    setCompletedSale(actualSale);
    loadCatalog();
  };

  return (
    <div className="pos-wrapper">
      {/* Barra superior de control y pestañas del POS */}
      <div className="pos-control-bar">
        <div className="pos-control-tabs">
          <button
            type="button"
            className={`pos-tab-btn ${posTab === 'mostrador' ? 'active' : ''}`}
            onClick={() => setPosTab('mostrador')}
          >
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              <IconCart size={16} />
              <span>Mostrador POS</span>
            </span>
            {cart.length > 0 && (
              <span className="pos-cart-badge" style={{ background: '#ffffff', color: '#b8860b' }}>
                {cart.reduce((a, b) => a + b.cantidad, 0)}
              </span>
            )}
          </button>
          <button
            type="button"
            className={`pos-tab-btn ${posTab === 'historial' ? 'active' : ''}`}
            onClick={() => setPosTab('historial')}
          >
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              <IconReceipt size={16} />
              <span>Historial de Ventas</span>
            </span>
          </button>
          <button
            type="button"
            className={`pos-tab-btn ${posTab === 'resumen' ? 'active' : ''}`}
            onClick={() => setPosTab('resumen')}
          >
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              <IconCashRegister size={16} />
              <span>Control de Caja y Turnos</span>
            </span>
            {cashStatus && (
              <span style={{
                fontSize: '10.5px',
                padding: '2px 7px',
                borderRadius: '10px',
                fontWeight: 700,
                background: cashStatus.abierta ? '#dcfce7' : '#fee2e2',
                color: cashStatus.abierta ? '#15803d' : '#b91c1c'
              }}>
                {cashStatus.abierta ? 'Abierta' : 'Cerrada'}
              </span>
            )}
          </button>
        </div>

        <div className="pos-control-actions">
          {cashStatus && !cashStatus.abierta && (
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => setIsOpenCashModalOpen(true)}
              style={{ fontSize: '12px', padding: '6px 12px', background: '#b8860b', borderColor: '#b8860b', color: '#fff', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700 }}
              title="Iniciar turno de caja para habilitar ventas"
            >
              <IconCashRegister size={14} />
              <span>+ Abrir Turno de Caja</span>
            </button>
          )}
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onOpenScanner}
            style={{ fontSize: '12.5px', padding: '6px 14px', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <span className="scanner-indicator-dot" style={{ position: 'static', display: 'inline-block' }}></span>
            <IconSmartphone size={15} />
            <span>Escáner Celular / USB</span>
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => { loadCatalog(); fetchCashStatus(); }}
            title="Recargar catálogo y estado de caja"
            style={{ fontSize: '12.5px', padding: '6px 12px', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <IconRefresh size={14} />
            <span>Actualizar</span>
          </button>
        </div>
      </div>

      {/* PESTAÑA 1: MOSTRADOR DE VENTA */}
      {posTab === 'mostrador' && (
        <div className="pos-main-grid">
          {/* Panel Izquierdo: Catálogo y Búsqueda */}
          <div className="pos-catalog-panel">
            <div className="pos-search-header">
              <div className="pos-search-box">
                <span className="pos-search-icon" style={{ display: 'flex', alignItems: 'center' }}>
                  <IconSearch size={16} />
                </span>
                <input
                  type="text"
                  className="pos-search-input"
                  placeholder="Buscar producto por nombre o código (o escanea directamente)..."
                  value={searchTerm}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  onKeyDown={handleSearchKeyDown}
                />
                {searchTerm && (
                  <button
                    type="button"
                    className="pos-search-clear"
                    onClick={() => setSearchTerm('')}
                    title="Limpiar búsqueda (Esc)"
                  >
                    ✕
                  </button>
                )}
                <span className="pos-search-badge" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                  <IconBarcode size={13} />
                  <span>Escáner Activo</span>
                </span>
              </div>

              {/* Categorías Pills con Iconos Silueta Dinámicos */}
              <div className="pos-categories-bar">
                <button
                  type="button"
                  className={`pos-cat-pill ${selectedCategory === 'ALL' ? 'active' : ''}`}
                  onClick={() => setSelectedCategory('ALL')}
                >
                  <IconTag size={13} style={{ marginRight: '5px' }} />
                  <span>Todos ({products.length})</span>
                </button>
                {categories.map(cat => {
                  const count = products.filter(p => String(p.categoria) === String(cat.id_categoria)).length;
                  return (
                    <button
                      key={cat.id_categoria}
                      type="button"
                      className={`pos-cat-pill ${selectedCategory === String(cat.id_categoria) ? 'active' : ''}`}
                      onClick={() => setSelectedCategory(String(cat.id_categoria))}
                    >
                      <CategorySilhouetteIcon name={cat.nombre} size={13} style={{ marginRight: '5px' }} />
                      <span>{cat.nombre} ({count})</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Cuadrícula de Productos */}
            <div className="pos-products-scroll">
              {cashStatus && !cashStatus.abierta && (
                <div style={{
                  background: 'linear-gradient(135deg, #fff7ed 0%, #fef2f2 100%)',
                  border: '1px solid #fed7aa',
                  borderRadius: '12px',
                  padding: '14px 18px',
                  marginBottom: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '12px',
                  flexWrap: 'wrap',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.03)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{
                      width: '38px', height: '38px', borderRadius: '10px',
                      background: 'rgba(239, 68, 68, 0.12)', color: '#dc2626',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      flexShrink: 0
                    }}>
                      <IconCashRegister size={20} />
                    </div>
                    <div>
                      <strong style={{ fontSize: '13.5px', color: '#9a3412', display: 'block' }}>
                        Turno de Caja Inactivo / Caja Cerrada
                      </strong>
                      <span style={{ fontSize: '12px', color: '#c2410c' }}>
                        No se pueden emitir facturas ni cobrar ventas hasta realizar la apertura de turno en Control de Caja.
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="btn btn-primary"
                    style={{ background: 'var(--accent)', borderColor: 'var(--accent)', color: '#fff', fontSize: '12px', padding: '6px 14px', fontWeight: 700, borderRadius: '8px' }}
                    onClick={() => setIsOpenCashModalOpen(true)}
                  >
                    + Abrir Turno de Caja
                  </button>
                </div>
              )}

              {loading && products.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '48px', color: 'var(--text-muted)' }}>
                  Cargando productos del almacén...
                </div>
              ) : filteredProducts.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '48px', color: 'var(--text-muted)' }}>
                  No se encontraron productos con "{searchTerm}".
                </div>
              ) : (
                <div className="pos-products-grid">
                  {filteredProducts.map(p => {
                    const stock = parseInt(p.stock_total, 10) || 0;
                    const isOutOfStock = stock <= 0;
                    const isLowStock = !isOutOfStock && stock <= (p.stock_minimo || 5);
                    const pPrice = parseFloat(p.precio_venta) || 0;

                    return (
                      <div
                        key={p.id_producto}
                        className={`pos-card-product ${isOutOfStock ? 'disabled' : ''}`}
                        onClick={() => !isOutOfStock && addToCart(p, 1)}
                        title={isOutOfStock ? 'Sin existencias en inventario' : `Clic para agregar: ${p.nombre}`}
                      >
                        <div className="pos-card-top">
                          <div className="pos-card-icon-box" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <CategorySilhouetteIcon name={p.categoria_nombre} size={22} />
                          </div>
                          <span
                            className={`stock-badge ${isOutOfStock ? 'stock-danger' : (isLowStock ? 'stock-warning' : 'stock-success')}`}
                            style={{ fontSize: '11px', padding: '2px 8px' }}
                          >
                            {isOutOfStock ? '○ Agotado (0)' : `● ${stock} ${p.unidad_simbolo || 'ud'}`}
                          </span>
                        </div>

                        <div>
                          <div className="pos-card-name" title={p.nombre}>{p.nombre}</div>
                          <div className="pos-card-meta">
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                              <IconBarcode size={12} />
                              <span>{p.codigo_barras || 'S/C'}</span>
                            </span>
                            {p.marca_nombre && <span>• {p.marca_nombre}</span>}
                          </div>
                        </div>

                        <div className="pos-card-bottom">
                          <div className="pos-card-price">Q {pPrice.toFixed(2)}</div>
                          {!isOutOfStock && (
                            <span className="pos-card-add-btn">
                              + Agregar
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Panel Derecho: Carrito de Venta y Facturación */}
          <div className="pos-cart-panel">
            <div className="pos-cart-header">
              <div className="pos-cart-header-top">
                <h3 className="pos-cart-title">
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                    <IconCart size={16} />
                    <span>Mostrador</span>
                  </span>
                  <span className="pos-cart-badge">{cart.reduce((a, b) => a + b.cantidad, 0)} items</span>
                </h3>
                {cart.length > 0 && (
                  <button
                    type="button"
                    className="btn btn-secondary"
                    style={{ fontSize: '11px', padding: '3px 8px', color: '#ef4444', borderColor: '#fca5a5', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                    onClick={clearCart}
                    title="Vaciar carrito"
                  >
                    <IconTrash size={12} />
                    <span>Vaciar</span>
                  </button>
                )}
              </div>

              {/* Tarjeta de Cliente */}
              <div className="pos-customer-chip">
                <div className="pos-customer-info">
                  <span style={{ color: 'var(--text-muted)', fontSize: '10.5px', textTransform: 'uppercase', fontWeight: 700 }}>
                    Cliente Facturación
                  </span>
                  <strong style={{ fontSize: '12.5px', color: 'var(--text-main)' }}>
                    {client?.nombre_completo || 'Consumidor Final'}
                  </strong>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    NIT: {client?.nit || 'C/F'}
                  </span>
                </div>
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ fontSize: '11.5px', padding: '4px 8px', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                  onClick={() => setIsClientModalOpen(true)}
                  title="Cambiar o crear cliente"
                >
                  <IconEdit size={12} />
                  <span>Cambiar</span>
                </button>
              </div>
            </div>

            {/* Listado de Productos en el Carrito */}
            <div className="pos-cart-items-list">
              {cart.length === 0 ? (
                <div className="pos-cart-empty">
                  <div className="pos-cart-empty-icon" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <IconCart size={38} />
                  </div>
                  <strong style={{ fontSize: '14px', color: 'var(--text-main)', display: 'block', marginBottom: '4px' }}>
                    Carrito Vacío
                  </strong>
                  <span style={{ fontSize: '12px', lineHeight: '1.4', maxWidth: '240px' }}>
                    Escanea productos con el lector o haz clic en el catálogo para añadirlos a la orden.
                  </span>
                </div>
              ) : (
                cart.map(item => (
                  <div key={item.producto.id_producto} className="pos-cart-item">
                    <div className="pos-cart-item-row">
                      <div className="pos-cart-item-title">{item.producto.nombre}</div>
                      <div className="pos-cart-item-subtotal">Q {item.subtotal.toFixed(2)}</div>
                    </div>

                    <div className="pos-cart-item-row">
                      <span style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>
                        Q {item.precio_unitario.toFixed(2)} c/u
                      </span>

                      <div className="pos-qty-controls">
                        <button
                          type="button"
                          className="pos-qty-btn"
                          onClick={() => updateCartQty(item.producto.id_producto, item.cantidad - 1)}
                          title="Disminuir"
                        >
                          -
                        </button>
                        <input
                          type="number"
                          className="pos-qty-input"
                          min="1"
                          max={item.producto.stock_total}
                          value={item.cantidad}
                          onChange={(e) => updateCartQty(item.producto.id_producto, parseInt(e.target.value, 10) || 1)}
                        />
                        <button
                          type="button"
                          className="pos-qty-btn"
                          onClick={() => updateCartQty(item.producto.id_producto, item.cantidad + 1)}
                          title="Aumentar"
                          disabled={item.cantidad >= item.producto.stock_total}
                        >
                          +
                        </button>
                        <button
                          type="button"
                          className="pos-btn-del-item"
                          onClick={() => removeFromCart(item.producto.id_producto)}
                          title="Eliminar de la orden"
                          style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
                        >
                          <IconTrash size={13} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Resumen del Carrito y Botón de Cobro */}
            <div className="pos-cart-summary">
              <div className="pos-summary-row">
                <span>Subtotal:</span>
                <span style={{ fontWeight: 700, color: 'var(--text-main)' }}>Q {subtotal.toFixed(2)}</span>
              </div>
              <div className="pos-summary-row">
                <span>Descuento (Q):</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Q</span>
                  <input
                    type="number"
                    min="0"
                    step="0.5"
                    value={discount}
                    onChange={(e) => setDiscount(Math.max(0, parseFloat(e.target.value) || 0))}
                    style={{
                      width: '65px',
                      textAlign: 'right',
                      padding: '3px 6px',
                      fontSize: '12.5px',
                      fontWeight: 700,
                      borderRadius: '6px',
                      border: '1px solid var(--card-border)',
                      background: 'var(--card-bg)'
                    }}
                  />
                </div>
              </div>

              <div className="pos-summary-total">
                <span style={{ fontSize: '15px', fontWeight: 800 }}>Total a Cobrar:</span>
                <span className="pos-total-amount">Q {total.toFixed(2)}</span>
              </div>

              {/* Alerta si la caja está cerrada */}
              {cashStatus && !cashStatus.abierta && (
                <div style={{
                  background: '#fef2f2',
                  border: '1px solid #fecaca',
                  borderRadius: '8px',
                  padding: '8px 10px',
                  marginBottom: '10px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontSize: '11.5px',
                  color: '#991b1b'
                }}>
                  <span style={{ fontSize: '15px' }}>🔒</span>
                  <div style={{ flex: 1, lineHeight: '1.3' }}>
                    <strong>Caja Cerrada:</strong> Requiere turno abierto para cobrar.
                  </div>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    style={{ fontSize: '10.5px', padding: '3px 8px', fontWeight: 700, borderColor: '#fca5a5', color: '#991b1b' }}
                    onClick={() => setIsOpenCashModalOpen(true)}
                  >
                    Abrir Caja
                  </button>
                </div>
              )}

              <button
                type="button"
                className="pos-btn-checkout"
                disabled={cart.length === 0 || (cashStatus && !cashStatus.abierta)}
                onClick={() => {
                  if (cashStatus && !cashStatus.abierta) {
                    setToast({ type: 'warning', message: 'No se puede procesar la venta: Debe aperturar la caja en Control de Caja primero.' });
                    setIsOpenCashModalOpen(true);
                    return;
                  }
                  setIsCheckoutModalOpen(true);
                }}
                style={cashStatus && !cashStatus.abierta ? { opacity: 0.6, cursor: 'not-allowed', filter: 'grayscale(0.4)' } : {}}
                title={cashStatus && !cashStatus.abierta ? 'Turno de caja cerrado. Abra la caja para habilitar el cobro.' : 'Cobrar (F4)'}
              >
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                  <IconCash size={18} />
                  <span>Cobrar (F4)</span>
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PESTAÑA 2: HISTORIAL DE VENTAS */}
      {posTab === 'historial' && (
        <SalesHistoryView onReprintTicket={(venta) => setCompletedSale(venta)} />
      )}

      {/* PESTAÑA 3: RESUMEN DE CAJA DEL DÍA */}
      {posTab === 'resumen' && (
        <SalesDailySummaryView />
      )}

      {/* Modal para Selección / Alta de Clientes */}
      <ClientSelectModal
        isOpen={isClientModalOpen}
        onClose={() => setIsClientModalOpen(false)}
        onSelectClient={(c) => setClient(c)}
        selectedClient={client}
      />

      {/* Modal para Procesar el Pago */}
      <CheckoutModal
        isOpen={isCheckoutModalOpen}
        onClose={() => setIsCheckoutModalOpen(false)}
        cartItems={cart}
        subtotal={subtotal}
        discount={discount}
        total={total}
        client={client}
        onSuccessSale={handleSaleSuccess}
      />

      {/* Modal para Imprimir Comprobante Térmico */}
      <InvoiceTicketModal
        isOpen={Boolean(completedSale)}
        onClose={() => setCompletedSale(null)}
        saleData={completedSale}
      />

      {/* Modal para Apertura Rápida de Caja */}
      <OpenCashModal
        isOpen={isOpenCashModalOpen}
        onClose={() => setIsOpenCashModalOpen(false)}
        onSuccess={(nuevaSesion) => {
          fetchCashStatus();
          setToast({ type: 'success', message: `Turno #${nuevaSesion.id_sesion} abierto exitosamente. Mostrador listo para facturar.` });
        }}
      />

      <Toast toast={toast} onClose={() => setToast(null)} />
    </div>
  );
};


export default POSPage;

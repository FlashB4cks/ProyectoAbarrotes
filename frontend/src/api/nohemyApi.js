// Determinar dinamicamente la URL del backend segun el entorno
// Usar ruta relativa '/api' en el navegador para que pase siempre por el proxy de Vite en puerto 3000.
// Esto soluciona definitivamente el error 'Failed to fetch', bloqueos de puertos y CORS en telefonos moviles conectados por USB o Wi-Fi.
const getApiBaseUrl = () => {
  if (import.meta.env && import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }
  if (typeof window !== 'undefined' && window.location) {
    return '/api';
  }
  return 'http://127.0.0.1:8000/api';
};

const API_BASE_URL = getApiBaseUrl();

const STORAGE_KEYS = {
  ACCESS_TOKEN: 'nohemysys_access_token',
  REFRESH_TOKEN: 'nohemysys_refresh_token',
  USER_DATA: 'nohemysys_user_data',
};

/* ── CLIENTE HTTP API ── */
class NohemyApi {
  static getBaseUrl() {
    return getApiBaseUrl();
  }

  static getAccessToken() {
    return localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
  }

  static getRefreshToken() {
    return localStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);
  }

  static setTokens(access, refresh) {
    if (access) localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, access);
    if (refresh) localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, refresh);
  }

  static clearTokens() {
    localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
    localStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
    localStorage.removeItem(STORAGE_KEYS.USER_DATA);
  }

  static async request(endpoint, options = {}) {
    const url = `${this.getBaseUrl()}${endpoint}`;
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    const token = this.getAccessToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    let response = await fetch(url, { ...options, headers });

    if (response.status === 401 && this.getRefreshToken() && !options._retry) {
      options._retry = true;
      const refreshed = await this.refreshToken();
      if (refreshed) {
        headers['Authorization'] = `Bearer ${this.getAccessToken()}`;
        response = await fetch(url, { ...options, headers });
      } else {
        this.clearTokens();
        window.location.reload();
      }
    }

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      let errorMsg = data.message || data.detail;
      if (!errorMsg && typeof data === 'object') {
        const flatVals = Object.values(data).flat();
        const strVals = flatVals.filter(v => typeof v === 'string' && v.trim());
        errorMsg = strVals.length > 0 ? strVals.join(', ') : 'Error en la solicitud';
      }
      const error = new Error(errorMsg || 'Error en la solicitud');
      error.status = response.status;
      error.data = data;
      error.details = data.details || (typeof data === 'object' ? data : {});
      throw error;
    }

    return data;
  }

  static async refreshToken() {
    try {
      const refresh = this.getRefreshToken();
      if (!refresh) return false;
      const res = await fetch(`${this.getBaseUrl()}/autenticacion/refresh/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh }),
      });
      if (res.ok) {
        const data = await res.json();
        this.setTokens(data.access, data.refresh);
        return true;
      }
    } catch (e) {
      console.error('Refresh token failed:', e);
    }
    return false;
  }

  /* ── AUTENTICACIÓN Y USUARIOS ── */
  static async login(usernameOrEmail, password) {
    const data = await this.request('/autenticacion/login/', {
      method: 'POST',
      body: JSON.stringify({ username: usernameOrEmail, password }),
    });
    this.setTokens(data.access, data.refresh);
    localStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(data.user));
    return data.user;
  }

  static async cambiarPassword(password_actual, nueva_password, confirmar_password) {
    return await this.request('/autenticacion/cambiar-password/', {
      method: 'POST',
      body: JSON.stringify({ password_actual, nueva_password, confirmar_password }),
    });
  }

  static async getUsers() { return await this.request('/autenticacion/users/'); }
  static async createUser(userData) { return await this.request('/autenticacion/users/', { method: 'POST', body: JSON.stringify(userData) }); }
  static async updateUser(id, userData) { return await this.request(`/autenticacion/users/${id}/`, { method: 'PUT', body: JSON.stringify(userData) }); }
  static async toggleUserStatus(id) { return await this.request(`/autenticacion/users/${id}/toggle-status/`, { method: 'POST' }); }

  /* ── MANTENIMIENTO DE ROLES ── */
  static async getRoles() { return await this.request('/autenticacion/roles/'); }
  static async createRol(data) { return await this.request('/autenticacion/roles/', { method: 'POST', body: JSON.stringify(data) }); }
  static async updateRol(id, data) { return await this.request(`/autenticacion/roles/${id}/`, { method: 'PUT', body: JSON.stringify(data) }); }
  static async toggleRolStatus(id) { return await this.request(`/autenticacion/roles/${id}/toggle-status/`, { method: 'POST' }); }

  /* ── CATÁLOGOS Y PRODUCTOS ── */
  static async getCategorias() { return await this.request('/catalogos/categorias/'); }
  static async createCategoria(data) { return await this.request('/catalogos/categorias/', { method: 'POST', body: JSON.stringify(data) }); }
  static async updateCategoria(id, data) { return await this.request(`/catalogos/categorias/${id}/`, { method: 'PUT', body: JSON.stringify(data) }); }
  static async toggleCategoriaStatus(id) { return await this.request(`/catalogos/categorias/${id}/toggle-status/`, { method: 'POST' }); }

  static async getMarcas() { return await this.request('/catalogos/marcas/'); }
  static async createMarca(data) { return await this.request('/catalogos/marcas/', { method: 'POST', body: JSON.stringify(data) }); }
  static async updateMarca(id, data) { return await this.request(`/catalogos/marcas/${id}/`, { method: 'PUT', body: JSON.stringify(data) }); }
  static async toggleMarcaStatus(id) { return await this.request(`/catalogos/marcas/${id}/toggle-status/`, { method: 'POST' }); }

  static async getUnidades() { return await this.request('/catalogos/unidades/'); }
  static async createUnidad(data) { return await this.request('/catalogos/unidades/', { method: 'POST', body: JSON.stringify(data) }); }
  static async updateUnidad(id, data) { return await this.request(`/catalogos/unidades/${id}/`, { method: 'PUT', body: JSON.stringify(data) }); }
  static async toggleUnidadStatus(id) { return await this.request(`/catalogos/unidades/${id}/toggle-status/`, { method: 'POST' }); }

  static async getProveedores() { return await this.request('/catalogos/proveedores/'); }
  static async createProveedor(data) { return await this.request('/catalogos/proveedores/', { method: 'POST', body: JSON.stringify(data) }); }
  static async updateProveedor(id, data) { return await this.request(`/catalogos/proveedores/${id}/`, { method: 'PUT', body: JSON.stringify(data) }); }
  static async toggleProveedorStatus(id) { return await this.request(`/catalogos/proveedores/${id}/toggle-status/`, { method: 'POST' }); }

  static async getProductos(params = {}) {
    const query = new URLSearchParams(params).toString();
    return await this.request(`/catalogos/productos/${query ? '?' + query : ''}`);
  }
  static async createProducto(data) { return await this.request('/catalogos/productos/', { method: 'POST', body: JSON.stringify(data) }); }
  static async updateProducto(id, data) { return await this.request(`/catalogos/productos/${id}/`, { method: 'PUT', body: JSON.stringify(data) }); }
  static async toggleProductoStatus(id) { return await this.request(`/catalogos/productos/${id}/toggle-status/`, { method: 'POST' }); }

  /* ── COMPRAS E INVENTARIO ── */
  static async getCompras(params = {}) {
    const query = new URLSearchParams(params).toString();
    return await this.request(`/compras/compras/${query ? '?' + query : ''}`);
  }
  static async createCompra(data) {
    return await this.request('/compras/compras/', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }
  static async anularCompra(id) {
    return await this.request(`/compras/compras/${id}/anular/`, {
      method: 'POST',
    });
  }
  static async getLotes(params = {}) {
    const query = new URLSearchParams(params).toString();
    return await this.request(`/inventario/lotes/${query ? '?' + query : ''}`);
  }
  static async getResumenSemaforo() {
    return await this.request('/inventario/lotes/resumen-semaforo/');
  }
  static async getStockCritico(params = {}) {
    const query = new URLSearchParams(params).toString();
    return await this.request(`/inventario/lotes/stock-critico/${query ? '?' + query : ''}`);
  }
  static async registrarMermaLote(loteId, data) {
    return await this.request(`/inventario/lotes/${loteId}/registrar-merma/`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }
  static async getAjustesInventario(params = {}) {
    const query = new URLSearchParams(params).toString();
    return await this.request(`/inventario/ajustes/${query ? '?' + query : ''}`);
  }

  /* ── ENLACE DE ESCÁNER INALÁMBRICO / CELULAR (MÉTODO 1) ── */
  static async getEscanerInfo() {
    return await this.request('/inventario/escaner/sesion/');
  }
  static async createEscanerSesion() {
    return await this.request('/inventario/escaner/sesion/', { method: 'POST' });
  }
  static async enviarCodigoEscaner(data) {
    return await this.request('/inventario/escaner/enviar/', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }
  static async recibirCodigoEscaner(sessionId, sinceId = 0) {
    return await this.request(`/inventario/escaner/recibir/?session_id=${sessionId}&since_id=${sinceId}`);
  }

  /* ── VENTAS Y FACTURACIÓN (POS) ── */
  static async getClientes(search = '') {
    const q = search ? `?search=${encodeURIComponent(search)}` : '';
    return await this.request(`/ventas/clientes/${q}`);
  }
  static async getConsumidorFinal() {
    return await this.request('/ventas/clientes/consumidor_final/');
  }
  static async createCliente(data) {
    return await this.request('/ventas/clientes/', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }
  static async updateCliente(id, data) {
    return await this.request(`/ventas/clientes/${id}/`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }
  static async toggleClienteStatus(id) {
    return await this.request(`/ventas/clientes/${id}/toggle-status/`, {
      method: 'POST',
    });
  }
  static async getVentas(params = {}) {
    const query = new URLSearchParams(params).toString();
    return await this.request(`/ventas/ventas/${query ? '?' + query : ''}`);
  }
  static async getVenta(id) {
    return await this.request(`/ventas/ventas/${id}/`);
  }
  static async createVenta(data) {
    return await this.request('/ventas/ventas/', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }
  static async anularVenta(id, motivo = '') {
    return await this.request(`/ventas/ventas/${id}/anular/`, {
      method: 'POST',
      body: JSON.stringify({ motivo }),
    });
  }
  static async getResumenDiarioVentas() {
    return await this.request('/ventas/ventas/resumen_diario/');
  }
  static async getCajaActiva() {
    return await this.request('/ventas/caja/activa/');
  }
  static async abrirCaja(data) {
    return await this.request('/ventas/caja/abrir/', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }
  static async registrarMovimientoCaja(data) {
    return await this.request('/ventas/caja/movimiento/', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }
  static async cerrarCaja(data) {
    return await this.request('/ventas/caja/cerrar/', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }
  static async getHistorialCajas(params = {}) {
    const query = new URLSearchParams(params).toString();
    return await this.request(`/ventas/caja/${query ? '?' + query : ''}`);
  }
  static async getMovimientosFinancieros(params = {}) {
    const query = new URLSearchParams(params).toString();
    return await this.request(`/ventas/movimientos/${query ? '?' + query : ''}`);
  }

  /* ── REPORTES Y ANALÍTICAS (RF-07.2) ── */
  static async getReporteFinanciero(params = {}) {
    const query = new URLSearchParams(params).toString();
    return await this.request(`/ventas/reportes/financiero/${query ? '?' + query : ''}`);
  }
  static async getReporteMermasFIFO() {
    return await this.request('/ventas/reportes/mermas-fifo/');
  }

  /* ── AUDITORÍA DEL SISTEMA (RF-07.1) ── */
  static async getBitacoraAuditoria(params = {}) {
    const query = new URLSearchParams(params).toString();
    return await this.request(`/auditoria/bitacora/${query ? '?' + query : ''}`);
  }
  static async getResumenAuditoria() {
    return await this.request('/auditoria/bitacora/resumen/');
  }
}

export { API_BASE_URL, STORAGE_KEYS, NohemyApi };
export default NohemyApi;

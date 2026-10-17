-- ====================================================================
-- PROYECTO EMPRESA CLOUD - SCRIPT SQL DE BASE DE DATOS (POSTGRESQL 16)
-- Sistema: NohemySys
-- ====================================================================

-- 1. TABLA: ROLES DE USUARIO
CREATE TABLE IF NOT EXISTS roles (
    id_rol BIGSERIAL PRIMARY KEY,
    codigo VARCHAR(50) UNIQUE NOT NULL,
    nombre VARCHAR(100) NOT NULL,
    descripcion TEXT,
    permisos JSONB DEFAULT '[]'::jsonb,
    is_active BOOLEAN DEFAULT TRUE,
    fecha_creacion TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. TABLA: USUARIOS
CREATE TABLE IF NOT EXISTS usuarios (
    id BIGSERIAL PRIMARY KEY,
    username VARCHAR(150) UNIQUE NOT NULL,
    password VARCHAR(128) NOT NULL,
    first_name VARCHAR(150) DEFAULT '',
    last_name VARCHAR(150) DEFAULT '',
    email VARCHAR(254) NOT NULL,
    rol VARCHAR(20) DEFAULT 'VENDEDOR' NOT NULL,
    dpi VARCHAR(13) UNIQUE,
    nit VARCHAR(20),
    telefono VARCHAR(20),
    direccion VARCHAR(255),
    is_staff BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    is_superuser BOOLEAN DEFAULT FALSE,
    debe_cambiar_password BOOLEAN DEFAULT FALSE,
    date_joined TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP WITH TIME ZONE
);

-- 3. TABLA: CLIENTES
CREATE TABLE IF NOT EXISTS clientes (
    id_cliente BIGSERIAL PRIMARY KEY,
    nombre_completo VARCHAR(150) NOT NULL,
    nit VARCHAR(20) DEFAULT 'C/F' NOT NULL,
    dpi VARCHAR(20),
    telefono VARCHAR(20),
    direccion VARCHAR(255),
    is_active BOOLEAN DEFAULT TRUE,
    fecha_registro TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. TABLA: CATEGORIAS Y MARCAS DE PRODUCTOS
CREATE TABLE IF NOT EXISTS categorias (
    id_categoria BIGSERIAL PRIMARY KEY,
    nombre VARCHAR(100) UNIQUE NOT NULL,
    descripcion TEXT,
    is_active BOOLEAN DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS marcas (
    id_marca BIGSERIAL PRIMARY KEY,
    nombre VARCHAR(100) UNIQUE NOT NULL,
    is_active BOOLEAN DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS unidades_medida (
    id_unidad BIGSERIAL PRIMARY KEY,
    nombre VARCHAR(50) NOT NULL,
    abreviatura VARCHAR(10) UNIQUE NOT NULL
);

-- 5. TABLA: PRODUCTOS
CREATE TABLE IF NOT EXISTS productos (
    id_producto BIGSERIAL PRIMARY KEY,
    codigo_barras VARCHAR(50) UNIQUE NOT NULL,
    nombre VARCHAR(150) NOT NULL,
    descripcion TEXT,
    precio_venta NUMERIC(10, 2) NOT NULL CHECK (precio_venta >= 0),
    precio_costo NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    stock_actual NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    stock_minimo NUMERIC(10, 2) NOT NULL DEFAULT 5.00,
    is_active BOOLEAN DEFAULT TRUE,
    categoria_id BIGINT REFERENCES categorias(id_categoria) ON DELETE RESTRICT,
    marca_id BIGINT REFERENCES marcas(id_marca) ON DELETE RESTRICT,
    unidad_medida_id BIGINT REFERENCES unidades_medida(id_unidad) ON DELETE RESTRICT,
    fecha_creacion TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 6. TABLA: SESIONES DE CAJA
CREATE TABLE IF NOT EXISTS sesiones_caja (
    id_sesion BIGSERIAL PRIMARY KEY,
    monto_apertura NUMERIC(10, 2) NOT NULL,
    monto_cierre NUMERIC(10, 2),
    monto_esperado NUMERIC(10, 2),
    diferencia NUMERIC(10, 2),
    estado VARCHAR(20) DEFAULT 'ABIERTA' NOT NULL,
    fecha_apertura TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    fecha_cierre TIMESTAMP WITH TIME ZONE,
    usuario_apertura_id BIGINT NOT NULL REFERENCES usuarios(id),
    usuario_cierre_id BIGINT REFERENCES usuarios(id)
);

-- 7. TABLA: VENTAS
CREATE TABLE IF NOT EXISTS ventas (
    id_venta BIGSERIAL PRIMARY KEY,
    numero_factura VARCHAR(50) UNIQUE NOT NULL,
    fecha_venta TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    subtotal NUMERIC(10, 2) NOT NULL,
    impuesto NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    total NUMERIC(10, 2) NOT NULL,
    metodo_pago VARCHAR(20) DEFAULT 'EFECTIVO' NOT NULL,
    estado VARCHAR(20) DEFAULT 'COMPLETADA' NOT NULL,
    cliente_id BIGINT NOT NULL REFERENCES clientes(id_cliente) ON DELETE RESTRICT,
    usuario_id BIGINT NOT NULL REFERENCES usuarios(id) ON DELETE RESTRICT,
    sesion_caja_id BIGINT REFERENCES sesiones_caja(id_sesion) ON DELETE SET NULL
);

-- 8. TABLA: DETALLE_VENTA
CREATE TABLE IF NOT EXISTS detalles_venta (
    id_detalle BIGSERIAL PRIMARY KEY,
    venta_id BIGINT NOT NULL REFERENCES ventas(id_venta) ON DELETE CASCADE,
    producto_id BIGINT NOT NULL REFERENCES productos(id_producto) ON DELETE RESTRICT,
    cantidad NUMERIC(10, 2) NOT NULL CHECK (cantidad > 0),
    precio_unitario NUMERIC(10, 2) NOT NULL,
    subtotal NUMERIC(10, 2) NOT NULL
);

-- 9. TABLA: DOCUMENTOS Y COMPROBANTES DE ALMACENAMIENTO (CLOUD STORAGE)
CREATE TABLE IF NOT EXISTS documentos_adjuntos (
    id_documento BIGSERIAL PRIMARY KEY,
    titulo VARCHAR(150) NOT NULL,
    tipo_documento VARCHAR(50) NOT NULL, -- 'FACTURA', 'COMPROBANTE', 'REPORTE'
    gcs_bucket_name VARCHAR(100) NOT NULL,
    gcs_object_path VARCHAR(255) NOT NULL,
    url_publica VARCHAR(500),
    tamano_bytes BIGINT,
    mime_type VARCHAR(100),
    fecha_subida TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    usuario_id BIGINT REFERENCES usuarios(id)
);

-- 10. DATOS INICIALES (SEEDING)
INSERT INTO roles (codigo, nombre, descripcion, permisos) VALUES
('ADMINISTRADOR', 'Administrador General', 'Acceso total y configuracion', '["*"]'::jsonb),
('VENDEDOR', 'Vendedor / Cajero', 'Punto de venta y facturacion', '["pos", "ventas"]'::jsonb),
('ALMACENERO', 'Encargado de Inventario', 'Recepcion de compras y kardex', '["inventario", "compras"]'::jsonb)
ON CONFLICT (codigo) DO NOTHING;

INSERT INTO clientes (nombre_completo, nit, direccion) VALUES
('Consumidor Final', 'C/F', 'Ciudad de Guatemala')
ON CONFLICT DO NOTHING;

-- FIN DEL SCRIPT

import os
import sys
from pathlib import Path
import docx
from docx import Document
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT, WD_ALIGN_VERTICAL
from docx.oxml import OxmlElement
from docx.oxml.ns import qn

def set_cell_background(cell, fill_hex):
    """Establece color de fondo de una celda."""
    tcPr = cell._element.get_or_add_tcPr()
    shd = OxmlElement('w:shd')
    shd.set(qn('w:val'), 'clear')
    shd.set(qn('w:color'), 'auto')
    shd.set(qn('w:fill'), fill_hex)
    tcPr.append(shd)

def set_cell_border(cell, **kwargs):
    """
    kwargs: top, bottom, left, right
    values: dict(sz=12, val='single', color='1A73E8', space='0')
    """
    tcPr = cell._element.get_or_add_tcPr()
    tcBorders = OxmlElement('w:tcBorders')
    for edge, border_args in kwargs.items():
        edge_data = OxmlElement(f'w:{edge}')
        for key, val in border_args.items():
            edge_data.set(qn(f'w:{key}'), str(val))
        tcBorders.append(edge_data)
    tcPr.append(tcBorders)

def add_placeholder_box(doc, title, instruction):
    """Crea un recuadro estetico como placeholder para pegar una captura de pantalla."""
    table = doc.add_table(rows=1, cols=1)
    table.alignment = WD_TABLE_ALIGNMENT.CENTER
    table.autofit = False
    
    cell = table.rows[0].cells[0]
    cell.width = Inches(6.5)
    
    # Fondo gris suave y borde azul punteado/solido
    set_cell_background(cell, "F8F9FA")
    set_cell_border(cell, 
                    top={'val': 'dashed', 'sz': 8, 'color': '1A73E8', 'space': '0'},
                    bottom={'val': 'dashed', 'sz': 8, 'color': '1A73E8', 'space': '0'},
                    left={'val': 'dashed', 'sz': 8, 'color': '1A73E8', 'space': '0'},
                    right={'val': 'dashed', 'sz': 8, 'color': '1A73E8', 'space': '0'})
    
    p = cell.paragraphs[0]
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p.paragraph_format.space_before = Pt(18)
    p.paragraph_format.space_after = Pt(4)
    
    run_icon = p.add_run("📸 [ PEGAR AQUÍ CAPTURA DE PANTALLA ]\n")
    run_icon.bold = True
    run_icon.font.size = Pt(11)
    run_icon.font.color.rgb = RGBColor(26, 115, 232) # Google Blue
    
    run_title = p.add_run(f"{title}\n")
    run_title.bold = True
    run_title.font.size = Pt(10)
    run_title.font.color.rgb = RGBColor(32, 33, 36)
    
    run_desc = p.add_run(instruction)
    run_desc.italic = True
    run_desc.font.size = Pt(9)
    run_desc.font.color.rgb = RGBColor(95, 99, 104)
    
    p_pad = cell.add_paragraph()
    p_pad.paragraph_format.space_after = Pt(18)
    
    # Espacio tras la tabla
    p_after = doc.add_paragraph()
    p_after.paragraph_format.space_before = Pt(0)
    p_after.paragraph_format.space_after = Pt(10)

def generate_document(output_path):
    doc = Document()
    
    # Configurar margenes normales (1 pulgada = 2.54 cm)
    for section in doc.sections:
        section.top_margin = Inches(1.0)
        section.bottom_margin = Inches(1.0)
        section.left_margin = Inches(1.0)
        section.right_margin = Inches(1.0)

    # Colores institucionales
    COLOR_PRIMARY = RGBColor(26, 115, 232)   # Google Blue
    COLOR_SECONDARY = RGBColor(30, 41, 59)  # Slate Dark
    COLOR_MUTED = RGBColor(100, 116, 139)

    # ==========================================
    # PORTADA
    # ==========================================
    p_pre = doc.add_paragraph()
    p_pre.paragraph_format.space_before = Pt(40)
    p_pre.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r_uni = p_pre.add_run("INFRAESTRUCTURA Y SERVICIOS EN LA NUBE\nGOOGLE CLOUD PLATFORM")
    r_uni.bold = True
    r_uni.font.size = Pt(13)
    r_uni.font.color.rgb = COLOR_MUTED

    p_title = doc.add_paragraph()
    p_title.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_title.paragraph_format.space_before = Pt(20)
    p_title.paragraph_format.space_after = Pt(15)
    r_title = p_title.add_run("PROYECTO EMPRESA CLOUD")
    r_title.bold = True
    r_title.font.size = Pt(26)
    r_title.font.color.rgb = COLOR_PRIMARY

    p_sub = doc.add_paragraph()
    p_sub.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_sub.paragraph_format.space_after = Pt(40)
    r_sub = p_sub.add_run("Diseño e Implementación de Infraestructura Empresarial Completa\nSistema NohemySys (VPC, Cloud Run, Cloud SQL y Cloud Storage)")
    r_sub.font.size = Pt(13)
    r_sub.font.color.rgb = COLOR_SECONDARY

    # Linea divisoria estetica
    p_line = doc.add_paragraph()
    p_line.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_line.paragraph_format.space_after = Pt(100)
    r_line = p_line.add_run("━" * 45)
    r_line.font.color.rgb = RGBColor(218, 224, 233)

    # Datos del estudiante / equipo
    p_meta = doc.add_paragraph()
    p_meta.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_meta.paragraph_format.line_spacing = 1.3
    
    r_aut = p_meta.add_run("Presentado por:\n")
    r_aut.bold = True
    r_aut.font.size = Pt(11)
    
    r_nom = p_meta.add_run("Rubén Estuardo / FlashB4cks\n\n")
    r_nom.font.size = Pt(12)
    
    r_fecha = p_meta.add_run("Proyecto ID GCP: proyectotelecom-511619\nRegión: us-central1\nOctubre 2026")
    r_fecha.font.size = Pt(10)
    r_fecha.font.color.rgb = COLOR_MUTED

    doc.add_page_break()

    # ==========================================
    # 1. OBJETIVO Y DESCRIPCIÓN DEL CASO
    # ==========================================
    h1 = doc.add_heading("1. Objetivo del Proyecto", level=1)
    h1.runs[0].font.color.rgb = COLOR_PRIMARY
    
    p = doc.add_paragraph(
        "Diseñar e implementar una infraestructura empresarial completa, desacoplada y escalable "
        "utilizando los servicios administrados de Google Cloud Platform (GCP). El proyecto garantiza "
        "la separación estricta de capas de red, alta disponibilidad, seguridad de datos y "
        "cumplimiento con el estándar OWASP Top 10 para la gestión corporativa de información."
    )
    p.paragraph_format.space_after = Pt(12)

    h2 = doc.add_heading("2. Caso Empresarial y Alcance", level=1)
    h2.runs[0].font.color.rgb = COLOR_PRIMARY
    
    doc.add_paragraph(
        "Una empresa ficticia de carácter comercial y minorista requiere un sistema web integral y robusto "
        "(denominado NohemySys) para administrar de forma centralizada y segura sus operaciones neurálgicas:"
    )
    
    bullet_items = [
        ("Clientes:", "Control y registro de cartera de clientes, soporte fiscal para Consumidor Final (C/F) y NIT."),
        ("Productos:", "Catálogo maestro con código de barras, categorías, marcas, precios de costo/venta y control de stock."),
        ("Ventas:", "Punto de Venta (POS) multisesión de caja, tickets de venta, control de mermas y balance de ingresos."),
        ("Usuarios:", "Seguridad por roles RBAC (Administrador, Vendedor, Almacenero) con trazabilidad y auditoría."),
        ("Documentos:", "Generación de comprobantes, reportes y respaldo en repositorio de objetos en la nube.")
    ]
    for b_title, b_desc in bullet_items:
        bp = doc.add_paragraph(style='List Bullet')
        r_b = bp.add_run(b_title + " ")
        r_b.bold = True
        bp.add_run(b_desc)

    # ==========================================
    # 3. TABLA DE DIRECCIONAMIENTO DE RED
    # ==========================================
    doc.add_page_break()
    h3 = doc.add_heading("3. Direccionamiento de Red y Subredes (VPC)", level=1)
    h3.runs[0].font.color.rgb = COLOR_PRIMARY

    doc.add_paragraph(
        "Para aislar los entornos de ejecución y cumplir con el principio de mínima exposición, "
        "se diseñó una Red Virtual Privada (VPC) con modo de subredes personalizado (Custom Subnet Mode) "
        "y direccionamiento bajo el estándar RFC 1918."
    )

    # Tabla de direccionamiento
    table = doc.add_table(rows=5, cols=4)
    table.alignment = WD_TABLE_ALIGNMENT.CENTER
    table.autofit = False

    headers = ["Recurso", "Red / Prefijo CIDR", "Rango de IPs Asignables", "Propósito en la Infraestructura"]
    col_widths = [Inches(1.2), Inches(1.5), Inches(1.8), Inches(2.0)]

    hdr_cells = table.rows[0].cells
    for i, title in enumerate(headers):
        hdr_cells[i].text = title
        hdr_cells[i].width = col_widths[i]
        set_cell_background(hdr_cells[i], "1A73E8")
        p = hdr_cells[i].paragraphs[0]
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        p.runs[0].font.bold = True
        p.runs[0].font.color.rgb = RGBColor(255, 255, 255)
        p.runs[0].font.size = Pt(9.5)

    data_rows = [
        ("VPC Principal", "10.10.0.0/16", "10.10.0.1 - 10.10.255.254", "Red virtual empresarial (vpc-empresa)."),
        ("Subred Web", "10.10.10.0/24", "10.10.10.1 - 10.10.10.254", "Capa frontend (React SPA + Nginx Alpine)."),
        ("Subred App", "10.10.20.0/24", "10.10.20.1 - 10.10.20.254", "Capa backend (Django REST Framework + Gunicorn)."),
        ("Subred DB", "10.10.30.0/24", "10.10.30.1 - 10.10.30.254", "Capa de persistencia (PostgreSQL en Cloud SQL).")
    ]

    for row_idx, data in enumerate(data_rows, start=1):
        row_cells = table.rows[row_idx].cells
        bg_color = "F1F5F9" if row_idx % 2 == 0 else "FFFFFF"
        for col_idx, val in enumerate(data):
            row_cells[col_idx].text = val
            row_cells[col_idx].width = col_widths[col_idx]
            set_cell_background(row_cells[col_idx], bg_color)
            p = row_cells[col_idx].paragraphs[0]
            p.runs[0].font.size = Pt(9)
            if col_idx == 0:
                p.runs[0].font.bold = True

    doc.add_paragraph().paragraph_format.space_after = Pt(10)

    # Reglas de Firewall
    h3_sub = doc.add_heading("Políticas de Seguridad y Firewall", level=2)
    h3_sub.runs[0].font.color.rgb = COLOR_SECONDARY

    doc.add_paragraph(
        "Se establecieron tres reglas de cortafuegos perimetrales para salvaguardar la VPC:"
    )
    fw_items = [
        ("allow-web-traffic (Prioridad 1000):", "Permite tráfico entrante HTTP (puerto 80) y HTTPS (puerto 443) desde cualquier origen (0.0.0.0/0) hacia la subred Web."),
        ("allow-internal-traffic (Prioridad 1000):", "Permite la interconexión completa y segura entre los servicios internos pertenecientes al rango corporativo 10.10.0.0/16."),
        ("allow-icmp (Prioridad 1000):", "Habilita diagnósticos y pruebas de latencia/conectividad interna mediante protocolo ICMP.")
    ]
    for f_title, f_desc in fw_items:
        fp = doc.add_paragraph(style='List Bullet')
        r_f = fp.add_run(f_title + " ")
        r_f.bold = True
        fp.add_run(f_desc)

    # ==========================================
    # 4. ARQUITECTURA DE LA SOLUCIÓN
    # ==========================================
    doc.add_page_break()
    h4 = doc.add_heading("4. Arquitectura de Infraestructura en Google Cloud", level=1)
    h4.runs[0].font.color.rgb = COLOR_PRIMARY

    doc.add_paragraph(
        "La arquitectura implementada responde al patrón moderno de microservicios serverless desacoplados, "
        "optimizando costos operativos gracias al escalado automático a cero instancias y máxima seguridad perimetral:"
    )

    arch_points = [
        ("Capa de Cómputo (Cloud Run):", "Alojamiento de contenedores Docker ligeros. El Frontend (React SPA) es servido por Nginx Alpine y el Backend API por Django 6 + Gunicorn multihilo."),
        ("Capa de Base de Datos (Cloud SQL):", "Instancia administrada de PostgreSQL 16 (nohemysys-db) con conexión encriptada mediante túnel de Socket Unix y respaldos automatizados."),
        ("Capa de Almacenamiento (Cloud Storage):", "Bucket de objetos gs://nohemysys-documentos-proyectotelecom-511619 para el resguardo inmutable de facturas, tickets y documentos empresariales."),
        ("Seguridad e IAM:", "Cuentas de servicio con roles mínimos (roles/cloudsql.client, roles/storage.admin) y certificados SSL gestionados automáticamente.")
    ]
    for a_title, a_desc in arch_points:
        ap = doc.add_paragraph(style='List Bullet')
        r_a = ap.add_run(a_title + " ")
        r_a.bold = True
        ap.add_run(a_desc)

    doc.add_paragraph().paragraph_format.space_after = Pt(10)
    add_placeholder_box(doc, "DIAGRAMA DE ARQUITECTURA GENERAL", 
                        "Inserta aquí el diagrama exportado de Draw.io, Lucidchart o captura del flujo de arquitectura Cloud Run + Cloud SQL + Storage.")

    # ==========================================
    # 5. MODELO DE DATOS Y REPOSITORIO
    # ==========================================
    doc.add_page_break()
    h5 = doc.add_heading("5. Modelo de Base de Datos y Código Fuente", level=1)
    h5.runs[0].font.color.rgb = COLOR_PRIMARY

    doc.add_paragraph(
        "El modelo relacional cumple y excede las especificaciones mínimas solicitadas, "
        "incorporando integridad referencial, índices de alto desempeño y protección transaccional ACID."
    )

    t_db = doc.add_table(rows=6, cols=3)
    t_db.alignment = WD_TABLE_ALIGNMENT.CENTER
    t_db.autofit = False

    t_headers = ["Entidad / Tabla", "Campos Clave Implementados", "Relación / Descripción"]
    t_widths = [Inches(1.5), Inches(3.0), Inches(2.0)]

    for idx, text in enumerate(t_headers):
        cell = t_db.rows[0].cells[idx]
        cell.text = text
        cell.width = t_widths[idx]
        set_cell_background(cell, "1A73E8")
        p = cell.paragraphs[0]
        p.runs[0].font.bold = True
        p.runs[0].font.color.rgb = RGBColor(255, 255, 255)
        p.runs[0].font.size = Pt(9.5)

    db_data = [
        ("CLIENTES", "id_cliente, nombre_completo, nit, dpi, telefono, direccion, is_active", "Gestión de clientes con NIT C/F."),
        ("PRODUCTOS", "id_producto, codigo_barras, nombre, precio_venta, precio_costo, stock_actual", "Catálogo comercial e inventario."),
        ("VENTAS", "id_venta, numero_factura, fecha_venta, subtotal, impuesto, total, cliente_id", "Cabecera de ventas y facturación."),
        ("DETALLES_VENTA", "id_detalle, venta_id, producto_id, cantidad, precio_unitario, subtotal", "Detalle de líneas de venta (N:1)."),
        ("USUARIOS / ROLES", "id, username, password, email, rol (ADMIN, VENDEDOR, ALMACENERO)", "Control de acceso RBAC seguro.")
    ]

    for r_idx, row in enumerate(db_data, start=1):
        cells = t_db.rows[r_idx].cells
        bg = "F1F5F9" if r_idx % 2 == 0 else "FFFFFF"
        for c_idx, val in enumerate(row):
            cells[c_idx].text = val
            cells[c_idx].width = t_widths[c_idx]
            set_cell_background(cells[c_idx], bg)
            p = cells[c_idx].paragraphs[0]
            p.runs[0].font.size = Pt(9)
            if c_idx == 0:
                p.runs[0].font.bold = True

    p_repo = doc.add_paragraph()
    p_repo.paragraph_format.space_before = Pt(16)
    r_r1 = p_repo.add_run("Repositorio de Código Fuente (GitHub):\n")
    r_r1.bold = True
    r_r2 = p_repo.add_run("https://github.com/FlashB4cks/ProyectoAbarrotes\n")
    r_r2.font.color.rgb = COLOR_PRIMARY
    r_r2.bold = True
    r_r3 = p_repo.add_run("Script SQL DDL Adjunto en Repositorio: ")
    r_r4 = p_repo.add_run("database_schema.sql (disponible en la raíz del proyecto).")
    r_r4.italic = True

    # ==========================================
    # 6. EVIDENCIAS DE IMPLEMENTACIÓN
    # ==========================================
    doc.add_page_break()
    h6 = doc.add_heading("6. Evidencias de Implementación en Google Cloud", level=1)
    h6.runs[0].font.color.rgb = COLOR_PRIMARY

    doc.add_paragraph(
        "A continuación se presentan las capturas de pantalla organizadas por cada uno de los servicios "
        "y componentes obligatorios desplegados en el proyecto proyectotelecom-511619."
    )

    evidencias = [
        ("EVIDENCIA 6.1: PROYECTO EN GOOGLE CLOUD PLATFORM",
         "Captura de la barra superior de la consola de Google Cloud donde se verifique el ID del proyecto: proyectotelecom-511619."),
        
        ("EVIDENCIA 6.2: RED VIRTUAL PRIVADA (VPC)",
         "Captura en Red de VPC > Redes de VPC mostrando la red 'vpc-empresa' con modo de subred personalizado."),
        
        ("EVIDENCIA 6.3: SUBREDES CONFIGURADAS (WEB, APP, DB)",
         "Captura dentro de 'vpc-empresa' donde se visualicen 'subnet-web' (10.10.10.0/24), 'subnet-app' (10.10.20.0/24) y 'subnet-db' (10.10.30.0/24) en us-central1."),
        
        ("EVIDENCIA 6.4: REGLAS DE FIREWALL",
         "Captura en Red de VPC > Firewall con las reglas 'allow-web-traffic', 'allow-internal-traffic' y 'allow-icmp' activas."),
        
        ("EVIDENCIA 6.5: CÓMPUTO SERVERLESS - CLOUD RUN",
         "Captura en Cloud Run mostrando los dos servicios activos: 'nohemysys-backend' y 'nohemysys-frontend' con estado verde 100% de tráfico."),
        
        ("EVIDENCIA 6.6: BASE DE DATOS ADMINISTRADA - CLOUD SQL",
         "Captura en Cloud SQL mostrando la instancia 'nohemysys-db' con motor PostgreSQL 16 y estado RUNNABLE."),
        
        ("EVIDENCIA 6.7: ALMACENAMIENTO DE OBJETOS - CLOUD STORAGE",
         "Captura en Cloud Storage > Buckets mostrando el bucket de almacenamiento de documentos creado en us-central1."),
        
        ("EVIDENCIA 6.8: APLICACIÓN WEB - PANTALLA DE INICIO DE SESIÓN",
         "Captura de la aplicación en el navegador con la URL pública HTTPS de Cloud Run cargando el módulo de Login."),
        
        ("EVIDENCIA 6.9: APLICACIÓN WEB - MÓDULO DE CLIENTES (CRUD)",
         "Captura del módulo de Clientes listando registros (ej. Consumidor Final) y formulario de nuevo cliente."),
        
        ("EVIDENCIA 6.10: APLICACIÓN WEB - MÓDULO DE PRODUCTOS (CATÁLOGO)",
         "Captura del catálogo maestro de productos con precios, stock y códigos de barras."),
        
        ("EVIDENCIA 6.11: APLICACIÓN WEB - PUNTO DE VENTA (POS) Y FACTURACIÓN",
         "Captura del Punto de Venta con productos agregados al carrito, cálculo de subtotales, impuestos y total."),
        
        ("EVIDENCIA 6.12: REPOSITORIO DE CÓDIGO FUENTE (GITHUB)",
         "Captura de la página principal del repositorio en GitHub (FlashB4cks/ProyectoAbarrotes) mostrando los commits y estructura Docker.")
    ]

    for title, desc in evidencias:
        add_placeholder_box(doc, title, desc)

    # ==========================================
    # 7. CONCLUSIONES
    # ==========================================
    h7 = doc.add_heading("7. Conclusiones y Beneficios de la Arquitectura", level=1)
    h7.runs[0].font.color.rgb = COLOR_PRIMARY

    conclusiones = [
        ("Escalabilidad Serverless sin Servidores Fijos:", "El uso combinado de Cloud Run para Frontend y Backend permite a la empresa atender picos de ventas sin sobreaprovisionamiento de hardware, escalando a cero durante la noche y reduciendo drásticamente los costos de infraestructura."),
        ("Seguridad Perimetral y OWASP Hardening:", "La separación de la red en subredes privadas (Web, App, DB), el filtrado por Firewall y la autenticación JWT con control RBAC garantizan que los datos financieros y de clientes permanezcan aislados de vectores de ataque comunes."),
        ("Alta Disponibilidad y Mantenimiento Cero:", "Tanto Cloud SQL como Cloud Storage delegan la administración de parches, replicación y certificados SSL directamente en la infraestructura global de Google, asegurando un SLA del 99.95% para la operación continua del negocio.")
    ]
    for c_title, c_desc in conclusiones:
        cp = doc.add_paragraph(style='List Bullet')
        r_c = cp.add_run(c_title + " ")
        r_c.bold = True
        cp.add_run(c_desc)

    doc.save(output_path)
    print(f"Documento generado exitosamente en: {output_path}")

if __name__ == '__main__':
    target = os.path.join(r"c:\Users\ruben\OneDrive\Escritorio\Proyecto abarrotes", "Informe_Proyecto_Empresa_Cloud.docx")
    generate_document(target)

import os
import re
import sys

BASE_DIR = r'c:\Users\ruben\OneDrive\Escritorio\Proyecto abarrotes\frontend\src'
APP_FILE = os.path.join(BASE_DIR, 'App.jsx.bak') # Read from backup so we always have the clean source!

with open(APP_FILE, 'r', encoding='utf-8') as f:
    lines = f.readlines()

def get_slice(start, end):
    return ''.join(lines[start - 1 : end])

ALL_ICONS = [
    'CategorySilhouetteIcon', 'IconAlertTriangle', 'IconBank', 'IconBarChart', 'IconBarcode',
    'IconCalendar', 'IconCard', 'IconCart', 'IconCash', 'IconCashRegister', 'IconChart',
    'IconCheck', 'IconCopy', 'IconCreditCard', 'IconDollarSign', 'IconEdit', 'IconLayers',
    'IconLock', 'IconPackage', 'IconPlus', 'IconPrinter', 'IconQuetzal', 'IconReceipt',
    'IconRefresh', 'IconSearch', 'IconShieldCheck', 'IconShoppingBag', 'IconSmartphone',
    'IconTag', 'IconTrash', 'IconTrendingUp', 'IconTruck', 'IconUser', 'IconWifi'
]
ALL_COMMON = ['Toast', 'ConfirmModal', 'CredentialsModal', 'ChangePasswordModal', 'ModuleErrorBoundary']
ALL_HOOKS = ['useState', 'useEffect', 'useMemo', 'useCallback', 'useRef', 'createContext', 'useContext']
ALL_AUDIO = ['playCashRegisterSound', 'playScannerBeep']
ALL_API = ['NohemyApi', 'STORAGE_KEYS', 'API_BASE_URL']

def compute_imports(code, file_dir_from_src='', ignore_common=None, ignore_icons=None):
    if ignore_common is None:
        ignore_common = []
    if ignore_icons is None:
        ignore_icons = []

    # Calculate relative prefix to 'src/'
    # e.g. for 'pages/pos' -> '../../'
    # for 'components/layout' -> '../../'
    # for 'components/common' -> '../../'
    # for 'api' -> '../'
    depth = len(file_dir_from_src.strip('/').split('/')) if file_dir_from_src else 0
    rel_src = '../' * depth if depth > 0 else './'

    used_hooks = [h for h in ALL_HOOKS if re.search(r'\b' + h + r'\b', code)]
    if used_hooks:
        react_import = "import React, { " + ", ".join(used_hooks) + " } from 'react';"
    else:
        react_import = "import React from 'react';"

    extra_imports = []

    used_api = [a for a in ALL_API if re.search(r'\b' + a + r'\b', code)]
    if used_api:
        extra_imports.append("import { " + ", ".join(used_api) + " } from '" + rel_src + "api/nohemyApi';")

    if re.search(r'\buseAuth\b', code):
        extra_imports.append("import { useAuth } from '" + rel_src + "context/AuthContext';")

    used_audio = [au for au in ALL_AUDIO if re.search(r'\b' + au + r'\b', code)]
    if used_audio:
        extra_imports.append("import { " + ", ".join(used_audio) + " } from '" + rel_src + "utils/audio';")

    used_common = [c for c in ALL_COMMON if re.search(r'<' + c + r'\b', code) and c not in ignore_common]
    if used_common:
        extra_imports.append("import { " + ", ".join(used_common) + " } from '" + rel_src + "components/common';")

    used_icons = [ic for ic in ALL_ICONS if re.search(r'\b' + ic + r'\b', code) and ic not in ignore_icons]
    if used_icons:
        extra_imports.append("import { " + ", ".join(used_icons) + " } from '" + rel_src + "components/icons/Icons';")

    return '\n'.join([react_import] + extra_imports) + '\n\n'

def write_module(rel_path, code, imports_header, exports_footer=''):
    full_path = os.path.join(BASE_DIR, rel_path)
    os.makedirs(os.path.dirname(full_path), exist_ok=True)
    with open(full_path, 'w', encoding='utf-8') as f:
        f.write(imports_header + code + exports_footer)
    print(f"Created: {rel_path}")

# --- 1. Suppliers ---
supp_modal_code = get_slice(1059, 1275).replace('const SupplierModal =', 'export const SupplierModal =')
write_module(
    'pages/suppliers/SupplierModal.jsx',
    supp_modal_code,
    compute_imports(supp_modal_code, 'pages/suppliers'),
    '\nexport default SupplierModal;\n'
)

supp_page_code = get_slice(3094, 3377).replace('const SuppliersContent =', 'export const SuppliersContent =') + '\n' + \
                 get_slice(3378, 3385).replace('const SuppliersPage =', 'export const SuppliersPage =')
supp_page_imports = compute_imports(supp_page_code, 'pages/suppliers') + "import SupplierModal from './SupplierModal';\n"
write_module(
    'pages/suppliers/SuppliersPage.jsx',
    supp_page_code,
    supp_page_imports,
    '\nexport default SuppliersPage;\n'
)

# --- 2. Clients ---
cust_modal_code = get_slice(3386, 3621).replace('const CustomerModal =', 'export const CustomerModal =')
write_module(
    'pages/clients/CustomerModal.jsx',
    cust_modal_code,
    compute_imports(cust_modal_code, 'pages/clients'),
    '\nexport default CustomerModal;\n'
)

clients_page_code = get_slice(3622, 3940).replace('const ClientsContent =', 'export const ClientsContent =') + '\n' + \
                    get_slice(3941, 3948).replace('const ClientsPage =', 'export const ClientsPage =')
clients_page_imports = compute_imports(clients_page_code, 'pages/clients') + "import CustomerModal from './CustomerModal';\n"
write_module(
    'pages/clients/ClientsPage.jsx',
    clients_page_code,
    clients_page_imports,
    '\nexport default ClientsPage;\n'
)

# --- 3. Users & Roles ---
user_modal_code = get_slice(616, 766).replace('const UserModal =', 'export const UserModal =')
write_module(
    'pages/users/UserModal.jsx',
    user_modal_code,
    compute_imports(user_modal_code, 'pages/users'),
    '\nexport default UserModal;\n'
)

rol_modal_code = get_slice(767, 882).replace('const RolModal =', 'export const RolModal =')
write_module(
    'pages/users/RolModal.jsx',
    rol_modal_code,
    compute_imports(rol_modal_code, 'pages/users'),
    '\nexport default RolModal;\n'
)

users_page_code = get_slice(3949, 4030).replace('const UserTable =', 'export const UserTable =') + '\n' + \
                  get_slice(4031, 4306).replace('const UsersPage =', 'export const UsersPage =')
users_page_imports = compute_imports(users_page_code, 'pages/users') + "import UserModal from './UserModal';\nimport RolModal from './RolModal';\n"
write_module(
    'pages/users/UsersPage.jsx',
    users_page_code,
    users_page_imports,
    '\nexport default UsersPage;\n'
)

# --- 4. Products, Brands, Units ---
marca_modal_code = get_slice(883, 964).replace('const MarcaModal =', 'export const MarcaModal =')
write_module(
    'pages/products/MarcaModal.jsx',
    marca_modal_code,
    compute_imports(marca_modal_code, 'pages/products'),
    '\nexport default MarcaModal;\n'
)

unidad_modal_code = get_slice(965, 1048).replace('const UnidadModal =', 'export const UnidadModal =')
write_module(
    'pages/products/UnidadModal.jsx',
    unidad_modal_code,
    compute_imports(unidad_modal_code, 'pages/products'),
    '\nexport default UnidadModal;\n'
)

prod_modal_code = get_slice(1276, 1546).replace('const ProductModal =', 'export const ProductModal =')
prod_modal_imports = compute_imports(prod_modal_code, 'pages/products') + \
    "import MarcaModal from './MarcaModal';\nimport UnidadModal from './UnidadModal';\nimport SupplierModal from '../suppliers/SupplierModal';\n"
write_module(
    'pages/products/ProductModal.jsx',
    prod_modal_code,
    prod_modal_imports,
    '\nexport default ProductModal;\n'
)

prods_page_code = get_slice(1547, 2154).replace('const ProductsPage =', 'export const ProductsPage =')
prods_page_imports = compute_imports(prods_page_code, 'pages/products') + \
    "import ProductModal from './ProductModal';\nimport MarcaModal from './MarcaModal';\nimport UnidadModal from './UnidadModal';\nimport SupplierModal from '../suppliers/SupplierModal';\n"
write_module(
    'pages/products/ProductsPage.jsx',
    prods_page_code,
    prods_page_imports,
    '\nexport default ProductsPage;\n'
)

# --- 5. Purchases ---
new_purch_code = get_slice(2155, 2573).replace('const NewPurchaseModal =', 'export const NewPurchaseModal =')
new_purch_imports = compute_imports(new_purch_code, 'pages/purchases') + \
    "import SupplierModal from '../suppliers/SupplierModal';\n"
write_module(
    'pages/purchases/NewPurchaseModal.jsx',
    new_purch_code,
    new_purch_imports,
    '\nexport default NewPurchaseModal;\n'
)

purch_detail_code = get_slice(2574, 2670).replace('const PurchaseDetailModal =', 'export const PurchaseDetailModal =')
write_module(
    'pages/purchases/PurchaseDetailModal.jsx',
    purch_detail_code,
    compute_imports(purch_detail_code, 'pages/purchases'),
    '\nexport default PurchaseDetailModal;\n'
)

purch_page_code = get_slice(2671, 3093).replace('const PurchasesPage =', 'export const PurchasesPage =')
purch_page_imports = compute_imports(purch_page_code, 'pages/purchases') + \
    "import NewPurchaseModal from './NewPurchaseModal';\nimport PurchaseDetailModal from './PurchaseDetailModal';\nimport SupplierModal from '../suppliers/SupplierModal';\n"
write_module(
    'pages/purchases/PurchasesPage.jsx',
    purch_page_code,
    purch_page_imports,
    '\nexport default PurchasesPage;\n'
)

# --- 6. Inventory Batches & Mermas FIFO ---
merma_modal_code = get_slice(7419, 7608).replace('const RegisterMermaModal =', 'export const RegisterMermaModal =')
write_module(
    'pages/inventory/RegisterMermaModal.jsx',
    merma_modal_code,
    compute_imports(merma_modal_code, 'pages/inventory'),
    '\nexport default RegisterMermaModal;\n'
)

inv_page_code = get_slice(7609, 8389).replace('const InventoryBatchesPage =', 'export const InventoryBatchesPage =')
inv_page_imports = compute_imports(inv_page_code, 'pages/inventory') + \
    "import RegisterMermaModal from './RegisterMermaModal';\n"
write_module(
    'pages/inventory/InventoryBatchesPage.jsx',
    inv_page_code,
    inv_page_imports,
    '\nexport default InventoryBatchesPage;\n'
)

# --- 7. Cash Control (Control de Caja) ---
open_cash_code = get_slice(5528, 5635).replace('const OpenCashModal =', 'export const OpenCashModal =')
write_module(
    'pages/cash/OpenCashModal.jsx',
    open_cash_code,
    compute_imports(open_cash_code, 'pages/cash'),
    '\nexport default OpenCashModal;\n'
)

cash_mov_code = get_slice(5636, 5805).replace('const CashMovementModal =', 'export const CashMovementModal =')
write_module(
    'pages/cash/CashMovementModal.jsx',
    cash_mov_code,
    compute_imports(cash_mov_code, 'pages/cash'),
    '\nexport default CashMovementModal;\n'
)

close_cash_code = get_slice(5806, 6077).replace('const CloseCashModal =', 'export const CloseCashModal =')
write_module(
    'pages/cash/CloseCashModal.jsx',
    close_cash_code,
    compute_imports(close_cash_code, 'pages/cash'),
    '\nexport default CloseCashModal;\n'
)

cash_ticket_code = get_slice(6078, 6209).replace('const CashTicketModal =', 'export const CashTicketModal =')
write_module(
    'pages/cash/CashTicketModal.jsx',
    cash_ticket_code,
    compute_imports(cash_ticket_code, 'pages/cash'),
    '\nexport default CashTicketModal;\n'
)

cash_ctrl_code = get_slice(6210, 6714).replace('const CashControlPage =', 'export const CashControlPage =')
cash_ctrl_imports = compute_imports(cash_ctrl_code, 'pages/cash') + \
    "import OpenCashModal from './OpenCashModal';\nimport CashMovementModal from './CashMovementModal';\nimport CloseCashModal from './CloseCashModal';\nimport CashTicketModal from './CashTicketModal';\n"
write_module(
    'pages/cash/CashControlPage.jsx',
    cash_ctrl_code,
    cash_ctrl_imports,
    '\nexport default CashControlPage;\n'
)

# --- 8. POS (Punto de Venta) ---
client_sel_code = get_slice(4598, 4896).replace('const ClientSelectModal =', 'export const ClientSelectModal =')
write_module(
    'pages/pos/ClientSelectModal.jsx',
    client_sel_code,
    compute_imports(client_sel_code, 'pages/pos'),
    '\nexport default ClientSelectModal;\n'
)

checkout_code = get_slice(4897, 5148).replace('const CheckoutModal =', 'export const CheckoutModal =')
write_module(
    'pages/pos/CheckoutModal.jsx',
    checkout_code,
    compute_imports(checkout_code, 'pages/pos'),
    '\nexport default CheckoutModal;\n'
)

invoice_ticket_code = get_slice(5149, 5303).replace('const InvoiceTicketModal =', 'export const InvoiceTicketModal =')
write_module(
    'pages/pos/InvoiceTicketModal.jsx',
    invoice_ticket_code,
    compute_imports(invoice_ticket_code, 'pages/pos'),
    '\nexport default InvoiceTicketModal;\n'
)

sales_hist_code = get_slice(5304, 5527).replace('const SalesHistoryView =', 'export const SalesHistoryView =')
sales_hist_imports = compute_imports(sales_hist_code, 'pages/pos') + \
    "import InvoiceTicketModal from './InvoiceTicketModal';\n"
write_module(
    'pages/pos/SalesHistoryView.jsx',
    sales_hist_code,
    sales_hist_imports,
    '\nexport default SalesHistoryView;\n'
)

pos_page_code = get_slice(6715, 6717).replace('const SalesDailySummaryView =', 'export const SalesDailySummaryView =') + '\n' + \
                get_slice(6718, 7418).replace('const POSPage =', 'export const POSPage =')
pos_page_imports = compute_imports(pos_page_code, 'pages/pos') + \
    "import ClientSelectModal from './ClientSelectModal';\nimport CheckoutModal from './CheckoutModal';\nimport InvoiceTicketModal from './InvoiceTicketModal';\nimport SalesHistoryView from './SalesHistoryView';\nimport CashControlPage from '../cash/CashControlPage';\n"
write_module(
    'pages/pos/POSPage.jsx',
    pos_page_code,
    pos_page_imports,
    '\nexport default POSPage;\n'
)

# --- 9. Reports & Analytics ---
rep_code = get_slice(8390, 9103).replace('const ReportsAnalyticsPage =', 'export const ReportsAnalyticsPage =')
write_module(
    'pages/reports/ReportsAnalyticsPage.jsx',
    rep_code,
    compute_imports(rep_code, 'pages/reports'),
    '\nexport default ReportsAnalyticsPage;\n'
)

# --- 10. Audit Log ---
audit_code = get_slice(9104, 9528).replace('const AuditLogPage =', 'export const AuditLogPage =')
write_module(
    'pages/audit/AuditLogPage.jsx',
    audit_code,
    compute_imports(audit_code, 'pages/audit'),
    '\nexport default AuditLogPage;\n'
)

# --- 11. Scanner & Mobile ---
scanner_modal_code = get_slice(9742, 10020).replace('const ScannerModal =', 'export const ScannerModal =')
write_module(
    'pages/scanner/ScannerModal.jsx',
    scanner_modal_code,
    compute_imports(scanner_modal_code, 'pages/scanner'),
    '\nexport default ScannerModal;\n'
)

mobile_scan_code = get_slice(10021, 10478).replace('const MobileScannerPage =', 'export const MobileScannerPage =')
write_module(
    'pages/scanner/MobileScannerPage.jsx',
    mobile_scan_code,
    compute_imports(mobile_scan_code, 'pages/scanner'),
    '\nexport default MobileScannerPage;\n'
)

# --- 12. Login ---
login_code = get_slice(10479, 10539).replace('const LoginPage =', 'export const LoginPage =')
write_module(
    'pages/login/LoginPage.jsx',
    login_code,
    compute_imports(login_code, 'pages/login'),
    '\nexport default LoginPage;\n'
)

# --- 13. Layout: Sidebar & Header ---
sidebar_code = get_slice(9529, 9708).replace('const Sidebar =', 'export const Sidebar =')
write_module(
    'components/layout/Sidebar.jsx',
    sidebar_code,
    compute_imports(sidebar_code, 'components/layout'),
    '\nexport default Sidebar;\n'
)

header_code = get_slice(9709, 9741).replace('const Header =', 'export const Header =')
write_module(
    'components/layout/Header.jsx',
    header_code,
    compute_imports(header_code, 'components/layout'),
    '\nexport default Header;\n'
)

# --- 14. MainLayout ---
main_layout_code = get_slice(10577, 10796).replace('const MainLayout =', 'export const MainLayout =')
main_layout_imports = compute_imports(main_layout_code, 'components/layout') + """import Sidebar from './Sidebar';
import Header from './Header';
import LoginPage from '../../pages/login/LoginPage';
import POSPage from '../../pages/pos/POSPage';
import CashControlPage from '../../pages/cash/CashControlPage';
import ProductsPage from '../../pages/products/ProductsPage';
import ClientsPage from '../../pages/clients/ClientsPage';
import PurchasesPage from '../../pages/purchases/PurchasesPage';
import SuppliersPage from '../../pages/suppliers/SuppliersPage';
import InventoryBatchesPage from '../../pages/inventory/InventoryBatchesPage';
import ReportsAnalyticsPage from '../../pages/reports/ReportsAnalyticsPage';
import AuditLogPage from '../../pages/audit/AuditLogPage';
import UsersPage from '../../pages/users/UsersPage';
import ScannerModal from '../../pages/scanner/ScannerModal';
"""
write_module(
    'components/layout/MainLayout.jsx',
    main_layout_code,
    main_layout_imports,
    '\nexport default MainLayout;\n'
)

# --- 15. Root App.jsx ---
app_code = """import React, { useState, useEffect } from 'react';
import { AuthProvider } from './context/AuthContext';
import MainLayout from './components/layout/MainLayout';
import MobileScannerPage from './pages/scanner/MobileScannerPage';

export function App() {
  const [route, setRoute] = useState(() => window.location.hash || window.location.pathname);

  useEffect(() => {
    const handleHashChange = () => setRoute(window.location.hash || window.location.pathname);
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // Si la ruta contiene #scanner, se renderiza la vista de cámara móvil para el teléfono
  if (route.includes('scanner')) {
    return <MobileScannerPage />;
  }

  return (
    <AuthProvider>
      <MainLayout />
    </AuthProvider>
  );
}

export default App;
"""

with open(os.path.join(BASE_DIR, 'App.jsx'), 'w', encoding='utf-8') as f:
    f.write(app_code)

print("Modularization complete! All modules generated.")

import React, { useState, useEffect } from 'react';
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

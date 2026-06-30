import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Operaciones from './pages/Operaciones';
import RegistrarOperacion from './pages/RegistrarOperacion';
import DetalleOperacion from './pages/DetalleOperacion';
import Alertas from './pages/Alertas';
import Auditoria from './pages/Auditoria';
import Parametros from './pages/Parametros';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />

          <Route
            path="/*"
            element={
              <ProtectedRoute>
                <Layout>
                  <Routes>
                    <Route path="/" element={<Navigate to="/dashboard" replace />} />
                    <Route path="/dashboard" element={<Dashboard />} />
                    <Route path="/operaciones" element={<Operaciones />} />
                    <Route
                      path="/registrar"
                      element={
                        <ProtectedRoute roles={['OFICIAL_CUMPLIMIENTO', 'AREA_OPERATIVA', 'ADMINISTRADOR']}>
                          <RegistrarOperacion />
                        </ProtectedRoute>
                      }
                    />
                    <Route path="/operaciones/:id" element={<DetalleOperacion />} />
                    <Route
                      path="/alertas"
                      element={
                        <ProtectedRoute roles={['OFICIAL_CUMPLIMIENTO', 'AREA_LEGAL', 'ADMINISTRADOR']}>
                          <Alertas />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/auditoria"
                      element={
                        <ProtectedRoute roles={['AREA_AUDITORIA', 'ADMINISTRADOR']}>
                          <Auditoria />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/parametros"
                      element={
                        <ProtectedRoute roles={['ADMINISTRADOR']}>
                          <Parametros />
                        </ProtectedRoute>
                      }
                    />
                  </Routes>
                </Layout>
              </ProtectedRoute>
            }
          />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;

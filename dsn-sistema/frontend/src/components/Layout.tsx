import { useState } from 'react';
import { NavLink, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard,
  FilePlus,
  List,
  Bell,
  Lock,
  Settings,
  LogOut,
  User,
  Shield,
  Plus,
  X,
} from 'lucide-react';

const ROL_LABELS: Record<string, string> = {
  OFICIAL_CUMPLIMIENTO: 'Oficial de Cumplimiento',
  AREA_LEGAL:           'Área Legal',
  AREA_OPERATIVA:       'Área Operativa',
  AREA_AUDITORIA:       'Área de Auditoría',
  ADMINISTRADOR:        'Administrador',
};

interface NavItem {
  to: string;
  label: string;
  Icon: React.FC<{ size?: number; className?: string }>;
  roles?: string[];
}

const NAV_ITEMS: NavItem[] = [
  { to: '/dashboard',   label: 'Panel Principal',      Icon: LayoutDashboard },
  { to: '/registrar',   label: 'Registrar Operación',  Icon: FilePlus,  roles: ['OFICIAL_CUMPLIMIENTO','AREA_OPERATIVA','ADMINISTRADOR'] },
  { to: '/operaciones', label: 'Lista de Operaciones', Icon: List },
  { to: '/alertas',     label: 'Alertas',              Icon: Bell,  roles: ['OFICIAL_CUMPLIMIENTO','AREA_LEGAL','ADMINISTRADOR'] },
  { to: '/auditoria',   label: 'Log de Auditoría',     Icon: Lock,  roles: ['AREA_AUDITORIA','ADMINISTRADOR'] },
  { to: '/parametros',  label: 'Parámetros',           Icon: Settings, roles: ['ADMINISTRADOR'] },
];

export default function Layout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [showPerfil, setShowPerfil] = useState(false);
  const [showConfig, setShowConfig] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const visibleNav = NAV_ITEMS.filter(
    (item) => !item.roles || (user && item.roles.includes(user.rol))
  );

  const canRegister = ['OFICIAL_CUMPLIMIENTO','AREA_OPERATIVA','ADMINISTRADOR'].includes(user?.rol || '');

  return (
    <div className="layout">
      <aside className="sidebar">
        {/* Logo */}
        <div className="sidebar-logo">
          <Shield size={28} className="logo-shield" />
          <div className="logo-text">
            <span className="logo-title">DSN Trade</span>
            <span className="logo-subtitle">Cumplimiento Institucional</span>
          </div>
        </div>

        {/* Botón nueva operación */}
        {canRegister && (
          <Link to="/registrar" className="sidebar-new-btn">
            <Plus size={14} />
            Nueva Operación
          </Link>
        )}

        {/* Navegación */}
        <nav className="sidebar-nav">
          {visibleNav.map(({ to, label, Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) => `nav-link ${isActive ? 'nav-link-active' : ''}`}
            >
              <Icon size={16} className="nav-icon" />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        {/* Pie de barra lateral */}
        <div className="sidebar-footer">
          <div className="user-info">
            <div className="user-avatar">
              {user?.nombre?.charAt(0)?.toUpperCase() || 'U'}
            </div>
            <div className="user-details">
              <span className="user-name">{user?.nombre}</span>
              <span className="user-role">{ROL_LABELS[user?.rol || ''] || user?.rol}</span>
            </div>
          </div>

          <button className="sidebar-footer-link" type="button" onClick={() => setShowPerfil(true)}>
            <User size={15} />
            Perfil
          </button>
          <button className="sidebar-footer-link" type="button" onClick={() => setShowConfig(true)}>
            <Settings size={15} />
            Configuración
          </button>
          <button className="btn-logout" onClick={handleLogout} id="btn-logout">
            <LogOut size={15} />
            Cerrar Sesión
          </button>
        </div>
      </aside>

      <main className="main-content">
        <div className="page-wrapper">
          {children}
        </div>
      </main>

      {/* Modal Perfil */}
      {showPerfil && (
        <div className="modal-overlay" onClick={() => setShowPerfil(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 className="modal-title" style={{ margin: 0 }}>Mi Perfil</h3>
              <button className="btn-ghost" style={{ padding: 4 }} onClick={() => setShowPerfil(false)}>
                <X size={18} />
              </button>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20 }}>
              <div style={{
                width: 56, height: 56, borderRadius: '50%',
                background: 'var(--primary)', color: 'white',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '1.4rem', fontWeight: 700, flexShrink: 0,
              }}>
                {user?.nombre?.charAt(0)?.toUpperCase() || 'U'}
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text)' }}>{user?.nombre}</div>
                <div style={{ fontSize: '.82rem', color: 'var(--text-muted)', marginTop: 2 }}>{user?.email}</div>
                <span className="badge badge-info" style={{ marginTop: 6, display: 'inline-block' }}>
                  {ROL_LABELS[user?.rol || ''] || user?.rol}
                </span>
              </div>
            </div>
            <div style={{ borderTop: '1px solid var(--border)', paddingTop: 14 }}>
              <div className="info-item" style={{ marginBottom: 8 }}>
                <span className="info-label">Correo electrónico</span>
                <span className="info-value">{user?.email}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Rol en el sistema</span>
                <span className="info-value">{ROL_LABELS[user?.rol || ''] || user?.rol}</span>
              </div>
            </div>
            <div className="modal-actions" style={{ marginTop: 20 }}>
              <button className="btn-secondary" onClick={() => setShowPerfil(false)}>Cerrar</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Configuración */}
      {showConfig && (
        <div className="modal-overlay" onClick={() => setShowConfig(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 className="modal-title" style={{ margin: 0 }}>Configuración</h3>
              <button className="btn-ghost" style={{ padding: 4 }} onClick={() => setShowConfig(false)}>
                <X size={18} />
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div className="info-item">
                <span className="info-label">Versión del sistema</span>
                <span className="info-value">v4.2.1-SECURE</span>
              </div>
              <div className="info-item">
                <span className="info-label">Idioma</span>
                <span className="info-value">Español (Colombia)</span>
              </div>
              <div className="info-item">
                <span className="info-label">Zona horaria</span>
                <span className="info-value">America/Bogota (UTC−5)</span>
              </div>
              <div className="info-item">
                <span className="info-label">Parámetros del sistema</span>
                <span className="info-value">
                  {user?.rol === 'ADMINISTRADOR'
                    ? <Link to="/parametros" onClick={() => setShowConfig(false)} style={{ color: 'var(--primary)', textDecoration: 'none', fontWeight: 600 }}>
                        Ir a Parámetros →
                      </Link>
                    : 'Solo disponible para Administradores'}
                </span>
              </div>
            </div>
            <div className="modal-actions" style={{ marginTop: 20 }}>
              <button className="btn-secondary" onClick={() => setShowConfig(false)}>Cerrar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

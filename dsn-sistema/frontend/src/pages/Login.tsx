import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Shield, User, Lock, Key, Headphones } from 'lucide-react';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const quickLogin = (rol: string) => {
    const CREDS: Record<string, string> = {
      oficial:   'oficial@dsn.com',
      legal:     'legal@dsn.com',
      operativo: 'operativo@dsn.com',
      auditoria: 'auditoria@dsn.com',
      admin:     'admin@dsn.com',
    };
    setEmail(CREDS[rol]);
    setPassword('demo123');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { mensaje?: string } } };
      setError(axiosErr?.response?.data?.mensaje || 'Credenciales incorrectas');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      {/* Marca */}
      <div className="login-brand">
        <Shield size={26} className="login-brand-icon" />
        <div className="login-brand-text">
          <span className="login-brand-name">DSN Trade</span>
          <span className="login-brand-sub">Cumplimiento Institucional</span>
        </div>
      </div>

      {/* Tarjeta */}
      <div className="login-card">
        <h1 className="login-heading">Iniciar Sesión</h1>
        <p className="login-subheading">Solo personal autorizado.</p>

        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label htmlFor="email" className="form-label">Usuario o Correo Electrónico</label>
            <div className="input-icon-wrap">
              <User size={15} className="input-icon-left" />
              <input
                id="email"
                type="email"
                className="form-input"
                placeholder="Ingresa tus credenciales"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="password" className="form-label">Contraseña</label>
            <div className="input-icon-wrap">
              <Lock size={15} className="input-icon-left" />
              <input
                id="password"
                type="password"
                className="form-input"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
          </div>

          {error && <div className="alert alert-error">{error}</div>}

          <button
            id="btn-login"
            type="submit"
            className="btn-primary btn-full"
            disabled={loading}
            style={{ marginTop: 4, padding: '11px 18px', fontSize: '.9rem', justifyContent: 'center' }}
          >
            {loading ? <span className="spinner-sm"></span> : <>Ingresar &nbsp;→</>}
          </button>
        </form>

        <div className="login-divider" />

        <button className="login-link" type="button">
          <Key size={14} className="login-link-icon" />
          Olvidé mi contraseña
        </button>
        <button className="login-link" type="button">
          <Headphones size={14} className="login-link-icon" />
          Soporte Técnico
        </button>

        {/* Acceso rápido demo */}
        <div className="quick-access">
          <p className="quick-access-title">Acceso rápido (demo)</p>
          <div className="quick-access-grid">
            {[
              { key: 'oficial',   label: 'Oficial',   color: '#1d4ed8' },
              { key: 'legal',     label: 'Legal',     color: '#7c3aed' },
              { key: 'operativo', label: 'Operativo', color: '#059669' },
              { key: 'auditoria', label: 'Auditoría', color: '#d97706' },
              { key: 'admin',     label: 'Admin',     color: '#dc2626' },
            ].map(({ key, label, color }) => (
              <button
                key={key}
                id={`quick-${key}`}
                className="quick-btn"
                style={{ borderColor: color, color }}
                onClick={() => quickLogin(key)}
                type="button"
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Pie de página */}
      <div className="login-footer" style={{ marginTop: 24, width: '100%', maxWidth: 400 }}>
        <div className="login-status">
          <span className="login-status-dot"></span>
          <span style={{ fontWeight: 600, fontSize: '.7rem', letterSpacing: '.05em', textTransform: 'uppercase' }}>
            Estado del Sistema: Operacional
          </span>
        </div>
        <span className="login-version">v4.2.1-SECURE</span>
      </div>
    </div>
  );
}

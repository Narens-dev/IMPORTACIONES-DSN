import { useEffect, useState } from 'react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';

interface Alerta {
  _id: string;
  tipo: string;
  estado: string;
  descripcion: string;
  prioridad: string;
  fechaCreacion: string;
  fechaResolucion?: string;
  operacionId?: { _id: string; producto: string } | string;
  entidadAfectada?: string;
}

const PRIORIDAD_CONFIG: Record<string, { label: string; cls: string }> = {
  CRITICA:  { label: 'Crítica',  cls: 'badge-bloqueada' },
  ALTA:     { label: 'Alta',     cls: 'badge-revision' },
  MEDIA:    { label: 'Media',    cls: 'badge-warning' },
  BAJA:     { label: 'Baja',     cls: 'badge-info' },
};

const TIPO_LABELS: Record<string, string> = {
  SANCION_DETECTADA:            'Sanción Detectada',
  EMBARGO_ACTIVO:               'Embargo Activo',
  CLASIFICACION_BAJA_CONFIANZA: 'Confianza de Clasificación Baja',
  CERTIFICACION_VENCIDA:        'Certificación Vencida',
  API_NO_DISPONIBLE:            'API No Disponible',
  REVISION_MANUAL_REQUERIDA:    'Revisión Manual Requerida',
};

export default function Alertas() {
  const [alertas, setAlertas] = useState<Alerta[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState('PENDIENTE');
  const { user } = useAuth();

  const puedeAtender = ['OFICIAL_CUMPLIMIENTO', 'AREA_LEGAL', 'ADMINISTRADOR'].includes(user?.rol || '');

  const cargar = () => {
    setLoading(true);
    api.get('/alertas')
      .then((res) => setAlertas(res.data.alertas || res.data || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { cargar(); }, []);

  const resolver = async (id: string) => {
    try {
      await api.patch(`/alertas/${id}/atender`);
      cargar();
    } catch (err) {
      console.error(err);
    }
  };

  const filtradas = alertas.filter((a) => !filtro || a.estado === filtro);

  const total     = alertas.length;
  const pendientes = alertas.filter((a) => a.estado === 'PENDIENTE').length;
  const criticas  = alertas.filter((a) => a.prioridad === 'CRITICA').length;
  const altas     = alertas.filter((a) => a.prioridad === 'ALTA').length;

  const resueltas = alertas.filter((a) => a.estado === 'RESUELTA' && a.fechaResolucion && a.fechaCreacion);
  const promedioHoras = resueltas.length > 0
    ? Math.round(resueltas.reduce((acc, a) => {
        const diff = new Date(a.fechaResolucion!).getTime() - new Date(a.fechaCreacion).getTime();
        return acc + diff / 3600000;
      }, 0) / resueltas.length)
    : null;

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Alertas de Cumplimiento</h1>
          <p className="page-subtitle">Monitoreo de sanciones, embargos y anomalías del sistema.</p>
        </div>
      </div>

      {/* KPIs */}
      <div className="alertas-kpi-grid">
        <div className="kpi-card">
          <span className="kpi-label">Total Activas</span>
          <span className="kpi-value">{pendientes}</span>
          <span className="kpi-sublabel">De {total} registradas</span>
        </div>
        <div className="kpi-card">
          <span className="kpi-label">Riesgo Alto</span>
          <span className="kpi-value" style={{ color: criticas > 0 ? '#ba1a1a' : 'var(--text)' }}>
            {criticas}
          </span>
          <span className="kpi-sublabel">Críticas</span>
        </div>
        <div className="kpi-card">
          <span className="kpi-label">Advertencias</span>
          <span className="kpi-value" style={{ color: altas > 0 ? '#f59e0b' : 'var(--text)' }}>
            {altas}
          </span>
          <span className="kpi-sublabel">Prioridad Alta</span>
        </div>
        <div className="kpi-card">
          <span className="kpi-label">Promedio Resolución</span>
          <span className="kpi-value">
            {promedioHoras !== null ? `${promedioHoras}h` : '—'}
          </span>
          <span className="kpi-sublabel">Basado en resueltas</span>
        </div>
      </div>

      {/* Filtro estado */}
      <div className="filter-bar">
        {[
          { val: 'PENDIENTE', label: 'Pendientes' },
          { val: 'RESUELTA',  label: 'Resueltas' },
          { val: '',          label: 'Todas' },
        ].map(({ val, label }) => (
          <button
            key={label}
            className={filtro === val ? 'btn-primary' : 'btn-secondary'}
            style={{ fontSize: '.78rem', padding: '6px 14px' }}
            onClick={() => setFiltro(val)}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Tabla */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div className="page-loading"><div className="loading-spinner"></div></div>
        ) : filtradas.length === 0 ? (
          <div className="empty-state">
            <span className="empty-icon">✅</span>
            <p>No hay alertas {filtro === 'PENDIENTE' ? 'pendientes' : ''}</p>
          </div>
        ) : (
          <div className="table-wrapper">
            <table className="table">
              <thead>
                <tr>
                  <th>Tipo de Alerta</th>
                  <th>ID Operación</th>
                  <th>Fecha y Hora</th>
                  <th>Entidad Involucrada</th>
                  <th>Nivel de Riesgo</th>
                  <th>Acción</th>
                </tr>
              </thead>
              <tbody>
                {filtradas.map((a) => {
                  const prioConf = PRIORIDAD_CONFIG[a.prioridad] || { label: a.prioridad || '—', cls: 'badge-gray' };
                  const opId = typeof a.operacionId === 'object' && a.operacionId
                    ? a.operacionId._id
                    : a.operacionId;
                  const opLabel = typeof a.operacionId === 'object' && a.operacionId
                    ? `#OPS-${a.operacionId._id?.slice(-6).toUpperCase()}`
                    : opId
                    ? `#OPS-${String(opId).slice(-6).toUpperCase()}`
                    : '—';

                  return (
                    <tr key={a._id}>
                      <td>
                        <div style={{ fontWeight: 600, fontSize: '.84rem', color: 'var(--text)' }}>
                          {TIPO_LABELS[a.tipo] || a.tipo?.replace(/_/g, ' ')}
                        </div>
                        {a.descripcion && (
                          <div style={{ fontSize: '.74rem', color: 'var(--text-subtle)', marginTop: 2 }}>
                            {a.descripcion.length > 60 ? a.descripcion.slice(0, 60) + '…' : a.descripcion}
                          </div>
                        )}
                      </td>
                      <td className="td-secondary" style={{ fontSize: '.82rem', fontWeight: 600 }}>
                        {opLabel}
                      </td>
                      <td className="td-secondary" style={{ fontSize: '.78rem' }}>
                        {new Date(a.fechaCreacion).toLocaleString('es-CO', { dateStyle: 'short', timeStyle: 'short' })}
                      </td>
                      <td className="td-secondary" style={{ fontSize: '.82rem' }}>
                        {a.entidadAfectada || '—'}
                      </td>
                      <td><span className={`badge ${prioConf.cls}`}>{prioConf.label}</span></td>
                      <td>
                        {a.estado === 'PENDIENTE' && puedeAtender ? (
                          <button
                            className="btn-primary"
                            style={{ fontSize: '.75rem', padding: '5px 12px' }}
                            onClick={() => resolver(a._id)}
                          >
                            Resolver
                          </button>
                        ) : (
                          <span style={{ fontSize: '.78rem', color: 'var(--text-subtle)' }}>
                            {a.estado === 'RESUELTA' ? 'Resuelta' : '—'}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

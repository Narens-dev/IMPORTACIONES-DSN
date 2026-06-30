import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/axios';
import { Calendar, Download, Eye } from 'lucide-react';

function exportCSVOps(ops: Operacion[]) {
  const headers = ['ID','Producto','Origen','Destino','Contraparte','Valor FOB','Estado','Fecha'];
  const rows = ops.map((o) => [
    `#OPS-${o._id.slice(-6).toUpperCase()}`,
    o.producto,
    o.paisOrigen,
    o.paisDestino,
    o.contraparte,
    o.valorFOB,
    o.estado,
    new Date(o.fechaRegistro).toLocaleDateString('es-CO'),
  ].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(','));
  const csv = [headers.join(','), ...rows].join('\n');
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `operaciones_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

interface Stats {
  total: number;
  pendientes: number;
  aprobadas: number;
  bloqueadas: number;
  revision: number;
}

interface Operacion {
  _id: string;
  producto: string;
  paisOrigen: string;
  paisDestino: string;
  contraparte: string;
  estado: string;
  valorFOB: number;
  fechaRegistro: string;
}

interface Alerta {
  _id: string;
  tipo: string;
  estado: string;
  descripcion: string;
  fechaCreacion: string;
  operacionId: { producto: string } | string;
}

const ESTADO_CONFIG: Record<string, { label: string; cls: string }> = {
  PENDIENTE_CLASIFICACION:   { label: 'Pendiente',             cls: 'badge-pending' },
  CLASIFICACION_APROBADA:    { label: 'Clasificada',           cls: 'badge-info' },
  REQUIERE_REVISION_MANUAL:  { label: 'Requiere Revisión',     cls: 'badge-revision' },
  APROBADA:                  { label: 'Aprobada',              cls: 'badge-aprobada' },
  APROBADA_CON_CONDICIONES:  { label: 'Aprobada c/Condiciones',cls: 'badge-warning' },
  BLOQUEADA:                 { label: 'Bloqueada',             cls: 'badge-bloqueada' },
  EN_CONTINGENCIA:           { label: 'En Contingencia',       cls: 'badge-gray' },
};

const TIPO_DOT: Record<string, string> = {
  SANCION_DETECTADA:            'dot-red',
  EMBARGO_ACTIVO:               'dot-red',
  CLASIFICACION_BAJA_CONFIANZA: 'dot-yellow',
  CERTIFICACION_VENCIDA:        'dot-yellow',
  API_NO_DISPONIBLE:            'dot-blue',
};

export default function Dashboard() {
  const [stats, setStats] = useState<Stats>({ total: 0, pendientes: 0, aprobadas: 0, bloqueadas: 0, revision: 0 });
  const [operaciones, setOperaciones] = useState<Operacion[]>([]);
  const [todasOps, setTodasOps] = useState<Operacion[]>([]);
  const [alertas, setAlertas] = useState<Alerta[]>([]);
  const [loading, setLoading] = useState(true);
  const [diasFiltro, setDiasFiltro] = useState(30);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [opsRes, alertasRes] = await Promise.all([
          api.get('/operaciones'),
          api.get('/alertas').catch(() => ({ data: { alertas: [] } })),
        ]);

        const ops: Operacion[] = opsRes.data.operaciones || opsRes.data;
        setTodasOps(ops);
        setOperaciones(ops.slice(0, 5));

        const counts: Stats = { total: ops.length, pendientes: 0, aprobadas: 0, bloqueadas: 0, revision: 0 };
        ops.forEach((op) => {
          if (op.estado === 'PENDIENTE_CLASIFICACION') counts.pendientes++;
          if (['APROBADA', 'APROBADA_CON_CONDICIONES', 'CLASIFICACION_APROBADA'].includes(op.estado)) counts.aprobadas++;
          if (op.estado === 'BLOQUEADA') counts.bloqueadas++;
          if (op.estado === 'REQUIERE_REVISION_MANUAL') counts.revision++;
        });
        setStats(counts);

        const als: Alerta[] = alertasRes.data.alertas || alertasRes.data || [];
        setAlertas(als.slice(0, 4));
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) return <div className="page-loading"><div className="loading-spinner"></div></div>;

  const alertasPendientes = alertas.filter((a) => a.estado === 'PENDIENTE');
  const alertasCriticas   = alertas.filter((a) => ['SANCION_DETECTADA', 'EMBARGO_ACTIVO'].includes(a.tipo));
  const hoy = new Date().toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' });

  const total = stats.total || 1;
  const distData = [
    { label: 'Aprobadas',  value: stats.aprobadas,  color: '#16a34a', pct: Math.round((stats.aprobadas / total) * 100) },
    { label: 'Revisión',   value: stats.revision,   color: '#f59e0b', pct: Math.round((stats.revision / total) * 100) },
    { label: 'Pendientes', value: stats.pendientes, color: '#3b82f6', pct: Math.round((stats.pendientes / total) * 100) },
    { label: 'Bloqueadas', value: stats.bloqueadas, color: '#ba1a1a', pct: Math.round((stats.bloqueadas / total) * 100) },
  ];

  return (
    <div className="page">
      {/* Cabecera */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Resumen de Operaciones</h1>
          <p className="page-subtitle">Monitoreo en tiempo real del estado de cumplimiento comercial.</p>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <select
            className="filter-select"
            style={{ fontSize: '.78rem', padding: '7px 12px' }}
            value={diasFiltro}
            onChange={(e) => setDiasFiltro(Number(e.target.value))}
          >
            <option value={7}>Últimos 7 días</option>
            <option value={30}>Últimos 30 días</option>
            <option value={90}>Últimos 90 días</option>
            <option value={365}>Último año</option>
          </select>
          <button
            className="btn-secondary"
            style={{ fontSize: '.78rem', padding: '7px 14px', gap: 6, display: 'flex', alignItems: 'center' }}
            onClick={() => exportCSVOps(todasOps)}
          >
            <Download size={14} />
            Exportar Reporte
          </button>
        </div>
      </div>

      {/* Tarjetas KPI */}
      <div className="kpi-grid">
        <div className="kpi-card">
          <span className="kpi-label">Operaciones Pendientes</span>
          <span className="kpi-value">{String(stats.pendientes + stats.revision).padStart(2, '0')}</span>
          <span className="kpi-sublabel">En cola</span>
          {stats.revision > 0 && (
            <span style={{ fontSize: '.72rem', color: '#f59e0b', fontWeight: 600, marginTop: 4 }}>
              +{stats.revision} requieren acción manual
            </span>
          )}
        </div>

        <div className="kpi-card">
          {alertasCriticas.length > 0 && (
            <span className="kpi-badge-critical">Crítico</span>
          )}
          <span className="kpi-label">Alertas Activas</span>
          <span className="kpi-value" style={{ color: alertasPendientes.length > 0 ? '#ba1a1a' : 'var(--text)' }}>
            {String(alertasPendientes.length).padStart(2, '0')}
          </span>
          <span className="kpi-sublabel">
            {alertasPendientes.length > 0 ? 'Requieren atención' : 'Sin alertas pendientes'}
          </span>
        </div>

        <div className="kpi-card">
          <span className="kpi-date-label">{hoy}</span>
          <span className="kpi-label">Aprobadas Hoy</span>
          <span className="kpi-value">{stats.aprobadas}</span>
          <span className="kpi-sublabel">Operaciones</span>
        </div>
      </div>

      {/* Distribución + Actividad reciente */}
      <div className="dashboard-main-grid">
        <div className="card" style={{ marginBottom: 0 }}>
          <div className="card-header">
            <span className="card-title">Distribución de Cumplimiento</span>
            <select style={{ fontSize: '.75rem', border: '1px solid var(--border)', borderRadius: 4, padding: '3px 8px', color: 'var(--text-muted)', background: 'var(--surface)' }}>
              <option>Por Estado</option>
            </select>
          </div>
          <div className="dist-bar-group">
            {distData.map((d) => (
              <div key={d.label} className="dist-bar-item">
                <div className="dist-bar-label">
                  <span>{d.label}</span>
                  <span style={{ fontWeight: 600, color: 'var(--text)' }}>{d.value}</span>
                </div>
                <div className="dist-bar-track">
                  <div className="dist-bar-fill" style={{ width: `${d.pct}%`, background: d.color }} />
                </div>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 16, marginTop: 14, flexWrap: 'wrap' }}>
            {[
              { label: 'Estándar', color: '#3b82f6' },
              { label: 'Expedita', color: '#16a34a' },
              { label: 'Alto Riesgo', color: '#ba1a1a' },
            ].map((l) => (
              <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '.72rem', color: 'var(--text-muted)' }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: l.color, display: 'inline-block' }} />
                {l.label}
              </div>
            ))}
          </div>
        </div>

        <div className="card" style={{ marginBottom: 0 }}>
          <div className="card-header">
            <span className="card-title">Actividad Reciente</span>
          </div>
          <div className="activity-list">
            {alertas.slice(0, 3).map((a) => (
              <div key={a._id} className="activity-item">
                <span className={`activity-dot ${TIPO_DOT[a.tipo] || 'dot-blue'}`} />
                <div>
                  <div className="activity-text">
                    {a.tipo?.replace(/_/g, ' ')}
                    {typeof a.operacionId === 'object' && a.operacionId?.producto
                      ? ` — ${a.operacionId.producto}`
                      : ''}
                  </div>
                  <div className="activity-time">
                    {new Date(a.fechaCreacion).toLocaleString('es-CO', { dateStyle: 'short', timeStyle: 'short' })}
                  </div>
                </div>
              </div>
            ))}
            {alertas.length === 0 && (
              <div style={{ padding: '16px 0', color: 'var(--text-subtle)', fontSize: '.82rem' }}>
                Sin actividad reciente
              </div>
            )}
          </div>
          <Link to="/auditoria" className="activity-link">Ver historial completo →</Link>
        </div>
      </div>

      {/* Cola de procesamiento prioritario */}
      <div className="card">
        <div className="card-header">
          <span className="card-title">Cola de Procesamiento Prioritario</span>
          <span style={{ fontSize: '.75rem', color: 'var(--text-subtle)' }}>
            Mostrando {operaciones.length} de {stats.total} operaciones
          </span>
        </div>
        <div className="table-wrapper">
          <table className="table">
            <thead>
              <tr>
                <th>ID Operación</th>
                <th>Destino</th>
                <th>Valor (USD)</th>
                <th>Estado Cumplimiento</th>
                <th>Acción</th>
              </tr>
            </thead>
            <tbody>
              {operaciones.map((op) => {
                const cfg = ESTADO_CONFIG[op.estado] || { label: op.estado, cls: 'badge-gray' };
                return (
                  <tr
                    key={op._id}
                    className="table-row-clickable"
                    onClick={() => (window.location.href = `/operaciones/${op._id}`)}
                  >
                    <td style={{ fontWeight: 600, color: 'var(--text)', fontSize: '.84rem' }}>
                      #OPS-{op._id.slice(-6).toUpperCase()}
                    </td>
                    <td className="td-secondary">{op.paisDestino}</td>
                    <td className="td-money">
                      USD {op.valorFOB?.toLocaleString('es-CO', { minimumFractionDigits: 2 })}
                    </td>
                    <td><span className={`badge ${cfg.cls}`}>{cfg.label}</span></td>
                    <td>
                      <button
                        className="btn-ghost"
                        style={{ padding: '4px 8px' }}
                        onClick={(e) => { e.stopPropagation(); window.location.href = `/operaciones/${op._id}`; }}
                        title="Ver detalle"
                      >
                        <Eye size={14} />
                      </button>
                    </td>
                  </tr>
                );
              })}
              {operaciones.length === 0 && (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', padding: '24px', color: 'var(--text-subtle)', fontSize: '.84rem' }}>
                    No hay operaciones registradas aún
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

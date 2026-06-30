import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { Eye } from 'lucide-react';

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

const ESTADO_CONFIG: Record<string, { label: string; cls: string }> = {
  PENDIENTE_CLASIFICACION:   { label: 'Pendiente',              cls: 'badge-pending' },
  CLASIFICACION_APROBADA:    { label: 'Clasificada',            cls: 'badge-info' },
  REQUIERE_REVISION_MANUAL:  { label: 'Requiere Revisión',      cls: 'badge-revision' },
  APROBADA:                  { label: 'Aprobada',               cls: 'badge-aprobada' },
  APROBADA_CON_CONDICIONES:  { label: 'Aprobada c/Condiciones', cls: 'badge-warning' },
  BLOQUEADA:                 { label: 'Bloqueada',              cls: 'badge-bloqueada' },
  EN_CONTINGENCIA:           { label: 'En Contingencia',        cls: 'badge-gray' },
};

export default function Operaciones() {
  const [operaciones, setOperaciones] = useState<Operacion[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtroEstado, setFiltroEstado] = useState('');
  const [filtroDestino, setFiltroDestino] = useState('');
  const [pagina, setPagina] = useState(1);
  const POR_PAGINA = 10;
  const navigate = useNavigate();

  useEffect(() => {
    api.get('/operaciones')
      .then((res) => setOperaciones(res.data.operaciones || res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const destinos = [...new Set(operaciones.map((o) => o.paisDestino))].sort();

  const filtradas = operaciones.filter((op) => {
    if (filtroEstado && op.estado !== filtroEstado) return false;
    if (filtroDestino && op.paisDestino !== filtroDestino) return false;
    return true;
  });

  const totalPaginas = Math.ceil(filtradas.length / POR_PAGINA);
  const pagActual = filtradas.slice((pagina - 1) * POR_PAGINA, pagina * POR_PAGINA);

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Lista de Operaciones</h1>
          <p className="page-subtitle">Consulta y gestión de todas las operaciones de comercio exterior.</p>
        </div>
      </div>

      {/* Filtros */}
      <div className="filter-bar">
        <select
          className="filter-select"
          value={filtroEstado}
          onChange={(e) => { setFiltroEstado(e.target.value); setPagina(1); }}
        >
          <option value="">Todos los estados</option>
          {Object.entries(ESTADO_CONFIG).map(([k, v]) => (
            <option key={k} value={k}>{v.label}</option>
          ))}
        </select>

        <select
          className="filter-select"
          value={filtroDestino}
          onChange={(e) => { setFiltroDestino(e.target.value); setPagina(1); }}
        >
          <option value="">Todos los destinos</option>
          {destinos.map((d) => <option key={d} value={d}>{d}</option>)}
        </select>

        {(filtroEstado || filtroDestino) && (
          <button
            className="btn-ghost"
            style={{ fontSize: '.8rem', padding: '6px 12px' }}
            onClick={() => { setFiltroEstado(''); setFiltroDestino(''); setPagina(1); }}
          >
            Limpiar filtros
          </button>
        )}
      </div>

      {/* Tabla */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div className="page-loading"><div className="loading-spinner"></div></div>
        ) : pagActual.length === 0 ? (
          <div className="empty-state">
            <span className="empty-icon">📦</span>
            <p>No se encontraron operaciones</p>
          </div>
        ) : (
          <div className="table-wrapper">
            <table className="table">
              <thead>
                <tr>
                  <th>ID Operación</th>
                  <th>Fecha</th>
                  <th>Destino</th>
                  <th>Valor (USD)</th>
                  <th>Estado Cumplimiento</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {pagActual.map((op) => {
                  const cfg = ESTADO_CONFIG[op.estado] || { label: op.estado, cls: 'badge-gray' };
                  return (
                    <tr
                      key={op._id}
                      className="table-row-clickable"
                      onClick={() => navigate(`/operaciones/${op._id}`)}
                    >
                      <td style={{ fontWeight: 600, color: 'var(--text)', fontSize: '.84rem' }}>
                        #OPS-{op._id.slice(-6).toUpperCase()}
                      </td>
                      <td className="td-secondary" style={{ fontSize: '.8rem' }}>
                        {new Date(op.fechaRegistro).toLocaleDateString('es-CO', {
                          year: 'numeric', month: 'short', day: '2-digit',
                        })}
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
                          onClick={(e) => { e.stopPropagation(); navigate(`/operaciones/${op._id}`); }}
                          title="Ver detalle"
                        >
                          <Eye size={14} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Paginación */}
      {totalPaginas > 1 && (
        <div className="pagination">
          <span className="pagination-info">
            Mostrando {(pagina - 1) * POR_PAGINA + 1}–{Math.min(pagina * POR_PAGINA, filtradas.length)} de {filtradas.length} operaciones
          </span>
          <div className="pagination-controls">
            <button
              className="btn-ghost pagination-btn"
              onClick={() => setPagina((p) => Math.max(1, p - 1))}
              disabled={pagina === 1}
            >
              ← Anterior
            </button>
            {Array.from({ length: totalPaginas }, (_, i) => i + 1).map((n) => (
              <button
                key={n}
                className={`pagination-btn ${n === pagina ? 'pagination-btn-active' : 'btn-ghost'}`}
                onClick={() => setPagina(n)}
              >
                {n}
              </button>
            ))}
            <button
              className="btn-ghost pagination-btn"
              onClick={() => setPagina((p) => Math.min(totalPaginas, p + 1))}
              disabled={pagina === totalPaginas}
            >
              Siguiente →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

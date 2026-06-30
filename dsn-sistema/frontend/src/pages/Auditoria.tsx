import { useEffect, useState } from 'react';
import api from '../api/axios';
import { Search, Download } from 'lucide-react';

function exportCSV(logs: LogEntry[]) {
  const headers = ['Fecha','Usuario','Email','Accion','Entidad','EntidadId','Detalle'];
  const rows = logs.map((l) => [
    new Date(l.fecha).toLocaleString('es-CO'),
    l.usuarioId?.nombre || 'Sistema',
    l.usuarioId?.email || '',
    l.accion,
    l.entidad || '',
    l.entidadId || '',
    (l.detalle || '').replace(/"/g, '""'),
  ].map((v) => `"${v}"`).join(','));
  const csv = [headers.join(','), ...rows].join('\n');
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `auditoria_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

interface LogEntry {
  _id: string;
  accion: string;
  entidad?: string;
  entidadId?: string;
  detalle?: string;
  fecha: string;
  usuarioId?: { nombre: string; email: string; rol: string };
}

/* El backend devuelve { datos, total, pagina, totalPaginas } */
interface AuditoriaResponse {
  datos: LogEntry[];
  total: number;
  pagina: number;
  totalPaginas: number;
}

const ACCIONES_RIESGO = ['OPERACION_BLOQUEADA', 'ACCESS_DENIED', 'LOGIN_FALLIDO'];

export default function Auditoria() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [busqueda, setBusqueda] = useState('');

  useEffect(() => {
    api.get('/auditoria')
      .then((res) => {
        const data: AuditoriaResponse = res.data;
        setLogs(data.datos || []);
        setTotal(data.total || 0);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const filtered = busqueda.trim()
    ? logs.filter((l) =>
        l.accion?.toLowerCase().includes(busqueda.toLowerCase()) ||
        l.entidad?.toLowerCase().includes(busqueda.toLowerCase()) ||
        l.detalle?.toLowerCase().includes(busqueda.toLowerCase()) ||
        l.usuarioId?.nombre?.toLowerCase().includes(busqueda.toLowerCase())
      )
    : logs;

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Log de Auditoría</h1>
          <p className="page-subtitle">
            Registro inmutable de actividad del sistema y verificaciones de cumplimiento.
          </p>
        </div>
        <div className="audit-badge">🔐 Solo Lectura</div>
      </div>

      {/* Banner WORM */}
      <div className="worm-banner">
        <span className="worm-icon">🔒</span>
        <div>
          <strong>Log de Auditoría Inmutable (WORM)</strong>
          <p>
            Este registro es de solo lectura. Las entradas no pueden ser modificadas ni eliminadas.
            Cumple con RNF-1 del sistema DSN.
          </p>
        </div>
      </div>

      {/* Barra de herramientas */}
      <div className="audit-toolbar">
        <div className="audit-toolbar-search" style={{ position: 'relative' }}>
          <Search size={14} className="search-icon" />
          <input
            id="search-auditoria"
            className="search-input"
            type="text"
            placeholder="Buscar por usuario, acción o entidad..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            style={{ margin: 0 }}
          />
        </div>

        <button className="btn-export" onClick={() => exportCSV(filtered)}>
          <Download size={13} />
          Exportar CSV
        </button>
        <button
          className="btn-export"
          onClick={() => window.print()}
          title="Usa la función de impresión del navegador para guardar como PDF"
        >
          <Download size={13} />
          Exportar PDF
        </button>
      </div>

      {/* Tabla */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div className="page-loading"><div className="loading-spinner"></div></div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <span className="empty-icon">📋</span>
            <p>No hay entradas de auditoría</p>
          </div>
        ) : (
          <div className="table-wrapper">
            <table className="table">
              <thead>
                <tr>
                  <th>Fecha y Hora</th>
                  <th>Usuario</th>
                  <th>Acción</th>
                  <th>Entidad Afectada</th>
                  <th>Detalle</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((log) => {
                  const esRiesgo = ACCIONES_RIESGO.includes(log.accion);
                  return (
                    <tr key={log._id}>
                      <td className="td-nowrap" style={{ fontSize: '.78rem' }}>
                        <div style={{ fontVariantNumeric: 'tabular-nums', color: 'var(--text)', fontWeight: 500 }}>
                          {new Date(log.fecha).toLocaleDateString('es-CO', {
                            year: 'numeric', month: '2-digit', day: '2-digit',
                          })}
                        </div>
                        <div style={{ fontSize: '.7rem', color: 'var(--text-subtle)' }}>
                          {new Date(log.fecha).toLocaleTimeString('es-CO', {
                            hour: '2-digit', minute: '2-digit', second: '2-digit',
                          })} UTC
                        </div>
                      </td>

                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                          <div style={{
                            width: 26, height: 26, borderRadius: '50%',
                            background: 'var(--primary)', color: 'white',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '.65rem', fontWeight: 700, flexShrink: 0,
                          }}>
                            {log.usuarioId?.nombre?.charAt(0)?.toUpperCase() || 'S'}
                          </div>
                          <div>
                            <div style={{ fontSize: '.82rem', fontWeight: 600, color: 'var(--text)' }}>
                              {log.usuarioId?.nombre || 'Sistema Bot'}
                            </div>
                            {log.usuarioId?.email && (
                              <div style={{ fontSize: '.7rem', color: 'var(--text-subtle)' }}>
                                {log.usuarioId.email}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>

                      <td>
                        <span className="audit-accion">{log.accion}</span>
                      </td>

                      <td className="td-secondary" style={{ fontSize: '.8rem' }}>
                        {log.entidad || '—'}
                      </td>

                      <td className="td-secondary td-detail" style={{ fontSize: '.78rem', maxWidth: 260 }}>
                        {log.detalle || '—'}
                      </td>

                      <td>
                        {esRiesgo ? (
                          <span className="audit-status-flagged">FLAGGED</span>
                        ) : (
                          <span className="audit-status-verified">VERIFIED</span>
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

      <p className="audit-footer">
        🔒 Mostrando {filtered.length} de {total} entradas · Sin opciones de edición por diseño del sistema (RNF-1)
      </p>
    </div>
  );
}

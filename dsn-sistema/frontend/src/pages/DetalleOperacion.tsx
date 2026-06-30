import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { ChevronLeft, AlertTriangle, CheckCircle, XCircle, Clock } from 'lucide-react';

interface Operacion {
  _id: string;
  producto: string;
  paisOrigen: string;
  paisDestino: string;
  contraparte: string;
  valorFOB: number;
  estado: string;
  fechaRegistro: string;
  registradaPor?: { nombre: string; email: string };
}

interface Clasificacion {
  partidaArancelaria: string;
  porcentajeConfianza: number;
  tlcAplicado?: string;
  montoImpuestos: number;
  requiereRevision: boolean;
  aprobadaPor?: { nombre: string };
  fechaClasificacion: string;
}

interface Alerta {
  _id: string;
  tipo: string;
  estado: string;
  descripcion: string;
  fechaCreacion: string;
}

interface Resolucion {
  tipo: string;
  justificacion: string;
  referenciaNormativa?: string;
  emitidaPor?: { nombre: string };
  fechaEmision: string;
}

interface DetalleData {
  operacion: Operacion;
  clasificacion?: Clasificacion;
  alertas?: Alerta[];
  resoluciones?: Resolucion[];
}

const ESTADO_CONFIG: Record<string, { label: string; cls: string }> = {
  PENDIENTE_CLASIFICACION:   { label: 'Pendiente Clasificación', cls: 'badge-pending' },
  CLASIFICACION_APROBADA:    { label: 'Clasificación Aprobada',  cls: 'badge-info' },
  REQUIERE_REVISION_MANUAL:  { label: 'Requiere Revisión',       cls: 'badge-revision' },
  APROBADA:                  { label: 'Aprobada',                cls: 'badge-aprobada' },
  APROBADA_CON_CONDICIONES:  { label: 'Aprobada c/Condiciones',  cls: 'badge-warning' },
  BLOQUEADA:                 { label: 'Bloqueada',               cls: 'badge-bloqueada' },
  EN_CONTINGENCIA:           { label: 'En Contingencia',         cls: 'badge-gray' },
};

export default function DetalleOperacion() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [data, setData] = useState<DetalleData | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  /* Modales */
  const [showClasificar, setShowClasificar] = useState(false);
  const [showResolucion, setShowResolucion] = useState(false);
  const [showBloquear, setShowBloquear] = useState(false);

  const [partidaManual, setPartidaManual] = useState('');
  const [motivoBloqueo, setMotivoBloqueo] = useState('');
  const [resolucionForm, setResolucionForm] = useState({
    tipo: 'DESBLOQUEO',
    justificacion: '',
    referenciaNormativa: '',
  });

  const fetchData = () => {
    setLoading(true);
    api.get(`/operaciones/${id}`)
      .then((res) => setData(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchData(); }, [id]);

  const doAction = async (endpoint: string, body?: Record<string, unknown>) => {
    setActionLoading(true);
    setError('');
    setSuccess('');
    try {
      await api.patch(`/operaciones/${id}/${endpoint}`, body || {});
      setSuccess('Acción realizada exitosamente.');
      fetchData();
      setShowClasificar(false);
      setShowResolucion(false);
      setShowBloquear(false);
      setPartidaManual('');
      setMotivoBloqueo('');
      setResolucionForm({ tipo: 'DESBLOQUEO', justificacion: '', referenciaNormativa: '' });
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { mensaje?: string; errores?: { msg: string }[] } } };
      const msgs = axiosErr?.response?.data?.errores?.map((e) => e.msg).join(', ');
      setError(msgs || axiosErr?.response?.data?.mensaje || 'Error al realizar la acción');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) return <div className="page-loading"><div className="loading-spinner"></div></div>;
  if (!data) return <div className="page"><div className="alert alert-error">Operación no encontrada</div></div>;

  const { operacion, clasificacion, alertas = [], resoluciones = [] } = data;
  const cfg = ESTADO_CONFIG[operacion.estado] || { label: operacion.estado, cls: 'badge-gray' };

  const esOficial = user?.rol === 'OFICIAL_CUMPLIMIENTO' || user?.rol === 'ADMINISTRADOR';
  const esLegal   = user?.rol === 'AREA_LEGAL' || user?.rol === 'ADMINISTRADOR';

  /* Flujo de auditoría */
  const trailItems = [
    {
      title: 'Operación Registrada',
      meta: `${new Date(operacion.fechaRegistro).toLocaleDateString('es-CO', { dateStyle: 'long' })} · ${operacion.registradaPor?.nombre || 'Sistema'}`,
      dot: 'dot-blue',
    },
    clasificacion
      ? {
          title: 'Clasificación Completada',
          meta: `${new Date(clasificacion.fechaClasificacion).toLocaleDateString('es-CO', { dateStyle: 'medium' })} · Confianza ${clasificacion.porcentajeConfianza}%`,
          dot: clasificacion.porcentajeConfianza >= 75 ? 'dot-green' : 'dot-yellow',
        }
      : {
          title: 'Clasificación Pendiente',
          meta: 'Motor BRM procesando…',
          dot: 'dot-yellow',
        },
    {
      title:
        operacion.estado === 'APROBADA'   ? 'Operación Aprobada' :
        operacion.estado === 'BLOQUEADA'  ? 'Operación Bloqueada' :
        operacion.estado === 'EN_CONTINGENCIA' ? 'En Contingencia' :
        'Revisión Pendiente',
      meta:
        operacion.estado === 'APROBADA'  ? 'Firma digital generada' :
        operacion.estado === 'BLOQUEADA' ? 'Bloqueo de cumplimiento aplicado' :
        'Monitoreando estado de la operación',
      dot:
        operacion.estado === 'APROBADA'  ? 'dot-green' :
        operacion.estado === 'BLOQUEADA' ? 'dot-red' : 'dot-yellow',
    },
  ];

  return (
    <div className="page">
      {/* Cabecera */}
      <div style={{ marginBottom: 20 }}>
        <button className="btn-back" onClick={() => navigate('/operaciones')}>
          <ChevronLeft size={16} /> Lista de Operaciones
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 6 }}>
          <h1 className="page-title" style={{ fontSize: '1.3rem' }}>
            OPS-{operacion._id.slice(-6).toUpperCase()}
          </h1>
          <span className={`badge badge-lg ${cfg.cls}`}>{cfg.label}</span>
        </div>
      </div>

      {error   && <div className="alert alert-error"   style={{ marginBottom: 14 }}>{error}</div>}
      {success && <div className="alert alert-success" style={{ marginBottom: 14 }}>{success}</div>}

      <div className="detalle-layout">
        {/* Columna izquierda */}
        <div className="detalle-grid">

          {/* Resumen de la operación */}
          <div className="card">
            <div className="card-header">
              <span className="card-title">Resumen de la Operación</span>
              <span style={{ fontSize: '.72rem', color: 'var(--text-subtle)' }}>
                Ref: TRD-{operacion._id.slice(-4).toUpperCase()}
              </span>
            </div>
            <div className="info-grid" style={{ marginBottom: 16 }}>
              <div className="info-item">
                <span className="info-label">Producto / Activo</span>
                <span className="info-value" style={{ fontWeight: 600 }}>{operacion.producto}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Valor Total (FOB)</span>
                <span className="info-value" style={{ fontSize: '1.1rem', fontWeight: 700 }}>
                  USD {operacion.valorFOB?.toLocaleString('es-CO', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="info-item">
                <span className="info-label">Fecha de Registro</span>
                <span className="info-value">
                  {new Date(operacion.fechaRegistro).toLocaleDateString('es-CO', { dateStyle: 'long' })}
                </span>
              </div>
              <div className="info-item">
                <span className="info-label">Ruta Comercial</span>
                <span className="info-value">{operacion.paisOrigen} → {operacion.paisDestino}</span>
              </div>
              {operacion.registradaPor && (
                <div className="info-item">
                  <span className="info-label">Registrada por</span>
                  <span className="info-value">{operacion.registradaPor.nombre}</span>
                </div>
              )}
            </div>

            {/* Partes involucradas */}
            <div>
              <span className="info-label" style={{ display: 'block', marginBottom: 8 }}>Partes Involucradas</span>
              <div className="parties-row">
                <div className="party-card">
                  <span className="party-role">Exportador</span>
                  <span className="party-name">DSN Global Solutions</span>
                  <span className="party-loc">{operacion.paisOrigen}</span>
                </div>
                <div className="party-card">
                  <span className="party-role">Consignatario</span>
                  <span className="party-name">{operacion.contraparte}</span>
                  <span className="party-loc">{operacion.paisDestino}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Clasificación arancelaria */}
          <div className="card">
            <div className="card-header">
              <span className="card-title">Clasificación Arancelaria (Motor BRM)</span>
            </div>
            {clasificacion ? (
              <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: 180 }}>
                  <span className="info-label">Código HS (Sistema Armonizado)</span>
                  <div style={{ fontSize: '2rem', fontWeight: 700, fontVariantNumeric: 'tabular-nums', color: 'var(--text)', marginTop: 4 }}>
                    {clasificacion.partidaArancelaria}
                  </div>

                  <div style={{ marginTop: 10 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '.75rem', color: 'var(--text-muted)', marginBottom: 4 }}>
                      <span>Nivel de confianza</span>
                      <span style={{ fontWeight: 700, color: 'var(--text)' }}>{clasificacion.porcentajeConfianza}%</span>
                    </div>
                    <div className="confianza-bar">
                      <div className="confianza-fill" style={{
                        width: `${clasificacion.porcentajeConfianza}%`,
                        background: clasificacion.porcentajeConfianza >= 75 ? 'var(--success)' : 'var(--warning)',
                      }} />
                    </div>
                  </div>

                  {clasificacion.tlcAplicado && (
                    <div style={{ marginTop: 10 }}>
                      <span className="info-label">TLC Aplicado</span>
                      <div style={{ marginTop: 4 }}>
                        <span className="badge badge-aprobada">{clasificacion.tlcAplicado}</span>
                      </div>
                    </div>
                  )}

                  <div style={{ marginTop: 10 }}>
                    <span className="info-label">Monto de Impuestos Estimado</span>
                    <div style={{ fontSize: '1.1rem', fontWeight: 700, marginTop: 4 }}>
                      USD {clasificacion.montoImpuestos?.toLocaleString('es-CO', { minimumFractionDigits: 2 })}
                    </div>
                  </div>

                  {clasificacion.aprobadaPor && (
                    <div style={{ marginTop: 10 }}>
                      <span className="info-label">Aprobada por</span>
                      <div style={{ fontSize: '.875rem', fontWeight: 500, marginTop: 2 }}>
                        {clasificacion.aprobadaPor.nombre}
                      </div>
                    </div>
                  )}
                </div>

                {/* Alertas regulatorias */}
                {alertas.length > 0 && (
                  <div style={{ flex: 1, minWidth: 200 }}>
                    {alertas.map((a) => (
                      <div key={a._id} className="reg-alert" style={{ marginBottom: 8 }}>
                        <div className="reg-alert-title">
                          <AlertTriangle size={13} style={{ display: 'inline', marginRight: 4, verticalAlign: 'middle' }} />
                          Alerta Regulatoria
                        </div>
                        <div style={{ fontSize: '.8rem', marginTop: 4 }}>{a.descripcion}</div>
                        <div style={{ marginTop: 6, display: 'flex', flexDirection: 'column', gap: 4 }}>
                          <div className="reg-alert-item">
                            {a.tipo === 'SANCION_DETECTADA' || a.tipo === 'EMBARGO_ACTIVO'
                              ? <XCircle size={12} style={{ color: 'var(--danger)', flexShrink: 0 }} />
                              : <CheckCircle size={12} style={{ color: 'var(--warning)', flexShrink: 0 }} />
                            }
                            <span>
                              {a.tipo === 'SANCION_DETECTADA' ? 'Lista de sanciones: COINCIDENCIA ENCONTRADA' :
                               a.tipo === 'EMBARGO_ACTIVO'    ? 'Embargo activo detectado' :
                               a.tipo?.replace(/_/g, ' ')}
                            </span>
                          </div>
                          <div style={{ fontSize: '.7rem', color: 'var(--danger)', fontWeight: 600 }}>
                            Estado: {a.estado === 'PENDIENTE' ? 'Pendiente de atención' : 'Atendida'}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="empty-state">
                <Clock size={24} style={{ color: 'var(--text-subtle)' }} />
                <p>Clasificación pendiente — Motor BRM procesando</p>
              </div>
            )}
          </div>

          {/* Panel financiero */}
          {clasificacion && (
            <div className="card">
              <div className="card-header">
                <span className="card-title">Resumen Financiero</span>
              </div>
              <div className="info-grid">
                <div className="info-item">
                  <span className="info-label">Valor FOB (Ingreso)</span>
                  <span className="info-value" style={{ fontWeight: 700, color: '#16a34a', fontSize: '1.1rem' }}>
                    + USD {operacion.valorFOB?.toLocaleString('es-CO', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="info-item">
                  <span className="info-label">Impuestos Estimados (Egreso)</span>
                  <span className="info-value" style={{ fontWeight: 700, color: '#ba1a1a', fontSize: '1.1rem' }}>
                    − USD {clasificacion.montoImpuestos?.toLocaleString('es-CO', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="info-item">
                  <span className="info-label">Valor Neto Estimado</span>
                  <span className="info-value" style={{ fontWeight: 700, fontSize: '1.15rem' }}>
                    USD {(operacion.valorFOB - (clasificacion.montoImpuestos || 0)).toLocaleString('es-CO', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                {clasificacion.tlcAplicado && (
                  <div className="info-item">
                    <span className="info-label">Beneficio TLC</span>
                    <span className="info-value">
                      <span className="badge badge-aprobada">{clasificacion.tlcAplicado} aplicado</span>
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Resoluciones legales */}
          {resoluciones.length > 0 && (
            <div className="card">
              <div className="card-header"><span className="card-title">Resoluciones Legales</span></div>
              {resoluciones.map((res, i) => (
                <div key={i} className="resolucion-item">
                  <div className="resolucion-header">
                    <span className="badge badge-info">{res.tipo?.replace(/_/g, ' ')}</span>
                    <small style={{ color: 'var(--text-subtle)', fontSize: '.72rem' }}>
                      {new Date(res.fechaEmision).toLocaleString('es-CO')}
                    </small>
                  </div>
                  <p style={{ fontSize: '.84rem', marginTop: 6 }}><strong>Justificación:</strong> {res.justificacion}</p>
                  {res.referenciaNormativa && (
                    <p style={{ fontSize: '.84rem', marginTop: 4 }}><strong>Referencia:</strong> {res.referenciaNormativa}</p>
                  )}
                  {res.emitidaPor && (
                    <p style={{ fontSize: '.84rem', marginTop: 4 }}><strong>Emitida por:</strong> {res.emitidaPor.nombre}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Columna derecha: panel de control + trazabilidad */}
        <div className="control-panel">

          {/* Panel de control */}
          <div className="control-panel-card">
            <span className="control-panel-title">Panel de Control</span>
            <span style={{ fontSize: '.72rem', color: 'var(--text-subtle)', marginBottom: 6, display: 'block' }}>
              Sesión de supervisión de cumplimiento
            </span>

            {/* Aprobar: solo cuando está en CLASIFICACION_APROBADA */}
            {esOficial && operacion.estado === 'CLASIFICACION_APROBADA' && (
              <button
                id="btn-aprobar"
                className="control-btn control-btn-approve"
                disabled={actionLoading}
                onClick={() => doAction('aprobar')}
              >
                {actionLoading ? <span className="spinner-sm" /> : '✓ Aprobar Transacción'}
              </button>
            )}

            {/* Clasificar manualmente: solo cuando requiere revisión manual */}
            {esOficial && operacion.estado === 'REQUIERE_REVISION_MANUAL' && (
              <button
                id="btn-clasificar-manual"
                className="control-btn control-btn-assign"
                onClick={() => setShowClasificar(true)}
              >
                Asignar Nuevo Código HS
              </button>
            )}

            {/* Bloquear: cuando está clasificada o requiere revisión */}
            {esLegal && (operacion.estado === 'CLASIFICACION_APROBADA' || operacion.estado === 'REQUIERE_REVISION_MANUAL') && (
              <button
                id="btn-bloquear"
                className="control-btn control-btn-block"
                onClick={() => setShowBloquear(true)}
                disabled={actionLoading}
              >
                ✕ Bloquear Operación
              </button>
            )}

            {/* Desbloquear: solo cuando está bloqueada */}
            {esLegal && operacion.estado === 'BLOQUEADA' && (
              <button
                id="btn-desbloquear"
                className="control-btn control-btn-approve"
                onClick={() => setShowResolucion(true)}
              >
                ⚖ Emitir Resolución Legal
              </button>
            )}

            {!esOficial && !esLegal && (
              <p style={{ fontSize: '.78rem', color: 'var(--text-subtle)', textAlign: 'center', padding: '8px 0' }}>
                Sin permisos de acción para este módulo
              </p>
            )}

            <span className="control-hint">
              Todas las acciones quedan registradas en la trazabilidad de auditoría inmutable.
            </span>
          </div>

          {/* Trazabilidad */}
          <div className="control-panel-card">
            <span className="control-panel-title">Trazabilidad de Auditoría</span>
            <div className="audit-trail">
              {trailItems.map((item, i) => (
                <div key={i} className="audit-trail-item">
                  <span className={`audit-trail-dot ${item.dot}`} />
                  <div className="audit-trail-content">
                    <span className="audit-trail-title">{item.title}</span>
                    <span className="audit-trail-meta">{item.meta}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Modal: Clasificación Manual */}
      {showClasificar && (
        <div className="modal-overlay" onClick={() => setShowClasificar(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3 className="modal-title">Asignar Código HS Manualmente</h3>
            <p className="modal-desc">Ingresa la partida arancelaria correcta para esta operación.</p>
            <div className="form-group">
              <label className="form-label">Partida Arancelaria</label>
              <input
                className="form-input"
                placeholder="Ej: 8471.30"
                value={partidaManual}
                onChange={(e) => setPartidaManual(e.target.value)}
              />
              <span className="form-hint">Formato requerido: XXXX.XX (cuatro dígitos, punto, dos dígitos)</span>
            </div>
            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setShowClasificar(false)}>Cancelar</button>
              <button
                id="btn-confirmar-clasificar"
                className="btn-primary"
                disabled={!partidaManual || actionLoading}
                onClick={() => doAction('clasificar', { partidaArancelaria: partidaManual })}
              >
                {actionLoading ? <span className="spinner-sm" /> : 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Bloquear operación */}
      {showBloquear && (
        <div className="modal-overlay" onClick={() => setShowBloquear(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3 className="modal-title">Bloquear Operación</h3>
            <p className="modal-desc">Esta acción bloqueará la operación e iniciará una alerta de cumplimiento.</p>
            <div className="form-group">
              <label className="form-label">Motivo del Bloqueo *</label>
              <textarea
                className="form-textarea"
                rows={3}
                placeholder="Describa el motivo del bloqueo..."
                value={motivoBloqueo}
                onChange={(e) => setMotivoBloqueo(e.target.value)}
              />
            </div>
            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setShowBloquear(false)}>Cancelar</button>
              <button
                id="btn-confirmar-bloquear"
                className="btn-danger"
                disabled={!motivoBloqueo.trim() || actionLoading}
                onClick={() => doAction('bloquear', { motivo: motivoBloqueo })}
              >
                {actionLoading ? <span className="spinner-sm" /> : 'Confirmar Bloqueo'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Resolución Legal (Desbloquear) */}
      {showResolucion && (
        <div className="modal-overlay" onClick={() => setShowResolucion(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3 className="modal-title">Emitir Resolución Legal</h3>
            <div className="form-group">
              <label className="form-label">Tipo de Resolución</label>
              <select
                className="form-select"
                value={resolucionForm.tipo}
                onChange={(e) => setResolucionForm(p => ({ ...p, tipo: e.target.value }))}
              >
                <option value="DESBLOQUEO">Desbloqueo</option>
                <option value="BLOQUEO_DEFINITIVO">Bloqueo Definitivo</option>
                <option value="APROBACION_CONDICIONADA">Aprobación Condicionada</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Justificación Legal * (mín. 20 caracteres)</label>
              <textarea
                className="form-textarea"
                rows={4}
                placeholder="Fundamento legal de la resolución..."
                value={resolucionForm.justificacion}
                onChange={(e) => setResolucionForm(p => ({ ...p, justificacion: e.target.value }))}
              />
              <span style={{ fontSize: '.7rem', color: resolucionForm.justificacion.length >= 20 ? 'var(--success)' : 'var(--text-subtle)' }}>
                {resolucionForm.justificacion.length}/20 caracteres mínimos
              </span>
            </div>
            <div className="form-group">
              <label className="form-label">Referencia Normativa (opcional)</label>
              <input
                className="form-input"
                placeholder="Ej: Decreto 1165/2019, Art. 15"
                value={resolucionForm.referenciaNormativa}
                onChange={(e) => setResolucionForm(p => ({ ...p, referenciaNormativa: e.target.value }))}
              />
            </div>
            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setShowResolucion(false)}>Cancelar</button>
              <button
                id="btn-confirmar-resolucion"
                className="btn-primary"
                disabled={resolucionForm.justificacion.length < 20 || actionLoading}
                onClick={() => doAction('desbloquear', resolucionForm)}
              >
                {actionLoading ? <span className="spinner-sm" /> : 'Emitir Resolución'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

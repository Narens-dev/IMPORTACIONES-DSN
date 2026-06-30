import { useEffect, useState } from 'react';
import api from '../api/axios';

interface Parametro {
  _id?: string;
  nombre: string;
  valor: string;
  descripcion?: string;
}

export default function Parametros() {
  const [parametros, setParametros] = useState<Parametro[]>([]);
  const [loading, setLoading] = useState(true);
  const [editValues, setEditValues] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<string | null>(null);
  const [savedMsg, setSavedMsg] = useState<string | null>(null);

  const fetchParametros = () => {
    api.get('/parametros')
      .then((res) => {
        const data: Parametro[] = res.data.parametros || res.data;
        setParametros(data);
        const vals: Record<string, string> = {};
        data.forEach((p) => { vals[p.nombre] = p.valor; });
        setEditValues(vals);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchParametros(); }, []);

  const handleSave = async (nombre: string) => {
    setSaving(nombre);
    try {
      await api.patch(`/parametros/${nombre}`, { valor: editValues[nombre] });
      setSavedMsg(nombre);
      setTimeout(() => setSavedMsg(null), 2000);
      fetchParametros();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(null);
    }
  };

  const getParametroConfig = (nombre: string) => {
    const configs: Record<string, { label: string; icon: string; type: string; min?: number; max?: number; unit?: string }> = {
      UMBRAL_CONFIANZA_BRM:       { label: 'Umbral de Confianza BRM',      icon: '🤖', type: 'slider', min: 0, max: 100, unit: '%' },
      TIEMPO_LIMITE_ALERTAS_HORAS:{ label: 'Tiempo Límite para Alertas',   icon: '⏰', type: 'number', unit: 'horas' },
    };
    return configs[nombre] || { label: nombre, icon: '⚙️', type: 'text' };
  };

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">⚙️ Parámetros del Sistema</h1>
          <p className="page-subtitle">Configuración global del motor DSN — Solo Administrador</p>
        </div>
        <div className="audit-badge" style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444' }}>
          <span>🔐 Solo ADMINISTRADOR</span>
        </div>
      </div>

      {loading ? (
        <div className="page-loading"><div className="loading-spinner"></div></div>
      ) : (
        <div className="parametros-grid">
          {parametros.map((param) => {
            const cfg = getParametroConfig(param.nombre);
            const valor = editValues[param.nombre] ?? param.valor;
            const isSaved = savedMsg === param.nombre;

            return (
              <div key={param.nombre} className="card param-card">
                <div className="param-header">
                  <span className="param-icon">{cfg.icon}</span>
                  <div>
                    <h3 className="param-label">{cfg.label}</h3>
                    <code className="param-nombre">{param.nombre}</code>
                  </div>
                </div>

                {param.descripcion && (
                  <p className="param-desc">{param.descripcion}</p>
                )}

                <div className="param-control">
                  {cfg.type === 'slider' ? (
                    <div className="slider-wrapper">
                      <input
                        id={`param-${param.nombre}`}
                        type="range"
                        className="param-slider"
                        min={cfg.min}
                        max={cfg.max}
                        value={valor}
                        onChange={(e) => setEditValues(prev => ({ ...prev, [param.nombre]: e.target.value }))}
                      />
                      <div className="slider-labels">
                        <span>{cfg.min}{cfg.unit}</span>
                        <span className="slider-value">{valor}{cfg.unit}</span>
                        <span>{cfg.max}{cfg.unit}</span>
                      </div>
                    </div>
                  ) : (
                    <div className="input-unit-wrapper">
                      <input
                        id={`param-${param.nombre}`}
                        type="number"
                        className="form-input"
                        value={valor}
                        onChange={(e) => setEditValues(prev => ({ ...prev, [param.nombre]: e.target.value }))}
                      />
                      {cfg.unit && <span className="input-unit">{cfg.unit}</span>}
                    </div>
                  )}
                </div>

                <div className="param-footer">
                  <span className="param-current">Valor actual: <strong>{param.valor}{cfg.unit}</strong></span>
                  <button
                    id={`btn-save-${param.nombre}`}
                    className={`btn-sm ${isSaved ? 'btn-success' : 'btn-primary'}`}
                    disabled={saving === param.nombre || valor === param.valor}
                    onClick={() => handleSave(param.nombre)}
                  >
                    {saving === param.nombre ? <span className="spinner-sm"></span> : isSaved ? '✅ Guardado' : '💾 Guardar'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

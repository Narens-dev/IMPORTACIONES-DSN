import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { Globe } from 'lucide-react';

const PAISES = [
  'Colombia', 'Estados Unidos', 'China', 'Alemania', 'México', 'Brasil',
  'Japón', 'Corea del Sur', 'Francia', 'Reino Unido', 'India', 'Italia',
  'España', 'Países Bajos', 'Rusia', 'Australia', 'Canadá', 'Argentina',
  'Chile', 'Perú', 'Venezuela', 'Ecuador', 'Irán', 'Corea del Norte', 'Cuba',
];

interface FormState {
  producto: string;
  descripcionProducto: string;
  paisOrigen: string;
  paisDestino: string;
  valorFOB: string;
  contraparte: string;
}

const INITIAL: FormState = {
  producto: '',
  descripcionProducto: '',
  paisOrigen: 'Colombia',
  paisDestino: '',
  valorFOB: '',
  contraparte: '',
};

const PASOS = [
  { n: 1, label: 'Ingreso de Datos' },
  { n: 2, label: 'Clasificación BRM' },
  { n: 3, label: 'Revisión Legal' },
  { n: 4, label: 'Aprobación Final' },
];

export default function RegistrarOperacion() {
  const [form, setForm] = useState<FormState>(INITIAL);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [exitoId, setExitoId] = useState('');
  const navigate = useNavigate();

  const set = (k: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const confianzaEstimada = form.producto.length > 3 ? Math.min(60 + form.producto.length * 2, 94) : 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!form.paisDestino) { setError('Selecciona el país de destino.'); return; }
    if (!form.contraparte.trim()) { setError('Ingresa la contraparte comercial.'); return; }
    const fob = parseFloat(form.valorFOB);
    if (!form.valorFOB || isNaN(fob) || fob <= 0) { setError('El valor FOB debe ser un número mayor a 0.'); return; }

    setLoading(true);
    try {
      const res = await api.post('/operaciones', {
        producto: form.producto,
        descripcionProducto: form.descripcionProducto,
        paisOrigen: form.paisOrigen,
        paisDestino: form.paisDestino,
        valorFOB: fob,
        contraparte: form.contraparte,
      });
      const id = res.data._id || res.data.operacion?._id;
      setExitoId(id);
    } catch (err: unknown) {
      const axErr = err as { response?: { data?: { mensaje?: string; errores?: { msg: string }[] } } };
      const errores = axErr?.response?.data?.errores;
      if (errores?.length) {
        setError(errores.map((e) => e.msg).join(' · '));
      } else {
        setError(axErr?.response?.data?.mensaje || 'Error al registrar la operación.');
      }
    } finally {
      setLoading(false);
    }
  };

  if (exitoId) {
    return (
      <div className="page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <div className="card" style={{ maxWidth: 480, textAlign: 'center', padding: '40px 32px' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>✅</div>
          <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text)', marginBottom: 8 }}>
            Operación Registrada
          </h2>
          <p style={{ fontSize: '.88rem', color: 'var(--text-muted)', marginBottom: 24 }}>
            La operación fue enviada para clasificación automática por el Motor BRM.<br />
            ID: <strong>#OPS-{exitoId.slice(-6).toUpperCase()}</strong>
          </p>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
            <button className="btn-primary" onClick={() => navigate(`/operaciones/${exitoId}`)}>
              Ver Operación →
            </button>
            <button className="btn-secondary" onClick={() => { setForm(INITIAL); setExitoId(''); }}>
              Registrar Otra
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Registrar Operación</h1>
          <p className="page-subtitle">Ingrese los datos de la operación de comercio exterior para iniciar la clasificación automática.</p>
        </div>
      </div>

      <div className="registrar-grid">
        {/* Formulario */}
        <form onSubmit={handleSubmit} className="card" style={{ marginBottom: 0 }}>
          <h2 className="card-title" style={{ marginBottom: 20 }}>Datos de la Operación</h2>

          <div className="form-group">
            <label className="form-label">Nombre del Producto *</label>
            <input
              className="form-input"
              type="text"
              placeholder="Ej: Turbina de gas industrial"
              value={form.producto}
              onChange={set('producto')}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Descripción Técnica del Producto</label>
            <textarea
              className="form-input"
              style={{ minHeight: 80, resize: 'vertical' }}
              placeholder="Especificaciones técnicas, uso previsto, materiales, etc."
              value={form.descripcionProducto}
              onChange={set('descripcionProducto')}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div className="form-group">
              <label className="form-label">País de Origen *</label>
              <select className="form-input" value={form.paisOrigen} onChange={set('paisOrigen')} required>
                {PAISES.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">País de Destino *</label>
              <select className="form-input" value={form.paisDestino} onChange={set('paisDestino')} required>
                <option value="">— Seleccionar —</option>
                {PAISES.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Valor FOB (USD) *</label>
            <input
              className="form-input"
              type="number"
              step="0.01"
              min="0"
              placeholder="0.00"
              value={form.valorFOB}
              onChange={set('valorFOB')}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Contraparte Comercial *</label>
            <input
              className="form-input"
              type="text"
              placeholder="Nombre de la empresa o persona"
              value={form.contraparte}
              onChange={set('contraparte')}
              required
            />
          </div>

          {error && <div className="alert alert-error">{error}</div>}

          <button
            type="submit"
            className="btn-primary btn-full"
            disabled={loading}
            style={{ marginTop: 8, padding: '11px 18px', justifyContent: 'center' }}
          >
            {loading ? <span className="spinner-sm"></span> : 'Enviar para Revisión →'}
          </button>
        </form>

        {/* Panel lateral */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Vista previa HS */}
          <div className="card" style={{ marginBottom: 0 }}>
            <h3 className="card-title" style={{ marginBottom: 14 }}>Vista Previa de Clasificación</h3>
            <div className="classif-preview">
              <div className="classif-hs">
                {form.producto.length > 3 ? '?????.??' : '— — — —'}
              </div>
              <div className="classif-desc">
                {form.producto.length > 3 ? form.producto : 'Ingrese el nombre del producto'}
              </div>
            </div>
            {form.producto.length > 3 && (
              <>
                <div style={{ margin: '12px 0 4px', fontSize: '.78rem', color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between' }}>
                  <span>Confianza estimada BRM</span>
                  <span style={{ fontWeight: 700, color: confianzaEstimada >= 80 ? '#16a34a' : '#f59e0b' }}>
                    {confianzaEstimada}%
                  </span>
                </div>
                <div className="dist-bar-track">
                  <div
                    className="dist-bar-fill"
                    style={{
                      width: `${confianzaEstimada}%`,
                      background: confianzaEstimada >= 80 ? '#16a34a' : '#f59e0b',
                    }}
                  />
                </div>
                <p style={{ fontSize: '.74rem', color: 'var(--text-subtle)', marginTop: 8 }}>
                  * La clasificación final será determinada por el Motor BRM tras el envío.
                </p>
              </>
            )}
          </div>

          {/* Cadena de suministro */}
          {form.paisOrigen && form.paisDestino && (
            <div className="card" style={{ marginBottom: 0 }}>
              <h3 className="card-title" style={{ marginBottom: 12 }}>Cadena de Suministro Global</h3>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <Globe size={14} style={{ color: 'var(--primary)' }} />
                <span style={{ fontSize: '.82rem', fontWeight: 600 }}>{form.paisOrigen}</span>
                <span style={{ color: 'var(--text-subtle)', fontSize: '.9rem' }}>→</span>
                <span style={{ fontSize: '.82rem', color: 'var(--text-muted)' }}>DSN (Bogotá)</span>
                <span style={{ color: 'var(--text-subtle)', fontSize: '.9rem' }}>→</span>
                <span style={{ fontSize: '.82rem', fontWeight: 600 }}>{form.paisDestino}</span>
              </div>
            </div>
          )}

          {/* Flujo de revisión */}
          <div className="card" style={{ marginBottom: 0 }}>
            <h3 className="card-title" style={{ marginBottom: 14 }}>Flujo de Revisión</h3>
            <div className="workflow-stepper">
              {PASOS.map((paso, idx) => (
                <div key={paso.n} className={`workflow-step ${idx === 0 ? 'step-active' : 'step-pending'}`}>
                  <div className="step-circle">{paso.n}</div>
                  <div className="step-label">{paso.label}</div>
                  {idx < PASOS.length - 1 && <div className="step-connector" />}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

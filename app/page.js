'use client';
import { useState, useRef, useEffect } from 'react';

const API = process.env.NEXT_PUBLIC_API_URL || 'https://core-backend-production-9f3f.up.railway.app';
const STORAGE_KEY = 'kore_sesion';

function guardarSesion(datos) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(datos)); } catch {}
}
function leerSesion() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null'); } catch { return null; }
}
function limpiarSesion() {
  try { localStorage.removeItem(STORAGE_KEY); } catch {}
}

function SkeletonLista({ cantidad = 3 }) {
  return (
    <>
      <style>{`@keyframes pulso { 0%,100%{opacity:1} 50%{opacity:0.4} }`}</style>
      {Array.from({ length: cantidad }).map((_, i) => (
        <div key={i} style={{
          width: '100%', height: 44, borderRadius: 10, marginBottom: 8,
          background: '#E0E0DA', animation: 'pulso 1.4s ease-in-out infinite',
          animationDelay: `${i * 0.15}s`
        }} />
      ))}
    </>
  );
}

export default function Page() {
  const [paso, setPaso] = useState(1);
  const [empresas, setEmpresas] = useState([]);
  const [puestos, setPuestos] = useState([]);
  const [cargandoLista, setCargandoLista] = useState(false);

  const [empresaId, setEmpresaId] = useState('');
  const [empresaNombre, setEmpresaNombre] = useState('');
  const [puestoId, setPuestoId] = useState('');
  const [puestoNombre, setPuestoNombre] = useState('');
  const [nombreEmpleado, setNombreEmpleado] = useState('');
  const [empleadoId, setEmpleadoId] = useState('');

  const [mensajes, setMensajes] = useState([]);
  const [input, setInput] = useState('');
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');
  const bottomRef = useRef(null);

  useEffect(() => {
    const sesion = leerSesion();
    if (sesion?.empleadoId && sesion?.puestoId && sesion?.empresaId) {
      setEmpresaId(sesion.empresaId);
      setEmpresaNombre(sesion.empresaNombre);
      setPuestoId(sesion.puestoId);
      setPuestoNombre(sesion.puestoNombre);
      setNombreEmpleado(sesion.nombreEmpleado);
      setEmpleadoId(sesion.empleadoId);
      setPaso(4);
      return;
    }
    cargarEmpresas();
  }, []);

  useEffect(() => {
    if (!empresaId || paso === 4) return;
    setCargandoLista(true);
    setPuestos([]);
    fetch(`${API}/empresas/${empresaId}/puestos`)
      .then(r => r.json())
      .then(data => setPuestos(Array.isArray(data) ? data : []))
      .catch(() => setError('Error al cargar puestos.'))
      .finally(() => setCargandoLista(false));
  }, [empresaId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [mensajes]);

  function cargarEmpresas() {
    setCargandoLista(true);
    fetch(`${API}/empresas`)
      .then(r => r.json())
      .then(data => setEmpresas(Array.isArray(data) ? data : []))
      .catch(() => setError('No se pudo conectar con el servidor.'))
      .finally(() => setCargandoLista(false));
  }

  function elegirEmpresa(id, nombre) {
    setEmpresaId(id); setEmpresaNombre(nombre); setError(''); setPaso(2);
  }
  function elegirPuesto(id, nombre) {
    setPuestoId(id); setPuestoNombre(nombre); setError(''); setPaso(3);
  }

  async function confirmarNombre(e) {
    e.preventDefault();
    if (!nombreEmpleado.trim()) return;
    setCargando(true); setError('');
    try {
      const emailUnico = `${nombreEmpleado.trim().toLowerCase().replace(/\s+/g, '.')}.${Date.now()}@kore.demo`;
      const res = await fetch(`${API}/empleados`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombre: nombreEmpleado.trim(), empresa_id: empresaId, email: emailUnico, fecha_ingreso: null }),
      });
      const data = await res.json();
      if (!data.id) throw new Error('No se pudo crear el empleado.');
      setEmpleadoId(data.id);
      guardarSesion({ empresaId, empresaNombre, puestoId, puestoNombre, nombreEmpleado: nombreEmpleado.trim(), empleadoId: data.id });
      setPaso(4);
    } catch (err) {
      setError('Error al registrar empleado: ' + err.message);
    } finally {
      setCargando(false);
    }
  }

  function cambiarPuesto() {
    limpiarSesion();
    setEmpresaId(''); setEmpresaNombre(''); setPuestoId(''); setPuestoNombre('');
    setNombreEmpleado(''); setEmpleadoId(''); setMensajes([]); setError('');
    setPaso(1); cargarEmpresas();
  }

  async function enviarMensaje(e) {
    e.preventDefault();
    if (!input.trim() || cargando) return;
    const texto = input.trim();
    setMensajes(prev => [...prev, { rol: 'usuario', texto }]);
    setInput(''); setCargando(true); setError('');
    try {
      const res = await fetch(`${API}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ puesto_id: puestoId, empleado_id: empleadoId, mensaje: texto }),
      });
      const data = await res.json();
      setMensajes(prev => [...prev, { rol: 'kore', texto: data.respuesta || data.error || 'Sin respuesta.' }]);
    } catch {
      setError('Error de conexión.');
    } finally {
      setCargando(false);
    }
  }

  // =============================================
  // UI — SELECCIÓN
  // =============================================
  if (paso < 4) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F5F5F0', padding: '1rem' }}>
        <style>{`
          @keyframes pulso { 0%,100%{opacity:1} 50%{opacity:0.4} }
          @keyframes girar { to{transform:rotate(360deg)} }
        `}</style>
        <div style={{ background: '#fff', borderRadius: 16, padding: '2rem', width: '100%', maxWidth: 400, border: '0.5px solid #E0E0DA' }}>

          {/* Logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: '2rem' }}>
            <div style={{ position: 'relative', width: 32, height: 32, flexShrink: 0 }}>
              <div style={{ position: 'absolute', top: 0, left: 0, width: 20, height: 20, border: '2px solid #0D0D0D', borderRadius: 3 }} />
              <div style={{ position: 'absolute', bottom: 0, right: 0, width: 20, height: 20, background: '#C8FF57', borderRadius: 3 }} />
            </div>
            <span style={{ fontSize: 18, fontWeight: 300, letterSpacing: '0.16em', color: '#0D0D0D' }}>KORE</span>
          </div>

          {/* Steps */}
          <div style={{ display: 'flex', gap: 6, marginBottom: '1.5rem' }}>
            {['Empresa', 'Puesto', 'Acceso'].map((label, i) => (
              <div key={i} style={{ flex: 1 }}>
                <div style={{ height: 3, borderRadius: 2, marginBottom: 6, background: paso > i + 1 ? '#C8FF57' : paso === i + 1 ? '#0D0D0D' : '#E0E0DA' }} />
                <div style={{ fontSize: 11, color: paso === i + 1 ? '#0D0D0D' : '#999', textAlign: 'center' }}>{label}</div>
              </div>
            ))}
          </div>

          {error && (
            <div style={{ background: '#FFF0F0', border: '0.5px solid #FFCCCC', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#C00', marginBottom: 16 }}>
              {error}
            </div>
          )}

          {paso === 1 && (
            <>
              <h2 style={{ fontSize: 17, fontWeight: 500, marginBottom: 4, color: '#0D0D0D' }}>Seleccioná tu empresa</h2>
              <p style={{ fontSize: 13, color: '#888', marginBottom: 16 }}>¿En qué empresa trabajás?</p>
              {cargandoLista ? <SkeletonLista cantidad={3} /> : empresas.map(emp => (
                <button key={emp.id} onClick={() => elegirEmpresa(emp.id, emp.nombre)}
                  style={{ display: 'block', width: '100%', textAlign: 'left', padding: '12px 14px', marginBottom: 8, border: '0.5px solid #E0E0DA', borderRadius: 10, background: '#fff', cursor: 'pointer', fontSize: 14, color: '#0D0D0D', transition: 'border-color 0.15s' }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = '#0D0D0D'}
                  onMouseLeave={e => e.currentTarget.style.borderColor = '#E0E0DA'}
                >{emp.nombre}</button>
              ))}
            </>
          )}

          {paso === 2 && (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <button onClick={() => setPaso(1)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, color: '#888', padding: 0, lineHeight: 1 }}>←</button>
                <h2 style={{ fontSize: 17, fontWeight: 500, color: '#0D0D0D' }}>Seleccioná tu puesto</h2>
              </div>
              <p style={{ fontSize: 13, color: '#888', marginBottom: 16, marginLeft: 28 }}>{empresaNombre}</p>
              {cargandoLista ? <SkeletonLista cantidad={4} /> : puestos.length === 0 ? (
                <p style={{ fontSize: 14, color: '#aaa' }}>No hay puestos cargados para esta empresa.</p>
              ) : puestos.map(p => (
                <button key={p.id} onClick={() => elegirPuesto(p.id, p.nombre)}
                  style={{ display: 'block', width: '100%', textAlign: 'left', padding: '12px 14px', marginBottom: 8, border: '0.5px solid #E0E0DA', borderRadius: 10, background: '#fff', cursor: 'pointer', transition: 'border-color 0.15s' }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = '#0D0D0D'}
                  onMouseLeave={e => e.currentTarget.style.borderColor = '#E0E0DA'}
                >
                  <div style={{ fontSize: 14, fontWeight: 500, color: '#0D0D0D' }}>{p.nombre}</div>
                  {p.descripcion_rol && <div style={{ fontSize: 12, color: '#888', marginTop: 2 }}>{p.descripcion_rol}</div>}
                </button>
              ))}
            </>
          )}

          {paso === 3 && (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <button onClick={() => setPaso(2)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, color: '#888', padding: 0, lineHeight: 1 }}>←</button>
                <h2 style={{ fontSize: 17, fontWeight: 500, color: '#0D0D0D' }}>¿Cómo te llamás?</h2>
              </div>
              <p style={{ fontSize: 13, color: '#888', marginBottom: 20, marginLeft: 28 }}>{puestoNombre} · {empresaNombre}</p>
              <form onSubmit={confirmarNombre}>
                <input type="text" value={nombreEmpleado} onChange={e => setNombreEmpleado(e.target.value)}
                  placeholder="Tu nombre completo" autoFocus disabled={cargando}
                  style={{ width: '100%', padding: '11px 14px', border: '0.5px solid #E0E0DA', borderRadius: 10, fontSize: 14, marginBottom: 12, boxSizing: 'border-box', outline: 'none', color: '#0D0D0D' }}
                />
                <button type="submit" disabled={cargando || !nombreEmpleado.trim()}
                  style={{ width: '100%', padding: '11px 0', background: cargando || !nombreEmpleado.trim() ? '#E0E0DA' : '#0D0D0D', color: cargando || !nombreEmpleado.trim() ? '#999' : '#C8FF57', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 500, cursor: 'pointer', transition: 'background 0.15s' }}
                >
                  {cargando ? (
                    <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                      <span style={{ width: 14, height: 14, borderRadius: '50%', border: '2px solid #999', borderTopColor: 'transparent', display: 'inline-block', animation: 'girar 0.7s linear infinite' }} />
                      Ingresando...
                    </span>
                  ) : 'Ingresar al puesto →'}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    );
  }

  // =============================================
  // UI — CHAT
  // =============================================
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: '#F5F5F0' }}>
      <style>{`
        @keyframes bote {
          0%,80%,100% { transform:translateY(0); opacity:0.4; }
          40% { transform:translateY(-5px); opacity:1; }
        }
        @keyframes girar { to{transform:rotate(360deg)} }

        .kore-header {
          background: #0D0D0D;
          color: #F0EDE6;
          padding: 12px 16px;
          display: flex;
          flex-direction: column;
          gap: 8px;
          flex-shrink: 0;
        }
        .kore-header-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
        }
        .kore-header-info { flex: 1; min-width: 0; }
        .kore-header-puesto {
          font-weight: 500;
          font-size: 15px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .kore-header-sub {
          font-size: 12px;
          color: #666;
          margin-top: 2px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .kore-badge {
          background: #C8FF57;
          color: #0D0D0D;
          font-size: 11px;
          font-weight: 500;
          padding: 3px 8px;
          border-radius: 20px;
          letter-spacing: 0.08em;
          flex-shrink: 0;
          white-space: nowrap;
        }
        .kore-header-actions {
          display: flex;
          gap: 6px;
        }
        .kore-btn-header {
          font-size: 11px;
          color: #888;
          background: none;
          border: 0.5px solid #333;
          border-radius: 8px;
          padding: 5px 10px;
          cursor: pointer;
          white-space: nowrap;
          text-decoration: none;
          display: inline-block;
          flex: 1;
          text-align: center;
        }
      `}</style>

      {/* Header responsive */}
      <div className="kore-header">
        <div className="kore-header-top">
          <div className="kore-header-info">
            <div className="kore-header-puesto">{puestoNombre}</div>
            <div className="kore-header-sub">{nombreEmpleado} · {empresaNombre}</div>
          </div>
          <div className="kore-badge">KORE OS</div>
        </div>
        <div className="kore-header-actions">
          <button onClick={cambiarPuesto} className="kore-btn-header">
            Cambiar puesto
          </button>
          <a href="/gestion" className="kore-btn-header">
            Panel de gestión →
          </a>
        </div>
      </div>

      {/* Mensajes */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem 1rem' }}>
        {mensajes.length === 0 && (
          <div style={{ textAlign: 'center', color: '#aaa', fontSize: 14, marginTop: '4rem', lineHeight: 1.8 }}>
            Hola <strong style={{ color: '#0D0D0D' }}>{nombreEmpleado}</strong>, soy la inteligencia<br />
            del puesto <strong style={{ color: '#0D0D0D' }}>{puestoNombre}</strong>.<br />
            ¿En qué trabajamos hoy?
          </div>
        )}

        {mensajes.map((m, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: m.rol === 'usuario' ? 'flex-end' : 'flex-start', marginBottom: 10 }}>
            <div style={{
              maxWidth: '78%', padding: '10px 14px',
              borderRadius: m.rol === 'usuario' ? '12px 12px 4px 12px' : '12px 12px 12px 4px',
              fontSize: 14, lineHeight: 1.65,
              background: m.rol === 'usuario' ? '#0D0D0D' : '#fff',
              color: m.rol === 'usuario' ? '#F0EDE6' : '#0D0D0D',
              border: m.rol === 'kore' ? '0.5px solid #E0E0DA' : 'none',
              whiteSpace: 'pre-wrap'
            }}>
              {m.texto}
            </div>
          </div>
        ))}

        {cargando && (
          <div style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: 10 }}>
            <div style={{ padding: '12px 16px', borderRadius: '12px 12px 12px 4px', background: '#fff', border: '0.5px solid #E0E0DA', display: 'flex', gap: 5, alignItems: 'center' }}>
              {[0, 1, 2].map(i => (
                <div key={i} style={{ width: 7, height: 7, borderRadius: '50%', background: '#C8FF57', animation: 'bote 1.2s ease-in-out infinite', animationDelay: `${i * 0.2}s` }} />
              ))}
            </div>
          </div>
        )}

        {error && <p style={{ color: '#C00', fontSize: 13, textAlign: 'center', margin: '8px 0' }}>{error}</p>}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <form onSubmit={enviarMensaje} style={{ padding: '12px 16px', background: '#fff', borderTop: '0.5px solid #E0E0DA', display: 'flex', gap: 8, flexShrink: 0 }}>
        <input value={input} onChange={e => setInput(e.target.value)}
          placeholder="Escribí tu mensaje..." disabled={cargando}
          style={{ flex: 1, padding: '10px 14px', border: '0.5px solid #E0E0DA', borderRadius: 10, fontSize: 14, outline: 'none', color: '#0D0D0D', background: '#fff' }}
        />
        <button type="submit" disabled={cargando || !input.trim()}
          style={{ padding: '10px 18px', background: cargando || !input.trim() ? '#E0E0DA' : '#0D0D0D', color: cargando || !input.trim() ? '#999' : '#C8FF57', border: 'none', borderRadius: 10, fontWeight: 500, cursor: 'pointer', fontSize: 16, transition: 'background 0.15s' }}
        >→</button>
      </form>
    </div>
  );
}

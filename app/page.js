'use client';
import { useState, useRef, useEffect } from 'react';

const API = process.env.NEXT_PUBLIC_API_URL || 'https://core-backend-production-9f3f.up.railway.app';

export default function Page() {
  // --- Estado de selección ---
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

  // --- Estado de chat ---
  const [mensajes, setMensajes] = useState([]);
  const [input, setInput] = useState('');
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');
  const bottomRef = useRef(null);

  // Cargar empresas al inicio
  useEffect(() => {
    setCargandoLista(true);
    fetch(`${API}/empresas`)
      .then(r => r.json())
      .then(data => setEmpresas(Array.isArray(data) ? data : []))
      .catch(() => setError('No se pudo conectar con el servidor.'))
      .finally(() => setCargandoLista(false));
  }, []);

  // Cargar puestos al elegir empresa
  useEffect(() => {
    if (!empresaId) return;
    setCargandoLista(true);
    setPuestos([]);
    fetch(`${API}/empresas/${empresaId}/puestos`)
      .then(r => r.json())
      .then(data => setPuestos(Array.isArray(data) ? data : []))
      .catch(() => setError('Error al cargar puestos.'))
      .finally(() => setCargandoLista(false));
  }, [empresaId]);

  // Scroll al fondo
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [mensajes]);

  // --- Selección ---
  function elegirEmpresa(id, nombre) {
    setEmpresaId(id);
    setEmpresaNombre(nombre);
    setError('');
    setPaso(2);
  }

  function elegirPuesto(id, nombre) {
    setPuestoId(id);
    setPuestoNombre(nombre);
    setError('');
    setPaso(3);
  }

  async function confirmarNombre(e) {
    e.preventDefault();
    if (!nombreEmpleado.trim()) return;
    setCargando(true);
    setError('');

    try {
      // Crear empleado real en Supabase
      const res = await fetch(`${API}/empleados`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre: nombreEmpleado.trim(),
          empresa_id: empresaId,
          email: null,
        }),
      });
      const data = await res.json();
      if (!data.id) throw new Error('No se pudo crear el empleado.');
      setEmpleadoId(data.id);
      setPaso(4);
    } catch (err) {
      setError('Error al registrar empleado: ' + err.message);
    } finally {
      setCargando(false);
    }
  }

  // --- Chat ---
  async function enviarMensaje(e) {
    e.preventDefault();
    if (!input.trim() || cargando) return;

    const texto = input.trim();
    setMensajes(prev => [...prev, { rol: 'usuario', texto }]);
    setInput('');
    setCargando(true);
    setError('');

    try {
      const res = await fetch(`${API}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          puesto_id: puestoId,
          empleado_id: empleadoId,
          mensaje: texto,
        }),
      });
      const data = await res.json();
      const respuesta = data.respuesta || data.error || 'Sin respuesta.';
      setMensajes(prev => [...prev, { rol: 'kore', texto: respuesta }]);
    } catch {
      setError('Error de conexión.');
    } finally {
      setCargando(false);
    }
  }

  // =============================================
  // UI — PANTALLA DE SELECCIÓN
  // =============================================
  if (paso < 4) {
    return (
      <div style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center',
        justifyContent: 'center', background: '#F5F5F0', padding: '1rem'
      }}>
        <div style={{
          background: '#fff', borderRadius: 16, padding: '2rem',
          width: '100%', maxWidth: 400,
          border: '0.5px solid #E0E0DA'
        }}>
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
                <div style={{
                  height: 3, borderRadius: 2, marginBottom: 6,
                  background: paso > i + 1 ? '#C8FF57' : paso === i + 1 ? '#0D0D0D' : '#E0E0DA'
                }} />
                <div style={{ fontSize: 11, color: paso === i + 1 ? '#0D0D0D' : '#999', textAlign: 'center' }}>{label}</div>
              </div>
            ))}
          </div>

          {error && (
            <div style={{ background: '#FFF0F0', border: '0.5px solid #FFCCCC', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#C00', marginBottom: 16 }}>
              {error}
            </div>
          )}

          {/* Paso 1: empresa */}
          {paso === 1 && (
            <>
              <h2 style={{ fontSize: 17, fontWeight: 500, marginBottom: 4, color: '#0D0D0D' }}>Seleccioná tu empresa</h2>
              <p style={{ fontSize: 13, color: '#888', marginBottom: 16 }}>¿En qué empresa trabajás?</p>
              {cargandoLista ? (
                <p style={{ fontSize: 14, color: '#aaa' }}>Cargando...</p>
              ) : empresas.map(emp => (
                <button key={emp.id} onClick={() => elegirEmpresa(emp.id, emp.nombre)}
                  style={{
                    display: 'block', width: '100%', textAlign: 'left',
                    padding: '12px 14px', marginBottom: 8,
                    border: '0.5px solid #E0E0DA', borderRadius: 10,
                    background: '#fff', cursor: 'pointer', fontSize: 14,
                    color: '#0D0D0D', transition: 'border-color 0.15s'
                  }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = '#0D0D0D'}
                  onMouseLeave={e => e.currentTarget.style.borderColor = '#E0E0DA'}
                >
                  {emp.nombre}
                </button>
              ))}
            </>
          )}

          {/* Paso 2: puesto */}
          {paso === 2 && (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <button onClick={() => setPaso(1)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, color: '#888', padding: 0, lineHeight: 1 }}>←</button>
                <h2 style={{ fontSize: 17, fontWeight: 500, color: '#0D0D0D' }}>Seleccioná tu puesto</h2>
              </div>
              <p style={{ fontSize: 13, color: '#888', marginBottom: 16, marginLeft: 28 }}>{empresaNombre}</p>
              {cargandoLista ? (
                <p style={{ fontSize: 14, color: '#aaa' }}>Cargando puestos...</p>
              ) : puestos.length === 0 ? (
                <p style={{ fontSize: 14, color: '#aaa' }}>No hay puestos cargados para esta empresa.</p>
              ) : puestos.map(p => (
                <button key={p.id} onClick={() => elegirPuesto(p.id, p.nombre)}
                  style={{
                    display: 'block', width: '100%', textAlign: 'left',
                    padding: '12px 14px', marginBottom: 8,
                    border: '0.5px solid #E0E0DA', borderRadius: 10,
                    background: '#fff', cursor: 'pointer', transition: 'border-color 0.15s'
                  }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = '#0D0D0D'}
                  onMouseLeave={e => e.currentTarget.style.borderColor = '#E0E0DA'}
                >
                  <div style={{ fontSize: 14, fontWeight: 500, color: '#0D0D0D' }}>{p.nombre}</div>
                  {p.descripcion_rol && (
                    <div style={{ fontSize: 12, color: '#888', marginTop: 2 }}>{p.descripcion_rol}</div>
                  )}
                </button>
              ))}
            </>
          )}

          {/* Paso 3: nombre */}
          {paso === 3 && (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <button onClick={() => setPaso(2)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, color: '#888', padding: 0, lineHeight: 1 }}>←</button>
                <h2 style={{ fontSize: 17, fontWeight: 500, color: '#0D0D0D' }}>¿Cómo te llamás?</h2>
              </div>
              <p style={{ fontSize: 13, color: '#888', marginBottom: 20, marginLeft: 28 }}>
                {puestoNombre} · {empresaNombre}
              </p>
              <form onSubmit={confirmarNombre}>
                <input
                  type="text"
                  value={nombreEmpleado}
                  onChange={e => setNombreEmpleado(e.target.value)}
                  placeholder="Tu nombre completo"
                  autoFocus
                  disabled={cargando}
                  style={{
                    width: '100%', padding: '11px 14px',
                    border: '0.5px solid #E0E0DA', borderRadius: 10,
                    fontSize: 14, marginBottom: 12,
                    boxSizing: 'border-box', outline: 'none',
                    color: '#0D0D0D'
                  }}
                />
                <button
                  type="submit"
                  disabled={cargando || !nombreEmpleado.trim()}
                  style={{
                    width: '100%', padding: '11px 0',
                    background: cargando || !nombreEmpleado.trim() ? '#E0E0DA' : '#0D0D0D',
                    color: cargando || !nombreEmpleado.trim() ? '#999' : '#C8FF57',
                    border: 'none', borderRadius: 10,
                    fontSize: 14, fontWeight: 500, cursor: 'pointer',
                    transition: 'background 0.15s'
                  }}
                >
                  {cargando ? 'Ingresando...' : 'Ingresar al puesto →'}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    );
  }

  // =============================================
  // UI — PANTALLA DE CHAT
  // =============================================
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: '#F5F5F0' }}>

      {/* Header */}
      <div style={{
        background: '#0D0D0D', color: '#F0EDE6',
        padding: '14px 20px', display: 'flex',
        alignItems: 'center', justifyContent: 'space-between',
        flexShrink: 0
      }}>
        <div>
          <div style={{ fontWeight: 500, fontSize: 15 }}>{puestoNombre}</div>
          <div style={{ fontSize: 12, color: '#666', marginTop: 2 }}>
            {nombreEmpleado} · {empresaNombre}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            background: '#C8FF57', color: '#0D0D0D',
            fontSize: 11, fontWeight: 500,
            padding: '4px 10px', borderRadius: 20,
            letterSpacing: '0.08em'
          }}>KORE OS</div>
        </div>
      </div>

      {/* Mensajes */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem 1rem' }}>
        {mensajes.length === 0 && (
          <div style={{
            textAlign: 'center', color: '#aaa',
            fontSize: 14, marginTop: '4rem', lineHeight: 1.8
          }}>
            Hola <strong style={{ color: '#0D0D0D' }}>{nombreEmpleado}</strong>, soy la inteligencia<br />
            del puesto <strong style={{ color: '#0D0D0D' }}>{puestoNombre}</strong>.<br />
            ¿En qué trabajamos hoy?
          </div>
        )}

        {mensajes.map((m, i) => (
          <div key={i} style={{
            display: 'flex',
            justifyContent: m.rol === 'usuario' ? 'flex-end' : 'flex-start',
            marginBottom: 10
          }}>
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
            <div style={{
              padding: '10px 14px', borderRadius: '12px 12px 12px 4px',
              background: '#fff', border: '0.5px solid #E0E0DA',
              fontSize: 14, color: '#aaa'
            }}>
              Pensando...
            </div>
          </div>
        )}

        {error && (
          <p style={{ color: '#C00', fontSize: 13, textAlign: 'center', margin: '8px 0' }}>
            {error}
          </p>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <form onSubmit={enviarMensaje} style={{
        padding: '12px 16px', background: '#fff',
        borderTop: '0.5px solid #E0E0DA',
        display: 'flex', gap: 8, flexShrink: 0
      }}>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="Escribí tu mensaje..."
          disabled={cargando}
          style={{
            flex: 1, padding: '10px 14px',
            border: '0.5px solid #E0E0DA', borderRadius: 10,
            fontSize: 14, outline: 'none', color: '#0D0D0D',
            background: '#fff'
          }}
        />
        <button
          type="submit"
          disabled={cargando || !input.trim()}
          style={{
            padding: '10px 18px',
            background: cargando || !input.trim() ? '#E0E0DA' : '#0D0D0D',
            color: cargando || !input.trim() ? '#999' : '#C8FF57',
            border: 'none', borderRadius: 10,
            fontWeight: 500, cursor: 'pointer',
            fontSize: 16, transition: 'background 0.15s'
          }}
        >
          →
        </button>
      </form>
    </div>
  );
}

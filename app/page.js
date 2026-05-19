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

function IconoMenu() {
  return (
    <span style={{ display: 'flex', gap: 3, alignItems: 'center' }}>
      {[0, 1, 2].map(i => (
        <span key={i} style={{ width: 5, height: 5, borderRadius: '50%', background: '#C8FF57', display: 'inline-block' }} />
      ))}
    </span>
  );
}

const ESTADO_CONFIG = {
  pendiente:    { label: 'Pendiente',    bg: '#FFF8E1', color: '#B8860B', border: '#F0D060' },
  'en progreso':{ label: 'En progreso',  bg: '#E8F4FD', color: '#1565C0', border: '#90CAF9' },
  bloqueada:    { label: 'Bloqueada',    bg: '#FDECEA', color: '#C62828', border: '#EF9A9A' },
  completada:   { label: 'Completada',   bg: '#F0F9F0', color: '#2E7D32', border: '#A5D6A7' },
};

const PRIORIDAD_CONFIG = {
  alta:   { label: 'Alta',   color: '#C62828' },
  media:  { label: 'Media',  color: '#B8860B' },
  baja:   { label: 'Baja',   color: '#666'    },
};

function BadgeEstado({ estado }) {
  const cfg = ESTADO_CONFIG[estado] || { label: estado, bg: '#F5F5F0', color: '#666', border: '#E0E0DA' };
  return (
    <span style={{
      fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 20,
      background: cfg.bg, color: cfg.color, border: `0.5px solid ${cfg.border}`,
      letterSpacing: '0.04em', textTransform: 'uppercase'
    }}>{cfg.label}</span>
  );
}

function BadgePrioridad({ prioridad }) {
  const cfg = PRIORIDAD_CONFIG[prioridad] || { label: prioridad, color: '#666' };
  return (
    <span style={{ fontSize: 10, color: cfg.color, fontWeight: 500 }}>
      ● {cfg.label}
    </span>
  );
}

function formatFecha(iso) {
  if (!iso) return null;
  const d = new Date(iso);
  const hoy = new Date();
  const diff = Math.ceil((d - hoy) / (1000 * 60 * 60 * 24));
  const str = d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' });
  if (diff < 0) return { texto: `Vencio ${str}`, vencida: true };
  if (diff === 0) return { texto: 'Vence hoy', vencida: true };
  if (diff <= 3) return { texto: `Vence ${str}`, vencida: true };
  return { texto: `Vence ${str}`, vencida: false };
}

const ORDEN_ESTADOS = ['bloqueada', 'pendiente', 'en progreso', 'completada'];

function ordenarTareas(tareas) {
  return [...tareas].sort((a, b) => {
    const ia = ORDEN_ESTADOS.indexOf(a.estado);
    const ib = ORDEN_ESTADOS.indexOf(b.estado);
    if (ia !== ib) return ia - ib;
    const pa = ['alta','media','baja'].indexOf(a.prioridad);
    const pb = ['alta','media','baja'].indexOf(b.prioridad);
    return pa - pb;
  });
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
  const [menuAbierto, setMenuAbierto] = useState(false);
  const [tareasPendientes, setTareasPendientes] = useState(null);
  const [aprobando, setAprobando] = useState(false);
  const [tareasPuesto, setTareasPuesto] = useState([]);
  const [panelTareasAbierto, setPanelTareasAbierto] = useState(false);
  const [filtroEstado, setFiltroEstado] = useState('todas');

  const bottomRef = useRef(null);
  const menuRef = useRef(null);

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
      cargarTareasPuesto(sesion.puestoId);
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

  useEffect(() => {
    function handleClickOutside(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuAbierto(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, []);

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
      cargarTareasPuesto(puestoId);
    } catch (err) {
      setError('Error al registrar empleado: ' + err.message);
    } finally {
      setCargando(false);
    }
  }

  async function cargarTareasPuesto(id) {
    try {
      const res = await fetch(`${API}/puestos/${id}/tareas`);
      const data = await res.json();
      // Sin filtro — todos los estados
      setTareasPuesto(Array.isArray(data) ? data : []);
    } catch {
      setTareasPuesto([]);
    }
  }

  function cambiarPuesto() {
    limpiarSesion();
    setEmpresaId(''); setEmpresaNombre(''); setPuestoId(''); setPuestoNombre('');
    setNombreEmpleado(''); setEmpleadoId(''); setMensajes([]); setError('');
    setMenuAbierto(false);
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
      if (data.tareas_sugeridas && data.tareas_sugeridas.length > 0) {
        setTareasPendientes({ tareas: data.tareas_sugeridas, puesto_origen_id: puestoId });
      }
      // Recargar tareas despues de cada mensaje por si cambiaron
      cargarTareasPuesto(puestoId);
    } catch {
      setError('Error de conexion.');
    } finally {
      setCargando(false);
    }
  }

  async function aprobarAsignaciones() {
    if (!tareasPendientes) return;
    setAprobando(true);
    try {
      const tareasResueltas = [...tareasPendientes.tareas];
      const hayNulos = tareasResueltas.some(t => !t.puesto_destino_id);
      if (hayNulos) {
        const resPuestos = await fetch(`${API}/empresas/${empresaId}/puestos`);
        const listaPuestos = await resPuestos.json();
        for (const tarea of tareasResueltas) {
          if (!tarea.puesto_destino_id && tarea.puesto_destino_nombre) {
            const match = listaPuestos.find(p =>
              p.nombre.toLowerCase().includes(tarea.puesto_destino_nombre.toLowerCase()) ||
              tarea.puesto_destino_nombre.toLowerCase().includes(p.nombre.toLowerCase())
            );
            if (match) tarea.puesto_destino_id = match.id;
          }
        }
      }
      const res = await fetch(`${API}/asignar-tareas`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          empresa_id: empresaId,
          puesto_origen_id: tareasPendientes.puesto_origen_id,
          tareas: tareasResueltas
        }),
      });
      const data = await res.json();
      const ok = data.resultados?.filter(r => r.ok).length || 0;
      setMensajes(prev => [...prev, { rol: 'kore', texto: `\u2713 ${ok} tarea${ok !== 1 ? 's' : ''} asignada${ok !== 1 ? 's' : ''} correctamente.` }]);
      setTareasPendientes(null);
      cargarTareasPuesto(puestoId);
    } catch {
      setError('Error al asignar tareas.');
    } finally {
      setAprobando(false);
    }
  }

  // Tareas filtradas y ordenadas para el panel
  const tareasParaPanel = ordenarTareas(
    filtroEstado === 'todas'
      ? tareasPuesto
      : tareasPuesto.filter(t => t.estado === filtroEstado)
  );

  const contadorPendientes = tareasPuesto.filter(t => t.estado === 'pendiente' || t.estado === 'bloqueada').length;

  // =============================================
  // UI — SELECCION
  // =============================================
  if (paso < 4) {
    return (
      <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F5F5F0', padding: '1rem' }}>
        <style>{`
          @keyframes pulso { 0%,100%{opacity:1} 50%{opacity:0.4} }
          @keyframes girar { to{transform:rotate(360deg)} }
        `}</style>
        <div style={{ background: '#fff', borderRadius: 16, padding: '2rem', width: '100%', maxWidth: 400, border: '0.5px solid #E0E0DA' }}>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: '2rem' }}>
            <div style={{ position: 'relative', width: 32, height: 32, flexShrink: 0 }}>
              <div style={{ position: 'absolute', top: 0, left: 0, width: 20, height: 20, border: '2px solid #0D0D0D', borderRadius: 3 }} />
              <div style={{ position: 'absolute', bottom: 0, right: 0, width: 20, height: 20, background: '#C8FF57', borderRadius: 3 }} />
            </div>
            <span style={{ fontSize: 18, fontWeight: 300, letterSpacing: '0.16em', color: '#0D0D0D' }}>KORE</span>
          </div>

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
              <h2 style={{ fontSize: 17, fontWeight: 500, marginBottom: 4, color: '#0D0D0D' }}>Selecciona tu empresa</h2>
              <p style={{ fontSize: 13, color: '#888', marginBottom: 16 }}>En que empresa trabajas?</p>
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
                <h2 style={{ fontSize: 17, fontWeight: 500, color: '#0D0D0D' }}>Selecciona tu puesto</h2>
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
                </button>
              ))}
            </>
          )}

          {paso === 3 && (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <button onClick={() => setPaso(2)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, color: '#888', padding: 0, lineHeight: 1 }}>←</button>
                <h2 style={{ fontSize: 17, fontWeight: 500, color: '#0D0D0D' }}>Como te llamas?</h2>
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
    <div style={{ display: 'flex', flexDirection: 'column', height: '100dvh', background: '#F5F5F0' }}>
      <style>{`
        @keyframes bote {
          0%,80%,100% { transform:translateY(0); opacity:0.4; }
          40% { transform:translateY(-5px); opacity:1; }
        }
        @keyframes fadeIn {
          from { opacity:0; transform:translateY(-6px); }
          to   { opacity:1; transform:translateY(0); }
        }
        @keyframes slideIn {
          from { transform:translateX(100%); }
          to   { transform:translateX(0); }
        }
      `}</style>

      {/* Header */}
      <div style={{
        background: '#0D0D0D', color: '#F0EDE6',
        padding: '12px 16px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        flexShrink: 0, position: 'relative'
      }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 500, fontSize: 14, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {puestoNombre}
          </div>
          <div style={{ fontSize: 11, color: '#666', marginTop: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {nombreEmpleado} · {empresaNombre}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          <div style={{ background: '#C8FF57', color: '#0D0D0D', fontSize: 10, fontWeight: 600, padding: '3px 8px', borderRadius: 20, letterSpacing: '0.08em' }}>
            KORE OS
          </div>

          <button
            onClick={() => { setPanelTareasAbierto(true); setFiltroEstado('todas'); }}
            style={{
              background: contadorPendientes > 0 ? '#C8FF57' : 'transparent',
              border: contadorPendientes > 0 ? 'none' : '0.5px solid #444',
              borderRadius: 20,
              padding: '4px 10px',
              fontSize: 11,
              fontWeight: 600,
              color: contadorPendientes > 0 ? '#0D0D0D' : '#666',
              cursor: 'pointer',
              letterSpacing: '0.05em'
            }}
          >
            {contadorPendientes > 0 ? `${contadorPendientes} TAREA${contadorPendientes !== 1 ? 'S' : ''}` : 'SIN TAREAS'}
          </button>

          <div ref={menuRef} style={{ position: 'relative' }}>
            <button
              onClick={() => setMenuAbierto(v => !v)}
              style={{
                width: 34, height: 34, borderRadius: 8,
                background: menuAbierto ? '#222' : 'none',
                border: '0.5px solid #333',
                cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'background 0.15s'
              }}
            >
              <IconoMenu />
            </button>

            {menuAbierto && (
              <div style={{
                position: 'absolute', top: 'calc(100% + 8px)', right: 0,
                background: '#1A1A1A', border: '0.5px solid #333',
                borderRadius: 10, padding: '6px',
                minWidth: 190, zIndex: 100,
                animation: 'fadeIn 0.15s ease-out',
                boxShadow: '0 8px 24px rgba(0,0,0,0.4)'
              }}>
                <button
                  onClick={cambiarPuesto}
                  style={{ display: 'block', width: '100%', textAlign: 'left', padding: '9px 12px', borderRadius: 7, background: 'none', border: 'none', color: '#F0EDE6', fontSize: 13, cursor: 'pointer', transition: 'background 0.1s' }}
                  onMouseEnter={e => e.currentTarget.style.background = '#2A2A2A'}
                  onMouseLeave={e => e.currentTarget.style.background = 'none'}
                >
                  Cambiar puesto
                </button>
                <a
                  href="/gestion"
                  onClick={() => setMenuAbierto(false)}
                  style={{ display: 'block', width: '100%', textAlign: 'left', padding: '9px 12px', borderRadius: 7, color: '#F0EDE6', fontSize: 13, textDecoration: 'none', transition: 'background 0.1s' }}
                  onMouseEnter={e => e.currentTarget.style.background = '#2A2A2A'}
                  onMouseLeave={e => e.currentTarget.style.background = 'none'}
                >
                  Panel de gestion →
                </a>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mensajes */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem 1rem' }}>
        {mensajes.length === 0 && (
          <div style={{ textAlign: 'center', color: '#aaa', fontSize: 14, marginTop: '4rem', lineHeight: 1.8 }}>
            Hola <strong style={{ color: '#0D0D0D' }}>{nombreEmpleado}</strong>, soy la inteligencia<br />
            del puesto <strong style={{ color: '#0D0D0D' }}>{puestoNombre}</strong>.<br />
            En que trabajamos hoy?
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

        {tareasPendientes && (
          <div style={{ display: 'flex', gap: 8, padding: '8px 0', justifyContent: 'flex-start' }}>
            <button
              onClick={aprobarAsignaciones}
              disabled={aprobando}
              style={{
                padding: '9px 18px', borderRadius: 10, border: 'none',
                background: aprobando ? '#E0E0DA' : '#0D0D0D',
                color: aprobando ? '#999' : '#C8FF57',
                fontSize: 13, fontWeight: 500, cursor: aprobando ? 'default' : 'pointer'
              }}
            >
              {aprobando ? 'Asignando...' : `Aprobar ${tareasPendientes.tareas.length} tarea${tareasPendientes.tareas.length !== 1 ? 's' : ''}`}
            </button>
            <button
              onClick={() => setTareasPendientes(null)}
              disabled={aprobando}
              style={{
                padding: '9px 18px', borderRadius: 10,
                border: '0.5px solid #E0E0DA', background: '#fff',
                color: '#666', fontSize: 13, cursor: 'pointer'
              }}
            >
              Modificar
            </button>
          </div>
        )}

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

      {/* Panel lateral de tareas */}
      {panelTareasAbierto && (
        <>
          {/* Overlay */}
          <div
            onClick={() => setPanelTareasAbierto(false)}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.2)', zIndex: 199 }}
          />
          {/* Panel */}
          <div style={{
            position: 'fixed', top: 0, right: 0, width: 320, height: '100dvh',
            background: '#fff', borderLeft: '0.5px solid #E0E0DA',
            zIndex: 200, display: 'flex', flexDirection: 'column',
            boxShadow: '-8px 0 24px rgba(0,0,0,0.1)',
            animation: 'slideIn 0.2s ease-out'
          }}>
            {/* Header panel */}
            <div style={{ padding: '16px', borderBottom: '0.5px solid #E0E0DA', flexShrink: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#0D0D0D' }}>
                  Tareas
                  {tareasPuesto.length > 0 && (
                    <span style={{ background: '#F5F5F0', color: '#666', borderRadius: 20, padding: '1px 8px', fontSize: 11, marginLeft: 8, border: '0.5px solid #E0E0DA' }}>
                      {tareasPuesto.length}
                    </span>
                  )}
                </div>
                <button onClick={() => setPanelTareasAbierto(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, color: '#888', lineHeight: 1, padding: 0 }}>×</button>
              </div>

              {/* Filtros por estado */}
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {['todas', 'pendiente', 'en progreso', 'bloqueada', 'completada'].map(est => {
                  const count = est === 'todas' ? tareasPuesto.length : tareasPuesto.filter(t => t.estado === est).length;
                  const activo = filtroEstado === est;
                  const cfg = ESTADO_CONFIG[est];
                  return (
                    <button
                      key={est}
                      onClick={() => setFiltroEstado(est)}
                      style={{
                        fontSize: 11, padding: '3px 10px', borderRadius: 20, cursor: 'pointer',
                        border: activo ? '0.5px solid #0D0D0D' : '0.5px solid #E0E0DA',
                        background: activo ? '#0D0D0D' : '#F5F5F0',
                        color: activo ? '#F0EDE6' : '#666',
                        fontWeight: activo ? 600 : 400,
                        transition: 'all 0.1s'
                      }}
                    >
                      {est === 'todas' ? 'Todas' : ESTADO_CONFIG[est]?.label || est} {count > 0 && `(${count})`}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Lista de tareas */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '12px' }}>
              {tareasParaPanel.length === 0 ? (
                <p style={{ fontSize: 13, color: '#aaa', textAlign: 'center', marginTop: 32 }}>
                  {filtroEstado === 'todas' ? 'Sin tareas asignadas' : `Sin tareas ${ESTADO_CONFIG[filtroEstado]?.label?.toLowerCase() || filtroEstado}`}
                </p>
              ) : tareasParaPanel.map(t => {
                const fecha = formatFecha(t.fecha_vencimiento);
                return (
                  <div key={t.id} style={{
                    padding: '12px', borderRadius: 10,
                    border: `0.5px solid ${t.estado === 'bloqueada' ? '#EF9A9A' : '#E0E0DA'}`,
                    marginBottom: 8,
                    background: t.estado === 'completada' ? '#FAFAFA' : '#fff',
                    opacity: t.estado === 'completada' ? 0.7 : 1
                  }}>
                    {/* Titulo */}
                    <div style={{
                      fontSize: 13, fontWeight: 500, color: '#0D0D0D', marginBottom: 6,
                      textDecoration: t.estado === 'completada' ? 'line-through' : 'none'
                    }}>
                      {t.titulo}
                    </div>

                    {/* Descripcion */}
                    {t.descripcion && (
                      <div style={{ fontSize: 12, color: '#666', lineHeight: 1.5, marginBottom: 8 }}>
                        {t.descripcion}
                      </div>
                    )}

                    {/* Footer: badges */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <BadgeEstado estado={t.estado} />
                      {t.prioridad && <BadgePrioridad prioridad={t.prioridad} />}
                      {fecha && (
                        <span style={{ fontSize: 10, color: fecha.vencida ? '#C62828' : '#888', marginLeft: 'auto' }}>
                          {fecha.vencida ? '⚠ ' : ''}{fecha.texto}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Footer panel */}
            <div style={{ padding: '12px 16px', borderTop: '0.5px solid #E0E0DA', flexShrink: 0 }}>
              <button
                onClick={() => { cargarTareasPuesto(puestoId); }}
                style={{
                  width: '100%', padding: '9px 0', borderRadius: 10,
                  border: '0.5px solid #E0E0DA', background: '#F5F5F0',
                  color: '#666', fontSize: 12, cursor: 'pointer'
                }}
              >
                Actualizar
              </button>
            </div>
          </div>
        </>
      )}

      {/* Input */}
      <form onSubmit={enviarMensaje} style={{ padding: '12px 16px', background: '#fff', borderTop: '0.5px solid #E0E0DA', display: 'flex', gap: 8, flexShrink: 0 }}>
        <input value={input} onChange={e => setInput(e.target.value)}
          placeholder="Escribi tu mensaje..." disabled={cargando}
          style={{ flex: 1, padding: '10px 14px', border: '0.5px solid #E0E0DA', borderRadius: 10, fontSize: 14, outline: 'none', color: '#0D0D0D', background: '#fff' }}
        />
        <button type="submit" disabled={cargando || !input.trim()}
          style={{ padding: '10px 18px', background: cargando || !input.trim() ? '#E0E0DA' : '#0D0D0D', color: cargando || !input.trim() ? '#999' : '#C8FF57', border: 'none', borderRadius: 10, fontWeight: 500, cursor: 'pointer', fontSize: 16, transition: 'background 0.15s' }}
        >→</button>
      </form>
    </div>
  );
}

'use client';
import { useState, useEffect, useRef } from 'react';

// =============================================
// PANEL DE GESTION INDIVIDUAL
// Cada puesto ve solo sus tareas: las que le pidieron (ejecutor)
// y las que pidio a otros (solicitante). Solo lectura: los cambios
// de estado se hacen desde la pantalla de chat.
// =============================================

const API = process.env.NEXT_PUBLIC_API_URL || 'https://core-backend-production-9f3f.up.railway.app';
const STORAGE_KEY = 'kore_sesion';
const ROJO = '#E53935';

function leerSesion() { try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null'); } catch { return null; } }
function limpiarSesion() { try { localStorage.removeItem(STORAGE_KEY); } catch {} }

// Todo pedido protegido pasa por aca: agrega el token de la sesion.
// Si el backend responde 401 (token vencido o invalido), cierra la sesion
// y devuelve al login.
async function authFetch(url, opciones = {}) {
  const sesion = leerSesion();
  const headers = { ...(opciones.headers || {}) };
  if (sesion?.token) headers['Authorization'] = 'Bearer ' + sesion.token;
  const res = await fetch(url, { ...opciones, headers });
  if (res.status === 401) {
    limpiarSesion();
    if (typeof window !== 'undefined') window.location.href = '/';
    throw new Error('Sesion vencida');
  }
  return res;
}

const ESTADO_CONFIG = {
  pendiente:     { label: 'Pendiente',   bg: '#FFF8E1', color: '#B8860B', border: '#F0D060' },
  'en progreso': { label: 'En progreso', bg: '#E8F4FD', color: '#1565C0', border: '#90CAF9' },
  bloqueada:     { label: 'Bloqueada',   bg: '#FDECEA', color: '#C62828', border: '#EF9A9A' },
  completada:    { label: 'Completada',  bg: '#F0F9F0', color: '#2E7D32', border: '#A5D6A7' },
};
const ORDEN_ESTADOS = ['bloqueada', 'pendiente', 'en progreso', 'completada'];

function BadgeEstado({ estado }) {
  const cfg = ESTADO_CONFIG[estado] || { label: estado, bg: '#E8E8E4', color: '#666', border: '#D0D0CC' };
  return (
    <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 7px', borderRadius: 20, background: cfg.bg, color: cfg.color, border: `0.5px solid ${cfg.border}`, letterSpacing: '0.04em', textTransform: 'uppercase', flexShrink: 0 }}>{cfg.label}</span>
  );
}

function formatFechaCorta(iso) {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' });
}

// Fecha de vencimiento: se muestra tal cual esta guardada (dd/mm), sin
// conversion de zona horaria, para que no se corra un dia.
function formatVencimiento(fecha) {
  const s = String(fecha).slice(0, 10);
  const [, m, d] = s.split('-');
  return d && m ? `${d}/${m}` : s;
}

// Fin del dia de vencimiento en hora de Argentina (UTC-3): 23:59:59.
function limiteVencimiento(fechaVencimiento) {
  return new Date(`${String(fechaVencimiento).slice(0, 10)}T23:59:59.999-03:00`);
}

function estaVencida(t) {
  return !!t.fecha_vencimiento && t.estado !== 'completada' && new Date() > limiteVencimiento(t.fecha_vencimiento);
}

function ordenarTareas(tareas) {
  return [...tareas].sort((a, b) => {
    const ia = ORDEN_ESTADOS.indexOf(a.estado), ib = ORDEN_ESTADOS.indexOf(b.estado);
    if (ia !== ib) return ia - ib;
    return ['alta', 'media', 'baja'].indexOf(a.prioridad) - ['alta', 'media', 'baja'].indexOf(b.prioridad);
  });
}

// Mismo calculo que el bloque "Mi gestion" de la pantalla de chat.
// Recibe solo las tareas donde el puesto es ejecutor.
function calcularGestion(tareasEjecutor) {
  const r = { enTermino: 0, fueraTermino: 0, vencidas: 0, abiertasEnTermino: 0, sinVencimiento: 0, sinFechaCierre: 0 };
  const ahora = new Date();
  const tiempos = [];

  tareasEjecutor.forEach(t => {
    if (t.fecha_inicio && t.created_at) {
      const ms = new Date(t.fecha_inicio) - new Date(t.created_at);
      if (ms >= 0) tiempos.push(ms);
    }
    if (!t.fecha_vencimiento) { r.sinVencimiento++; return; }
    const limite = limiteVencimiento(t.fecha_vencimiento);
    if (t.estado === 'completada') {
      if (!t.fecha_completada) { r.sinFechaCierre++; return; }
      if (new Date(t.fecha_completada) <= limite) r.enTermino++;
      else r.fueraTermino++;
      return;
    }
    if (ahora > limite) r.vencidas++;
    else r.abiertasEnTermino++;
  });

  r.respuestaPromedioMs = tiempos.length ? tiempos.reduce((a, b) => a + b, 0) / tiempos.length : null;
  return r;
}

function formatDuracion(ms) {
  if (ms === null) return '-';
  const horas = ms / (1000 * 60 * 60);
  if (horas < 1) return 'menos de 1 h';
  if (horas < 24) return `${Math.round(horas)} h`;
  return `${(horas / 24).toFixed(1).replace('.', ',')} dias`;
}

function contarEstados(tareas) {
  return {
    pendiente: tareas.filter(t => t.estado === 'pendiente').length,
    enProgreso: tareas.filter(t => t.estado === 'en progreso').length,
    bloqueada: tareas.filter(t => t.estado === 'bloqueada').length,
    completada: tareas.filter(t => t.estado === 'completada').length,
    vencida: tareas.filter(estaVencida).length,
  };
}

// ---------- Componentes visuales ----------

function IconoMenu() {
  return (
    <span style={{ display: 'flex', gap: 3, alignItems: 'center' }}>
      {[0, 1, 2].map(i => (
        <span key={i} style={{ width: 5, height: 5, borderRadius: '50%', background: '#C8FF57', display: 'inline-block' }} />
      ))}
    </span>
  );
}

function MenuItem({ label, href, onClick, activo, danger }) {
  const base = { display: 'block', width: '100%', textAlign: 'left', padding: '9px 12px', borderRadius: 7, background: activo ? '#2A2A2A' : 'none', border: 'none', color: danger ? '#FF9057' : activo ? '#C8FF57' : '#F0EDE6', fontSize: 13, cursor: 'pointer', transition: 'background 0.1s', textDecoration: 'none', boxSizing: 'border-box' };
  if (href) return (
    <a href={href} onClick={onClick} style={base}
      onMouseEnter={e => e.currentTarget.style.background = '#2A2A2A'}
      onMouseLeave={e => e.currentTarget.style.background = activo ? '#2A2A2A' : 'none'}
    >{label}</a>
  );
  return (
    <button onClick={onClick} style={base}
      onMouseEnter={e => e.currentTarget.style.background = '#2A2A2A'}
      onMouseLeave={e => e.currentTarget.style.background = activo ? '#2A2A2A' : 'none'}
    >{label}</button>
  );
}

function HeaderKore({ mostrarNavegacion }) {
  const [menuAbierto, setMenuAbierto] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    function handleClick(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuAbierto(false);
    }
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('touchstart', handleClick);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('touchstart', handleClick);
    };
  }, []);

  function cerrarSesion() {
    limpiarSesion();
    window.location.href = '/';
  }

  return (
    <div style={{ background: '#0D0D0D', color: '#F0EDE6', padding: '0 16px', display: 'flex', alignItems: 'center', minHeight: 52, flexShrink: 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginRight: 'auto' }}>
        <div style={{ position: 'relative', width: 28, height: 28, flexShrink: 0 }}>
          <div style={{ position: 'absolute', top: 0, left: 0, width: 17, height: 17, border: '1.5px solid #F0EDE6', borderRadius: 2 }} />
          <div style={{ position: 'absolute', bottom: 0, right: 0, width: 17, height: 17, background: '#C8FF57', borderRadius: 2 }} />
        </div>
        <span style={{ fontSize: 16, fontWeight: 300, letterSpacing: '0.16em' }}>KORE</span>
      </div>

      {mostrarNavegacion && (
        <div ref={menuRef} style={{ position: 'relative' }}>
          <button
            onClick={() => setMenuAbierto(v => !v)}
            style={{ width: 34, height: 34, borderRadius: 8, background: menuAbierto ? '#222' : 'none', border: '0.5px solid #333', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.15s' }}
          >
            <IconoMenu />
          </button>
          {menuAbierto && (
            <div style={{ position: 'absolute', top: 'calc(100% + 8px)', right: 0, background: '#1A1A1A', border: '0.5px solid #333', borderRadius: 10, padding: '6px', minWidth: 200, zIndex: 100, boxShadow: '0 8px 24px rgba(0,0,0,0.4)' }}>
              <MenuItem label="Vista empleado" href="/" onClick={() => setMenuAbierto(false)} />
              <MenuItem label="Panel de gestion" href="/mi-gestion" onClick={() => setMenuAbierto(false)} activo />
              <MenuItem label="Agenda" href="/agenda" onClick={() => setMenuAbierto(false)} />
              <div style={{ height: '0.5px', background: '#333', margin: '4px 0' }} />
              <MenuItem label="Cerrar sesion" onClick={cerrarSesion} danger />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function TituloSeccion({ titulo, subtitulo }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ fontSize: 11, fontWeight: 500, letterSpacing: '0.07em', textTransform: 'uppercase', color: '#888888' }}>{titulo}</div>
      {subtitulo && <div style={{ fontSize: 12, color: '#555555', marginTop: 2 }}>{subtitulo}</div>}
    </div>
  );
}

function Contador({ label, value }) {
  return (
    <div style={{ background: '#E8E8E4', border: '0.5px solid rgba(13,13,13,0.15)', borderRadius: 10, padding: '14px 16px' }}>
      <div style={{ fontSize: 24, fontWeight: 300, color: ROJO, lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 11, color: '#555555', marginTop: 4, letterSpacing: '0.04em' }}>{label}</div>
    </div>
  );
}

function GrillaContadores({ items }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: 10, marginBottom: 16 }}>
      {items.map(c => <Contador key={c.label} label={c.label} value={c.value} />)}
    </div>
  );
}

function FilaTarea({ t, contraparte }) {
  const vencida = estaVencida(t);
  return (
    <div style={{ padding: '10px 14px', borderTop: '0.5px solid rgba(13,13,13,0.1)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ fontSize: 13, color: '#0D0D0D', flex: 1, lineHeight: 1.4 }}>{t.titulo || t.descripcion}</div>
        {t.prioridad === 'alta' && <span style={{ fontSize: 9, color: '#C62828', fontWeight: 600, flexShrink: 0 }}>● ALTA</span>}
        <BadgeEstado estado={t.estado} />
      </div>
      {contraparte && <div style={{ fontSize: 11, color: '#1565C0', marginTop: 3 }}>{contraparte}</div>}
      <div style={{ fontSize: 11, color: '#888888', marginTop: 3 }}>
        {t.created_at && <span>Requerida {formatFechaCorta(t.created_at)}</span>}
        {t.fecha_inicio && <span> · Inicio {formatFechaCorta(t.fecha_inicio)}</span>}
        {t.fecha_vencimiento
          ? <span style={{ color: vencida ? ROJO : '#888888', fontWeight: vencida ? 600 : 400 }}> · {vencida ? 'Vencida' : 'Vence'} {formatVencimiento(t.fecha_vencimiento)}</span>
          : <span> · Sin vencimiento</span>}
        {t.fecha_completada && <span> · Cierre {formatFechaCorta(t.fecha_completada)}</span>}
      </div>
    </div>
  );
}

function ListaTareas({ tareas, textoContraparte, vacio }) {
  const [verCompletadas, setVerCompletadas] = useState(false);
  const abiertas = ordenarTareas(tareas.filter(t => t.estado !== 'completada'));
  const completadas = tareas
    .filter(t => t.estado === 'completada')
    .sort((a, b) => new Date(b.fecha_completada || b.updated_at || 0) - new Date(a.fecha_completada || a.updated_at || 0));

  return (
    <div style={{ background: '#E8E8E4', border: '0.5px solid rgba(13,13,13,0.15)', borderRadius: 10, overflow: 'hidden' }}>
      {tareas.length === 0 ? (
        <div style={{ padding: '14px', fontSize: 12, color: '#888888', textAlign: 'center' }}>{vacio}</div>
      ) : (
        <>
          {abiertas.length === 0 && (
            <div style={{ padding: '14px', fontSize: 12, color: '#888888', textAlign: 'center' }}>Sin tareas abiertas</div>
          )}
          {abiertas.map(t => <FilaTarea key={t.id} t={t} contraparte={textoContraparte(t)} />)}
          {completadas.length > 0 && (
            <div style={{ borderTop: '0.5px solid rgba(13,13,13,0.15)', padding: '8px 14px' }}>
              <button
                onClick={() => setVerCompletadas(v => !v)}
                style={{ fontSize: 12, color: '#1565C0', background: 'none', border: 'none', padding: 0, cursor: 'pointer', textDecoration: 'underline' }}
              >
                {verCompletadas ? 'Ocultar completadas' : `Ver completadas (${completadas.length})`}
              </button>
            </div>
          )}
          {verCompletadas && completadas.map(t => <FilaTarea key={t.id} t={t} contraparte={textoContraparte(t)} />)}
        </>
      )}
    </div>
  );
}

// ---------- Pagina ----------

export default function MiGestion() {
  // acceso: verificando -> permitido | sin-sesion
  const [acceso, setAcceso] = useState('verificando');
  const [sesion, setSesion] = useState(null);
  const [tareas, setTareas] = useState([]);
  const [puestos, setPuestos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const s = leerSesion();
    if (!s?.token || !s?.puestoId || !s?.empresaId) { setAcceso('sin-sesion'); return; }
    setSesion(s);
    setAcceso('permitido');
  }, []);

  useEffect(() => {
    if (acceso !== 'permitido' || !sesion) return;
    setCargando(true);

    // Nombres de los puestos, para mostrar quien pidio / a quien se pidio.
    fetch(`${API}/empresas/${sesion.empresaId}/puestos`)
      .then(r => r.json())
      .then(data => setPuestos(Array.isArray(data) ? data : []))
      .catch(() => {});

    // Tareas del puesto: devuelve las que pidio y las que le pidieron.
    authFetch(`${API}/puestos/${sesion.puestoId}/tareas`)
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) setTareas(data);
        else setError('No se pudieron cargar las tareas.');
      })
      .catch(() => setError('No se pudieron cargar las tareas.'))
      .finally(() => setCargando(false));
  }, [acceso, sesion]);

  if (acceso === 'verificando') {
    return (
      <div style={{ minHeight: '100vh', background: '#C8C8C4' }}>
        <HeaderKore mostrarNavegacion={false} />
        <div style={{ textAlign: 'center', color: '#888888', fontSize: 14, marginTop: '4rem' }}>Verificando acceso...</div>
      </div>
    );
  }

  if (acceso === 'sin-sesion') {
    return (
      <div style={{ minHeight: '100vh', background: '#C8C8C4' }}>
        <HeaderKore mostrarNavegacion={false} />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '4rem 1.5rem' }}>
          <div style={{ background: '#E8E8E4', border: '0.5px solid rgba(13,13,13,0.15)', borderRadius: 16, padding: '2rem', maxWidth: 400, width: '100%', textAlign: 'center' }}>
            <div style={{ fontSize: 11, fontWeight: 500, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#888888', marginBottom: 10 }}>Acceso restringido</div>
            <h2 style={{ fontSize: 18, fontWeight: 400, color: '#0D0D0D', marginBottom: 10 }}>Necesitas iniciar sesion</h2>
            <p style={{ fontSize: 13, color: '#555555', lineHeight: 1.6, marginBottom: 22 }}>Ingresa con la clave de tu puesto para continuar.</p>
            <a href="/" style={{ display: 'inline-block', padding: '11px 22px', background: '#0D0D0D', color: '#C8FF57', borderRadius: 10, fontSize: 14, fontWeight: 500, textDecoration: 'none' }}>Volver al inicio</a>
          </div>
        </div>
      </div>
    );
  }

  const puestoId = sesion.puestoId;
  const nombrePuesto = (id) => puestos.find(p => p.id === id)?.nombre || 'otro puesto';

  // Me pidieron: el puesto es ejecutor (incluye tareas propias).
  const mePidieron = tareas.filter(t => t.puesto_destino_id === puestoId);
  // Pedi: el puesto es solicitante y el ejecutor es otro puesto.
  const pedi = tareas.filter(t => t.puesto_origen_id === puestoId && t.puesto_destino_id !== puestoId);

  const cEjec = contarEstados(mePidieron);
  const cPedi = contarEstados(pedi);
  const g = calcularGestion(mePidieron);

  const indicadoresGestion = [
    { label: 'Completadas en termino', value: g.enTermino },
    { label: 'Completadas fuera de termino', value: g.fueraTermino },
    { label: 'Vencidas sin completar', value: g.vencidas },
    { label: 'Abiertas en termino', value: g.abiertasEnTermino },
  ];
  if (g.sinVencimiento > 0) indicadoresGestion.push({ label: 'Sin vencimiento', value: g.sinVencimiento });
  if (g.sinFechaCierre > 0) indicadoresGestion.push({ label: 'Completadas sin fecha de cierre', value: g.sinFechaCierre });
  indicadoresGestion.push({ label: 'Tiempo de respuesta promedio', value: formatDuracion(g.respuestaPromedioMs) });

  return (
    <div style={{ minHeight: '100vh', background: '#C8C8C4' }}>
      <HeaderKore mostrarNavegacion={true} />

      <div style={{ padding: '2rem 1.5rem', maxWidth: 900, margin: '0 auto' }}>
        {error && (
          <div style={{ background: '#FDECEA', border: '0.5px solid #EF9A9A', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#C62828', marginBottom: 16 }}>{error}</div>
        )}

        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1.75rem', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <p style={{ fontSize: 11, fontWeight: 500, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#888888', marginBottom: 6 }}>Panel de gestion</p>
            <h2 style={{ fontSize: 20, fontWeight: 400, color: '#0D0D0D', marginBottom: 2 }}>{sesion.puestoNombre}</h2>
            <p style={{ fontSize: 13, color: '#555555' }}>{sesion.empresaNombre}{sesion.nombreEmpleado ? ` · ${sesion.nombreEmpleado}` : ''}</p>
          </div>
        </div>

        {cargando ? (
          <div style={{ textAlign: 'center', color: '#888888', fontSize: 14, marginTop: '3rem' }}>Cargando tareas...</div>
        ) : (
          <>
            {/* Lo que me pidieron */}
            <div style={{ marginBottom: '2.25rem' }}>
              <TituloSeccion titulo="Lo que me pidieron" subtitulo="Tareas que tenes que ejecutar" />
              <GrillaContadores items={[
                { label: 'Pendientes', value: cEjec.pendiente },
                { label: 'En progreso', value: cEjec.enProgreso },
                { label: 'Bloqueadas', value: cEjec.bloqueada },
                { label: 'Completadas', value: cEjec.completada },
                { label: 'Vencidas', value: cEjec.vencida },
              ]} />
              <TituloSeccion titulo="Mi gestion" subtitulo="Cumplimiento de lo que te pidieron" />
              <GrillaContadores items={indicadoresGestion} />
              <ListaTareas
                tareas={mePidieron}
                textoContraparte={t => t.puesto_origen_id === t.puesto_destino_id ? 'Tarea propia' : `Me pidio ${nombrePuesto(t.puesto_origen_id)}`}
                vacio="No te pidieron tareas todavia"
              />
            </div>

            {/* Lo que pedi */}
            <div>
              <TituloSeccion titulo="Lo que pedi a otros puestos" subtitulo="Seguimiento del avance. No suma a tus indicadores" />
              <GrillaContadores items={[
                { label: 'Pendientes', value: cPedi.pendiente },
                { label: 'En progreso', value: cPedi.enProgreso },
                { label: 'Bloqueadas', value: cPedi.bloqueada },
                { label: 'Completadas', value: cPedi.completada },
                { label: 'Vencidas', value: cPedi.vencida },
              ]} />
              <ListaTareas
                tareas={pedi}
                textoContraparte={t => `Pedi a ${nombrePuesto(t.puesto_destino_id)}`}
                vacio="No pediste tareas a otros puestos"
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}

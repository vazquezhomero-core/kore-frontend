'use client';
import { useState, useEffect, useRef } from 'react';

const API = process.env.NEXT_PUBLIC_API_URL || 'https://core-backend-production-9f3f.up.railway.app';
const STORAGE_KEY = 'kore_sesion';

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
  pendiente:     { label: 'Pendiente',   color: '#B8860B', bg: '#E8E8E4' },
  'en progreso': { label: 'En progreso', color: '#1565C0', bg: '#C8FF57' },
  bloqueada:     { label: 'Bloqueada',   color: '#C62828', bg: '#FF9057' },
  completada:    { label: 'Completada',  color: '#2E7D32', bg: '#57C8FF' },
};

function estadoColor(estado) { return ESTADO_CONFIG[estado]?.bg || '#D0D0CC'; }
function estadoTexto(estado) { return ESTADO_CONFIG[estado]?.label || estado; }

function formatFecha(iso) {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' });
}
function esVencida(t) {
  return !!t.fecha_vencimiento && t.estado !== 'completada' && new Date(t.fecha_vencimiento) < new Date();
}

// Quien pidio la tarea y a quien se la pidieron, relativo al puesto
// de la tarjeta que se esta mostrando (para que el gerente vea las dos puntas).
function direccionTarea(t, puestoTarjetaId, puestos) {
  if (t.puesto_origen_id === t.puesto_destino_id) return null; // tarea propia, sin contraparte
  const nombrePuesto = (id) => puestos.find(p => p.id === id)?.nombre || 'otro puesto';
  if (t.puesto_origen_id === puestoTarjetaId) return `Pidio a ${nombrePuesto(t.puesto_destino_id)}`;
  if (t.puesto_destino_id === puestoTarjetaId) return `Se lo pidio ${nombrePuesto(t.puesto_origen_id)}`;
  return null;
}

function IconoMenu() {
  return (
    <span style={{ display: 'flex', gap: 3, alignItems: 'center' }}>
      {[0,1,2].map(i => (
        <span key={i} style={{ width: 5, height: 5, borderRadius: '50%', background: '#C8FF57', display: 'inline-block' }} />
      ))}
    </span>
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
            <div style={{ position: 'absolute', top: 'calc(100% + 8px)', right: 0, background: '#1A1A1A', border: '0.5px solid #333', borderRadius: 10, padding: '6px', minWidth: 200, zIndex: 100, boxShadow: '0 8px 24px rgba(0,0,0,0.4)', animation: 'fadeIn 0.15s ease-out' }}>
              <style>{`@keyframes fadeIn { from{opacity:0;transform:translateY(-6px)} to{opacity:1;transform:translateY(0)} }`}</style>
              <MenuItem label="Vista empleado" href="/" onClick={() => setMenuAbierto(false)} />
              <MenuItem label="Panel de gestion" href="/gestion" onClick={() => setMenuAbierto(false)} activo />
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

export default function PanelGestion() {
  // acceso: verificando -> permitido | sin-sesion | sin-permiso
  const [acceso, setAcceso] = useState('verificando');
  const [empresaId, setEmpresaId] = useState('');
  const [empresaNombre, setEmpresaNombre] = useState('');
  const [puestoPropio, setPuestoPropio] = useState('');
  const [puestos, setPuestos] = useState([]);
  const [detalle, setDetalle] = useState({});
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');
  const [tareasDashboard, setTareasDashboard] = useState([]);
  const [puestoExpandido, setPuestoExpandido] = useState(null);

  // Gating: se resuelve antes de pedir cualquier dato al backend.
  useEffect(() => {
    const sesion = leerSesion();
    if (!sesion?.token || !sesion?.empresaId) { setAcceso('sin-sesion'); return; }
    if (sesion.rol !== 'administrador') { setAcceso('sin-permiso'); return; }
    setEmpresaId(sesion.empresaId);
    setEmpresaNombre(sesion.empresaNombre || '');
    setPuestoPropio(sesion.puestoNombre || '');
    setAcceso('permitido');
  }, []);

  useEffect(() => {
    if (acceso !== 'permitido' || !empresaId) return;
    setCargando(true); setPuestos([]); setDetalle({}); setTareasDashboard([]);

    authFetch(`${API}/empresas/${empresaId}/tareas`)
      .then(r => r.json())
      .then(data => setTareasDashboard(Array.isArray(data) ? data : []))
      .catch(() => {});

    authFetch(`${API}/empresas/${empresaId}/puestos`)
      .then(r => r.json())
      .then(async (data) => {
        const lista = Array.isArray(data) ? data : [];
        setPuestos(lista);
        const detalles = {};
        await Promise.all(lista.map(async (p) => {
          const [tareas, convs] = await Promise.all([
            authFetch(`${API}/puestos/${p.id}/tareas`).then(r => r.json()).catch(() => []),
            authFetch(`${API}/puestos/${p.id}/conversaciones`).then(r => r.json()).catch(() => []),
          ]);
          detalles[p.id] = { tareas: Array.isArray(tareas) ? tareas : [], conversaciones: Array.isArray(convs) ? convs : [] };
        }));
        setDetalle(detalles);
      })
      .catch(() => setError('Error al cargar puestos.'))
      .finally(() => setCargando(false));
  }, [acceso, empresaId]);

  // --- Pantallas de acceso ---

  if (acceso === 'verificando') {
    return (
      <div style={{ minHeight: '100vh', background: '#C8C8C4' }}>
        <HeaderKore mostrarNavegacion={false} />
        <div style={{ textAlign: 'center', color: '#888888', fontSize: 14, marginTop: '4rem' }}>Verificando acceso...</div>
      </div>
    );
  }

  if (acceso === 'sin-sesion' || acceso === 'sin-permiso') {
    const esSinSesion = acceso === 'sin-sesion';
    return (
      <div style={{ minHeight: '100vh', background: '#C8C8C4' }}>
        <HeaderKore mostrarNavegacion={false} />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '4rem 1.5rem' }}>
          <div style={{ background: '#E8E8E4', border: `0.5px solid rgba(13,13,13,0.15)`, borderRadius: 16, padding: '2rem', maxWidth: 400, width: '100%', textAlign: 'center' }}>
            <div style={{ fontSize: 11, fontWeight: 500, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#888888', marginBottom: 10 }}>Acceso restringido</div>
            <h2 style={{ fontSize: 18, fontWeight: 400, color: '#0D0D0D', marginBottom: 10 }}>
              {esSinSesion ? 'Necesitas iniciar sesion' : 'Este panel es solo para administradores'}
            </h2>
            <p style={{ fontSize: 13, color: '#555555', lineHeight: 1.6, marginBottom: 22 }}>
              {esSinSesion
                ? 'Ingresa con la clave de tu puesto para continuar.'
                : 'Tu puesto no tiene permiso de administrador. Si necesitas acceso, pedilo al administrador del sistema.'}
            </p>
            <a href="/" style={{ display: 'inline-block', padding: '11px 22px', background: '#0D0D0D', color: '#C8FF57', borderRadius: 10, fontSize: 14, fontWeight: 500, textDecoration: 'none' }}>
              Volver al inicio
            </a>
          </div>
        </div>
      </div>
    );
  }

  // --- Panel (solo administrador) ---

  const hoy = new Date();
  const totalPendiente  = tareasDashboard.filter(t => t.estado === 'pendiente').length;
  const totalEnProgreso = tareasDashboard.filter(t => t.estado === 'en progreso').length;
  const totalBloqueada  = tareasDashboard.filter(t => t.estado === 'bloqueada').length;
  const totalCompletada = tareasDashboard.filter(t => t.estado === 'completada').length;
  const totalVencidas   = tareasDashboard.filter(t => t.fecha_vencimiento && new Date(t.fecha_vencimiento) < hoy && t.estado !== 'completada').length;

  const tareasPorPuesto = puestos.map(p => {
    const tp = tareasDashboard.filter(t => t.puesto_destino_id === p.id);
    return {
      nombre: p.nombre,
      pendiente:  tp.filter(t => t.estado === 'pendiente').length,
      enProgreso: tp.filter(t => t.estado === 'en progreso').length,
      bloqueada:  tp.filter(t => t.estado === 'bloqueada').length,
      completada: tp.filter(t => t.estado === 'completada').length,
      total: tp.length,
    };
  }).filter(p => p.total > 0);

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
            <h2 style={{ fontSize: 20, fontWeight: 400, color: '#0D0D0D', marginBottom: 2 }}>{empresaNombre}</h2>
            <p style={{ fontSize: 13, color: '#555555' }}>{puestos.length} puesto{puestos.length !== 1 ? 's' : ''} · Estado en tiempo real</p>
          </div>
          {puestoPropio && (
            <div style={{ background: '#E8E8E4', border: `0.5px solid rgba(13,13,13,0.15)`, borderRadius: 20, padding: '5px 12px', fontSize: 11, color: '#555555' }}>
              {puestoPropio} · administrador
            </div>
          )}
        </div>

        {/* Dashboard de tareas */}
        <div style={{ marginBottom: '2rem' }}>
          <div style={{ fontSize: 11, fontWeight: 500, letterSpacing: '0.07em', textTransform: 'uppercase', color: '#888888', marginBottom: 12 }}>Dashboard de tareas</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: 10, marginBottom: 16 }}>
            {[
              { label: 'Pendientes',  value: totalPendiente,  color: '#B8860B', bg: '#FFF8E1' },
              { label: 'En progreso', value: totalEnProgreso, color: '#1565C0', bg: '#E8F4FD' },
              { label: 'Bloqueadas',  value: totalBloqueada,  color: '#C62828', bg: '#FDECEA' },
              { label: 'Completadas', value: totalCompletada, color: '#2E7D32', bg: '#F0F9F0' },
              { label: 'Vencidas',    value: totalVencidas,   color: '#FF6B00', bg: '#FFF3E0' },
            ].map(card => (
              <div key={card.label} style={{ background: card.bg, border: `0.5px solid ${card.color}33`, borderRadius: 10, padding: '14px 16px' }}>
                <div style={{ fontSize: 24, fontWeight: 300, color: card.color, lineHeight: 1 }}>{card.value}</div>
                <div style={{ fontSize: 11, color: card.color, marginTop: 4, letterSpacing: '0.04em' }}>{card.label}</div>
              </div>
            ))}
          </div>

          {tareasPorPuesto.length > 0 && (
            <div style={{ background: '#E8E8E4', border: `0.5px solid rgba(13,13,13,0.15)`, borderRadius: 10, overflow: 'hidden' }}>
              <div style={{ padding: '12px 16px', borderBottom: `0.5px solid rgba(13,13,13,0.15)`, fontSize: 12, fontWeight: 500, color: '#555555' }}>Tareas por puesto</div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, minWidth: 400 }}>
                  <thead>
                    <tr style={{ background: '#D8D8D4' }}>
                      <th style={{ textAlign: 'left', padding: '8px 16px', color: '#888888', fontWeight: 500 }}>Puesto</th>
                      <th style={{ textAlign: 'center', padding: '8px 8px', color: '#B8860B', fontWeight: 500 }}>Pend.</th>
                      <th style={{ textAlign: 'center', padding: '8px 8px', color: '#1565C0', fontWeight: 500 }}>Prog.</th>
                      <th style={{ textAlign: 'center', padding: '8px 8px', color: '#C62828', fontWeight: 500 }}>Bloq.</th>
                      <th style={{ textAlign: 'center', padding: '8px 8px', color: '#2E7D32', fontWeight: 500 }}>Comp.</th>
                      <th style={{ textAlign: 'center', padding: '8px 16px', color: '#555555', fontWeight: 500 }}>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tareasPorPuesto.map((p, i) => (
                      <tr key={p.nombre} style={{ borderTop: `0.5px solid rgba(13,13,13,0.1)`, background: i % 2 === 0 ? '#E8E8E4' : '#DEDED9' }}>
                        <td style={{ padding: '10px 16px', color: '#0D0D0D' }}>{p.nombre}</td>
                        <td style={{ textAlign: 'center', padding: '10px 8px', color: '#B8860B' }}>{p.pendiente || '-'}</td>
                        <td style={{ textAlign: 'center', padding: '10px 8px', color: '#1565C0' }}>{p.enProgreso || '-'}</td>
                        <td style={{ textAlign: 'center', padding: '10px 8px', color: '#C62828' }}>{p.bloqueada || '-'}</td>
                        <td style={{ textAlign: 'center', padding: '10px 8px', color: '#2E7D32' }}>{p.completada || '-'}</td>
                        <td style={{ textAlign: 'center', padding: '10px 16px', color: '#555555', fontWeight: 500 }}>{p.total}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Cards de puestos */}
        {cargando ? (
          <div style={{ textAlign: 'center', color: '#888888', fontSize: 14, marginTop: '3rem' }}>Cargando puestos...</div>
        ) : puestos.length === 0 ? (
          <div style={{ textAlign: 'center', color: '#888888', fontSize: 14, marginTop: '3rem' }}>No hay puestos cargados para esta empresa.</div>
        ) : (
          <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))' }}>
            {puestos.map(p => {
              const d = detalle[p.id] || { tareas: [], conversaciones: [] };
              const tareasActivas = d.tareas.filter(t => t.estado === 'pendiente' || t.estado === 'en progreso').length;
              const tareasTotal = d.tareas.length;
              const ultimaConv = d.conversaciones[0];
              const hayBloqueo = d.tareas.some(t => t.estado === 'bloqueada');
              return (
                <div key={p.id} style={{ background: '#E8E8E4', border: `0.5px solid ${hayBloqueo ? '#FF9057' : 'rgba(13,13,13,0.15)'}`, borderRadius: 12, padding: '1.25rem', position: 'relative' }}>
                  {hayBloqueo && (
                    <div style={{ position: 'absolute', top: 12, right: 12, background: '#FF9057', color: '#fff', fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 20, letterSpacing: '0.05em' }}>BLOQUEO</div>
                  )}
                  <div style={{ fontSize: 15, fontWeight: 500, color: '#0D0D0D', marginBottom: 14, paddingRight: hayBloqueo ? 70 : 0 }}>{p.nombre}</div>
                  <div style={{ marginBottom: 12 }}>
                    <div style={{ fontSize: 11, fontWeight: 500, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#888888', marginBottom: 8 }}>Tareas</div>
                    {tareasTotal === 0 ? (
                      <div style={{ fontSize: 12, color: '#888888' }}>Sin tareas asignadas</div>
                    ) : (
                      <>
                        {(puestoExpandido === p.id ? d.tareas : d.tareas.slice(0, 3)).map(t => {
                          const direccion = direccionTarea(t, p.id, puestos);
                          return (
                          <div key={t.id} style={{ marginBottom: 8 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <div style={{ width: 8, height: 8, borderRadius: '50%', flexShrink: 0, background: estadoColor(t.estado) }} />
                              <div style={{ fontSize: 12, color: '#0D0D0D', flex: 1, lineHeight: 1.4 }}>{t.titulo || t.descripcion}</div>
                              <div style={{ fontSize: 10, color: '#555555', flexShrink: 0 }}>{estadoTexto(t.estado)}</div>
                            </div>
                            {direccion && <div style={{ fontSize: 10, color: '#1565C0', marginLeft: 16, marginTop: 2 }}>{direccion}</div>}
                            {(t.fecha_vencimiento || t.created_at || t.fecha_inicio) && (
                              <div style={{ fontSize: 10, color: '#888888', marginLeft: 16, marginTop: 2 }}>
                                {t.created_at && `Requerida ${formatFecha(t.created_at)}`}
                                {t.created_at && (t.fecha_inicio || t.fecha_vencimiento) && ' · '}
                                {t.fecha_inicio && `Inicio ${formatFecha(t.fecha_inicio)}`}
                                {t.fecha_inicio && t.fecha_vencimiento && ' · '}
                                {t.fecha_vencimiento && (
                                  <span style={{ color: esVencida(t) ? '#E53935' : '#888888', fontWeight: esVencida(t) ? 600 : 400 }}>
                                    Vence {formatFecha(t.fecha_vencimiento)}
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                          );
                        })}
                        {tareasTotal > 3 && (
                          <button
                            onClick={() => setPuestoExpandido(puestoExpandido === p.id ? null : p.id)}
                            style={{ fontSize: 11, color: '#1565C0', marginTop: 2, background: 'none', border: 'none', padding: 0, cursor: 'pointer', textDecoration: 'underline' }}
                          >
                            {puestoExpandido === p.id ? 'Ver menos' : `+${tareasTotal - 3} mas`}
                          </button>
                        )}
                      </>
                    )}
                  </div>
                  <div style={{ borderTop: `0.5px solid rgba(13,13,13,0.15)`, paddingTop: 10 }}>
                    <div style={{ fontSize: 11, fontWeight: 500, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#888888', marginBottom: 4 }}>Ultima actividad</div>
                    {ultimaConv ? (
                      <div style={{ fontSize: 12, color: '#555555' }}>
                        {new Date(ultimaConv.updated_at || ultimaConv.created_at).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </div>
                    ) : (
                      <div style={{ fontSize: 12, color: '#888888' }}>Sin conversaciones</div>
                    )}
                  </div>
                  <div style={{ marginTop: 12, background: '#C8C8C4', borderRadius: 8, padding: '8px 10px', fontSize: 12, color: '#555555' }}>
                    {tareasActivas > 0 ? `${tareasActivas} tarea${tareasActivas !== 1 ? 's' : ''} activa${tareasActivas !== 1 ? 's' : ''}` : 'Sin tareas activas'}
                    {' · '}
                    {d.conversaciones.length} conversacion{d.conversaciones.length !== 1 ? 'es' : ''}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

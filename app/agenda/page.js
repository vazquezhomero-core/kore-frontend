'use client';
import { useState, useEffect } from 'react';

const BACKEND = process.env.NEXT_PUBLIC_API_URL || 'https://core-backend-production-9f3f.up.railway.app';
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

export default function Agenda() {
  const [eventos, setEventos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [mes, setMes] = useState(new Date());
  const [acceso, setAcceso] = useState('verificando'); // verificando | permitido | sin-sesion
  const [puestoNombre, setPuestoNombre] = useState('');
  const [eventoABorrar, setEventoABorrar] = useState(null);
  const [borrando, setBorrando] = useState(false);

  useEffect(() => {
    const sesion = leerSesion();
    if (!sesion?.token || !sesion?.puestoId) { setAcceso('sin-sesion'); setLoading(false); return; }
    setPuestoNombre(sesion.puestoNombre || '');
    setAcceso('permitido');
    cargarEventos(sesion.puestoId);
  }, []);

  const cargarEventos = async (pid) => {
    try {
      const res = await authFetch(BACKEND+'/puestos/'+pid+'/eventos');
      const data = await res.json();
      setEventos(Array.isArray(data) ? data : []);
    } catch(e) { console.error(e); }
    finally { setLoading(false); }
  };

  const confirmarBorrado = async () => {
    if (!eventoABorrar) return;
    setBorrando(true);
    try {
      await authFetch(BACKEND+'/eventos/'+eventoABorrar.id, { method: 'DELETE' });
      setEventos(prev => prev.filter(e => e.id !== eventoABorrar.id));
      setEventoABorrar(null);
    } catch(e) { console.error(e); }
    finally { setBorrando(false); }
  };

  const year = mes.getFullYear();
  const month = mes.getMonth();
  const primer = new Date(year, month, 1).getDay();
  const total = new Date(year, month+1, 0).getDate();
  const nombreMes = mes.toLocaleString('es-AR', { month: 'long', year: 'numeric' });

  const eventosDia = (dia) => {
    const f = year+'-'+String(month+1).padStart(2,'0')+'-'+String(dia).padStart(2,'0');
    return eventos.filter(e => e.fecha === f);
  };

  const colorTipo = (t) => t==='reunion'?'#57C8FF':t==='recordatorio'?'#C8FF57':t==='vencimiento'?'#FF9057':'#888888';
  const hoy = new Date();

  // --- Pantallas de acceso ---

  if (acceso === 'verificando') {
    return (
      <div style={{ minHeight: '100vh', background: '#C8C8C4', color: '#0D0D0D', fontFamily: 'system-ui,sans-serif' }}>
        <div style={{ background: '#0D0D0D', padding: '0 24px', display: 'flex', alignItems: 'center', minHeight: 52 }}>
          <span style={{ fontSize: 13, color: '#888888', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Agenda</span>
        </div>
        <div style={{ textAlign: 'center', color: '#888888', fontSize: 14, marginTop: '4rem' }}>Verificando acceso...</div>
      </div>
    );
  }

  if (acceso === 'sin-sesion') {
    return (
      <div style={{ minHeight: '100vh', background: '#C8C8C4', color: '#0D0D0D', fontFamily: 'system-ui,sans-serif' }}>
        <div style={{ background: '#0D0D0D', padding: '0 24px', display: 'flex', alignItems: 'center', minHeight: 52 }}>
          <span style={{ fontSize: 13, color: '#888888', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Agenda</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '4rem 1.5rem' }}>
          <div style={{ background: '#E8E8E4', border: `0.5px solid rgba(13,13,13,0.15)`, borderRadius: 16, padding: '2rem', maxWidth: 400, width: '100%', textAlign: 'center' }}>
            <div style={{ fontSize: 11, fontWeight: 500, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#888888', marginBottom: 10 }}>Acceso restringido</div>
            <h2 style={{ fontSize: 18, fontWeight: 400, color: '#0D0D0D', marginBottom: 10 }}>Necesitas iniciar sesion</h2>
            <p style={{ fontSize: 13, color: '#555555', lineHeight: 1.6, marginBottom: 22 }}>Ingresa con la clave de tu puesto para ver la agenda.</p>
            <a href="/" style={{ display: 'inline-block', padding: '11px 22px', background: '#0D0D0D', color: '#C8FF57', borderRadius: 10, fontSize: 14, fontWeight: 500, textDecoration: 'none' }}>Volver al inicio</a>
          </div>
        </div>
      </div>
    );
  }

  // --- Agenda ---

  return (
    <div style={{ minHeight: '100vh', background: '#C8C8C4', color: '#0D0D0D', fontFamily: 'system-ui,sans-serif' }}>

      {/* Header */}
      <div style={{ background: '#0D0D0D', borderBottom: `0.5px solid rgba(13,13,13,0.3)`, padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', minHeight: 52 }}>
        <a href="/" style={{ color: '#F0EDE6', textDecoration: 'none', fontSize: 13 }}>← Volver al chat</a>
        <span style={{ fontSize: 13, color: '#888888', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Agenda{puestoNombre ? ' · ' + puestoNombre : ''}</span>
        <span style={{ fontSize: 12, color: '#888888' }}>Los eventos se crean desde el chat</span>
      </div>

      <div style={{ maxWidth: 900, margin: '0 auto', padding: '32px 24px' }}>

        {/* Navegacion mes */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <button onClick={() => setMes(new Date(year, month-1, 1))} style={{ background: '#E8E8E4', border: `0.5px solid rgba(13,13,13,0.15)`, color: '#0D0D0D', padding: '6px 14px', borderRadius: 6, cursor: 'pointer', fontSize: 14 }}>←</button>
          <span style={{ fontSize: 16, fontWeight: 300, letterSpacing: '0.1em', textTransform: 'capitalize', color: '#0D0D0D' }}>{nombreMes}</span>
          <button onClick={() => setMes(new Date(year, month+1, 1))} style={{ background: '#E8E8E4', border: `0.5px solid rgba(13,13,13,0.15)`, color: '#0D0D0D', padding: '6px 14px', borderRadius: 6, cursor: 'pointer', fontSize: 14 }}>→</button>
        </div>

        {/* Grilla calendario */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 4, marginBottom: 32 }}>
          {['Dom','Lun','Mar','Mie','Jue','Vie','Sab'].map(d => (
            <div key={d} style={{ textAlign: 'center', fontSize: 11, color: '#888888', padding: '8px 0' }}>{d}</div>
          ))}
          {Array.from({ length: primer }).map((_,i) => (<div key={'e'+i} />))}
          {Array.from({ length: total }).map((_,i) => {
            const dia = i+1;
            const ev = eventosDia(dia);
            const esHoy = hoy.getDate()===dia && hoy.getMonth()===month && hoy.getFullYear()===year;
            return (
              <div key={dia} style={{ minHeight: 70, background: esHoy ? '#D8D8D4' : '#E8E8E4', border: esHoy ? `1.5px solid #C8FF57` : `0.5px solid rgba(13,13,13,0.15)`, borderRadius: 6, padding: '6px 8px' }}>
                <div style={{ fontSize: 12, color: esHoy ? '#0D0D0D' : '#888888', fontWeight: esHoy ? 600 : 400, marginBottom: 4 }}>{dia}</div>
                {ev.map(e => (
                  <div key={e.id} onClick={() => setEventoABorrar(e)} title={e.titulo + ' — clic para eliminar'}
                    style={{ fontSize: 10, background: colorTipo(e.tipo)+'33', border: `0.5px solid ${colorTipo(e.tipo)}66`, color: colorTipo(e.tipo) === '#C8FF57' ? '#5A7000' : colorTipo(e.tipo), borderRadius: 3, padding: '2px 4px', marginBottom: 2, cursor: 'pointer', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
                    {e.titulo}
                  </div>
                ))}
              </div>
            );
          })}
        </div>

        {/* Proximos eventos */}
        <div style={{ borderTop: `0.5px solid rgba(13,13,13,0.15)`, paddingTop: 24 }}>
          <div style={{ fontSize: 11, color: '#888888', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 16 }}>Proximos eventos</div>
          {loading ? (
            <div style={{ color: '#888888', fontSize: 13 }}>Cargando...</div>
          ) : eventos.length === 0 ? (
            <div style={{ color: '#888888', fontSize: 13 }}>No hay eventos. Crealos desde el chat.</div>
          ) : (
            eventos
              .filter(e => e.fecha >= new Date().toISOString().split('T')[0])
              .sort((a,b) => a.fecha.localeCompare(b.fecha))
              .map(e => (
                <div key={e.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0', borderBottom: `0.5px solid rgba(13,13,13,0.15)` }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 3, height: 36, background: colorTipo(e.tipo), borderRadius: 2 }} />
                    <div>
                      <div style={{ fontSize: 14, color: '#0D0D0D' }}>{e.titulo}</div>
                      <div style={{ fontSize: 12, color: '#555555', marginTop: 2 }}>{e.fecha}{e.hora_inicio ? ' · '+e.hora_inicio : ''}{e.descripcion ? ' · '+e.descripcion : ''}</div>
                    </div>
                  </div>
                  <button onClick={() => setEventoABorrar(e)} title="Eliminar evento" style={{ background: 'none', border: 'none', color: '#888888', cursor: 'pointer', fontSize: 16 }}>×</button>
                </div>
              ))
          )}
        </div>

        {/* Leyenda */}
        <div style={{ display: 'flex', gap: 20, marginTop: 24 }}>
          {[['reunion','#57C8FF'],['recordatorio','#C8FF57'],['vencimiento','#FF9057']].map(([tipo,color]) => (
            <div key={tipo} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: color }} />
              <span style={{ fontSize: 11, color: '#555555', textTransform: 'capitalize' }}>{tipo}</span>
            </div>
          ))}
        </div>

      </div>

      {/* Confirmacion de borrado */}
      {eventoABorrar && (
        <>
          <div onClick={() => !borrando && setEventoABorrar(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', zIndex: 199 }} />
          <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', background: '#E8E8E4', border: `0.5px solid rgba(13,13,13,0.15)`, borderRadius: 14, padding: '1.5rem', width: 'calc(100% - 3rem)', maxWidth: 380, zIndex: 200, boxShadow: '0 12px 32px rgba(0,0,0,0.25)' }}>
            <div style={{ fontSize: 11, fontWeight: 500, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#888888', marginBottom: 10 }}>Eliminar evento</div>
            <div style={{ fontSize: 15, color: '#0D0D0D', marginBottom: 6, lineHeight: 1.4 }}>{eventoABorrar.titulo}</div>
            <div style={{ fontSize: 13, color: '#555555', marginBottom: 20 }}>
              {eventoABorrar.fecha}{eventoABorrar.hora_inicio ? ' · ' + eventoABorrar.hora_inicio : ''}
            </div>
            <p style={{ fontSize: 13, color: '#555555', lineHeight: 1.6, marginBottom: 20 }}>Esta accion no se puede deshacer.</p>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => setEventoABorrar(null)} disabled={borrando}
                style={{ flex: 1, padding: '10px 0', borderRadius: 10, border: `0.5px solid rgba(13,13,13,0.15)`, background: '#C8C8C4', color: '#555555', fontSize: 14, cursor: borrando ? 'default' : 'pointer' }}>
                Cancelar
              </button>
              <button onClick={confirmarBorrado} disabled={borrando}
                style={{ flex: 1, padding: '10px 0', borderRadius: 10, border: 'none', background: borrando ? '#D0D0CC' : '#C62828', color: borrando ? '#888888' : '#FFFFFF', fontSize: 14, fontWeight: 500, cursor: borrando ? 'default' : 'pointer' }}>
                {borrando ? 'Eliminando...' : 'Eliminar'}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

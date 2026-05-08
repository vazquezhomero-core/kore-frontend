'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';

const API = process.env.NEXT_PUBLIC_API_URL || 'https://core-backend-production-9f3f.up.railway.app';

export default function PanelGestion() {
  const [empresas, setEmpresas] = useState([]);
  const [empresaId, setEmpresaId] = useState('');
  const [empresaNombre, setEmpresaNombre] = useState('');
  const [puestos, setPuestos] = useState([]);
  const [detalle, setDetalle] = useState({}); // { puesto_id: { tareas, conversaciones } }
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');

  // Cargar empresas al inicio
  useEffect(() => {
    fetch(`${API}/empresas`)
      .then(r => r.json())
      .then(data => setEmpresas(Array.isArray(data) ? data : []))
      .catch(() => setError('No se pudo conectar con el servidor.'));
  }, []);

  // Cargar puestos al elegir empresa
  useEffect(() => {
    if (!empresaId) return;
    setCargando(true);
    setPuestos([]);
    setDetalle({});
    fetch(`${API}/empresas/${empresaId}/puestos`)
      .then(r => r.json())
      .then(async (data) => {
        const lista = Array.isArray(data) ? data : [];
        setPuestos(lista);
        // Cargar tareas y conversaciones de cada puesto en paralelo
        const detalles = {};
        await Promise.all(lista.map(async (p) => {
          const [tareas, convs] = await Promise.all([
            fetch(`${API}/puestos/${p.id}/tareas`).then(r => r.json()).catch(() => []),
            fetch(`${API}/puestos/${p.id}/conversaciones`).then(r => r.json()).catch(() => []),
          ]);
          detalles[p.id] = {
            tareas: Array.isArray(tareas) ? tareas : [],
            conversaciones: Array.isArray(convs) ? convs : [],
          };
        }));
        setDetalle(detalles);
      })
      .catch(() => setError('Error al cargar puestos.'))
      .finally(() => setCargando(false));
  }, [empresaId]);

  function elegirEmpresa(id, nombre) {
    setEmpresaId(id);
    setEmpresaNombre(nombre);
    setError('');
  }

  function estadoColor(estado) {
    const map = {
      pendiente: '#E0E0DA',
      en_progreso: '#C8FF57',
      bloqueada: '#FF9057',
      completada: '#57C8FF',
    };
    return map[estado] || '#E0E0DA';
  }

  function estadoTexto(estado) {
    const map = {
      pendiente: 'Pendiente',
      en_progreso: 'En progreso',
      bloqueada: 'Bloqueada',
      completada: 'Completada',
    };
    return map[estado] || estado;
  }

  return (
    <div style={{ minHeight: '100vh', background: '#F5F5F0' }}>

      {/* Header */}
      <div style={{
        background: '#0D0D0D', color: '#F0EDE6',
        padding: '14px 24px', display: 'flex',
        alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {/* Logo */}
          <div style={{ position: 'relative', width: 28, height: 28, flexShrink: 0 }}>
            <div style={{ position: 'absolute', top: 0, left: 0, width: 17, height: 17, border: '1.5px solid #F0EDE6', borderRadius: 2 }} />
            <div style={{ position: 'absolute', bottom: 0, right: 0, width: 17, height: 17, background: '#C8FF57', borderRadius: 2 }} />
          </div>
          <span style={{ fontSize: 16, fontWeight: 300, letterSpacing: '0.16em' }}>KORE</span>
          <span style={{ fontSize: 12, color: '#555', marginLeft: 4 }}>Panel de gestión</span>
        </div>
        <Link href="/" style={{
          fontSize: 12, color: '#888', textDecoration: 'none',
          border: '0.5px solid #333', borderRadius: 8,
          padding: '5px 12px', transition: 'color 0.15s'
        }}>
          ← Vista empleado
        </Link>
      </div>

      {/* Contenido */}
      <div style={{ padding: '2rem 1.5rem', maxWidth: 900, margin: '0 auto' }}>

        {error && (
          <div style={{ background: '#FFF0F0', border: '0.5px solid #FFCCCC', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#C00', marginBottom: 16 }}>
            {error}
          </div>
        )}

        {/* Selector de empresa */}
        {!empresaId ? (
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 500, color: '#0D0D0D', marginBottom: 6 }}>Seleccioná la empresa</h2>
            <p style={{ fontSize: 13, color: '#888', marginBottom: 20 }}>Para ver el estado de todos los puestos.</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxWidth: 400 }}>
              {empresas.map(emp => (
                <button key={emp.id} onClick={() => elegirEmpresa(emp.id, emp.nombre)}
                  style={{
                    textAlign: 'left', padding: '12px 16px',
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
            </div>
          </div>
        ) : (
          <>
            {/* Empresa seleccionada — encabezado */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
              <div>
                <h2 style={{ fontSize: 18, fontWeight: 500, color: '#0D0D0D', marginBottom: 2 }}>{empresaNombre}</h2>
                <p style={{ fontSize: 13, color: '#888' }}>{puestos.length} puesto{puestos.length !== 1 ? 's' : ''} · Estado en tiempo real</p>
              </div>
              <button onClick={() => { setEmpresaId(''); setEmpresaNombre(''); }}
                style={{ fontSize: 12, color: '#888', background: 'none', border: '0.5px solid #E0E0DA', borderRadius: 8, padding: '5px 12px', cursor: 'pointer' }}>
                Cambiar empresa
              </button>
            </div>

            {cargando ? (
              <div style={{ textAlign: 'center', color: '#aaa', fontSize: 14, marginTop: '3rem' }}>Cargando puestos...</div>
            ) : puestos.length === 0 ? (
              <div style={{ textAlign: 'center', color: '#aaa', fontSize: 14, marginTop: '3rem' }}>No hay puestos cargados para esta empresa.</div>
            ) : (
              <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}>
                {puestos.map(p => {
                  const d = detalle[p.id] || { tareas: [], conversaciones: [] };
                  const tareasPendientes = d.tareas.filter(t => t.estado === 'pendiente' || t.estado === 'en_progreso').length;
                  const tareasTotal = d.tareas.length;
                  const ultimaConv = d.conversaciones[0];
                  const hayBloqueo = d.tareas.some(t => t.estado === 'bloqueada');

                  return (
                    <div key={p.id} style={{
                      background: '#fff',
                      border: `0.5px solid ${hayBloqueo ? '#FF9057' : '#E0E0DA'}`,
                      borderRadius: 12, padding: '1.25rem',
                      position: 'relative'
                    }}>
                      {/* Badge bloqueo */}
                      {hayBloqueo && (
                        <div style={{
                          position: 'absolute', top: 12, right: 12,
                          background: '#FF9057', color: '#fff',
                          fontSize: 10, fontWeight: 600, padding: '2px 8px',
                          borderRadius: 20, letterSpacing: '0.05em'
                        }}>BLOQUEO</div>
                      )}

                      {/* Nombre del puesto */}
                      <div style={{ fontSize: 15, fontWeight: 500, color: '#0D0D0D', marginBottom: 4, paddingRight: hayBloqueo ? 70 : 0 }}>
                        {p.nombre}
                      </div>
                      {p.descripcion_rol && (
                        <div style={{ fontSize: 12, color: '#888', marginBottom: 14 }}>{p.descripcion_rol}</div>
                      )}

                      {/* Tareas */}
                      <div style={{ marginBottom: 12 }}>
                        <div style={{ fontSize: 11, fontWeight: 500, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#aaa', marginBottom: 8 }}>
                          Tareas
                        </div>
                        {tareasTotal === 0 ? (
                          <div style={{ fontSize: 12, color: '#ccc' }}>Sin tareas asignadas</div>
                        ) : (
                          <>
                            {d.tareas.slice(0, 3).map(t => (
                              <div key={t.id} style={{
                                display: 'flex', alignItems: 'center', gap: 8,
                                marginBottom: 6
                              }}>
                                <div style={{
                                  width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
                                  background: estadoColor(t.estado)
                                }} />
                                <div style={{ fontSize: 12, color: '#0D0D0D', flex: 1, lineHeight: 1.4 }}>{t.titulo || t.descripcion}</div>
                                <div style={{ fontSize: 10, color: '#aaa', flexShrink: 0 }}>{estadoTexto(t.estado)}</div>
                              </div>
                            ))}
                            {tareasTotal > 3 && (
                              <div style={{ fontSize: 11, color: '#aaa', marginTop: 4 }}>+{tareasTotal - 3} más</div>
                            )}
                          </>
                        )}
                      </div>

                      {/* Última actividad */}
                      <div style={{ borderTop: '0.5px solid #F0F0EA', paddingTop: 10 }}>
                        <div style={{ fontSize: 11, fontWeight: 500, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#aaa', marginBottom: 4 }}>
                          Última actividad
                        </div>
                        {ultimaConv ? (
                          <div style={{ fontSize: 12, color: '#888' }}>
                            {new Date(ultimaConv.created_at || ultimaConv.updated_at).toLocaleDateString('es-AR', {
                              day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
                            })}
                          </div>
                        ) : (
                          <div style={{ fontSize: 12, color: '#ccc' }}>Sin conversaciones</div>
                        )}
                      </div>

                      {/* Resumen */}
                      <div style={{
                        marginTop: 12, background: '#F5F5F0',
                        borderRadius: 8, padding: '8px 10px',
                        fontSize: 12, color: '#555'
                      }}>
                        {tareasPendientes > 0
                          ? `${tareasPendientes} tarea${tareasPendientes !== 1 ? 's' : ''} activa${tareasPendientes !== 1 ? 's' : ''}`
                          : 'Sin tareas activas'}
                        {' · '}
                        {d.conversaciones.length} conversaci{d.conversaciones.length !== 1 ? 'ones' : 'ón'}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';

const API = process.env.NEXT_PUBLIC_API_URL || 'https://core-backend-production-9f3f.up.railway.app';

const ESTADO_CONFIG = {
  pendiente:     { label: 'Pendiente',   color: '#B8860B', bg: '#E0E0DA' },
  'en progreso': { label: 'En progreso', color: '#1565C0', bg: '#C8FF57' },
  bloqueada:     { label: 'Bloqueada',   color: '#C62828', bg: '#FF9057' },
  completada:    { label: 'Completada',  color: '#2E7D32', bg: '#57C8FF' },
};

function estadoColor(estado) {
  return ESTADO_CONFIG[estado]?.bg || '#E0E0DA';
}

function estadoTexto(estado) {
  return ESTADO_CONFIG[estado]?.label || estado;
}

export default function PanelGestion() {
  const [empresas, setEmpresas] = useState([]);
  const [empresaId, setEmpresaId] = useState('');
  const [empresaNombre, setEmpresaNombre] = useState('');
  const [puestos, setPuestos] = useState([]);
  const [detalle, setDetalle] = useState({});
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');
  const [tareasDashboard, setTareasDashboard] = useState([]);

  useEffect(() => {
    fetch(`${API}/empresas`)
      .then(r => r.json())
      .then(data => setEmpresas(Array.isArray(data) ? data : []))
      .catch(() => setError('No se pudo conectar con el servidor.'));
  }, []);

  useEffect(() => {
    if (!empresaId) return;
    setCargando(true);
    setPuestos([]);
    setDetalle({});
    setTareasDashboard([]);

    fetch(`${API}/empresas/${empresaId}/tareas`)
      .then(r => r.json())
      .then(data => setTareasDashboard(Array.isArray(data) ? data : []))
      .catch(() => {});

    fetch(`${API}/empresas/${empresaId}/puestos`)
      .then(r => r.json())
      .then(async (data) => {
        const lista = Array.isArray(data) ? data : [];
        setPuestos(lista);
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

  // Calculos dashboard
  const totalPendiente  = tareasDashboard.filter(t => t.estado === 'pendiente').length;
  const totalEnProgreso = tareasDashboard.filter(t => t.estado === 'en progreso').length;
  const totalBloqueada  = tareasDashboard.filter(t => t.estado === 'bloqueada').length;
  const totalCompletada = tareasDashboard.filter(t => t.estado === 'completada').length;

  const hoy = new Date();
  const totalVencidas = tareasDashboard.filter(t =>
    t.fecha_vencimiento &&
    new Date(t.fecha_vencimiento) < hoy &&
    t.estado !== 'completada'
  ).length;

  // Tareas por puesto
  const tareasPorPuesto = puestos.map(p => {
    const tp = tareasDashboard.filter(t => t.puesto_destino_id === p.id);
    return {
      nombre: p.nombre,
      pendiente:    tp.filter(t => t.estado === 'pendiente').length,
      enProgreso:   tp.filter(t => t.estado === 'en progreso').length,
      bloqueada:    tp.filter(t => t.estado === 'bloqueada').length,
      completada:   tp.filter(t => t.estado === 'completada').length,
      total:        tp.length,
    };
  }).filter(p => p.total > 0);

  return (
    <div style={{ minHeight: '100vh', background: '#F5F5F0' }}>

      {/* Header */}
      <div style={{
        background: '#0D0D0D', color: '#F0EDE6',
        padding: '14px 24px', display: 'flex',
        alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ position: 'relative', width: 28, height: 28, flexShrink: 0 }}>
            <div style={{ position: 'absolute', top: 0, left: 0, width: 17, height: 17, border: '1.5px solid #F0EDE6', borderRadius: 2 }} />
            <div style={{ position: 'absolute', bottom: 0, right: 0, width: 17, height: 17, background: '#C8FF57', borderRadius: 2 }} />
          </div>
          <span style={{ fontSize: 16, fontWeight: 300, letterSpacing: '0.16em' }}>KORE</span>
          <span style={{ fontSize: 12, color: '#555', marginLeft: 4 }}>Panel de gestion</span>
        </div>
        <Link href="/" style={{
          fontSize: 12, color: '#888', textDecoration: 'none',
          border: '0.5px solid #333', borderRadius: 8,
          padding: '5px 12px',
        }}>
          Vista empleado
        </Link>
      </div>

      {/* Contenido */}
      <div style={{ padding: '2rem 1.5rem', maxWidth: 900, margin: '0 auto' }}>

        {error && (
          <div style={{ background: '#FFF0F0', border: '0.5px solid #FFCCCC', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#C00', marginBottom: 16 }}>
            {error}
          </div>
        )}

        {!empresaId ? (
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 500, color: '#0D0D0D', marginBottom: 6 }}>Selecciona la empresa</h2>
            <p style={{ fontSize: 13, color: '#888', marginBottom: 20 }}>Para ver el estado de todos los puestos.</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxWidth: 400 }}>
              {empresas.map(emp => (
                <button key={emp.id} onClick={() => elegirEmpresa(emp.id, emp.nombre)}
                  style={{
                    textAlign: 'left', padding: '12px 16px',
                    border: '0.5px solid #E0E0DA', borderRadius: 10,
                    background: '#fff', cursor: 'pointer', fontSize: 14,
                    color: '#0D0D0D',
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
            {/* Header empresa */}
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

            {/* Dashboard */}
            {empresaId && (
              <div style={{ marginBottom: '2rem' }}>
                <div style={{ fontSize: 11, fontWeight: 500, letterSpacing: '0.07em', textTransform: 'uppercase', color: '#aaa', marginBottom: 12 }}>
                  Dashboard de tareas
                </div>

                {/* Tarjetas de estado */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 10, marginBottom: 16 }}>
                  {[
                    { label: 'Pendientes',   value: totalPendiente,  color: '#B8860B', bg: '#FFFBEA' },
                    { label: 'En progreso',  value: totalEnProgreso, color: '#1565C0', bg: '#EBF3FF' },
                    { label: 'Bloqueadas',   value: totalBloqueada,  color: '#C62828', bg: '#FFF0F0' },
                    { label: 'Completadas',  value: totalCompletada, color: '#2E7D32', bg: '#F0FFF4' },
                    { label: 'Vencidas',     value: totalVencidas,   color: '#FF6B00', bg: '#FFF5EE' },
                  ].map(card => (
                    <div key={card.label} style={{
                      background: card.bg,
                      border: `0.5px solid ${card.color}33`,
                      borderRadius: 10, padding: '14px 16px',
                    }}>
                      <div style={{ fontSize: 24, fontWeight: 300, color: card.color, lineHeight: 1 }}>{card.value}</div>
                      <div style={{ fontSize: 11, color: card.color, marginTop: 4, letterSpacing: '0.04em' }}>{card.label}</div>
                    </div>
                  ))}
                </div>

                {/* Tareas por puesto */}
                {tareasPorPuesto.length > 0 && (
                  <div style={{ background: '#fff', border: '0.5px solid #E0E0DA', borderRadius: 10, overflow: 'hidden' }}>
                    <div style={{ padding: '12px 16px', borderBottom: '0.5px solid #F0F0EA', fontSize: 12, fontWeight: 500, color: '#555' }}>
                      Tareas por puesto
                    </div>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                      <thead>
                        <tr style={{ background: '#F9F9F7' }}>
                          <th style={{ textAlign: 'left', padding: '8px 16px', color: '#aaa', fontWeight: 500 }}></th>
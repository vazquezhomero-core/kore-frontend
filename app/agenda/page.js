'use client';
import { useState, useEffect } from 'react';

const BACKEND = 'https://core-backend-production-9f3f.up.railway.app';

export default function Agenda() {
  const [puestoId, setPuestoId] = useState(null);
  const [empleadoId, setEmpleadoId] = useState(null);
  const [eventos, setEventos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [mes, setMes] = useState(new Date());

  useEffect(() => {
    const pid = localStorage.getItem('kore_puesto_id');
    const eid = localStorage.getItem('kore_empleado_id');
    setPuestoId(pid);
    setEmpleadoId(eid);
    if (pid) cargarEventos(pid);
  }, []);

  const cargarEventos = async (pid) => {
    try {
      const res = await fetch(`${BACKEND}/puestos/${pid}/eventos`);
      const data = await res.json();
      setEventos(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const eliminarEvento = async (id) => {
    await fetch(`${BACKEND}/eventos/${id}`, { method: 'DELETE' });
    setEventos(prev => prev.filter(e => e.id !== id));
  };

  // Días del mes actual
  const diasEnMes = () => {
    const year = mes.getFullYear();
    const month = mes.getMonth();
    const primer = new Date(year, month, 1).getDay();
    const total = new Date(year, month + 1, 0).getDate();
    return { primer, total };
  };

  const { primer, total } = diasEnMes();
  const nombreMes = mes.toLocaleString('es-AR', { month: 'long', year: 'numeric' });

  const eventosDia = (dia) => {
    const fecha = `${mes.getF
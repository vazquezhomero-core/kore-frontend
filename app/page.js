'use client';

import { useState } from 'react';

const BACKEND = 'https://core-backend-production-9f3f.up.railway.app';
const PUESTO_ID = '80e383d4-2ea0-4186-ad75-132d21b766cd';
const EMPLEADO_ID = '86ddeeb4-6348-444e-af75-a4bb0aa75f7b';

export default function Home() {
  const [mensajes, setMensajes] = useState([]);
  const [input, setInput] = useState('');
  const [cargando, setCargando] = useState(false);

  async function enviar() {
    if (!input.trim()) return;
    const texto = input;
    setInput('');
    setMensajes(prev => [...prev, { rol: 'usuario', texto }]);
    setCargando(true);
    try {
      const res = await fetch(`${BACKEND}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ puesto_id: PUESTO_ID, empleado_id: EMPLEADO_ID, mensaje: texto }),
      });
      const data = await res.json();
      setMensajes(prev => [...prev, { rol: 'claude', texto: data.respuesta }]);
    } catch {
      setMensajes(prev => [...prev, { rol: 'claude', texto: 'Error al conectar con el servidor.' }]);
    }
    setCargando(false);
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col">
      <header className="border-b border-zinc-800 px-6 py-4">
        <p className="text-xs text-zinc-500 uppercase tracking-widest">KORE Manager</p>
        <h1 className="text-lg font-medium">Gerente General — Maria Barcena</h1>
      </header>
      <div className="flex-1 overflow-y-auto px-6 py-6 flex flex-col gap-4">
        {mensajes.length === 0 && (
          <p className="text-zinc-600 text-sm">Escribí tu primer mensaje para empezar.</p>
        )}
        {mensajes.map((m, i) => (
          <div key={i} className={`max-w-2xl px-4 py-3 rounded-lg text-sm leading-relaxed whitespace-pre-wrap ${m.rol === 'usuario' ? 'bg-zinc-800 self-end' : 'bg-zinc-900 self-start border border-zinc-800'}`}>
            {m.texto}
          </div>
        ))}
        {cargando && <div className="text-zinc-600 text-sm self-start">Claude está pensando...</div>}
      </div>
      <div className="border-t border-zinc-800 px-6 py-4 flex gap-3">
        <input
          className="flex-1 bg-zinc-900 border border-zinc-700 rounded-lg px-4 py-2 text-sm outline-none focus:border-zinc-500"
          placeholder="Escribí tu mensaje..."
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && !e.shiftKey && enviar()}
        />
        <button
          onClick={enviar}
          disabled={cargando}
          className="bg-zinc-100 text-zinc-900 px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-40"
        >
          Enviar
        </button>
      </div>
    </div>
  );
}
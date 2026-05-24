'use client';
import { useState, useEffect } from 'react';

const BACKEND = 'https://core-backend-production-9f3f.up.railway.app';

export default function Agenda() {
  const [eventos, setEventos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [mes, setMes] = useState(new Date());

  useEffect(() => {
    const pid = localStorage.getItem('kore_puesto_id');
    if (pid) cargarEventos(pid);
    else setLoading(false);
  }, []);

  const cargarEventos = async (pid) => {
    try {
      const res = await fetch(BACKEND+'/puestos/'+pid+'/eventos');
      const data = await res.json();
      setEventos(data);
    } catch(e) { console.error(e); }
    finally { setLoading(false); }
  };

  const eliminarEvento = async (id) => {
    await fetch(BACKEND+'/eventos/'+id, { method: 'DELETE' });
    setEventos(prev => prev.filter(e => e.id !== id));
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

  const colorTipo = (t) => t==='reunion'?'#57C8FF':t==='recordatorio'?'#C8FF57':t==='vencimiento'?'#FF9057':'#888';
  const hoy = new Date();

  return (
    <div style={{minHeight:'100vh',background:'#0D0D0D',color:'#F0EDE6',fontFamily:'system-ui,sans-serif'}}>
      <div style={{borderBottom:'1px solid #222',padding:'16px 24px',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
        <a href="/" style={{color:'#F0EDE6',textDecoration:'none',fontSize:13}}>← Volver al chat</a>
        <span style={{fontSize:13,color:'#555',textTransform:'uppercase',letterSpacing:'0.08em'}}>Agenda</span>
        <span style={{fontSize:12,color:'#555'}}>Los eventos se crean desde el chat</span>
      </div>
      <div style={{maxWidth:900,margin:'0 auto',padding:'32px 24px'}}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:24}}>
          <button onClick={()=>setMes(new Date(year,month-1,1))} style={{background:'none',border:'1px solid #333',color:'#F0EDE6',padding:'6px 14px',borderRadius:6,cursor:'pointer',fontSize:14}}>←</button>
          <span style={{fontSize:16,fontWeight:300,letterSpacing:'0.1em',textTransform:'capitalize'}}>{nombreMes}</span>
          <button onClick={()=>setMes(new Date(year,month+1,1))} style={{background:'none',border:'1px solid #333',color:'#F0EDE6',padding:'6px 14px',borderRadius:6,cursor:'pointer',fontSize:14}}>→</button>
        </div>
        <div style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)',gap:4,marginBottom:32}}>
          {['Dom','Lun','Mar','Mie','Jue','Vie','Sab'].map(d=>(<div key={d} style={{textAlign:'center',fontSize:11,color:'#555',padding:'8px 0'}}>{d}</div>))}
          {Array.from({length:primer}).map((_,i)=>(<div key={'e'+i}/>))}
          {Array.from({length:total}).map((_,i)=>{
            const dia=i+1;
            const ev=eventosDia(dia);
            const esHoy=hoy.getDate()===dia&&hoy.getMonth()===month&&hoy.getFullYear()===year;
            return(<div key={dia} style={{minHeight:70,background:esHoy?'#1a1a1a':'#111',border:esHoy?'1px solid #C8FF57':'1px solid #1e1e1e',borderRadius:6,padding:'6px 8px'}}>
              <div style={{fontSize:12,color:esHoy?'#C8FF57':'#555',marginBottom:4}}>{dia}</div>
              {ev.map(e=>(<div key={e.id} onClick={()=>eliminarEvento(e.id)} title={e.titulo} style={{fontSize:10,background:colorTipo(e.tipo)+'22',border:'1px solid '+colorTipo(e.tipo)+'44',color:colorTipo(e.tipo),borderRadius:3,padding:'2px 4px',marginBottom:2,cursor:'pointer',overflow:'hidden',whiteSpace:'nowrap',textOverflow:'ellipsis'}}>{e.titulo}</div>))}
            </div>);
          })}
        </div>
        <div style={{borderTop:'1px solid #222',paddingTop:24}}>
          <div style={{fontSize:11,color:'#555',letterSpacing:'0.08em',textTransform:'uppercase',marginBottom:16}}>Proximos eventos</div>
          {loading?(<div style={{color:'#555',fontSize:13}}>Cargando...</div>):eventos.length===0?(<div style={{color:'#555',fontSize:13}}>No hay eventos. Crealos desde el chat.</div>):(
            eventos.filter(e=>e.fecha>=new Date().toISOString().split('T')[0]).sort((a,b)=>a.fecha.localeCompare(b.fecha)).map(e=>(
              <div key={e.id} style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'12px 0',borderBottom:'1px solid #1a1a1a'}}>
                <div style={{display:'flex',alignItems:'center',gap:12}}>
                  <div style={{width:3,height:36,background:colorTipo(e.tipo),borderRadius:2}}/>
                  <div>
                    <div style={{fontSize:14,color:'#F0EDE6'}}>{e.titulo}</div>
                    <div style={{fontSize:12,color:'#555',marginTop:2}}>{e.fecha}{e.hora_inicio?' · '+e.hora_inicio:''}{e.descripcion?' · '+e.descripcion:''}</div>
                  </div>
                </div>
                <button onClick={()=>eliminarEvento(e.id)} style={{background:'none',border:'none',color:'#555',cursor:'pointer',fontSize:16}}>×</button>
              </div>
            ))
          )}
        </div>
        <div style={{display:'flex',gap:20,marginTop:24}}>
          {[['reunion','#57C8FF'],['recordatorio','#C8FF57'],['vencimiento','#FF9057']].map(([tipo,color])=>(
            <div key={tipo} style={{display:'flex',alignItems:'center',gap:6}}>
              <div style={{width:8,height:8,borderRadius:'50%',background:color}}/>
              <span style={{fontSize:11,color:'#555',textTransform:'capitalize'}}>{tipo}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

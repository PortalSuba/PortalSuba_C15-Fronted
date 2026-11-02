import { useEffect, useMemo, useState } from 'react';
import Chat from '../../components/Chat';
import { canales } from '../../services/chatApi';
import './ChatPartida.css';

const PESTANAS = [
  { id: 'equipo', texto: 'MI EQUIPO' },
  { id: 'partida', texto: 'GLOBAL' },
];

/**
 * Chat de la partida: uno solo del equipo y otro de toda la sala. Se queda montado aunque esté
 * cerrado para contar los mensajes sin leer.
 */
export default function ChatPartida({ matchId, equipoId, userId, abierto, onNoLeidos }) {
  const [pestana, setPestana] = useState('equipo');
  const [noLeidos, setNoLeidos] = useState({ equipo: 0, partida: 0 });

  const canalEquipo = useMemo(() => canales.equipo(matchId, equipoId), [matchId, equipoId]);
  const canalPartida = useMemo(() => canales.partida(matchId), [matchId]);

  // Lo que se está viendo ya está leído
  if (abierto && noLeidos[pestana] > 0) setNoLeidos({ ...noLeidos, [pestana]: 0 });

  useEffect(() => {
    onNoLeidos?.(noLeidos.equipo + noLeidos.partida);
  }, [noLeidos, onNoLeidos]);

  const contar = (id) => () => {
    if (!abierto || pestana !== id) setNoLeidos((n) => ({ ...n, [id]: n[id] + 1 }));
  };
  const visible = (id) => abierto && pestana === id;

  return (
    <aside className={`cp ${abierto ? '' : 'cp--cerrado'}`}>
      <div className="cp-tabs" role="tablist">
        {PESTANAS.map((p) => (
          <button key={p.id} role="tab" aria-selected={pestana === p.id}
                  className={pestana === p.id ? 'activa' : ''} onClick={() => setPestana(p.id)}>
            {p.texto}
            {noLeidos[p.id] > 0 && <span className="cp-badge">{noLeidos[p.id]}</span>}
          </button>
        ))}
      </div>
      <div className={`cp-canal ${pestana === 'equipo' ? '' : 'cp-canal--oculto'}`}>
        <Chat canal={canalEquipo} userId={userId} visible={visible('equipo')} onNuevo={contar('equipo')} />
      </div>
      <div className={`cp-canal ${pestana === 'partida' ? '' : 'cp-canal--oculto'}`}>
        <Chat canal={canalPartida} userId={userId} visible={visible('partida')} onNuevo={contar('partida')} />
      </div>
    </aside>
  );
}

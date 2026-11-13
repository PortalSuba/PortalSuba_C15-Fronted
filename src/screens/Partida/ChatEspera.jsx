import { useEffect, useRef, useState } from 'react';
import { historialChat, enviarMensajeChat, MAX_LONGITUD_MENSAJE } from '../../services/chatApi';
import { topics } from '../../config';
import { useSubscription } from '../../hooks/useSocket';
import { useNombres } from '../../hooks/useNombres';
import './ChatEspera.css';

const hora = (iso) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '' : `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

/** Agrega sin repetir: el mensaje propio llega por la respuesta del POST y también por STOMP. */
const agregar = (lista, m) => (lista.some((x) => x.id === m.id) ? lista : [...lista, m]);

/** Chat de la sala de espera. Solo se monta dentro de PanelEspera: al iniciar la partida desaparece. */
export default function ChatEspera({ salaId, userId }) {
  const [mensajes, setMensajes] = useState([]);
  const [texto, setTexto] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [aviso, setAviso] = useState(null);
  const listaRef = useRef(null);

  const nombreDe = useNombres(mensajes.map((m) => m.userId));

  // Historial (por si entramos con la conversación empezada)
  useEffect(() => {
    if (!salaId || !userId) return;
    let vivo = true;
    historialChat(salaId, userId)
      .then((h) => { if (vivo) setMensajes((actuales) => (h ?? []).reduce(agregar, actuales)); })
      .catch(() => { if (vivo) setAviso('NO SE PUDO CARGAR EL CHAT'); });
    return () => { vivo = false; };
  }, [salaId, userId]);

  // Mensajes nuevos en vivo
  useSubscription(salaId ? topics.chat(salaId) : null, (m) => {
    if (m?.id) setMensajes((lista) => agregar(lista, m));
  });

  // Siempre mostrar lo último
  useEffect(() => {
    const el = listaRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [mensajes]);

  async function enviar(e) {
    e.preventDefault();
    const limpio = texto.trim();
    if (!limpio || enviando) return;
    setEnviando(true);
    setAviso(null);
    try {
      const m = await enviarMensajeChat(salaId, userId, limpio);
      setMensajes((lista) => agregar(lista, m));
      setTexto('');
    } catch (err) {
      setAviso(err?.esConflicto ? 'EL CHAT SE CERRÓ: LA PARTIDA YA VA A EMPEZAR'
        : err?.esProhibido ? 'YA NO ESTÁS EN ESTA SALA'
        : (err?.message ?? 'NO SE PUDO ENVIAR').toUpperCase());
    } finally {
      setEnviando(false);
    }
  }

  return (
    <aside className="ce-chat" aria-label="Chat de la sala">
      <h3 className="ce-titulo">CHAT DE LA SALA</h3>

      <ol className="ce-lista" ref={listaRef} aria-live="polite">
        {mensajes.length === 0 && <li className="ce-vacio">AÚN NO HAY MENSAJES. ¡SALUDA A TU EQUIPO!</li>}
        {mensajes.map((m) => {
          const mio = m.userId === userId;
          return (
            <li key={m.id} className={`ce-mensaje ${mio ? 'ce-mensaje--mio' : ''}`}>
              <span className="ce-mensaje__cab">
                <span className="ce-mensaje__autor">{mio ? 'TÚ' : nombreDe(m.userId).toUpperCase()}</span>
                <span className="ce-mensaje__hora">{hora(m.enviadoEn)}</span>
              </span>
              <span className="ce-mensaje__texto">{m.texto}</span>
            </li>
          );
        })}
      </ol>

      {aviso && <p className="ce-aviso">{aviso}</p>}

      <form className="ce-form" onSubmit={enviar}>
        <input
          className="ce-input"
          value={texto}
          maxLength={MAX_LONGITUD_MENSAJE}
          placeholder="ESCRIBE UN MENSAJE..."
          onChange={(e) => setTexto(e.target.value)}
          disabled={enviando}
          aria-label="Mensaje"
        />
        <button className="ce-enviar" type="submit" disabled={enviando || !texto.trim()}>
          ENVIAR
        </button>
      </form>
    </aside>
  );
}

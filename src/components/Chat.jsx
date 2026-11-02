import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { MAX_LONGITUD_MENSAJE } from '../services/chatApi';
import { useConexion, useSubscription } from '../hooks/useSocket';
import { useNombres } from '../hooks/useNombres';
import './Chat.css';

const MAX_MENSAJES = 50; // lo mismo que guarda el back por canal
const CERCA_DEL_FINAL = 40; // px: si el jugador subió a leer, no se le mueve la lista

// Historial y STOMP pueden traer el mismo mensaje (y el POST también lo devuelve): cuenta una vez
function fusionar(actuales, nuevos) {
  const porId = new Map(actuales.map((m) => [m.id, m]));
  nuevos.forEach((m) => porId.set(m.id, m));
  return [...porId.values()]
    .sort((a, b) => Date.parse(a.enviadoEn) - Date.parse(b.enviadoEn))
    .slice(-MAX_MENSAJES);
}

const horaDe = (instante) =>
  new Date(instante).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', hour12: false });

function mensajeDeError(e) {
  if (e?.esConflicto) return 'ESTE CHAT YA ESTÁ CERRADO';
  if (e?.esProhibido) return 'YA NO ESTÁS AQUÍ';
  if (e?.status === 429) return 'VAS MUY RÁPIDO, ESPERA UN MOMENTO';
  if (e?.status === 400) return (e.message || 'MENSAJE NO VÁLIDO').toUpperCase();
  return 'NO SE PUDO ENVIAR, INTENTA DE NUEVO';
}

/**
 * Un canal de chat (ver canales en chatApi.js). `visible` es para los que se quedan montados pero
 * ocultos: siguen recibiendo y avisan con `onNuevo` cuando alguien más escribe.
 */
export default function Chat({ canal, userId, titulo, visible = true, onNuevo }) {
  const [mensajes, setMensajes] = useState([]);
  const [texto, setTexto] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState(null);
  const conectado = useConexion();
  const listaRef = useRef(null);
  const pegadoAlFinalRef = useRef(true);

  useSubscription(canal.topico, (m) => {
    if (!m?.id) return;
    setMensajes((actuales) => fusionar(actuales, [m]));
    if (m.userId !== userId) onNuevo?.();
  });

  // Al conectar y al reconectar: recupera lo que pudo llegar mientras no había socket
  useEffect(() => {
    if (!conectado) return;
    let vivo = true;
    canal.historial()
      .then((lista) => { if (vivo) setMensajes((actuales) => fusionar(actuales, lista ?? [])); })
      .catch(() => { /* los mensajes nuevos igual llegan por STOMP */ });
    return () => { vivo = false; };
  }, [canal, conectado]);

  const autores = useMemo(() => mensajes.map((m) => m.userId), [mensajes]);
  const nombreDe = useNombres(autores);

  useLayoutEffect(() => {
    const lista = listaRef.current;
    if (lista && visible && pegadoAlFinalRef.current) lista.scrollTop = lista.scrollHeight;
  }, [mensajes, visible]);

  function alHacerScroll(e) {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    pegadoAlFinalRef.current = scrollHeight - scrollTop - clientHeight < CERCA_DEL_FINAL;
  }

  async function enviar(e) {
    e.preventDefault();
    const limpio = texto.trim();
    if (!limpio || enviando) return;
    setEnviando(true);
    setError(null);
    try {
      const mensaje = await canal.enviar(limpio);
      pegadoAlFinalRef.current = true;
      setMensajes((actuales) => fusionar(actuales, [mensaje]));
      setTexto('');
    } catch (err) {
      setError(mensajeDeError(err));
    } finally {
      setEnviando(false);
    }
  }

  return (
    <section className="ch" aria-label={titulo ?? 'Chat'}>
      {titulo && <h3 className="ch-titulo">{titulo}</h3>}

      <ol className="ch-lista" ref={listaRef} onScroll={alHacerScroll} aria-live="polite">
        {mensajes.length === 0 && <li className="ch-vacio">AÚN NO HAY MENSAJES. ¡SALUDA!</li>}
        {mensajes.map((m) => (
          <li key={m.id} className={`ch-mensaje ${m.userId === userId ? 'ch-mensaje--mio' : ''}`}>
            <span className="ch-cab">
              <b>{nombreDe(m.userId).toUpperCase()}</b>
              <time dateTime={m.enviadoEn}>{horaDe(m.enviadoEn)}</time>
            </span>
            <span className="ch-texto">{m.texto}</span>
          </li>
        ))}
      </ol>

      {error && <p className="ch-error" role="alert">{error}</p>}

      <form className="ch-form" onSubmit={enviar}>
        <input
          className="ch-input"
          value={texto}
          maxLength={MAX_LONGITUD_MENSAJE}
          placeholder="ESCRIBE AQUÍ..."
          aria-label="Mensaje"
          onChange={(e) => { setTexto(e.target.value); setError(null); }}
        />
        <button className="ch-enviar" disabled={!texto.trim() || enviando}>ENVIAR</button>
      </form>
      {texto.length >= MAX_LONGITUD_MENSAJE - 20 && (
        <p className="ch-contador">{texto.length}/{MAX_LONGITUD_MENSAJE}</p>
      )}
    </section>
  );
}

import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Icono from '../Home/Iconos';
import { useTopic } from '../../hooks/useSocket';
import { listarSalas, crearSala, unirseASala } from '../../services/salasApi';
import { Sesion } from '../../services/sesion';
import { authApi } from '../../services/authApi';
import ConfirmarCerrarSesion from '../../components/ConfirmarCerrarSesion';
import './CrearSala.css';
import { topics } from '../../config';

const FONDO = '/assets/fondos/Fondo_Lobby.jpeg';

const TEMA = { id: 'biblioteca', nombre: 'BIBLIOTECA', imagen: '/assets/fondos/Fondo_mapa.jpeg', dificultad: 2 };
// Lo que el back acepta para la duración de la partida (Sala.DURACIONES_MINUTOS)
const TIEMPO_PARTIDA = 5;
const TIEMPOS = [TIEMPO_PARTIDA, 10, 15];
const NIVELES = ['', 'MUY FÁCIL', 'FÁCIL', 'MEDIA', 'DIFÍCIL', 'EXTREMA'];
const MAX_NOMBRE = 24;
// Por estabilidad las salas son de 2 equipos de 2 (el back no acepta otra configuración)
const MIN_JUGADORES = 2;
const MAX_JUGADORES = 2;
const NUM_EQUIPOS = 2;

export default function CrearSala() {
  const navegar = useNavigate();
  const userId = Sesion.userId;

  const [nombre, setNombre] = useState('');
  const [tiempo, setTiempo] = useState(TIEMPO_PARTIDA);
  const [jugadores, setJugadores] = useState(2);
  const [dificultad, setDificultad] = useState(TEMA.dificultad);
  const [visibilidad, setVisibilidad] = useState('publica');
  const [salas, setSalas] = useState([]);
  const [error, setError] = useState('');
  const [creando, setCreando] = useState(false);

  useEffect(() => {
    if (!userId) navegar('/');
  }, [userId, navegar]);

  useEffect(() => {
    listarSalas().then(setSalas).catch(() => {});
  }, []);
    useTopic(topics.salas(), setSalas);

  const nombreLimpio = nombre.trim();
  const repetido = useMemo(
    () => salas.some((s) => s.nombre.trim().toLowerCase() === nombreLimpio.toLowerCase()),
    [salas, nombreLimpio]
  );

  async function crear() {
    if (!nombreLimpio) return setError('PONLE UN NOMBRE A LA SALA');
    if (repetido) return setError('YA EXISTE UNA SALA CON ESE NOMBRE');

    setError('');
    setCreando(true);
    try{
      const sala = await crearSala({ nombre: nombreLimpio, minutos: tiempo });
      await unirseASala(sala.id);

      Sesion.guardar('salaId', sala.id);
      Sesion.guardar('configSala', {
        salaId: sala.id,
        tematica: TEMA.id,
        minutos: tiempo,
        dificultad,
        visibilidad,
      });
      navegar(`/sala/${sala.id}`);
    } catch (e) {
      setError((e.message || 'NO SE PUDO CREAR LA SALA').toUpperCase());
      setCreando(false);
    }
  }

  function cerrarSesion() {
    void authApi.logout();
  }

  if (!userId) return null;

  return (
    <div className="cs-root">
      <div className="cs-stage" style={{ backgroundImage: `url(${FONDO})` }}>
        {/* Esquinas inferiores: volver (izquierda) y cerrar sesión (derecha), con texto para que no confundan */}
        <button className="cs-esquina cs-bl cs-con-texto" onClick={() => navegar('/home')}>
          <Icono nombre="izquierda" /> VOLVER
        </button>
        <ConfirmarCerrarSesion className="cs-esquina cs-br cs-con-texto cs-rojo" onConfirmar={cerrarSesion}>
          <Icono nombre="salir" /> CERRAR SESIÓN
        </ConfirmarCerrarSesion>

        <h1 className="cs-titulo">CREAR SALA</h1>

        <div className="cs-cuerpo">
          {/* COLUMNA IZQUIERDA */}
          <div className="cs-col">
            <section className="cs-panel cs-panel-izq">
              <span className="remache tl" /><span className="remache tr" />
              <span className="remache bl" /><span className="remache br" />

              <label className="cs-label" htmlFor="cs-nombre">NOMBRE DE LA SALA</label>
              <div className={`cs-input ${repetido ? 'is-error' : ''}`}>
                <input
                  id="cs-nombre"
                  value={nombre}
                  maxLength={MAX_NOMBRE}
                  autoFocus
                  placeholder="Sala de los valientes"
                  onChange={(e) => { setNombre(e.target.value); setError(''); }}
                  onKeyDown={(e) => e.key === 'Enter' && crear()}
                />
                <span className="cs-contador">{nombre.length}/{MAX_NOMBRE}</span>
              </div>
              <p className={`cs-ayuda ${repetido ? 'is-error' : ''}`}>
                {repetido ? 'ESE NOMBRE YA ESTÁ EN EL CATÁLOGO' : `MÁX. ${MAX_NOMBRE} CARACTERES · DEBE SER ÚNICO EN EL CATÁLOGO`}
              </p>

              <p className="cs-label">TEMÁTICA</p>
              <div className="cs-mapa">
                <div className="cs-mapa__marco">
                  <img src={TEMA.imagen} alt="Vista del mapa de la Biblioteca" />
                </div>
                <p className="cs-mapa__nombre">{TEMA.nombre}</p>
              </div>

              <p className="cs-label cs-sugerida">
                DIFICULTAD SUGERIDA: {TEMA.dificultad}/5
                <Calaveras valor={TEMA.dificultad} />
              </p>
            </section>

            <div className="cs-panel-boton">
              <button className="cs-crear" onClick={crear} disabled={creando}>
                <Icono nombre="check" /> {creando ? 'CREANDO...' : 'CREAR SALA'}
              </button>
              {error && <p className="cs-error">{error}</p>}
            </div>
          </div>

          {/* COLUMNA DERECHA */}
          <div className="cs-col">
            <section className="cs-panel cs-panel-der">
              <span className="remache tl" /><span className="remache tr" />
              <span className="remache bl" /><span className="remache br" />
              <p className="cs-pestana">CONFIGURACIÓN</p>

              <p className="cs-label">TIEMPO DE LA PARTIDA</p>
              <div className="cs-opciones cs-cuatro">
                {TIEMPOS.map((m) => (
                  <button key={m} className={`cs-opcion ${tiempo === m ? 'activa' : ''}`} onClick={() => setTiempo(m)}>
                    {m} MIN
                  </button>
                ))}
              </div>

              <div className="cs-fila">
                <p className="cs-label">JUGADORES POR EQUIPO</p>
                <span className="cs-nota">MÍN. {MIN_JUGADORES} · MÁX. {MAX_JUGADORES}</span>
              </div>
              <div className="cs-stepper">
                <button className="cs-opcion" disabled={jugadores <= MIN_JUGADORES}
                        onClick={() => setJugadores(jugadores - 1)} aria-label="Menos">
                  <Icono nombre="menos" />
                </button>
                <span className="cs-stepper__valor">{jugadores}</span>
                <button className="cs-opcion" disabled={jugadores >= MAX_JUGADORES}
                        onClick={() => setJugadores(jugadores + 1)} aria-label="Más">
                  <Icono nombre="mas" />
                </button>
              </div>

              <div className="cs-fila">
                <p className="cs-label">DIFICULTAD</p>
                <span className="cs-nota cs-nota-clara">{dificultad}/5 · {NIVELES[dificultad]}</span>
              </div>
              <div className="cs-calaveras">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button key={n} className={n <= dificultad ? 'llena' : ''} onClick={() => setDificultad(n)}
                          aria-label={`Dificultad ${n}`}>
                    <Icono nombre="calavera" />
                  </button>
                ))}
              </div>

              <p className="cs-label">VISIBILIDAD</p>
              <div className="cs-opciones cs-dos">
                <button className={`cs-opcion ${visibilidad === 'publica' ? 'activa' : ''}`} onClick={() => setVisibilidad('publica')}>
                  <Icono nombre="mundo" /> PÚBLICA
                </button>
                <button className={`cs-opcion ${visibilidad === 'privada' ? 'activa' : ''}`} onClick={() => setVisibilidad('privada')}>
                  <Icono nombre="candado" /> PRIVADA
                </button>
              </div>
            </section>

            <section className="cs-resumen">
              <p className="cs-resumen__tag">RESUMEN</p>
              <p className="cs-resumen__linea">
                {TEMA.nombre} · {tiempo} MIN · {jugadores} VS {jugadores}
              </p>
              <p className="cs-resumen__detalle">
                TOTAL: {jugadores * NUM_EQUIPOS} JUGADORES · DIFICULTAD {dificultad}/5 · {visibilidad === 'publica' ? 'PÚBLICA' : 'PRIVADA'}
              </p>
            </section>

            <p className="cs-info">
              <Icono nombre="info" />
              LOS ROLES (HÉROE / VERDUGO) SE ASIGNAN AL AZAR CUANDO EMPIEZA LA PARTIDA.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function Calaveras({ valor }) {
  return (
    <span className="cs-mini-calaveras">
      {[1, 2, 3, 4, 5].map((n) => (
        <Icono key={n} nombre="calavera" className={n <= valor ? 'llena' : ''} />
      ))}
    </span>
  );
}
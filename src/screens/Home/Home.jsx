import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import SalaCard, { codigoDe } from './SalaCard';
import Icono from './Iconos';
import Ranking from './Ranking';
import Amigos from './Amigos';
import { Ajustes } from './Preferencias';
import { AJUSTES_INICIALES, aplicarAjustes, claveAjustes, guardarLocal, leerAjustes } from './almacenLocal';
import Chat from '../../components/Chat';
import { useTopic } from '../../hooks/useSocket';
import { useNombres } from '../../hooks/useNombres';
import { listarSalas, unirseASala } from '../../services/salasApi';
import { estadisticasDe } from '../../services/estadisticasApi';
import { canales } from '../../services/chatApi';
import { Sesion } from '../../services/sesion';
import { authApi } from '../../services/authApi';
import ConfirmarCerrarSesion from '../../components/ConfirmarCerrarSesion';
import './Home.css';
import './PanelesHome.css';
import { topics } from '../../config';

const FONDO = '/assets/fondos/Fondo_Lobby.jpeg';
const AVATAR = '/assets/avatares/avatar_1.png';
const MINIATURA_BIBLIOTECA = '/assets/fondos/Fondo_mapa.jpeg';

const TABS = [
  { id: 'salas', texto: 'SALAS', icono: 'salas' },
  { id: 'ranking', texto: 'RANKING', icono: 'ranking' },
  // Sin amigos en el back todavia: la pestana se ve pero no se puede abrir (para todos)
  { id: 'amigos', texto: 'AMIGOS', icono: 'persona', proximamente: true },
  { id: 'ajustes', texto: 'AJUSTES', icono: 'ajustes' },
];

export default function Home({ admin }) {
  const navegar = useNavigate();
  const avisoAlEntrar = useLocation().state?.aviso;
  const userId = Sesion.userId;
  const username = Sesion.username;

  const [salas, setSalas] = useState([]);
  const nombreDe = useNombres(salas.map((s) => s.anfitrionId));
  const [cargando, setCargando] = useState(true);
  const [aviso, setAviso] = useState('');
  const canalGlobal = useMemo(() => canales.global(), []);
  const [vista, setVista] = useState('salas');
  const [puntos, setPuntos] = useState(0);
  const [ajustes, setAjustes] = useState(() => leerAjustes(userId));
  const nombreVisible = username;
  const silenciado = !ajustes.efectos;
  const [codigo, setCodigo] = useState(['', '', '', '']);
  const temporizador = useRef(null);
  const casillas = useRef([]);
  const tituloVista = useRef(null);
  const [chatAbierto, setChatAbierto] = useState(false);
  const botonChat = useRef(null);
  const botonCerrarChat = useRef(null);

  useEffect(() => {
    if (chatAbierto) botonCerrarChat.current?.focus();
  }, [chatAbierto]);

  function cerrarChat() {
    setChatAbierto(false);
    botonChat.current?.focus();
  }

  useEffect(() => {
    if (!userId) navegar('/');
  }, [userId, navegar]);

  useEffect(() => {
    listarSalas()
      .then(setSalas)
      .catch((e) => avisar(e.message))
      .finally(() => setCargando(false));
  }, []);

   useTopic(topics.salas(), setSalas);

  // Aviso de la pantalla de la que viene; se borra del historial para que no salga otra vez al recargar
  useEffect(() => {
    if (!avisoAlEntrar) return;
    avisar(avisoAlEntrar);
    window.history.replaceState(null, '');
  }, [avisoAlEntrar]);

  useEffect(() => {
    if (userId) estadisticasDe(userId).then((e) => setPuntos(e.puntos)).catch(() => {});
  }, [userId]);

  useEffect(() => {
    if (userId) aplicarAjustes(ajustes);
  }, [userId, ajustes]);


  function cambiarAjuste(clave, valor) {
    const nuevos = { ...ajustes, [clave]: valor };
    if (clave === 'chatGlobal' && !valor) setChatAbierto(false);
    aplicarAjustes(nuevos);
    setAjustes(nuevos);
    if (!guardarLocal(claveAjustes(userId), nuevos)) avisar('El ajuste se aplicó durante esta sesión.');
  }

  function avisar(texto) {
    setAviso(texto);
    clearTimeout(temporizador.current);
    temporizador.current = setTimeout(() => setAviso(''), 3500);
  }

  async function entrar(sala) {
    try {
      if (sala.anfitrionId !== userId) await unirseASala(sala.id);
      Sesion.guardar('salaId', sala.id);
      navegar(`/sala/${sala.id}`);
    } catch (e) {
      avisar(e.esConflicto ? 'La sala se llenó, prueba con otra' : e.message);
    }
  }

  //Unirse por código
  function escribirCodigo(i, valor) {
    const letra = valor.slice(-1).toUpperCase().replace(/[^0-9A-F]/, '');
    const nuevo = [...codigo];
    nuevo[i] = letra;
    setCodigo(nuevo);
    if (letra && i < 3) casillas.current[i + 1]?.focus();
  }
  function teclaCodigo(i, e) {
    if (e.key === 'Backspace' && !codigo[i] && i > 0) casillas.current[i - 1]?.focus();
    if (e.key === 'Enter') unirsePorCodigo();
  }
  function unirsePorCodigo() {
    const texto = codigo.join('');
    if (texto.length < 4) return avisar('El código tiene 4 caracteres');
    const sala = salas.find((s) => codigoDe(s) === texto);
    if (!sala) return avisar(`No existe una sala con el código ${texto}`);
    entrar(sala);
  }

  //Crear sala
  function abrirCrear() {
    navegar('/crear-sala');
  }

  function cerrarSesion() {
    aplicarAjustes(AJUSTES_INICIALES);
    authApi.logout();
  }

  if (!userId) return null;

  const total = Math.max(4, salas.length + (salas.length % 2));
  const vacias = cargando ? 0 : total - salas.length;

  return (
    <div className="home-root">
      <div className={`home-stage home-stage--${vista}`} style={{ backgroundImage: `url(${FONDO})` }}>
        {/* ================= BARRA LATERAL ================= */}
        <aside className="lateral" aria-label="Jugador y salas">
          {/* Identificación */}
          <section className="placa placa-id">
            <p className="placa__rotulo">IDENTIFIC.</p>
            <div className="carnet">
              <span className="carnet__barra"><Icono nombre="tarjeta" /> CREDENCIAL {admin && <strong className="carnet__sello-admin">ADMIN</strong>}</span>
              <span className="carnet__cuerpo">
                <span className="carnet__avatar">
                  <span>{nombreVisible?.[0]?.toUpperCase()}</span>
                  <img src={AVATAR} alt="" onError={(e) => (e.currentTarget.style.display = 'none')} />
                </span>
                <span className="carnet__datos">
                  <span className="carnet__nombre">{nombreVisible}</span>
                  <span className="carnet__rango">SOBREVIVIENTE</span>
                  <span className="carnet__puntos"><Icono nombre="llave" /> PUNTOS: {puntos}</span>
                </span>
              </span>
            </div>
          </section>

          {/* Unirse por código */}
          <section className="placa placa-codigo">
            <p className="codigo-titulo"><Icono nombre="llave" /> UNIRSE POR CÓDIGO</p>
            <p className="codigo-ayuda">EL CÓDIGO APARECE EN EL TÍTULO DE CADA SALA</p>
            <div className="codigo-casillas">
              {codigo.map((letra, i) => (
                <input
                  key={i}
                  ref={(el) => (casillas.current[i] = el)}
                  value={letra}
                  placeholder="-"
                  aria-label={`Carácter ${i + 1} del código`}
                  maxLength={2}
                  onChange={(e) => escribirCodigo(i, e.target.value)}
                  onKeyDown={(e) => teclaCodigo(i, e)}
                  className={letra ? 'llena' : ''}
                />
              ))}
            </div>
            <button className="btn btn-verde btn-ancho" onClick={unirsePorCodigo}>
              <Icono nombre="candado" /> UNIRSE
            </button>
          </section>

          {/* Crear sala */}
          <section className="placa placa-crear">
            <div className="peligro">
              <button className="btn-crear" onClick={abrirCrear}>+ CREAR SALA</button>
            </div>
          </section>
        </aside>

        {/* CONTENIDO */}
        <main className="contenido">
          <div className="rotulo-nav home-nav-encabezado">
            <span>NAVEGACIÓN</span>
            {admin && <Link className="adm-enlace-home" to="/admin">
              <Icono nombre="ajustes" /> PANEL ADMIN
            </Link>}
          </div>
          <nav className="nav" aria-label="Menú principal">
            <div className="tabs">
              {TABS.map((t) => (
                <button
                  key={t.id}
                  className={`tab ${t.id === vista ? 'activa' : ''}`}
                  aria-pressed={t.id === vista}
                  disabled={t.proximamente}
                  title={t.proximamente ? 'Próximamente' : undefined}
                  onClick={() => setVista(t.id)}
                >
                  <Icono nombre={t.icono} /> {t.texto}
                </button>
              ))}
            </div>
            <div className="nav-sesion">
              <ConfirmarCerrarSesion className="cerrar" onConfirmar={cerrarSesion}>
                <Icono nombre="salir" /><span>CERRAR SESIÓN</span>
              </ConfirmarCerrarSesion>
              <button className="icono-btn" onClick={() => cambiarAjuste('efectos', silenciado)}
                      aria-label={silenciado ? 'Activar sonido' : 'Silenciar'} aria-pressed={silenciado}>
                <Icono nombre={silenciado ? 'mute' : 'sonido'} />
              </button>
            </div>
          </nav>

          <h1 ref={tituloVista} tabIndex={-1} className="titulo-salas">
            {{ salas: 'SALAS DISPONIBLES', ranking: 'RANKING', amigos: 'AMIGOS', ajustes: 'AJUSTES' }[vista]}
          </h1>

          <div className={`home-vista home-vista--${vista}`}>
            {vista === 'ranking' && <Ranking userId={userId} />}
            {vista === 'amigos' && <Amigos userId={userId} />}
            {vista === 'ajustes' && <Ajustes ajustes={ajustes} onCambiar={cambiarAjuste} />}
            {vista === 'salas' && <div className="grid-salas">
              {cargando && <p className="mensaje-grid">CARGANDO SALAS...</p>}

              {!cargando && salas.map((sala) => (
                <SalaCard
                  key={sala.id}
                  sala={sala}
                  userId={userId}
                  nombreLider={nombreDe(sala.anfitrionId)}
                  miniatura={MINIATURA_BIBLIOTECA}
                  onEntrar={entrar}
                />
              ))}

              {Array.from({ length: vacias }, (_, i) => (
                <button key={'v' + i} className="sala vacia" onClick={abrirCrear}>
                  <span>ESPACIO LIBRE</span>
                  <small>+ CREAR UNA SALA</small>
                </button>
              ))}
            </div>}
          </div>
        </main>

        {ajustes.chatGlobal && (
          <div className="home-chat-flotante">
            <section id="home-chat-global" className="placa home-chat" hidden={!chatAbierto}
              aria-labelledby="home-chat-titulo" onKeyDown={(e) => {
                if (e.key === 'Escape') cerrarChat();
              }}>
              <header className="home-chat__cabecera">
                <h2 id="home-chat-titulo">CHAT GLOBAL</h2>
                <button type="button" className="tab home-chat__cerrar" ref={botonCerrarChat}
                  onClick={cerrarChat} aria-label="Cerrar chat global">×</button>
              </header>
              <Chat canal={canalGlobal} userId={userId} visible={chatAbierto} />
            </section>
            <button type="button" className="tab home-chat__abrir" ref={botonChat} aria-expanded={chatAbierto}
              aria-controls="home-chat-global" onClick={chatAbierto ? cerrarChat : () => setChatAbierto(true)}>
              <Icono nombre="sobre" /> CHAT
            </button>
          </div>
        )}

        {aviso && <div className="aviso">{aviso}</div>}
      </div>
    </div>
  );
}
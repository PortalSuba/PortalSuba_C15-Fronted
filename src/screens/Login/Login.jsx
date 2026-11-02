import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authApi } from '../../services/authApi';
import { completarEntrada, entrar, hayCuenta } from '../../services/auth';
import './Login.css';

const FONDO = '/assets/fondos/Fondo_Login.jpeg';
const LLAVE = '/assets/iconos/llave.png';

const LINEA = {
  esperando: '> ESPERANDO IDENTIFICACIÓN',
  verificando: '> VERIFICANDO',
  ok: '> ACCESO CONCEDIDO',
};

export default function Login() {
  const navigate = useNavigate();
  const [nombre, setNombre] = useState('');
  const [pideNombre, setPideNombre] = useState(false);
  const [estado, setEstado] = useState('verificando');
  const [mensaje, setMensaje] = useState('');

  const accesoConcedido = useCallback(() => {
    setEstado('ok');
    setTimeout(() => navigate('/home', { replace: true }), 800);
  }, [navigate]);

  // Al llegar: quizá venimos de vuelta del proveedor, o ya hay sesión de antes en este navegador
  useEffect(() => {
    if (authApi.sesionActual()) { navigate('/home', { replace: true }); return; }
    (async () => {
      try {
        await completarEntrada();
        if (!(await hayCuenta())) { setEstado('esperando'); return; }
        if (await authApi.cargarPerfil()) accesoConcedido();
        else { setPideNombre(true); setEstado('esperando'); }
      } catch (err) {
        setMensaje((err.message || 'ERROR').toUpperCase());
        setEstado('error');
      }
    })();
  }, [navigate, accesoConcedido]);

  async function irAlProveedor(opciones) {
    setEstado('verificando');
    try {
      await entrar(opciones);
    } catch (err) {
      setMensaje((err.message || 'ERROR').toUpperCase());
      setEstado('error');
    }
  }

  async function onSubmit(e) {
    e.preventDefault();
    if (estado === 'verificando' || estado === 'ok') return;
    if (!pideNombre) return irAlProveedor();
    if (!nombre.trim()) {
      setMensaje('ELIGE UN NOMBRE');
      setEstado('error');
      return;
    }
    setEstado('verificando');
    try {
      await authApi.registrarNombre(nombre);
      accesoConcedido();
    } catch (err) {
      setMensaje(err.status === 409 ? 'ESE NOMBRE YA ESTÁ EN USO' : (err.message || 'ERROR').toUpperCase());
      setEstado('error');
    }
  }

  const linea = estado === 'error' ? `> ACCESO DENEGADO: ${mensaje}`
    : estado === 'esperando' && pideNombre ? '> ELIGE TU NOMBRE DE JUGADOR'
    : LINEA[estado];
  const textoBoton = { verificando: 'VERIFICANDO...', ok: 'ACCESO CONCEDIDO' }[estado]
    || (pideNombre ? 'CONFIRMAR NOMBRE' : 'ENTRAR');

  return (
    <div className="login-root">
      <div className="login-stage" style={{ backgroundImage: `url(${FONDO})` }}>
        <div className="login-columna">
          <header className="login-logo">
            <h1 className="login-logo__titulo">
              PORTAL <span>15</span>
            </h1>
            <p className="login-logo__sub">CADA EQUIPO TIENE SU PROPIA SALIDA</p>
          </header>

          <form className="login-form" onSubmit={onSubmit} noValidate>
            <div className="login-monitor-wrap">
              <div className={`login-monitor ${estado === 'error' ? 'is-error' : ''}`}>
                <div className="login-monitor__pantalla">
                  <p className="login-monitor__titulo">
                    {pideNombre ? <>PRIMERA VEZ –<br />ELIGE CÓMO TE VERÁN</> : <>SISTEMA BLOQUEADO –<br />IDENTIFÍCATE PARA ENTRAR</>}
                  </p>

                  {pideNombre && (
                    <label className="login-campo">
                      <span>NOMBRE DE JUGADOR</span>
                      <input
                        value={nombre}
                        onChange={(e) => { setNombre(e.target.value); if (estado === 'error') setEstado('esperando'); }}
                        maxLength={20}
                        autoFocus
                        disabled={estado === 'verificando' || estado === 'ok'}
                      />
                    </label>
                  )}

                  <div className="login-acciones">
                    <button type="submit" className={`login-boton is-${estado}`} disabled={estado === 'verificando'}>
                      {textoBoton}
                      <Candado abierto={estado === 'ok'} />
                    </button>
                    {!pideNombre && estado !== 'verificando' && estado !== 'ok' && (
                      <button type="button" className="login-registro" onClick={() => irAlProveedor({ registro: true })}>
                        ¿SIN CUENTA? CREA UNA
                      </button>
                    )}
                  </div>

                  <p className={`login-monitor__estado is-${estado}`} role="status">
                    {linea}
                    <span className="login-cursor">_</span>
                  </p>
                </div>

                <div className="login-monitor__lateral" aria-hidden="true">
                  <span /><span /><span /><span /><span />
                </div>
                <div className="login-monitor__controles" aria-hidden="true">
                  <span className="login-perilla" />
                  <span className={`login-led is-${estado}`} />
                </div>
              </div>

              <div className="login-etiqueta" aria-hidden="true">
                <img src={LLAVE} alt="" />
                <span>¡ESCAPE!</span>
              </div>
            </div>

          </form>
        </div>

        <footer className="login-footer">
          <span className="login-version">v1.0</span>
        </footer>
      </div>
    </div>
  );
}

/** Candado pixel art; se abre cuando el acceso es concedido. */
function Candado({ abierto }) {
  return (
    <svg className="login-candado" viewBox="0 0 8 10" shapeRendering="crispEdges" aria-hidden="true">
      <g fill="currentColor">
        {abierto
          ? <path d="M1 0h4v1H1zM0 1h1v3H0zM5 1h1v1H5z" />
          : <path d="M2 0h4v1H2zM1 1h1v3H1zM6 1h1v3H6z" />}
        <path d="M0 4h8v6H0z" />
      </g>
      <path d="M3 6h2v2H3z" className="login-candado__ojo" />
    </svg>
  );
}
import { useState } from 'react';
import { Link, Navigate, useSearchParams } from 'react-router-dom';
import { Sesion } from '../../services/sesion';
import { authApi } from '../../services/authApi';
import { codigoValido } from '../../services/adminApi';
import ConfirmarCerrarSesion from '../../components/ConfirmarCerrarSesion';
import Icono from '../Home/Iconos';
import { Negocio, Tecnico, ResultadoError } from './Tableros';
import { useTableroNegocio, useTableroTecnico, useBuscarError } from './useAdminDatos';
import './Admin.css';

const PESTANAS = [['negocio', 'Negocio'], ['tecnico', 'Técnico'], ['errores', 'Buscar error']];
const PERIODOS = [[15, '15 min'], [60, '1 hora'], [1440, '24 horas']];

function EstadoConsulta({ consulta, mensaje404, children }) {
  const { cargando, error, reintentar, actualizado } = consulta;
  if (error?.status === 403) return <Navigate to="/home" replace state={{ aviso: 'Solo para administradores' }} />;
  if (cargando) return <div className="adm-skeleton" role="status" aria-label="Cargando datos">
    <i /><i /><i /><i /><i />
  </div>;
  if (error) return <section className="adm-panel" role="alert">
    <p>{error.status === 503 ? 'Los registros no están disponibles en este entorno.' : (error.status === 404 && mensaje404) || error.message}</p>
    <button className="adm-boton" onClick={reintentar}>Reintentar</button>
  </section>;
  return <>
    {actualizado && <p className="adm-secundario">Actualizado a las {new Date(actualizado).toLocaleTimeString('es-CO')}</p>}
    {children}
  </>;
}

function Tablero({ vista, minutos }) {
  const negocio = useTableroNegocio(vista === 'negocio' ? minutos : null);
  const tecnico = useTableroTecnico(vista === 'tecnico' ? minutos : null);
  const consulta = vista === 'negocio' ? negocio : tecnico;
  return <EstadoConsulta consulta={consulta} mensaje404="El servidor no encontró la ruta del tablero (404). Usa un backend que incluya las rutas de administración del sprint.">
    {consulta.datos && (vista === 'negocio' ? <Negocio datos={consulta.datos} /> : <Tecnico datos={consulta.datos} />)}
  </EstadoConsulta>;
}

function BuscarError({ codigo, onBuscar }) {
  const [entrada, setEntrada] = useState(codigo);
  const [validacion, setValidacion] = useState('');
  const consulta = useBuscarError(codigo);

  function buscar(e) {
    e.preventDefault();
    const limpio = entrada.trim().toLowerCase();
    if (!codigoValido(limpio)) {
      setValidacion('Escribe un código hexadecimal de 8 a 32 caracteres (0–9, A–F).');
      return;
    }
    setValidacion('');
    if (limpio === codigo) consulta.reintentar();
    else onBuscar(limpio);
  }

  return <section className="adm-panel adm-busqueda">
    <h2>Buscar error</h2>
    <form className="adm-buscar" onSubmit={buscar}>
      <label htmlFor="adm-codigo">Código que vio el jugador</label>
      <input id="adm-codigo" value={entrada} autoComplete="off" spellCheck={false} maxLength={32}
        aria-invalid={!!validacion} aria-describedby={validacion ? 'adm-validacion' : undefined}
        onChange={(e) => { setEntrada(e.target.value); setValidacion(''); }} />
      <button type="submit" className="adm-boton" disabled={consulta.cargando}>Buscar</button>
    </form>
    {validacion && <p id="adm-validacion" role="alert">{validacion}</p>}
    <EstadoConsulta consulta={consulta}>
      {consulta.datos?.length === 0 && <p>No se encontró ese código en el último día. Los errores tardan unos segundos en aparecer.</p>}
      {consulta.datos?.length > 0 && <ol className="adm-registros">
        {[...consulta.datos].sort((a, b) => Date.parse(a.hora) - Date.parse(b.hora)).map((registro, i) =>
          <ResultadoError key={registro.traceId + '/' + registro.hora + '/' + i} registro={registro} />)}
      </ol>}
    </EstadoConsulta>
  </section>;
}

function RetratoAdmin() {
  return (
    <svg className="adm-retrato" viewBox="0 0 32 32" shapeRendering="crispEdges" aria-hidden="true">
      <path fill="#221731" d="M0 0h32v32H0z" />
      <path fill="#362245" d="M4 4h2v2H4zM26 6h2v2h-2zM3 19h2v2H3zM27 19h2v2h-2z" />
      <path fill="#100b17" d="M12 3h8v2h4v3h2v6h2v7h-2v3h3v2h2v6H1v-6h3v-2h3v-3H5v-7h2V8h2V5h3z" />
      <path fill="#402650" d="M12 5h8v2h4v3h2v8h-2v5h-5v3h-6v-3H8v-5H7v-6h2V8h3zM5 25h6v2h10v-2h6v2h2v5H3v-5h2z" />
      <path fill="#9261ae" d="M12 5h8v2h-7v2h-3v5H8V9h2V7h2zM5 26h5v2H6v4H3v-4h2zM23 26h4v2h2v4h-3v-4h-3z" />
      <path fill="#21152c" d="M13 10h7v2h3v8h-2v3h-3v2h-4v-2h-3v-3H9v-6h2v-2h2z" />
      <path fill="#b67d65" d="M13 12h6v2h3v5h-2v3h-2v2h-4v-2h-2v-3h-2v-4h3z" />
      <path fill="#ebad7e" d="M15 12h4v2h2v5h-2v2h-2v2h-3v-2h-1v-2h2z" />
      <path fill="#29123d" d="M10 14h13v4h-2v2h-3v-1h-4v1h-2v-2h-2z" />
      <path fill="#a554e8" d="M11 15h11v2h-3v1h-4v-1h-4z" />
      <path fill="#f4a9ff" d="M12 15h3v1h-3zM19 15h2v1h-2z" />
      <path fill="#6d477d" d="M10 24h3v2h3v3h-3v-2h-3zM19 24h3v3h-3v2h-3v-3h3z" />
      <path fill="#f4ca81" d="M15 28h3v3h-3z" />
    </svg>
  );
}

export default function Admin({ admin }) {
  const [params, setParams] = useSearchParams();
  const tab = params.get('vista');
  const vista = PESTANAS.some(([id]) => id === tab) ? tab : 'negocio';
  const codigo = params.get('codigo') ?? '';
  const [periodo, setPeriodo] = useState({});
  const minutos = periodo[vista] ?? (vista === 'negocio' ? 60 : 15);

  if (!Sesion.userId) return <Navigate to="/" replace />;
  if (admin === false) return <Navigate to="/home" replace state={{ aviso: 'Solo para administradores' }} />;
  if (admin == null) return <main className="adm-root"><p className="adm-panel" role="status">Comprobando acceso…</p></main>;

  return <main className="adm-root">
    <aside className="adm-lateral">
      <div className="adm-carnet">
        <RetratoAdmin />
        <div className="adm-carnet__datos">
          <span className="adm-sello">ADMIN</span>
          <strong>{Sesion.username}</strong>
        </div>
      </div>
      <nav className="adm-nav" aria-label="Panel de administración">
        {PESTANAS.map(([id, nombre]) => <Link key={id} className="adm-boton"
          to={{ search: '?' + new URLSearchParams({ vista: id, ...(id === 'errores' && codigo ? { codigo } : {}) }) }}
          aria-current={vista === id ? 'page' : undefined}>{nombre}</Link>)}
      </nav>
      <div className="adm-lateral__acciones">
        <Link className="adm-boton" to="/home"><Icono nombre="izquierda" /> Volver</Link>
        <ConfirmarCerrarSesion className="adm-boton adm-salir" onConfirmar={authApi.logout}>Cerrar sesión</ConfirmarCerrarSesion>
      </div>
    </aside>
    <div className="adm-contenido">
      <header className="adm-cabecera">
        <h1>Panel admin</h1>
        {vista !== 'errores' && <div className="adm-periodos" role="group" aria-label="Periodo de consulta">
          {PERIODOS.map(([valor, texto]) => <button key={valor} className="adm-boton" aria-pressed={valor === minutos}
            onClick={() => setPeriodo((p) => ({ ...p, [vista]: valor }))}>{texto}</button>)}
        </div>}
      </header>
      <div className={vista === "errores" && !codigo ? "adm-vista adm-vista--busqueda" : "adm-vista"}>
        {vista === 'errores'
          ? <BuscarError key={codigo} codigo={codigo} onBuscar={(nuevo) => setParams({ vista: 'errores', codigo: nuevo })} />
          : <Tablero vista={vista} minutos={minutos} />}
      </div>
    </div>
  </main>;
}

import { useEffect, useState } from 'react';
import { BrowserRouter, Link, Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import Login from './screens/Login/Login';
import Home from './screens/Home/Home';
import CrearSala from './screens/CrearSala/CrearSala';
import Partida from './screens/Partida/Partida';
import RetoHeroeVerdugo from './screens/RetoHeroeVerdugo/RetoHeroeVerdugo';
import Resumen from './screens/Resumen/Resumen';
import Admin from './screens/Admin/Admin';
import { useEsAdmin } from './hooks/useEsAdmin';
import { Sesion } from './services/sesion';
import { EVENTO_ERROR_SERVIDOR } from './services/http';
import { codigoValido } from './services/adminApi';

function LoginRuta() {
  const navegar = useNavigate();
  return <Login onExito={(usuario) => {
    sessionStorage.setItem('usuario', JSON.stringify(usuario));
    navegar('/home');
  }} />;
}

function AvisoServidor({ admin }) {
  const [error, setError] = useState(null);

  useEffect(() => {
    function mostrar(e) { setError(e.detail); }
    window.addEventListener(EVENTO_ERROR_SERVIDOR, mostrar);
    return () => window.removeEventListener(EVENTO_ERROR_SERVIDOR, mostrar);
  }, []);

  if (!error) return null;
  const codigo = error.traceId?.slice(0, 8) ?? '';
  return <div className="adm-aviso">
    <span role="alert">{error.message}</span>
    {admin && codigoValido(codigo) && <Link to={'/admin?vista=errores&codigo=' + encodeURIComponent(codigo)}>Ver detalle</Link>}
    <button onClick={() => setError(null)} aria-label="Cerrar aviso">×</button>
  </div>;
}

function Pantallas() {
  const ubicacion = useLocation();
  const admin = useEsAdmin(Sesion.userId);
  const mostrarAcceso = admin && !['/', '/home', '/admin'].includes(ubicacion.pathname.replace(/\/$/, '') || '/');

  return <>
    <Routes>
      <Route path="/" element={<LoginRuta />} />
      <Route path="/home" element={<Home admin={admin} />} />
      <Route path="/admin" element={<Admin admin={admin} />} />
      <Route path="/crear-sala" element={<CrearSala />} />
      <Route path="/partida/:salaId" element={<Partida admin={admin} />} />
      <Route path="/sala/:salaId" element={<Partida admin={admin} />} />
      <Route path="/reto/:matchId" element={<RetoHeroeVerdugo />} />
      <Route path="/resumen/:matchId" element={<Resumen admin={admin} />} />
    </Routes>
    {mostrarAcceso && <aside className="adm-acceso" aria-label="Acceso de administrador">
      <span>{Sesion.username} · <strong className="adm-sello">ADMIN</strong></span>
      <Link to="/admin">Panel admin</Link>
    </aside>}
    <AvisoServidor key={ubicacion.key} admin={admin} />
  </>;
}

export default function App() {
  return <BrowserRouter><Pantallas /></BrowserRouter>;
}

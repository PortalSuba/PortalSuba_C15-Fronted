import { describe, it, expect, vi } from 'vitest';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderEnRuta } from '../../test/render';
import { respuesta, simularFetch } from '../../test/fetchFalso';
import { stompFalso } from '../../test/stompFalso';
import { auth0Falso } from '../../test/auth0Falso';
import { Sesion } from '../../services/sesion';
import { CLAIM_ROLES } from '../../services/auth';
import { ApiError, EVENTO_ERROR_SERVIDOR } from '../../services/http';
import Resumen from '../Resumen/Resumen';
import App from '../../App';

const EQUIPOS = [
  { id: 'e1', numero: 1, cupoMaximo: 2, miembros: ['yo', 'compa'] },
  { id: 'e2', numero: 2, cupoMaximo: 2, miembros: ['r1'] },
];
const GANAMOS = {
  matchId: 'm1', motivo: 'ACERTIJOS_COMPLETOS', equipoGanadorId: 'e1', empate: false,
  clasificacion: [
    { equipoId: 'e2', acertijosResueltos: 1, retosGanados: 1, puntaje: 2 },
    { equipoId: 'e1', acertijosResueltos: ['a1', 'a2', 'a3'], retosGanados: 0, puntaje: 3 },
  ],
};

function enPartida() {
  Sesion.iniciar({ userId: 'yo', username: 'ana' });
  Sesion.guardar('equipoId', 'e1');
  Sesion.guardar('minutosPartida', 10);
}

function backDePartida(resultado = GANAMOS) {
  return simularFetch({
    'GET /api/partidas/m1/resultado': resultado,
    'GET /api/salas/m1/equipos': EQUIPOS,
    'GET /api/partidas/m1/equipos/e1/roles': [{ userId: 'yo', rol: 'HEROE' }, { userId: 'compa', rol: 'VERDUGO' }],
    'GET /api/partidas/m1/mapa': { componentes: [{ tipo: 'ACERTIJO' }, { tipo: 'ACERTIJO' }, { tipo: 'ACERTIJO' }, { tipo: 'OBJETO' }] },
    'GET /api/partidas/m1/cronometro': { segundosRestantes: 120, tiempoAgotado: false },
    'GET /api/usuarios': [{ userId: 'compa', username: 'luis' }],
  });
}

describe('Resumen', () => {
  it('sin sesión vuelve al login', () => {
    simularFetch();
    renderEnRuta(<Resumen />, { ruta: '/resumen/m1', patron: '/resumen/:matchId' });
    expect(screen.getByTestId('ruta')).toHaveTextContent(/^\/$/);
  });

  it('el equipo que escapó ve su victoria, sus jugadores con rol y la clasificación', async () => {
    enPartida();
    backDePartida();
    renderEnRuta(<Resumen admin />, { ruta: '/resumen/m1', patron: '/resumen/:matchId' });
    expect(await screen.findByText('¡LOGRARON ESCAPAR!')).toBeInTheDocument();
    expect(screen.getByText('EL EQUIPO 1 ENCONTRÓ LA SALIDA')).toBeInTheDocument();
    expect(screen.getByText('GANADOR')).toBeInTheDocument();
    expect(await screen.findByText('LUIS')).toBeInTheDocument();
    expect(screen.getByText('HÉROE')).toBeInTheDocument();
    expect(screen.getByText('VERDUGO')).toBeInTheDocument();
    expect(await screen.findByText('/3')).toBeInTheDocument();
    expect(await screen.findByText('08:00')).toBeInTheDocument(); // 10 min - 2 min restantes
    const filas = screen.getAllByRole('listitem').map((li) => li.textContent);
    expect(filas[0]).toContain('EQUIPO 1');
    expect(screen.getByText(/ACERTIJOS COMPLETOS/)).toBeInTheDocument();
  });

  it('admin copia el id de la partida', async () => {
    enPartida();
    backDePartida();
    const writeText = vi.fn().mockResolvedValueOnce().mockRejectedValueOnce(new Error('sin permiso'));
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
    renderEnRuta(<Resumen admin />, { ruta: '/resumen/m1', patron: '/resumen/:matchId' });
    await userEvent.click(await screen.findByRole('button', { name: 'Copiar ID' }));
    expect(await screen.findByText('ID copiado')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Copiar ID' }));
    expect(await screen.findByText(/cópialo manualmente|copiarlo manualmente/)).toBeInTheDocument();
  });

  it('empate por tiempo, sin roles y datos que llegan por la navegación', async () => {
    enPartida();
    simularFetch({ 'GET /api/salas/m1/equipos': respuesta(404, {}) });
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const resultado = { motivo: 'TIEMPO_AGOTADO', empate: true, equiposEmpatados: ['e1', 'e2'],
      clasificacion: [{ equipoId: 'e1', puntaje: 1 }, { equipoId: 'e2', puntaje: 1 }] };
    renderEnRuta(<Resumen />, { ruta: '/resumen/m1', patron: '/resumen/:matchId',
      state: { resultado, equipos: EQUIPOS, segundosRestantes: 0 } });
    expect(screen.getByText('¡NO LOGRARON ESCAPAR!')).toBeInTheDocument();
    expect(screen.getByText('SE ACABÓ EL TIEMPO · EMPATE EN PUNTOS')).toBeInTheDocument();
    expect(screen.getByText('EMPATE')).toBeInTheDocument();
    expect(screen.getAllByText('PARTICIPÓ')).toHaveLength(2);
  });

  it('derrota por puntos', async () => {
    enPartida();
    backDePartida({ motivo: 'TIEMPO_AGOTADO', equipoGanadorId: 'e2', clasificacion: [{ equipoId: 'e2', puntaje: 2 }, { equipoId: 'e1', puntaje: 0 }] });
    renderEnRuta(<Resumen />, { ruta: '/resumen/m1', patron: '/resumen/:matchId' });
    expect(await screen.findByText('SE ACABÓ EL TIEMPO · EQUIPO 2 PRIMERO EN PUNTOS')).toBeInTheDocument();
    expect(screen.getByText('DERROTA')).toBeInTheDocument();
  });

  it('sin resultado aún: avisa y lo recibe por STOMP', async () => {
    enPartida();
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    simularFetch({ 'GET /api/salas/m1/equipos': EQUIPOS });
    renderEnRuta(<Resumen />, { ruta: '/resumen/m1', patron: '/resumen/:matchId' });
    expect(await screen.findByText('LA PARTIDA AÚN NO TIENE RESULTADO')).toBeInTheDocument();
    await act(() => stompFalso.conectar());
    act(() => stompFalso.entregar('/topic/partidas/m1/resultado', { motivo: 'TIEMPO_AGOTADO', clasificacion: [] }));
    expect(screen.getByText('SE ACABÓ EL TIEMPO')).toBeInTheDocument();
  });

  it('error al cargar el resultado', async () => {
    enPartida();
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    simularFetch({ 'GET /api/partidas/m1/resultado': respuesta(500, {}) });
    renderEnRuta(<Resumen />, { ruta: '/resumen/m1', patron: '/resumen/:matchId' });
    expect(await screen.findByText('NO SE PUDO CARGAR EL RESULTADO')).toBeInTheDocument();
  });

  it('botones: sonido, jugar otra vez y volver al catálogo limpian la partida', async () => {
    enPartida();
    Sesion.guardar('matchId', 'm1');
    backDePartida();
    const { unmount } = renderEnRuta(<Resumen />, { ruta: '/resumen/m1', patron: '/resumen/:matchId' });
    await userEvent.click(screen.getByTitle('Sonido'));
    expect(sessionStorage.getItem('c15.mute')).toBe('1');
    await userEvent.click(screen.getByRole('button', { name: 'JUGAR OTRA VEZ' }));
    expect(screen.getByTestId('ruta')).toHaveTextContent('/crear-sala');
    expect(Sesion.matchId).toBeNull();
    unmount();

    enPartida();
    renderEnRuta(<Resumen />, { ruta: '/resumen/m1', patron: '/resumen/:matchId' });
    await userEvent.click(screen.getByRole('button', { name: 'VOLVER AL CATÁLOGO' }));
    expect(screen.getByTestId('ruta')).toHaveTextContent('/home');
  });
});

describe('App', () => {
  it('arranca en el login', async () => {
    window.history.replaceState(null, '', '/');
    render(<App />);
    expect(await screen.findByText(/ESPERANDO IDENTIFICACIÓN/)).toBeInTheDocument();
  });

  it('un admin ve el acceso al panel y el enlace "Ver detalle" de un error del servidor', async () => {
    Sesion.iniciar({ userId: 'admin1', username: 'jefa' });
    auth0Falso.usuario = { [CLAIM_ROLES]: ['admin'] };
    simularFetch({ 'GET /api/salas': [] });
    window.history.replaceState(null, '', '/crear-sala');
    render(<App />);
    expect(await screen.findByRole('link', { name: 'Panel admin' })).toBeInTheDocument();

    act(() => window.dispatchEvent(new CustomEvent(EVENTO_ERROR_SERVIDOR, {
      detail: new ApiError(500, 'Algo falló', 'abcdef0123456789'),
    })));
    expect(screen.getByRole('link', { name: 'Ver detalle' })).toHaveAttribute('href', '/admin?vista=errores&codigo=abcdef01');
    await userEvent.click(screen.getByRole('button', { name: 'Cerrar aviso' }));
    expect(screen.queryByRole('link', { name: 'Ver detalle' })).not.toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole('link', { name: 'Panel admin' })).toBeInTheDocument());
    window.history.replaceState(null, '', '/');
  });
});

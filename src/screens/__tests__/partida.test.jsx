import { describe, it, expect, vi } from 'vitest';
import { act, fireEvent, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderEnRuta } from '../../test/render';
import { respuesta, simularFetch } from '../../test/fetchFalso';
import { stompFalso } from '../../test/stompFalso';
import { auth0Falso } from '../../test/auth0Falso';
import { Sesion } from '../../services/sesion';
import Partida from '../Partida/Partida';
import Home from '../Home/Home';
import RetoHeroeVerdugo from '../RetoHeroeVerdugo/RetoHeroeVerdugo';

const EQUIPOS = [
  { id: 'e1', numero: 1, cupoMaximo: 2, miembros: ['yo', 'compa'] },
  { id: 'e2', numero: 2, cupoMaximo: 2, miembros: ['r1', 'r2'] },
];

/** Back de una partida en curso: el jugador está en (2,2) junto a un acertijo (3,2) o una llave. */
function backDePartida(componentes, extra = {}) {
  return simularFetch({
    'GET /api/salas': [{ id: 'm1', nombre: 'Cripta', estado: 'EN_PARTIDA', anfitrionId: 'yo' }],
    'GET /api/salas/m1/equipos': EQUIPOS,
    'GET /api/partidas/m1/mapa': { ancho: 10, alto: 10, componentes },
    'GET /api/partidas/m1/equipos/e1/posiciones': [
      { userId: 'yo', x: 2, y: 2, conectado: true },
      { userId: 'compa', x: 6, y: 6, conectado: true },
    ],
    'GET /api/partidas/m1/progreso': { equipos: [{ equipoId: 'e1', acertijosResueltos: [] }] },
    'GET /api/partidas/m1/resultado': respuesta(404, {}),
    'GET /api/partidas/m1/reto': respuesta(404, {}),
    'GET /api/partidas/m1/equipos/e1/inventario': { objetos: [] },
    'GET /api/partidas/m1/jugadores/yo/rol': { rol: 'HEROE' },
    'GET /api/partidas/m1/cronometro': { segundosRestantes: 200, tiempoAgotado: false },
    'GET /api/usuarios': [{ userId: 'compa', username: 'luis' }],
    'GET /api/chat/partidas/m1': [],
    'GET /api/chat/partidas/m1/equipo': [],
    ...extra,
  });
}

async function entrarAPartida(componentes, extra) {
  Sesion.iniciar({ userId: 'yo', username: 'ana' });
  vi.spyOn(console, 'warn').mockImplementation(() => {});
  const fetch = backDePartida(componentes, extra);
  renderEnRuta(<Partida />, { ruta: '/partida/m1', patron: '/partida/:salaId' });
  await act(() => stompFalso.conectar());
  await userEvent.click(await screen.findByRole('button', { name: /ENTENDIDO/ }));
  return fetch;
}

const llamadas = (fetch, metodo, ruta) => fetch.mock.calls.filter(([u, o]) => o.method === metodo && u.startsWith(ruta));

describe('Partida', () => {
  it('entra al mapa, se registra, muestra el rol y abre un acertijo con la tecla E', async () => {
    const fetch = await entrarAPartida([{ id: 'acertijo-1', tipo: 'ACERTIJO', x: 3, y: 2 }], {
      'POST /api/partidas/m1/acertijos/acertijo-1/bloqueo': {
        componenteMapaId: 'acertijo-1', enunciado: '¿2+2?', resuelto: false,
        elementos: [{ id: 'n', tipo: 'campo-numero', descripcion: 'Número' }],
      },
      'POST /api/partidas/m1/acertijos/acertijo-1/solucion': { correcto: true, mensaje: 'Correcto' },
    });
    expect(Sesion.equipoId).toBe('e1');
    expect(stompFalso.publicados.map((f) => f.destination)).toContain('/app/partidas/m1/sesion');

    // Hacia el acertijo no se mueve (la celda está ocupada)
    fireEvent.keyDown(window, { key: 'ArrowRight' });
    expect(llamadas(fetch, 'POST', '/api/partidas/m1/jugadores')).toHaveLength(0);

    fireEvent.keyDown(window, { key: 'e' });
    expect(await screen.findByText('¿2+2?')).toBeInTheDocument();
    await userEvent.type(screen.getByRole('spinbutton'), '4{enter}');
    expect(await screen.findByText('CORRECTO')).toBeInTheDocument();
    expect(await screen.findByText(/RESOLVIÓ EL ACERTIJO 1$/)).toBeInTheDocument();
  });

  it('se mueve con las flechas', async () => {
    const fetch = await entrarAPartida([{ id: 'llave-1', tipo: 'LLAVE', x: 2, y: 1 }], {
      'POST /api/partidas/m1/jugadores/yo/movimiento': { ruta: [{ x: 2, y: 3 }] },
      'POST /api/partidas/m1/objetos/llave-1/recoleccion': null,
    });
    fireEvent.keyDown(window, { key: 'ArrowDown' });
    await waitFor(() => expect(llamadas(fetch, 'POST', '/api/partidas/m1/jugadores/yo/movimiento')).toHaveLength(1));
    expect(fetch.mock.calls.find(([u]) => u.endsWith('/movimiento'))[1].body).toBe('{"x":2,"y":3}');

  });

  it('recoge la llave que tiene al lado', async () => {
    const fetch = await entrarAPartida([{ id: 'llave-1', tipo: 'LLAVE', x: 2, y: 1 }], {
      'POST /api/partidas/m1/objetos/llave-1/recoleccion': null,
    });
    fireEvent.keyDown(window, { key: 'Enter' });
    await waitFor(() => expect(llamadas(fetch, 'POST', '/api/partidas/m1/objetos/llave-1/recoleccion')).toHaveLength(1));
  });

  it('anima al compañero paso a paso y avisa cuando sale', async () => {
    await entrarAPartida([]);
    const topico = '/topic/partidas/m1/equipos/e1/posiciones';
    act(() => stompFalso.entregar(topico, { userId: 'compa', x: 6, y: 8, conectado: true, ruta: [{ x: 6, y: 7 }, { x: 6, y: 8 }] }));
    act(() => stompFalso.entregar(topico, { userId: 'compa', conectado: false }));
    expect(await screen.findByText(/luis SALIÓ DE LA PARTIDA/i)).toBeInTheDocument();
  });

  it('al terminar la partida va al resumen', async () => {
    await entrarAPartida([]);
    act(() => stompFalso.entregar('/topic/partidas/m1/resultado', { motivo: 'TIEMPO_AGOTADO', clasificacion: [] }));
    await waitFor(() => expect(screen.getByTestId('ruta')).toHaveTextContent('/resumen/m1'), { timeout: 4000 });
  });

  it('sala inexistente muestra el error', async () => {
    Sesion.iniciar({ userId: 'yo', username: 'ana' });
    simularFetch({ 'GET /api/salas': [] });
    renderEnRuta(<Partida />, { ruta: '/partida/m1', patron: '/partida/:salaId' });
    expect(await screen.findByText('LA SALA NO EXISTE')).toBeInTheDocument();
  });
});

describe('Home', () => {
  const SALAS = [{ id: 'abcd-1', nombre: 'Cripta', anfitrionId: 'h', jugadoresActuales: 1, cupoTotal: 4,
    numEquipos: 2, jugadoresPorEquipo: 2, estado: 'DISPONIBLE' }];

  function enHome() {
    Sesion.iniciar({ userId: 'yo', username: 'ana' });
    return simularFetch({
      'GET /api/salas': SALAS,
      'POST /api/salas/abcd-1/jugadores': {},
      'GET /api/estadisticas/jugadores/yo': { puntos: 4 },
      'GET /api/usuarios': [{ userId: 'h', username: 'hugo' }],
      'GET /api/chat/global': [],
    });
  }

  it('se une a una sala por su código', async () => {
    const fetch = enHome();
    renderEnRuta(<Home />, { ruta: '/home' });
    expect(await screen.findByText('SALA #ABCD - CRIPTA')).toBeInTheDocument();
    for (const [i, letra] of ['A', 'B', 'C', 'D'].entries()) {
      await userEvent.type(screen.getByLabelText(`Carácter ${i + 1} del código`), letra);
    }
    await userEvent.type(screen.getByLabelText('Carácter 4 del código'), '{enter}');
    await waitFor(() => expect(screen.getByTestId('ruta')).toHaveTextContent('/sala/abcd-1'));
    expect(llamadas(fetch, 'POST', '/api/salas/abcd-1/jugadores')).toHaveLength(1);
  });

  it('código que no existe', async () => {
    enHome();
    renderEnRuta(<Home />, { ruta: '/home' });
    await screen.findByText('SALA #ABCD - CRIPTA');
    for (const i of [1, 2, 3, 4]) await userEvent.type(screen.getByLabelText(`Carácter ${i} del código`), 'F');
    await userEvent.type(screen.getByLabelText('Carácter 4 del código'), '{enter}');
    expect(await screen.findByText('No existe una sala con el código FFFF')).toBeInTheDocument();
  });

  it('cerrar sesión', async () => {
    enHome();
    renderEnRuta(<Home />, { ruta: '/home' });
    await userEvent.click(screen.getByRole('button', { name: /CERRAR SESIÓN/ }));
    await userEvent.click(screen.getByRole('button', { name: 'Cerrar sesión', hidden: true }));
    await waitFor(() => expect(auth0Falso.llamadas.at(-1)?.[0]).toBe('logout'));
  });
});

describe('CrearSala y Reto', () => {
  it('CrearSala: cerrar sesión', async () => {
    const { default: CrearSala } = await import('../CrearSala/CrearSala');
    Sesion.iniciar({ userId: 'yo', username: 'ana' });
    simularFetch({ 'GET /api/salas': [] });
    renderEnRuta(<CrearSala />, { ruta: '/crear-sala' });
    await userEvent.click(screen.getByRole('button', { name: /CERRAR SESIÓN/ }));
    await userEvent.click(screen.getByRole('button', { name: 'Cerrar sesión', hidden: true }));
    await waitFor(() => expect(auth0Falso.llamadas.at(-1)?.[0]).toBe('logout'));
  });

  it('Reto: carga equipos y roles, y si falla deja volver a la partida', async () => {
    Sesion.iniciar({ userId: 'yo', username: 'ana' });
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    simularFetch({ 'GET /api/salas/m1/equipos': respuesta(500, {}) });
    renderEnRuta(<RetoHeroeVerdugo />, { ruta: '/reto/m1', patron: '/reto/:matchId' });
    expect(await screen.findByText('NO SE PUDO ENTRAR AL RETO')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'VOLVER' }));
    expect(screen.getByTestId('ruta')).toHaveTextContent('/partida/m1');
  });
});

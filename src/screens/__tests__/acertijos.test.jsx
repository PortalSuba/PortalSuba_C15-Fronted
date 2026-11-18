import { describe, it, expect, vi } from 'vitest';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderEnRuta } from '../../test/render';
import { respuesta, simularFetch } from '../../test/fetchFalso';
import { stompFalso } from '../../test/stompFalso';
import { Sesion } from '../../services/sesion';
import ModalAcertijo from '../Partida/ModalAcertijo';
import Partida from '../Partida/Partida';
import { respuestaDe, tienePistas, valorInicial } from '../Partida/respuestasAcertijo';

const SOLUCION = 'POST /api/partidas/m1/acertijos/acertijo-1/solucion';
const base = (tipo, datos, extra = {}) => ({
  componenteMapaId: 'acertijo-1', tipo, enunciado: `Enunciado ${tipo}`, resuelto: false,
  elementos: [{ id: 'e', tipo: 'campo-texto', descripcion: 'Respuesta' }], datos, ...extra,
});
const enviadas = (fetch) => fetch.mock.calls
  .filter(([u]) => u.endsWith('/solucion'))
  .map(([, o]) => JSON.parse(o.body).respuesta);

function abrir(dto, props = {}) {
  const fetch = simularFetch({ [SOLUCION]: { correcto: true, mensaje: 'Correcto' } });
  const onResuelto = vi.fn();
  const onCerrar = vi.fn();
  render(<ModalAcertijo dto={dto} matchId="m1" onCerrar={onCerrar} onResuelto={onResuelto} {...props} />);
  return { fetch, onResuelto, onCerrar };
}

describe('respuestasAcertijo', () => {
  it('arma el valor inicial y la respuesta de cada tipo', () => {
    const estante = base('estante', { libros: [{ titulo: 'B' }, { titulo: 'A' }] });
    expect(valorInicial(estante)).toEqual(['B', 'A']);
    expect(respuestaDe(estante, ['A', 'B'])).toEqual(['A', 'B']);
    expect(valorInicial(base('reloj', {}))).toEqual({ h: 12, m: 0 });
    expect(respuestaDe(base('reloj', {}), { h: 9, m: 5 })).toEqual(['9:05']);
    expect(respuestaDe(base('globo', {}), '  Lima ')).toEqual(['Lima']);
    expect(respuestaDe(base('uv', {}), '   ')).toEqual([]);
    expect(valorInicial(base('cifrado', {}))).toBe('');
    const pregunta = { elementos: [{ id: 'l', tipo: 'lista-ordenable' }, { id: 'n', tipo: 'campo-numero' }] };
    expect(valorInicial(pregunta)).toEqual({});
    expect(respuestaDe(pregunta, { l: 'rojo, azul,', n: ' 4 ' })).toEqual(['rojo', 'azul', '4']);
  });

  it('sabe si un acertijo reparte pistas', () => {
    expect(tienePistas(base('reloj', { pistas: ['I'] }))).toBe(true);
    expect(tienePistas(base('cifrado', { paginas: [{}] }))).toBe(true);
    expect(tienePistas(base('globo', {}))).toBe(false);
    expect(tienePistas(null)).toBe(false);
  });
});

describe('ModalAcertijo por tipo', () => {
  it('globo: muestra el telegrama y manda la ciudad', async () => {
    const { fetch, onResuelto } = abrir(base('globo', { telegrama: 'STOP', coordenadas: '4.71° N', latitud: 4.71, longitud: -74 }));
    expect(screen.getByText('4.71° N')).toBeInTheDocument();
    await userEvent.type(screen.getByRole('textbox'), 'Bogotá{enter}');
    expect(await screen.findByText('CORRECTO')).toBeInTheDocument();
    expect(enviadas(fetch)).toEqual([['Bogotá']]);
    expect(onResuelto).toHaveBeenCalledWith('acertijo-1');
  });

  it('estante: intercambia libros tocándolos y arrastrándolos, y manda el orden', async () => {
    const libros = [
      { titulo: 'Cielo', color: '#00f', nombreColor: 'azul', anio: 1950 },
      { titulo: 'Arena', color: '#ff0', nombreColor: 'amarillo', anio: 1900 },
      { titulo: 'Bosque', color: '#0f0', nombreColor: 'verde', anio: 1920 },
    ];
    const { fetch } = abrir(base('estante', { nota: '«Del más antiguo»', libros }));
    expect(screen.getByText('«Del más antiguo»')).toBeInTheDocument();
    // Tocar Cielo y luego Arena los intercambia
    await userEvent.click(screen.getByRole('button', { name: /^Cielo/ }));
    await userEvent.click(screen.getByRole('button', { name: /^Arena/ }));
    // Arrastrar Bosque (3.º) a la 2.ª posición
    const items = screen.getAllByRole('listitem');
    fireEvent.dragStart(items[2]);
    fireEvent.dragOver(items[1]);
    fireEvent.drop(items[1]);
    await userEvent.click(screen.getByRole('button', { name: 'ENVIAR' }));
    expect(enviadas(fetch)).toEqual([['Arena', 'Bosque', 'Cielo']]);
  });

  it('cifrado: muestra la nota y las páginas; solo pistas no deja responder', async () => {
    const dto = base('cifrado', { nota: '2-1-3', paginas: [{ numero: 2, lineas: ['la niebla bajo'] }] });
    const { fetch } = abrir(dto);
    expect(screen.getByText('PÁGINA 2')).toBeInTheDocument();
    await userEvent.type(screen.getByRole('textbox'), 'bajo{enter}');
    expect(enviadas(fetch)).toEqual([['bajo']]);
  });

  it('reloj: mueve las manecillas y manda la hora', async () => {
    const { fetch } = abrir(base('reloj', { pistas: ['I · 2 0 3'] }));
    expect(screen.getByText('I · 2 0 3')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'HORA más' })); // 12 -> 1
    await userEvent.click(screen.getByRole('button', { name: 'HORA menos' })); // 1 -> 12
    await userEvent.click(screen.getByRole('button', { name: 'HORA menos' })); // 12 -> 11
    await userEvent.click(screen.getByRole('button', { name: 'MIN menos' })); // 00 -> 55
    await userEvent.click(screen.getByRole('button', { name: 'MIN más' })); // 55 -> 00
    await userEvent.click(screen.getByRole('button', { name: 'MIN más' })); // 00 -> 05
    expect(screen.getByLabelText('MIN')).toHaveTextContent('05');
    await userEvent.click(screen.getByRole('button', { name: 'ENVIAR' }));
    expect(enviadas(fetch)).toEqual([['11:05']]);
  });

  it('uv: sin lámpara el cuadro no muestra nada; con lámpara se ve el mensaje', async () => {
    const datos = { cuadro: 'Retrato', sinObjeto: 'Hace falta una lámpara UV', oculto: 'LA CLAVE ES LUNA' };
    const { unmount } = render(<ModalAcertijo dto={base('uv', datos, { tieneObjeto: false })} matchId="m1"
                                              onCerrar={() => {}} onResuelto={() => {}} />);
    expect(screen.getByText('Hace falta una lámpara UV')).toBeInTheDocument();
    expect(screen.queryByText('LA CLAVE ES LUNA')).not.toBeInTheDocument();
    unmount();
    const { fetch } = abrir(base('uv', datos, { tieneObjeto: true }));
    expect(screen.getByText('LA CLAVE ES LUNA')).toBeInTheDocument();
    await userEvent.type(screen.getByRole('textbox'), 'luna{enter}');
    expect(enviadas(fetch)).toEqual([['luna']]);
  });

  it('solo pistas: muestra las pistas propias, sin responder, y se cierra', async () => {
    const { onCerrar, fetch } = abrir(base('reloj', { pistas: ['II · 1 1 2'] }), { soloPistas: true });
    const dialogo = screen.getByRole('dialog');
    expect(within(dialogo).getByText('TUS PISTAS')).toBeInTheDocument();
    expect(within(dialogo).getByText('II · 1 1 2')).toBeInTheDocument();
    expect(within(dialogo).queryByRole('button', { name: 'ENVIAR' })).not.toBeInTheDocument();
    expect(within(dialogo).getByText(/DÍCTALE TUS PISTAS/)).toBeInTheDocument();
    await userEvent.click(within(dialogo).getByRole('button', { name: 'CERRAR' }));
    expect(onCerrar).toHaveBeenCalled();
    expect(enviadas(fetch)).toEqual([]);
  });
});

describe('Partida con acertijos nuevos', () => {
  async function entrar(componentes, extra) {
    Sesion.iniciar({ userId: 'yo', username: 'ana' });
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const fetch = simularFetch({
      'GET /api/salas': [{ id: 'm1', nombre: 'Cripta', estado: 'EN_PARTIDA', anfitrionId: 'yo' }],
      'GET /api/salas/m1/equipos': [{ id: 'e1', numero: 1, cupoMaximo: 2, miembros: ['yo', 'compa'] }],
      'GET /api/partidas/m1/mapa': { ancho: 10, alto: 10, componentes },
      'GET /api/partidas/m1/equipos/e1/posiciones': [{ userId: 'yo', x: 2, y: 2, conectado: true }],
      'GET /api/partidas/m1/progreso': { equipos: [] },
      'GET /api/partidas/m1/resultado': respuesta(404, {}),
      'GET /api/partidas/m1/reto': respuesta(404, {}),
      'GET /api/partidas/m1/equipos/e1/inventario': { objetos: [] },
      'GET /api/partidas/m1/jugadores/yo/rol': { rol: 'VERDUGO' },
      'GET /api/partidas/m1/cronometro': { segundosRestantes: 200, tiempoAgotado: false },
      'GET /api/usuarios': [{ userId: 'compa', username: 'luis' }],
      'GET /api/chat/partidas/m1': [],
      'GET /api/chat/partidas/m1/equipo': [],
      ...extra,
    });
    renderEnRuta(<Partida />, { ruta: '/partida/m1', patron: '/partida/:salaId' });
    await act(() => stompFalso.conectar());
    await userEvent.click(await screen.findByRole('button', { name: /ENTENDIDO/ }));
    return fetch;
  }

  it('si el compañero lo tiene abierto, muestra mis pistas', async () => {
    await entrar([{ id: 'acertijo-1', tipo: 'ACERTIJO', x: 3, y: 2 }], {
      'POST /api/partidas/m1/acertijos/acertijo-1/bloqueo': respuesta(409, { error: 'bloqueado' }),
      'GET /api/partidas/m1/acertijos/acertijo-1': base('reloj', { pistas: ['II · 1 1 2'] }),
    });
    fireEvent.keyDown(window, { key: 'e' });
    expect(await screen.findByText('II · 1 1 2')).toBeInTheDocument();
    expect(document.querySelector('.pm-root')).toHaveClass('pm-con-acertijo');
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.queryByText('II · 1 1 2')).not.toBeInTheDocument();
  });

  it('si el acertijo no reparte pistas, solo avisa que está ocupado', async () => {
    await entrar([{ id: 'acertijo-1', tipo: 'ACERTIJO', x: 3, y: 2 }], {
      'POST /api/partidas/m1/acertijos/acertijo-1/bloqueo': respuesta(409, { error: 'bloqueado' }),
      'GET /api/partidas/m1/acertijos/acertijo-1': base('globo', {}),
    });
    fireEvent.keyDown(window, { key: 'e' });
    expect(await screen.findByText(/UN COMPAÑERO ESTÁ RESOLVIENDO/)).toBeInTheDocument();
  });

  it('recoge la lámpara UV del mapa', async () => {
    const fetch = await entrar([{ id: 'lampara-uv', tipo: 'OBJETO', x: 2, y: 1 }], {
      'POST /api/partidas/m1/objetos/lampara-uv/recoleccion': null,
    });
    expect(screen.getByText('LÁMPARA UV')).toBeInTheDocument();
    fireEvent.keyDown(window, { key: 'e' });
    await vi.waitFor(() => expect(fetch.mock.calls.some(([u, o]) => o.method === 'POST' && u.endsWith('/lampara-uv/recoleccion'))).toBe(true));
    // La lámpara no cuenta como llave
    await act(() => stompFalso.entregar('/topic/partidas/m1/equipos/e1/inventario',
      { objetos: [{ id: 'lampara-uv', nombre: 'Lámpara UV', recolectadoPor: 'yo' }] }));
    expect(screen.getByText(/LLAVES: 0/)).toBeInTheDocument();
  });
});

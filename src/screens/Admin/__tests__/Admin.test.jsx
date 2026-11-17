import { describe, it, expect, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Admin from '../Admin';
import { Sesion } from '../../../services/sesion';
import { respuesta, simularFetch } from '../../../test/fetchFalso';
import { renderEnRuta } from '../../../test/render';

const NEGOCIO = {
  totales: { jugadoresActivos: 12, partidasTerminadas: 3 },
  masUsadas: [{ funcion: 'mover', usos: 1200 }, { funcion: 'chat', usos: 300 }],
  jugadoresEnElTiempo: [{ momento: '2026-11-16T10:00:00Z', jugadores: 4 }, { momento: '2026-11-16T10:05:00Z', jugadores: 8 }],
};
const TECNICO = {
  usuariosConcurrentes: 5,
  replicas: [
    { servicio: 'c15-gameplay', replica: 'gameplay--abc12', peticiones: 900, p95: 40, porcentajeErrores: 0 },
    { servicio: 'c15-salas', replica: 'salas--zz999', peticiones: 0, sinSenal: true },
    { servicio: 'c15-social', replica: 'social--q1w2e', peticiones: 50, p95: 400, porcentajeErrores: 3, degradada: true, excepciones: 2 },
  ],
};
const ERRORES = [
  { traceId: 'abcd1234', hora: '2026-11-16T10:00:02Z', servicio: 'c15-gameplay', replica: 'gameplay--abc12', nivel: 'ERROR', estado: 500,
    ruta: '/dev/error', excepcion: 'IllegalStateException', mensaje: 'Error simulado', detalle: 'más detalle', pila: 'at x.y(Z.java:1)' },
  { traceId: 'abcd1234', hora: '2026-11-16T10:00:01Z', servicio: 'c15-gateway', replica: 'gw--11111', nivel: 'WARN', estado: 500,
    ruta: '/api/dev/error', mensaje: 'respuesta 500' },
];

function entrarComoAdmin() {
  Sesion.iniciar({ userId: 'admin1', username: 'jefa' });
}

describe('Admin', () => {
  it('sin sesión vuelve al login; un jugador vuelve al home', () => {
    renderEnRuta(<Admin admin={true} />, { ruta: '/admin' });
    expect(screen.getByTestId('ruta')).toHaveTextContent(/^\/$/);
  });

  it('un jugador que no es admin vuelve al home', () => {
    entrarComoAdmin();
    renderEnRuta(<Admin admin={false} />, { ruta: '/admin' });
    expect(screen.getByTestId('ruta')).toHaveTextContent('/home');
  });

  it('mientras comprueba el rol muestra un aviso', () => {
    entrarComoAdmin();
    renderEnRuta(<Admin admin={null} />, { ruta: '/admin' });
    expect(screen.getByRole('status')).toHaveTextContent('Comprobando acceso');
  });

  it('tablero de negocio con indicadores, lo más usado y jugadores en el tiempo; cambia de periodo', async () => {
    entrarComoAdmin();
    const fetch = simularFetch({ 'GET /api/admin/tablero/negocio': NEGOCIO });
    renderEnRuta(<Admin admin={true} />, { ruta: '/admin', patron: '/admin' });
    expect(await screen.findByText('Jugadores activos')).toBeInTheDocument();
    expect(screen.getByText('12')).toBeInTheDocument();
    expect(screen.getByText('mover')).toBeInTheDocument();
    expect(screen.getByText('Una barra por cada 5 min.')).toBeInTheDocument();
    expect(fetch.mock.calls[0][0]).toContain('minutos=60');

    await userEvent.click(screen.getByRole('button', { name: '24 horas' }));
    await waitFor(() => expect(fetch.mock.calls.at(-1)[0]).toContain('minutos=1440'));
  });

  it('negocio sin actividad', async () => {
    entrarComoAdmin();
    simularFetch({ 'GET /api/admin/tablero/negocio': {} });
    renderEnRuta(<Admin admin={true} />, { ruta: '/admin', patron: '/admin' });
    expect(await screen.findAllByText('Sin actividad en este periodo.')).toHaveLength(2);
  });

  it('tablero técnico: réplicas ordenadas por estado', async () => {
    entrarComoAdmin();
    simularFetch({ 'GET /api/admin/tablero/tecnico': TECNICO });
    renderEnRuta(<Admin admin={true} />, { ruta: '/admin?vista=tecnico', patron: '/admin' });
    const filas = await screen.findAllByRole('row');
    expect(filas.slice(1).map((f) => f.cells[0].textContent)).toEqual(['Sin señal', 'Degradada', 'OK']);
    expect(screen.getByText('Usuarios concurrentes')).toBeInTheDocument();
    expect(screen.getByText('400 ms')).toBeInTheDocument();
  });

  it('técnico sin réplicas', async () => {
    entrarComoAdmin();
    simularFetch({ 'GET /api/admin/tablero/tecnico': { usuariosConcurrentes: 0 } });
    renderEnRuta(<Admin admin={true} />, { ruta: '/admin?vista=tecnico', patron: '/admin' });
    expect(await screen.findByText('Sin actividad en este periodo.')).toBeInTheDocument();
  });

  it('errores del back: 503, 404 y reintentar', async () => {
    entrarComoAdmin();
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const fetch = simularFetch({ 'GET /api/admin/tablero/negocio': respuesta(503, {}) });
    renderEnRuta(<Admin admin={true} />, { ruta: '/admin', patron: '/admin' });
    expect(await screen.findByText('Los registros no están disponibles en este entorno.')).toBeInTheDocument();
    fetch.mockResolvedValue(respuesta(404, {}));
    await userEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
    expect(await screen.findByText(/no encontró la ruta del tablero/)).toBeInTheDocument();
  });

  it('un 403 del back lo saca al home', async () => {
    entrarComoAdmin();
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    simularFetch({ 'GET /api/admin/tablero/negocio': respuesta(403, {}) });
    renderEnRuta(<Admin admin={true} />, { ruta: '/admin', patron: '/admin' });
    await waitFor(() => expect(screen.getByTestId('ruta')).toHaveTextContent('/home'));
  });

  it('buscar error: valida el código, busca y muestra los registros en orden', async () => {
    entrarComoAdmin();
    const fetch = simularFetch({ 'GET /api/admin/errores/abcd1234': ERRORES });
    renderEnRuta(<Admin admin={true} />, { ruta: '/admin?vista=errores', patron: '/admin' });
    const campo = screen.getByLabelText('Código que vio el jugador');
    await userEvent.type(campo, 'xyz{enter}');
    expect(screen.getByRole('alert')).toHaveTextContent('código hexadecimal');

    await userEvent.clear(campo);
    await userEvent.type(campo, 'ABCD1234{enter}');
    expect(await screen.findByText('IllegalStateException · Error simulado')).toBeInTheDocument();
    const servicios = screen.getAllByRole('listitem').map((li) => li.querySelector('strong').textContent);
    expect(servicios).toEqual(['c15-gateway', 'c15-gameplay']);
    expect(screen.getByText('Ver pila')).toBeInTheDocument();
    expect(screen.getByTestId('ruta')).toHaveTextContent('codigo=abcd1234');

    await userEvent.click(screen.getByRole('button', { name: 'Buscar' }));
    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(2));
  });

  it('buscar error sin resultados', async () => {
    entrarComoAdmin();
    simularFetch({ 'GET /api/admin/errores/abcd1234': [] });
    renderEnRuta(<Admin admin={true} />, { ruta: '/admin?vista=errores&codigo=abcd1234', patron: '/admin' });
    expect(await screen.findByText(/No se encontró ese código/)).toBeInTheDocument();
  });
});

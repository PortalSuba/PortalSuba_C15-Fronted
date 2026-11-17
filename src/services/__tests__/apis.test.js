import { describe, it, expect } from 'vitest';
import { simularFetch } from '../../test/fetchFalso';
import { stompFalso } from '../../test/stompFalso';
import { salasApi, crearSala, salirDeSala, registrarSesionSala, unirseSala, unirseEquipo } from '../salasApi';
import { gameplayApi } from '../gameplayApi';
import { canales, MAX_LONGITUD_MENSAJE } from '../chatApi';
import { adminApi, codigoValido } from '../adminApi';
import { rankingJugadores, estadisticasDe } from '../estadisticasApi';

const llamadas = (fetch) => fetch.mock.calls.map(([url, op]) => `${op.method} ${url}${op.body ? ' ' + op.body : ''}`);
const todoVacio = () => simularFetch(() => ({ status: 204, ok: true, headers: { get: () => null } }));

describe('APIs del back', () => {
  it('salas: cada operación va a su ruta', async () => {
    const fetch = todoVacio();
    fetch.mockImplementation(async () => ({ status: 204, ok: true, headers: { get: () => null } }));
    await salasApi.listar();
    await salasApi.detalle('s1');
    await crearSala('Sala A');
    await crearSala({ nombre: 'Sala B', minutos: 10 });
    await salasApi.configurar('s1', 2, 2);
    await unirseSala('s1');
    await salasApi.equipos('s1');
    await unirseEquipo('e1');
    await salasApi.marcarListo('s1');
    await salasApi.desmarcarListo('s1');
    await salirDeSala('s1', 'auth0|u1');
    expect(llamadas(fetch)).toEqual([
      'GET /api/salas',
      'GET /api/salas/s1',
      'POST /api/salas {"nombre":"Sala A"}',
      'POST /api/salas {"nombre":"Sala B","minutos":10}',
      'PATCH /api/salas/s1/configuracion {"numEquipos":2,"jugadoresPorEquipo":2}',
      'POST /api/salas/s1/jugadores',
      'GET /api/salas/s1/equipos',
      'POST /api/equipos/e1/miembros',
      'POST /api/salas/s1/listo',
      'DELETE /api/salas/s1/listo',
      'DELETE /api/salas/s1/jugadores/auth0%7Cu1',
    ]);
  });

  it('gameplay: rutas de mapa, acertijos, reto y desarrollo', async () => {
    const fetch = todoVacio();
    fetch.mockImplementation(async () => ({ status: 204, ok: true, headers: { get: () => null } }));
    const g = gameplayApi;
    await g.mapa('m'); await g.mover('m', 'a|b', 1, 2); await g.posiciones('m', 'e');
    await g.miRol('m', 'u'); await g.rolesEquipo('m', 'e'); await g.inventario('m', 'e'); await g.recolectar('m', 'c');
    await g.abrirAcertijo('m', 'c'); await g.cerrarAcertijo('m', 'c'); await g.clickAcertijo('m', 'c', 'el', 3);
    await g.entradaAcertijo('m', 'c'); await g.reiniciarAcertijo('m', 'c'); await g.enviarSolucion('m', 'c', '42');
    await g.progreso('m'); await g.timer('m'); await g.resultado('m'); await g.estadoReto('m'); await g.clickReto('m');
    await g.salir('m', 'u'); await g.devIniciarTimer('m'); await g.devIniciarReto('m');
    const l = llamadas(fetch);
    expect(l).toContain('POST /api/partidas/m/jugadores/a%7Cb/movimiento {"x":1,"y":2}');
    expect(l).toContain('POST /api/partidas/m/acertijos/c/clicks {"elementoId":"el","valor":3}');
    expect(l).toContain('POST /api/partidas/m/acertijos/c/solucion {"respuesta":"42"}');
    expect(l).toContain('POST /dev/partidas/m/inicio?segundos=60');
    expect(l).toHaveLength(21);
  });

  it('registrar la sesión se manda por STOMP al conectar', async () => {
    registrarSesionSala('s1');
    gameplayApi.registrarSesion('m1');
    await stompFalso.conectar();
    const destinos = stompFalso.publicados.map((f) => f.destination);
    expect(destinos).toEqual(expect.arrayContaining(['/app/salas/s1/sesion', '/app/partidas/m1/sesion']));
  });

  it('chat: cada canal tiene su ruta y su tópico', async () => {
    const fetch = simularFetch({ 'GET /api/chat/global': [], 'POST /api/chat/partidas/m/equipo': { id: 1 } });
    expect(canales.global().topico).toBe('/topic/chat/global');
    expect(canales.sala('s').topico).toBe('/topic/chat/salas/s');
    expect(canales.partida('m').topico).toBe('/topic/chat/partidas/m');
    const eq = canales.equipo('m', 'e');
    expect(eq.topico).toBe('/topic/chat/partidas/m/equipos/e');
    await canales.global().historial();
    expect(await eq.enviar('hola')).toEqual({ id: 1 });
    expect(llamadas(fetch)[1]).toBe('POST /api/chat/partidas/m/equipo {"texto":"hola"}');
    expect(MAX_LONGITUD_MENSAJE).toBe(200);
  });

  it('admin y estadísticas', async () => {
    const fetch = todoVacio();
    await adminApi.negocio(60); await adminApi.tecnico(15); await adminApi.errores('abc 1');
    await rankingJugadores(); await estadisticasDe('a|b');
    expect(llamadas(fetch)).toEqual([
      'GET /api/admin/tablero/negocio?minutos=60',
      'GET /api/admin/tablero/tecnico?minutos=15',
      'GET /api/admin/errores/abc%201?dias=1',
      'GET /api/estadisticas/ranking?limite=10',
      'GET /api/estadisticas/jugadores/a%7Cb',
    ]);
  });

  it('codigoValido: hexadecimal de 8 a 32', () => {
    expect(codigoValido('abcd1234')).toBe(true);
    expect(codigoValido('ABCD1234ef')).toBe(true);
    expect(codigoValido('abc')).toBe(false);
    expect(codigoValido('zzzz1234')).toBe(false);
    expect(codigoValido('a'.repeat(33))).toBe(false);
  });
});

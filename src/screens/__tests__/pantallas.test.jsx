import { describe, it, expect, vi } from 'vitest';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderEnRuta } from '../../test/render';
import { respuesta, simularFetch } from '../../test/fetchFalso';
import { stompFalso } from '../../test/stompFalso';
import { auth0Falso } from '../../test/auth0Falso';
import { Sesion } from '../../services/sesion';
import Ranking from '../Home/Ranking';
import SalaCard, { codigoDe } from '../Home/SalaCard';
import { Ajustes, Perfil } from '../Home/Preferencias';
import { leerLocal, guardarLocal, leerAjustes, aplicarAjustes, obtenerAjustesActivos, claveAjustes, AJUSTES_INICIALES } from '../Home/almacenLocal';
import CrearSala from '../CrearSala/CrearSala';
import Login from '../Login/Login';
import ModalRol from '../Partida/ModalRol';
import ModalDesafio from '../Partida/ModalDesafio';
import ModalAcertijo from '../Partida/ModalAcertijo';
import { ApiError } from '../../services/http';

describe('Ranking', () => {
  const RANKING = [
    { posicion: 1, userId: 'u1', partidas: 3, victorias: 2, empates: 1, derrotas: 0, puntos: 7 },
    { posicion: 2, userId: 'u2', partidas: 1, victorias: 0, empates: 0, derrotas: 1, puntos: 0 },
  ];
  const MIAS = {
    puntos: 7, partidas: 3, victorias: 2, porcentajeVictorias: 67,
    ultimasPartidas: [{ matchId: 'm1', resultado: 'VICTORIA', puntajeEquipo: 2, jugadaEn: '2026-11-16T10:00:00Z' }],
  };

  it('muestra la tabla, mis estadísticas y se recarga cuando termina una partida', async () => {
    Sesion.iniciar({ userId: 'u1', username: 'ana' });
    const fetch = simularFetch({
      'GET /api/estadisticas/ranking': RANKING,
      'GET /api/estadisticas/jugadores/u1': MIAS,
      'GET /api/usuarios': [{ userId: 'u2', username: 'beto' }],
    });
    render(<Ranking userId="u1" />);
    expect(screen.getByText('CARGANDO RANKING...')).toBeInTheDocument();
    expect(await screen.findByText('BETO')).toBeInTheDocument();
    expect(screen.getByText('ANA')).toBeInTheDocument();
    expect(screen.getByText('67%')).toBeInTheDocument();
    expect(screen.getByText('VICTORIA')).toBeInTheDocument();

    const antes = fetch.mock.calls.length;
    await act(() => stompFalso.conectar());
    act(() => stompFalso.entregar('/topic/estadisticas/ranking', { matchId: 'm9' }));
    await waitFor(() => expect(fetch.mock.calls.length).toBeGreaterThan(antes));
  });

  it('sin partidas y con error', async () => {
    simularFetch({ 'GET /api/estadisticas/ranking': [], 'GET /api/estadisticas/jugadores/u1': { ...MIAS, ultimasPartidas: [] } });
    const { unmount } = render(<Ranking userId="u1" />);
    expect(await screen.findByText(/TODAVÍA NO HAY PARTIDAS/)).toBeInTheDocument();
    expect(screen.getByText('AÚN NO HAS TERMINADO NINGUNA')).toBeInTheDocument();
    unmount();

    vi.spyOn(console, 'warn').mockImplementation(() => {});
    simularFetch({ 'GET /api/estadisticas/ranking': respuesta(500, {}) });
    render(<Ranking userId="u1" />);
    expect(await screen.findByText('NO SE PUDO CARGAR EL RANKING')).toBeInTheDocument();
  });
});

describe('SalaCard', () => {
  const sala = { id: 'abcd-1', nombre: 'Cripta', anfitrionId: 'h', jugadoresActuales: 1, cupoTotal: 4, numEquipos: 2, jugadoresPorEquipo: 2, estado: 'DISPONIBLE' };

  it('sala con cupo: se puede unir', async () => {
    const onEntrar = vi.fn();
    render(<SalaCard sala={sala} userId="yo" nombreLider="hugo" onEntrar={onEntrar} miniatura="/x.png" />);
    expect(screen.getByText('SALA #ABCD - CRIPTA')).toBeInTheDocument();
    expect(screen.getByText('3 CUPOS LIBRES')).toBeInTheDocument();
    expect(screen.getByText('HUGO')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'UNIRSE' }));
    expect(onEntrar).toHaveBeenCalledWith(sala);
    expect(codigoDe(sala)).toBe('ABCD');
  });

  it('llena, en partida, anfitrión y volver a mi partida', () => {
    const { rerender } = render(<SalaCard sala={{ ...sala, jugadoresActuales: 4 }} userId="yo" nombreLider="hugo" />);
    expect(screen.getByText('SALA LLENA')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'UNIRSE' })).toBeDisabled();
    rerender(<SalaCard sala={{ ...sala, jugadoresActuales: 3 }} userId="yo" nombreLider="hugo" />);
    expect(screen.getByText('1 CUPO LIBRE')).toBeInTheDocument();
    rerender(<SalaCard sala={{ ...sala, estado: 'EN_PARTIDA' }} userId="yo" nombreLider="hugo" miPartida />);
    expect(screen.getByText('EN PROGRESO')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'VOLVER' })).toBeEnabled();
    rerender(<SalaCard sala={sala} userId="h" nombreLider="hugo" />);
    expect(screen.getByText('TÚ')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'ENTRAR' })).toBeEnabled();
  });
});

describe('Preferencias', () => {
  it('Ajustes avisa cada cambio', async () => {
    const onCambiar = vi.fn();
    render(<Ajustes ajustes={{ ...AJUSTES_INICIALES, volumen: 0 }} onCambiar={onCambiar} />);
    await userEvent.click(screen.getByRole('checkbox', { name: /Efectos de sonido/ }));
    await userEvent.click(screen.getByRole('checkbox', { name: /Mostrar chat global/ }));
    await userEvent.click(screen.getByRole('checkbox', { name: /Reducir movimiento/ }));
    expect(onCambiar.mock.calls).toEqual([['efectos', false], ['chatGlobal', false], ['reducirMovimiento', true]]);
    expect(screen.getByRole('button', { name: 'PROBAR SONIDO' })).toBeDisabled();
  });

  it('Perfil guarda el alias y dice si pudo', async () => {
    const onGuardar = vi.fn().mockReturnValueOnce(true).mockReturnValueOnce(false);
    render(<Perfil username="ana" alias="" puntos={7} onGuardar={onGuardar} />);
    const boton = screen.getByRole('button', { name: 'GUARDAR ALIAS' });
    expect(boton).toBeDisabled();
    await userEvent.type(screen.getByLabelText('Alias de la credencial'), ' Anita ');
    await userEvent.click(boton);
    expect(onGuardar).toHaveBeenCalledWith('Anita');
    expect(screen.getByRole('status')).toHaveTextContent('Credencial actualizada.');
    await userEvent.type(screen.getByLabelText('Alias de la credencial'), 'X');
    await userEvent.click(boton);
    expect(screen.getByRole('status')).toHaveTextContent('No se pudo guardar');
  });

  it('almacenLocal lee y guarda los ajustes de cada jugador', () => {
    expect(leerLocal('nada', 5)).toBe(5);
    expect(guardarLocal(claveAjustes('u1'), { volumen: 10 })).toBe(true);
    expect(leerAjustes('u1')).toEqual({ ...AJUSTES_INICIALES, volumen: 10 });
    localStorage.setItem('roto', '{');
    expect(leerLocal('roto', 1)).toBe(1);
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('lleno'); });
    expect(guardarLocal('x', 1)).toBe(false);
    aplicarAjustes({ ...AJUSTES_INICIALES, reducirMovimiento: true });
    expect(document.documentElement.hasAttribute('data-c15-movimiento-reducido')).toBe(true);
    expect(obtenerAjustesActivos().reducirMovimiento).toBe(true);
  });
});

describe('CrearSala', () => {
  it('sin sesión vuelve al login', () => {
    renderEnRuta(<CrearSala />, { ruta: '/crear-sala' });
    expect(screen.getByTestId('ruta')).toHaveTextContent(/^\/$/);
  });

  it('valida el nombre, no deja repetir y crea la sala con la duración elegida', async () => {
    Sesion.iniciar({ userId: 'u1', username: 'ana' });
    const fetch = simularFetch({
      'GET /api/salas': [{ id: 'x', nombre: 'Cripta' }],
      'POST /api/salas': { id: 'nueva' },
      'POST /api/salas/nueva/jugadores': {},
    });
    renderEnRuta(<CrearSala />, { ruta: '/crear-sala' });
    const crear = screen.getByRole('button', { name: /CREAR SALA/ });
    await userEvent.click(crear);
    expect(screen.getByText('PONLE UN NOMBRE A LA SALA')).toBeInTheDocument();

    const nombre = screen.getByLabelText('NOMBRE DE LA SALA');
    await userEvent.type(nombre, 'cripta');
    expect(await screen.findByText('ESE NOMBRE YA ESTÁ EN EL CATÁLOGO')).toBeInTheDocument();
    await userEvent.click(crear);
    expect(screen.getByText('YA EXISTE UNA SALA CON ESE NOMBRE')).toBeInTheDocument();

    await userEvent.clear(nombre);
    await userEvent.type(nombre, 'Bóveda');
    await userEvent.click(screen.getByRole('button', { name: '10 MIN' }));
    await userEvent.click(screen.getByRole('button', { name: 'Dificultad 4' }));
    await userEvent.click(screen.getByRole('button', { name: /PRIVADA/ }));
    expect(screen.getByText(/DIFICULTAD 4\/5 · PRIVADA/)).toBeInTheDocument();
    await userEvent.type(nombre, '{enter}');

    await waitFor(() => expect(screen.getByTestId('ruta')).toHaveTextContent('/sala/nueva'));
    expect(fetch.mock.calls.find(([u, o]) => u === '/api/salas' && o.method === 'POST')[1].body)
      .toBe('{"nombre":"Bóveda","minutos":10}');
    expect(Sesion.salaId).toBe('nueva');
    expect(Sesion.obtener('configSala')).toMatchObject({ minutos: 10, dificultad: 4, visibilidad: 'privada' });
  });

  it('muestra el error del back y deja intentar de nuevo', async () => {
    Sesion.iniciar({ userId: 'u1', username: 'ana' });
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    simularFetch({ 'GET /api/salas': [], 'POST /api/salas': respuesta(400, { error: 'Nombre inválido' }) });
    renderEnRuta(<CrearSala />, { ruta: '/crear-sala' });
    await userEvent.type(screen.getByLabelText('NOMBRE DE LA SALA'), 'Sala');
    await userEvent.click(screen.getByRole('button', { name: /CREAR SALA/ }));
    expect(await screen.findByText('NOMBRE INVÁLIDO')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /CREAR SALA/ })).toBeEnabled();
  });

  it('volver al home', async () => {
    Sesion.iniciar({ userId: 'u1', username: 'ana' });
    simularFetch({ 'GET /api/salas': [] });
    renderEnRuta(<CrearSala />, { ruta: '/crear-sala' });
    await userEvent.click(screen.getByRole('button', { name: /VOLVER/ }));
    expect(screen.getByTestId('ruta')).toHaveTextContent('/home');
  });
});

describe('Login', () => {
  it('sin cuenta espera a que el jugador entre y lo manda al proveedor', async () => {
    renderEnRuta(<Login />);
    expect(await screen.findByText(/ESPERANDO IDENTIFICACIÓN/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /ENTRAR/ }));
    expect(auth0Falso.llamadas).toEqual([['login', undefined]]);
  });

  it('crear cuenta abre la página de registro del proveedor', async () => {
    renderEnRuta(<Login />);
    await userEvent.click(await screen.findByRole('button', { name: /CREA UNA/ }));
    expect(auth0Falso.llamadas).toEqual([['login', { authorizationParams: { screen_hint: 'signup' } }]]);
  });

  it('con sesión guardada va directo al home', () => {
    Sesion.iniciar({ userId: 'u1', username: 'ana' });
    renderEnRuta(<Login />);
    expect(screen.getByTestId('ruta')).toHaveTextContent('/home');
  });

  it('cuenta con perfil: acceso concedido y al home', async () => {
    auth0Falso.autenticado = true;
    simularFetch({ 'GET /api/perfil': { userId: 'u1', username: 'ana' } });
    renderEnRuta(<Login />);
    expect(await screen.findByText(/ACCESO CONCEDIDO/, { selector: 'p' })).toBeInTheDocument();
    await waitFor(() => expect(screen.getByTestId('ruta')).toHaveTextContent('/home'), { timeout: 2000 });
  });

  it('cuenta nueva: pide nombre, avisa si está en uso y luego entra', async () => {
    auth0Falso.autenticado = true;
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const registro = vi.fn()
      .mockResolvedValueOnce(respuesta(409, { error: 'en uso' }))
      .mockResolvedValueOnce(respuesta(200, { userId: 'u1', username: 'ana' }));
    simularFetch({ 'GET /api/perfil': respuesta(404, {}), 'POST /api/perfil': registro });
    renderEnRuta(<Login />);
    expect(await screen.findByText(/ELIGE TU NOMBRE DE JUGADOR/)).toBeInTheDocument();
    const confirmar = screen.getByRole('button', { name: /CONFIRMAR NOMBRE/ });
    await userEvent.click(confirmar);
    expect(screen.getByText(/ELIGE UN NOMBRE/, { selector: 'p' })).toBeInTheDocument();
    await userEvent.type(screen.getByRole('textbox'), 'ana');
    await userEvent.click(confirmar);
    expect(await screen.findByText(/ESE NOMBRE YA ESTÁ EN USO/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /CONFIRMAR NOMBRE/ }));
    expect(await screen.findByText(/ACCESO CONCEDIDO/, { selector: 'p' })).toBeInTheDocument();
  });

  it('error del proveedor', async () => {
    window.history.replaceState(null, '', '/?error=x&error_description=Bloqueado');
    renderEnRuta(<Login />);
    expect(await screen.findByText(/ACCESO DENEGADO: BLOQUEADO/)).toBeInTheDocument();
  });

  it('volver-al-login limpia la sesión y vuelve al proveedor', async () => {
    window.history.replaceState(null, '', '/?volver-al-login=1');
    Sesion.iniciar({ userId: 'u1', username: 'ana' });
    renderEnRuta(<Login />);
    await waitFor(() => expect(auth0Falso.llamadas).toEqual([['login', undefined]]));
    expect(Sesion.userId).toBeNull();
    window.history.replaceState(null, '', '/');
  });
});

describe('Modales de la partida', () => {
  it('ModalRol muestra el rol y se cierra solo a los 16 s', () => {
    vi.useFakeTimers();
    const onCerrar = vi.fn();
    render(<ModalRol userId="u1" rol="verdugo" username="ana" equipoNumero={2} onCerrar={onCerrar} />);
    expect(screen.getByText('VERDUGO')).toBeInTheDocument();
    expect(screen.getByText('SABOTEA AL RIVAL · EQUIPO 2')).toBeInTheDocument();
    act(() => vi.advanceTimersByTime(16000));
    act(() => vi.advanceTimersByTime(10));
    expect(onCerrar).toHaveBeenCalled();
    vi.useRealTimers();
  });

  it('ModalRol se cierra con el botón; rol desconocido = héroe', () => {
    const onCerrar = vi.fn();
    render(<ModalRol userId="u1" rol={null} onCerrar={onCerrar} />);
    expect(screen.getByText('HÉROE')).toBeInTheDocument();
    screen.getByRole('button', { name: /ENTENDIDO/ }).click();
    expect(onCerrar).toHaveBeenCalled();
  });

  it('ModalDesafio cuenta hacia atrás y avisa al terminar', () => {
    vi.useFakeTimers();
    const onFin = vi.fn();
    const nombreDe = (id) => id.toUpperCase();
    render(<ModalDesafio miEquipo={{ numero: 1, miembros: ['a'] }} rival={{ numero: 2, miembros: ['b', 'c'] }}
      miRol="VERDUGO" nombreDe={nombreDe} segundos={2} onFin={onFin} />);
    expect(screen.getByText('CADA CLIC RESTA 1 PUNTO AL EQUIPO RIVAL')).toBeInTheDocument();
    expect(screen.getByText('2 JUGADORES')).toBeInTheDocument();
    act(() => vi.advanceTimersByTime(2000));
    expect(onFin).toHaveBeenCalled();
    vi.useRealTimers();
  });

  it('ModalDesafio para héroe y sin rol', () => {
    const { rerender } = render(<ModalDesafio miRol="HEROE" nombreDe={(x) => x} onFin={() => {}} />);
    expect(screen.getByText('CADA CLIC SUMA 1 PUNTO A TU EQUIPO')).toBeInTheDocument();
    rerender(<ModalDesafio miRol={null} nombreDe={(x) => x} onFin={() => {}} />);
    expect(screen.getByText('NO TIENES ROL EN ESTE RETO')).toBeInTheDocument();
  });

  const DTO = {
    componenteMapaId: 'acertijo-2', enunciado: '¿Cuánto es 2+2?', resuelto: false,
    elementos: [{ id: 'n', tipo: 'campo-numero', descripcion: 'Número' }, { id: 'l', tipo: 'lista-ordenable', descripcion: 'Colores' }],
  };

  it('ModalAcertijo: pide respuesta, marca error y luego resuelve', async () => {
    const solucion = vi.fn()
      .mockResolvedValueOnce(respuesta(200, { correcto: false, mensaje: 'Incorrecto' }))
      .mockResolvedValueOnce(respuesta(200, { correcto: true, mensaje: 'Correcto' }));
    const fetch = simularFetch({ 'POST /api/partidas/m1/acertijos/acertijo-2/solucion': solucion });
    const onResuelto = vi.fn();
    render(<ModalAcertijo dto={DTO} matchId="m1" onCerrar={() => {}} onResuelto={onResuelto} />);
    expect(screen.getByText(/ACERTIJO 2/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'ENVIAR' }));
    expect(screen.getByRole('status')).toHaveTextContent('ESCRIBE UNA RESPUESTA');

    await userEvent.type(screen.getByRole('spinbutton'), '4');
    await userEvent.type(screen.getByRole('textbox'), 'rojo, azul');
    await userEvent.click(screen.getByRole('button', { name: 'ENVIAR' }));
    expect(await screen.findByText('INCORRECTO')).toBeInTheDocument();
    expect(fetch.mock.calls[0][1].body).toBe('{"respuesta":["4","rojo","azul"]}');

    await userEvent.type(screen.getByRole('spinbutton'), '{enter}');
    expect(await screen.findByText('CORRECTO')).toBeInTheDocument();
    expect(onResuelto).toHaveBeenCalledWith('acertijo-2');
    expect(screen.getByRole('button', { name: 'CERRAR' })).toBeInTheDocument();
  });

  it('ModalAcertijo: tomado por otro compañero, ya resuelto y cerrar con Escape', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    simularFetch({ 'POST /api/partidas/m1/acertijos/acertijo-2/solucion': respuesta(409, { error: 'x' }) });
    const onCerrar = vi.fn();
    const { unmount } = render(<ModalAcertijo dto={DTO} matchId="m1" onCerrar={onCerrar} onResuelto={() => {}} />);
    await userEvent.type(screen.getByRole('spinbutton'), '4{enter}');
    expect(await screen.findByText('OTRO COMPAÑERO TOMÓ ESTE ACERTIJO')).toBeInTheDocument();
    await userEvent.keyboard('{Escape}');
    expect(onCerrar).toHaveBeenCalled();
    unmount();

    render(<ModalAcertijo dto={{ ...DTO, resuelto: true }} matchId="m1" onCerrar={() => {}} onResuelto={() => {}} />);
    expect(screen.getByText('TU EQUIPO YA RESOLVIÓ ESTE ACERTIJO')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'ENVIAR' })).not.toBeInTheDocument();
    expect(new ApiError(409, '').esConflicto).toBe(true);
  });
});

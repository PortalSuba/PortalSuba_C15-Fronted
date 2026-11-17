import { describe, it, expect, vi } from 'vitest';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Chat from '../Chat';
import ConfirmarCerrarSesion from '../ConfirmarCerrarSesion';
import { stompFalso } from '../../test/stompFalso';
import { simularFetch } from '../../test/fetchFalso';
import { ApiError } from '../../services/http';

const msg = (id, userId, texto, seg = id) => ({ id, userId, texto, enviadoEn: `2026-11-16T10:00:${String(seg).padStart(2, '0')}Z` });

function canalFalso({ historial = [], enviar } = {}) {
  return {
    topico: '/topic/chat/prueba',
    historial: vi.fn().mockResolvedValue(historial),
    enviar: enviar ?? vi.fn(async (texto) => msg(99, 'yo', texto, 59)),
  };
}

describe('Chat', () => {
  it('carga el historial al conectar, recibe en vivo sin repetir y avisa mensajes de otros', async () => {
    simularFetch({ 'GET /api/usuarios': [{ userId: 'otro', username: 'luis' }] });
    const canal = canalFalso({ historial: [msg(1, 'otro', 'hola')] });
    const onNuevo = vi.fn();
    render(<Chat canal={canal} userId="yo" titulo="Global" onNuevo={onNuevo} />);
    expect(screen.getByText('AÚN NO HAY MENSAJES. ¡SALUDA!')).toBeInTheDocument();

    await act(() => stompFalso.conectar());
    expect(await screen.findByText('hola')).toBeInTheDocument();
    expect(await screen.findByText('LUIS')).toBeInTheDocument();

    act(() => stompFalso.entregar('/topic/chat/prueba', msg(1, 'otro', 'hola')));
    act(() => stompFalso.entregar('/topic/chat/prueba', msg(2, 'otro', 'qué tal')));
    act(() => stompFalso.entregar('/topic/chat/prueba', { sinId: true }));
    expect(screen.getAllByRole('listitem')).toHaveLength(2);
    expect(onNuevo).toHaveBeenCalledTimes(2);
  });

  it('envía el mensaje sin espacios y limpia el campo', async () => {
    simularFetch({ 'GET /api/usuarios': [] });
    const canal = canalFalso();
    render(<Chat canal={canal} userId="yo" />);
    const campo = screen.getByLabelText('Mensaje');
    expect(screen.getByRole('button', { name: 'ENVIAR' })).toBeDisabled();
    await userEvent.type(campo, '  buenas  {enter}');
    expect(canal.enviar).toHaveBeenCalledWith('buenas');
    expect(await screen.findByText('buenas')).toBeInTheDocument();
    expect(campo).toHaveValue('');
  });

  it.each([
    [new ApiError(429, 'x'), 'VAS MUY RÁPIDO, ESPERA UN MOMENTO'],
    [new ApiError(409, 'x'), 'ESTE CHAT YA ESTÁ CERRADO'],
    [new ApiError(403, 'x'), 'YA NO ESTÁS AQUÍ'],
    [new ApiError(400, 'Mensaje muy largo'), 'MENSAJE MUY LARGO'],
    [new ApiError(500, 'Algo falló', 'abcdef123456'), 'NO SE PUDO ENVIAR, INTENTA DE NUEVO (CÓDIGO ABCDEF12)'],
  ])('muestra el error del envío (%s)', async (error, texto) => {
    const canal = canalFalso({ enviar: vi.fn().mockRejectedValue(error) });
    render(<Chat canal={canal} userId="yo" />);
    await userEvent.type(screen.getByLabelText('Mensaje'), 'hola{enter}');
    expect(await screen.findByRole('alert')).toHaveTextContent(texto);
    await userEvent.type(screen.getByLabelText('Mensaje'), 'a');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('muestra el contador cerca del límite', async () => {
    render(<Chat canal={canalFalso()} userId="yo" />);
    await userEvent.click(screen.getByLabelText('Mensaje'));
    await userEvent.paste('x'.repeat(185));
    expect(screen.getByText('185/200')).toBeInTheDocument();
  });

  it('si falla el historial igual queda vacío y usable', async () => {
    const canal = canalFalso();
    canal.historial.mockRejectedValue(new Error('x'));
    render(<Chat canal={canal} userId="yo" />);
    await act(() => stompFalso.conectar());
    await waitFor(() => expect(canal.historial).toHaveBeenCalled());
    expect(screen.getByText('AÚN NO HAY MENSAJES. ¡SALUDA!')).toBeInTheDocument();
  });
});

describe('ConfirmarCerrarSesion', () => {
  it('pide confirmación antes de cerrar la sesión', async () => {
    const onConfirmar = vi.fn();
    render(<ConfirmarCerrarSesion onConfirmar={onConfirmar}>SALIR</ConfirmarCerrarSesion>);
    await userEvent.click(screen.getByRole('button', { name: 'SALIR' }));
    await userEvent.click(screen.getByRole('button', { name: 'Cancelar', hidden: true }));
    expect(onConfirmar).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole('button', { name: 'SALIR' }));
    await userEvent.click(screen.getByRole('button', { name: 'Cerrar sesión', hidden: true }));
    expect(onConfirmar).toHaveBeenCalledTimes(1);
  });
});

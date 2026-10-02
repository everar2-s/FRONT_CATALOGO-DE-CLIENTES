import { afterEach, describe, expect, it, vi } from 'vitest';
import { ClientesService } from './clientes.service';

describe('ClientesService', () => {
  afterEach(() => vi.unstubAllGlobals());
  const fila = { Cli_Id: '001', Cli_Nombre: 'Ana', Cli_FechaNa: '2000-01-01', Cli_Edad: 26 };
  it('maps columns and retrieves subsequent pages', async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(new Response(JSON.stringify([fila]))).mockResolvedValueOnce(new Response('[]'));
    vi.stubGlobal('fetch', fetchMock);
    expect(await new ClientesService().listar()).toEqual([{ clave: '001', nombre: 'Ana', fechaNacimiento: '2000-01-01' }]);
    expect(fetchMock.mock.calls[1][0]).toContain('offset=1');
  });
  it('sends the exact columns and filters updates by the original key', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify([fila])));
    vi.stubGlobal('fetch', fetchMock);
    await new ClientesService().guardar({ clave: '001', nombre: 'Ana', fechaNacimiento: '2000-01-01' }, 26, '001');
    const [url, options] = fetchMock.mock.calls[0];
    expect(new URL(url).searchParams.get('Cli_Id')).toBe('eq.001');
    expect(options.method).toBe('PATCH');
    expect(JSON.parse(options.body)).toEqual(fila);
  });
  it('does not report success when RLS affects no rows', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('[]')));
    await expect(new ClientesService().eliminar('001')).rejects.toThrow('No se confirmó');
  });
  it.each(['001', 'A&B+ #%,.:()', 'A"B\\C'])('deletes using the exact key %s without adding quotes or query parameters', async clave => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify([{ ...fila, Cli_Id: clave }])));
    vi.stubGlobal('fetch', fetchMock);
    await new ClientesService().eliminar(clave);
    const [url, options] = fetchMock.mock.calls[0];
    expect([...new URL(url).searchParams.entries()]).toEqual([['Cli_Id', `eq.${clave}`]]);
    expect(options.method).toBe('DELETE');
  });
});

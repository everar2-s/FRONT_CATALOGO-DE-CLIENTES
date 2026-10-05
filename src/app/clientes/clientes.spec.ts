import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { Clientes } from './clientes';
import { ClientesService } from './clientes.service';

describe('Clientes', () => {
  const existente = { clave: 'cli001', nombre: 'Cliente', fechaNacimiento: '2004-06-25' };
  let servicio: { listar: ReturnType<typeof vi.fn>; guardar: ReturnType<typeof vi.fn>; eliminar: ReturnType<typeof vi.fn> };
  beforeEach(async () => {
    servicio = { listar: vi.fn().mockResolvedValue([existente]), guardar: vi.fn().mockImplementation(async c => c), eliminar: vi.fn().mockResolvedValue(undefined) };
    await TestBed.configureTestingModule({ imports: [Clientes], providers: [{ provide: ClientesService, useValue: servicio }] }).compileComponents();
  });
  it('loads the real service and renders the catalog', async () => {
    const fixture = TestBed.createComponent(Clientes);
    await fixture.whenStable();
    expect(servicio.listar).toHaveBeenCalledOnce();
    expect(fixture.nativeElement.textContent).toContain('cli001');
    expect(fixture.nativeElement.querySelector('h1').textContent).toContain('CATÁLOGO DE CLIENTES');
  });
  it('creates, updates and deletes through the service', async () => {
    const app = TestBed.createComponent(Clientes).componentInstance;
    await app.cargar();
    app.cliente = { clave: '0005', nombre: 'Ana López', fechaNacimiento: '2000-01-01' };
    await app.guardar();
    expect(servicio.guardar).toHaveBeenLastCalledWith(app.cliente, app.edad(), null);
    expect(app.clientes()).toHaveLength(2);
    app.cliente.nombre = 'Ana Pérez';
    await app.guardar();
    expect(servicio.guardar).toHaveBeenLastCalledWith(app.cliente, app.edad(), '0005');
    expect(app.clientes()[0].nombre).toBe('Ana Pérez');
    await app.eliminar();
    expect(servicio.eliminar).toHaveBeenCalledWith('0005');
    expect(app.clientes()).toEqual([existente]);
  });
  it('preserves data and form when a write fails', async () => {
    const app = TestBed.createComponent(Clientes).componentInstance;
    await app.cargar();
    app.seleccionar(existente);
    app.cliente.nombre = 'Cambio';
    servicio.guardar.mockRejectedValue(new Error('Permiso denegado'));
    await app.guardar();
    expect(app.clientes()).toEqual([existente]);
    expect(app.cliente.nombre).toBe('Cambio');
    expect(app.mensaje()).toBe('Permiso denegado');
    servicio.eliminar.mockRejectedValue(new Error('Permiso denegado'));
    await app.eliminar();
    expect(app.clientes()).toEqual([existente]);
    expect(app.ocupado()).toBe(false);
  });
  it('rejects duplicate keys and future birthdays before sending requests', async () => {
    const app = TestBed.createComponent(Clientes).componentInstance;
    await app.cargar();
    app.cliente = { ...existente };
    await app.guardar();
    expect(app.mensaje()).toContain('Ya existe');
    app.cliente = { clave: '0005', nombre: 'Futuro', fechaNacimiento: '2999-01-01' };
    await app.guardar();
    expect(servicio.guardar).not.toHaveBeenCalled();
  });
  it('loads an existing customer when its key is entered and leaves new keys ready for capture', async () => {
    const app = TestBed.createComponent(Clientes).componentInstance;
    await app.cargar();
    app.cliente.clave = existente.clave;
    app.buscarClave();
    expect(app.cliente).toEqual(existente);
    expect(app.seleccionada()).toBe(existente.clave);

    app.nuevo();
    app.cliente.clave = 'nueva';
    app.buscarClave();
    expect(app.seleccionada()).toBeNull();
    expect(app.cliente).toEqual({ clave: 'nueva', nombre: '', fechaNacimiento: '' });
  });
});

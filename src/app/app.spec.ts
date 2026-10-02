import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { App } from './app';
import { ClientesService } from './clientes/clientes.service';

describe('App', () => {
  it('renders the clientes component and its catalog', async () => {
    const listar = vi.fn().mockResolvedValue([]);
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [{ provide: ClientesService, useValue: { listar } }]
    }).compileComponents();
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('app-clientes')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('h1').textContent).toContain('CAT\u00c1LOGO DE CLIENTES');
    expect(listar).toHaveBeenCalledOnce();
  });
});

import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ClientesService } from './clientes.service';
import { Cliente } from './interfaces';

@Component({ selector: 'app-clientes', imports: [FormsModule], templateUrl: './clientes.html', styleUrl: './clientes.css' })
export class Clientes implements OnInit {
  private readonly servicio = inject(ClientesService);
  readonly hoy = new Date().toLocaleDateString('sv-SE');
  readonly clientes = signal<Cliente[]>([]);
  readonly ocupado = signal(false);
  readonly cargado = signal(false);
  readonly seleccionada = signal<string | null>(null);
  readonly mensaje = signal('');
  readonly confirmando = signal(false);
  cliente: Cliente = this.vacio();

  ngOnInit(): void { void this.cargar(); }
  async cargar(): Promise<void> {
    if (this.ocupado()) return;
    this.ocupado.set(true);
    this.mensaje.set('Cargando clientes…');
    try {
      this.clientes.set(await this.servicio.listar());
      this.cargado.set(true);
      this.mensaje.set('');
    } catch (error) { this.mostrarError(error); }
    finally { this.ocupado.set(false); }
  }
  edad(): number | null {
    if (!this.cliente.fechaNacimiento) return null;
    const nacimiento = new Date(this.cliente.fechaNacimiento + 'T00:00:00');
    if (Number.isNaN(nacimiento.getTime())) return null;
    const ahora = new Date();
    let edad = ahora.getFullYear() - nacimiento.getFullYear();
    if (ahora.getMonth() < nacimiento.getMonth() || (ahora.getMonth() === nacimiento.getMonth() && ahora.getDate() < nacimiento.getDate())) edad--;
    return edad;
  }
  nuevo(): void {
    this.cliente = this.vacio();
    this.seleccionada.set(null);
    this.confirmando.set(false);
    this.mensaje.set('');
  }
  seleccionar(cliente: Cliente): void {
    if (this.ocupado()) return;
    this.cliente = { ...cliente };
    this.seleccionada.set(cliente.clave);
    this.confirmando.set(false);
    this.mensaje.set('');
  }
  buscarClave(): void {
    if (this.seleccionada() !== null || this.ocupado()) return;
    const clave = this.cliente.clave.trim();
    if (!clave) return;
    const existente = this.clientes().find(cliente => cliente.clave === clave);
    if (existente) {
      this.cliente = { ...existente };
      this.seleccionada.set(existente.clave);
      this.mensaje.set('Ya existe un cliente con esa clave. Se cargaron sus datos para editar.');
    } else {
      this.cliente = { ...this.cliente, nombre: '', fechaNacimiento: '' };
      this.mensaje.set('Clave disponible. Continúa capturando los datos del cliente.');
    }
  }
  async guardar(): Promise<void> {
    if (this.ocupado() || !this.cargado()) return;
    const registro = { ...this.cliente, clave: this.cliente.clave.trim(), nombre: this.cliente.nombre.trim() };
    const edad = this.edad();
    if (!registro.clave || !registro.nombre || edad === null || edad < 0 || registro.fechaNacimiento > this.hoy) {
      this.mensaje.set('Completa la clave, el nombre y una fecha de nacimiento válida que no sea futura.');
      return;
    }
    if (this.seleccionada() === null && this.clientes().some(c => c.clave === registro.clave)) {
      this.mensaje.set('Ya existe un cliente con esa clave. Selecciónalo en la tabla para editarlo.');
      return;
    }
    this.ocupado.set(true);
    try {
      const guardado = await this.servicio.guardar(registro, edad, this.seleccionada());
      this.clientes.update(clientes => (this.seleccionada() === null ? [...clientes, guardado] : clientes.map(c => c.clave === this.seleccionada() ? guardado : c)).sort((a, b) => a.clave.localeCompare(b.clave, 'es', { numeric: true })));
      this.cliente = { ...guardado };
      this.seleccionada.set(guardado.clave);
      this.confirmando.set(false);
      this.mensaje.set('Cliente guardado en Supabase.');
    } catch (error) { this.mostrarError(error); }
    finally { this.ocupado.set(false); }
  }
  async eliminar(): Promise<void> {
    const clave = this.seleccionada();
    if (clave === null || this.ocupado()) return;
    this.ocupado.set(true);
    try {
      await this.servicio.eliminar(clave);
      this.clientes.update(clientes => clientes.filter(c => c.clave !== clave));
      this.nuevo();
      this.mensaje.set('Cliente eliminado de Supabase.');
    } catch (error) { this.mostrarError(error); }
    finally { this.ocupado.set(false); }
  }
  private mostrarError(error: unknown): void { this.mensaje.set(error instanceof Error ? error.message : 'No se pudo completar la operación.'); }
  private vacio(): Cliente { return { clave: '', nombre: '', fechaNacimiento: '' }; }
}

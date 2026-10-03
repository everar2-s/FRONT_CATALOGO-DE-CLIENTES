import { Injectable } from '@angular/core';

import { Cliente, FilaCliente } from './interfaces';

@Injectable({ providedIn: 'root' })
export class ClientesService {
  private readonly url = 'https://ovzqeujcyxdrtvsxnype.supabase.co/rest/v1/Clientes';
  // Clave pública anon: los permisos de acceso se controlan en Supabase mediante RLS.
  private readonly apiKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im92enFldWpjeXhkcnR2c3hueXBlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA4ODM2NTQsImV4cCI6MjEwNjQ1OTY1NH0.yZjoev7syLqvdtjx5LOjQGk0_NUDNJOlPTW2v8fhNMo';

  async listar(): Promise<Cliente[]> {
    const clientes: Cliente[] = [];
    let offset = 0;
    while (true) {
      const filas = await this.solicitar(`?select=Cli_Id,Cli_Nombre,Cli_FechaNa,Cli_Edad&order=Cli_Id.asc&limit=500&offset=${offset}`);
      clientes.push(...filas.map(fila => this.convertir(fila)));
      if (filas.length === 0) return clientes;
      offset += filas.length;
    }
  }
  async guardar(cliente: Cliente, edad: number, claveOriginal: string | null): Promise<Cliente> {
    const filas = await this.solicitar(claveOriginal === null ? '' : this.filtro(claveOriginal), {
      method: claveOriginal === null ? 'POST' : 'PATCH',
      body: JSON.stringify({ Cli_Id: cliente.clave, Cli_Nombre: cliente.nombre, Cli_FechaNa: cliente.fechaNacimiento, Cli_Edad: edad })
    });
    if (filas.length !== 1) throw new Error('No se confirmó el guardado. Revisa los permisos y que Cli_Id sea único.');
    return this.convertir(filas[0]);
  }
  async eliminar(clave: string): Promise<void> {
    const filas = await this.solicitar(this.filtro(clave), { method: 'DELETE' });
    if (filas.length !== 1) throw new Error('No se confirmó la eliminación. El registro pudo cambiar o faltar permisos.');
  }
  private filtro(clave: string): string {
    // El filtro eq compara el valor literal; URLSearchParams codifica la clave.
    return '?' + new URLSearchParams({ Cli_Id: `eq.${clave}` }).toString();
  }
  private convertir(fila: FilaCliente): Cliente {
    return { clave: fila.Cli_Id, nombre: fila.Cli_Nombre, fechaNacimiento: fila.Cli_FechaNa ?? '' };
  }
  private async solicitar(query: string, opciones: RequestInit = {}): Promise<FilaCliente[]> {
    let respuesta: Response;
    try {
      respuesta = await fetch(this.url + query, {
        ...opciones,
        headers: { apikey: this.apiKey, Authorization: `Bearer ${this.apiKey}`, 'Content-Type': 'application/json', Prefer: 'return=representation' },
        signal: AbortSignal.timeout(20000)
      });
    } catch { throw new Error('No se pudo contactar con Supabase. Revisa tu conexión y vuelve a intentar.'); }
    if (!respuesta.ok) {
      const error = await respuesta.json().catch(() => ({}));
      if (error.code === '23505') throw new Error('Ya existe un cliente con esa clave.');
      if (respuesta.status === 401 || respuesta.status === 403) throw new Error('Supabase rechazó la operación. Revisa los permisos de acceso y las políticas RLS de Clientes.');
      throw new Error(`Supabase: ${error.message || 'error ' + respuesta.status}`);
    }
    return respuesta.json();
  }
}

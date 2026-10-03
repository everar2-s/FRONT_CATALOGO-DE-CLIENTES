export interface Cliente {
  clave: string;
  nombre: string;
  fechaNacimiento: string;
}

export interface FilaCliente {
  Cli_Id: string;
  Cli_Nombre: string;
  Cli_FechaNa: string | null;
  Cli_Edad: number | null;
}

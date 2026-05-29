export interface Agente {
  id: string;

  nombre: string;

  tipo: string;

  proposito: string;

  fuente: string;

  descripcionFuente: string;

  regla: string;

  supervision: string;

  estado: "DRAFT" | "ACTIVE" | "DISABLED";
}
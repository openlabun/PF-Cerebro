export interface Title {
  _id?: string;
  nombre: string;
  descripcion: string;
  rareza: string; // comun, raro, epico, legendario
  iconoUrl?: string | null;
  creadoEn?: string;
}

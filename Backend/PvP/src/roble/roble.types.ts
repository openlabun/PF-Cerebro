export type RobleId = string;

// Respuesta de insertado de datos en ROBLE
export interface RobleInsertResponse<T = unknown> {
  inserted: T[];
  skipped: Array<{ index: number; reason: string; [key: string]: unknown }>;
}

// Respuesta de verificación de token en ROBLE
export interface RobleVerifyTokenResponse {
  valid?: boolean;
  uuid?: string;
  userId?: string;
  sub?: string;
  email?: string;
  role?: string;
  [key: string]: any; // Permite incluir cualquier otro campo adicional
}

export function generarCodigoAcceso(length = 6): string {
  const chars = 'ABCDEFGHJIKLMNPQRSTUVWXYZ0123456789';
  let out = '';
  for (let i = 0; i < length; i++) {
    out += chars[Math.floor(Math.random() * chars.length)];
  }
  return out;
}

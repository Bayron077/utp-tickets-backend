/** Formatea una fecha a dd/MM/yyyy (equivalente a formatearFecha() del Codigo.gs) */
export function formatearFecha(fecha: Date | string | null | undefined): string {
  if (!fecha) return "";
  const d = typeof fecha === "string" ? new Date(fecha) : fecha;
  if (isNaN(d.getTime())) return String(fecha);
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

/** Timestamp legible dd/MM/yyyy HH:mm:ss para constancia en correos (equivalente a timestampEnvio) */
export function timestampLegible(fecha: Date = new Date()): string {
  const dd = String(fecha.getDate()).padStart(2, "0");
  const mm = String(fecha.getMonth() + 1).padStart(2, "0");
  const yyyy = fecha.getFullYear();
  const hh = String(fecha.getHours()).padStart(2, "0");
  const mi = String(fecha.getMinutes()).padStart(2, "0");
  const ss = String(fecha.getSeconds()).padStart(2, "0");
  return `${dd}/${mm}/${yyyy} ${hh}:${mi}:${ss}`;
}

/** Fecha de hoy con hora en 00:00:00 (para comparar días sin la hora) */
export function hoyMedianoche(): Date {
  const h = new Date();
  h.setHours(0, 0, 0, 0);
  return h;
}

/** Diferencia en días completos entre dos fechas (redondeada) */
export function diferenciaDias(fechaLimite: Date, referencia: Date = hoyMedianoche()): number {
  const lim = new Date(fechaLimite);
  lim.setHours(0, 0, 0, 0);
  return Math.round((lim.getTime() - referencia.getTime()) / (1000 * 60 * 60 * 24));
}

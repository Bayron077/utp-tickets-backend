// Divide un texto en párrafos: una línea en blanco separa párrafos, mientras
// que los saltos de línea sueltos (típicos al pegar texto desde Word/Docs)
// se tratan como espacio para que el texto fluya y se pueda justificar.
export function parrafos(texto: string | null | undefined): string[] {
  if (!texto) return [];
  return texto
    .split(/\n\s*\n/)
    .map(p => p.replace(/\s*\n\s*/g, ' ').trim())
    .filter(p => p.length > 0);
}

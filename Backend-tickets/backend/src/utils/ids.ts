import { prisma } from "../db";

/** Genera el siguiente ID correlativo UTP-<año>-NNNN, igual que en el Apps Script original */
export async function generarSiguienteId(): Promise<string> {
  const anio = new Date().getFullYear();
  const tickets = await prisma.ticket.findMany({
    select: { id: true },
    where: { id: { startsWith: `UTP-${anio}-` } },
  });
  let ultimoNum = 0;
  for (const t of tickets) {
    const m = t.id.match(/(\d+)$/);
    if (m) ultimoNum = Math.max(ultimoNum, parseInt(m[1], 10));
  }
  const siguiente = ultimoNum + 1;
  return `UTP-${anio}-${String(siguiente).padStart(4, "0")}`;
}

/** SLA base en días según prioridad (fallback cuando el tipo de solicitud no trae días definidos) */
export function slaBasePorPrioridad(prioridad: string): number {
  if (prioridad === "Alta") return 1;
  if (prioridad === "Media") return 3;
  return 5; // Baja
}

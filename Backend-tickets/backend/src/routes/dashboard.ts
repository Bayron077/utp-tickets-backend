import { Router } from "express";
import { prisma } from "../db";
import { diferenciaDias } from "../utils/dates";

const router = Router();

/** GET /api/dashboard/metrics — equivale a obtenerMetricasDashboard() */
router.get("/metrics", async (_req, res) => {
  const tickets = await prisma.ticket.findMany();

  let total = 0, pendiente = 0, respondido = 0, gestionado = 0,
      respondidoTardio = 0, vencido = 0, proceso = 0;

  type Agg = { total: number; respondido: number; gestionado: number; tardio: number; vencido: number; pendiente: number; proceso: number; facultad?: string };
  const facMap: Record<string, Agg> = {};
  const progMap: Record<string, Agg> = {};

  for (const t of tickets) {
    total++;
    const estado = (t.estado || "").toLowerCase();
    const facultad = t.facultad || "Sin facultad";
    const programa = t.programa || "Sin programa";
    const diasRest = diferenciaDias(t.fechaLimite);

    let cls: keyof Agg;
    if (estado.includes("tardí") || estado.includes("tardi")) { cls = "tardio"; respondidoTardio++; }
    else if (estado.includes("gestion"))                        { cls = "gestionado"; gestionado++; }
    else if (estado.includes("respond"))                        { cls = "respondido"; respondido++; }
    else if (estado.includes("venc") || diasRest < 0)           { cls = "vencido"; vencido++; }
    else if (estado.includes("proceso"))                        { cls = "proceso"; proceso++; }
    else                                                        { cls = "pendiente"; pendiente++; }

    if (!facMap[facultad]) facMap[facultad] = { total: 0, respondido: 0, gestionado: 0, tardio: 0, vencido: 0, pendiente: 0, proceso: 0 };
    facMap[facultad].total++;
    facMap[facultad][cls]++;

    if (!progMap[programa]) progMap[programa] = { total: 0, respondido: 0, gestionado: 0, tardio: 0, vencido: 0, pendiente: 0, proceso: 0, facultad };
    progMap[programa].total++;
    progMap[programa][cls]++;
  }

  const completados = respondido + gestionado + respondidoTardio;

  const porFacultad = Object.entries(facMap).map(([nombre, d]) => ({
    nombre, total: d.total,
    completados: d.respondido + d.gestionado + d.tardio,
    tardio: d.tardio, vencido: d.vencido, pendiente: d.pendiente,
    pct: d.total > 0 ? Math.round(((d.respondido + d.gestionado + d.tardio) / d.total) * 100) : 0,
  })).sort((a, b) => b.total - a.total);

  const porPrograma = Object.entries(progMap).map(([nombre, d]) => ({
    nombre, facultad: d.facultad, total: d.total,
    completados: d.respondido + d.gestionado + d.tardio,
    tardio: d.tardio, vencido: d.vencido,
    pct: d.total > 0 ? Math.round(((d.respondido + d.gestionado + d.tardio) / d.total) * 100) : 0,
  })).sort((a, b) => b.total - a.total);

  res.json({
    totales: { total, pendiente, respondido, gestionado, respondidoTardio, vencido, proceso, completados },
    pctCumplimiento: total > 0 ? Math.round((completados / total) * 100) : 0,
    pctVencidos: total > 0 ? Math.round((vencido / total) * 100) : 0,
    porFacultad,
    porPrograma,
  });
});

export default router;

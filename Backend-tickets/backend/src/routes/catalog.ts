import { Router } from "express";
import { prisma } from "../db";

const router = Router();

/** GET /api/catalog/programas — equivale a obtenerProgramas() */
router.get("/programas", async (_req, res) => {
  const directores = await prisma.director.findMany({ orderBy: { programa: "asc" } });
  res.json(directores.map((d: { programa: string; facultad: string; responsable: string; correo: string }) => ({
    programa: d.programa, facultad: d.facultad, responsable: d.responsable, correo: d.correo,
  })));
});

/** GET /api/catalog/asesores — equivale a obtenerAsesores() */
router.get("/asesores", async (_req, res) => {
  const asesores = await prisma.asesor.findMany({ orderBy: { nombre: "asc" } });
  res.json(asesores.map((a: { nombre: string }) => a.nombre));
});

/** GET /api/catalog/tipos — equivale a obtenerTiposSolicitud() */
router.get("/tipos", async (_req, res) => {
  const tipos = await prisma.tipoSolicitud.findMany({ orderBy: { tipo: "asc" } });
  res.json(tipos.map((t: { tipo: string; dias: number | null; mensaje: string | null }) => ({ tipo: t.tipo, dias: t.dias, mensaje: t.mensaje })));
});

/** GET /api/catalog/decanos — [NUEVO] para administrar el mapeo Facultad -> Decano desde el panel */
router.get("/decanos", async (_req, res) => {
  const decanos = await prisma.decano.findMany({ orderBy: { facultad: "asc" } });
  res.json(decanos);
});

/** POST /api/catalog/decanos — [NUEVO] crea o actualiza el correo del decano de una facultad */
router.post("/decanos", async (req, res) => {
  const { facultad, correo, nombre } = req.body || {};
  if (!facultad || !correo) {
    return res.status(400).json({ exito: false, mensaje: "facultad y correo son obligatorios." });
  }
  const decano = await prisma.decano.upsert({
    where: { facultad },
    update: { correo, nombre },
    create: { facultad, correo, nombre },
  });
  res.json({ exito: true, decano });
});

export default router;

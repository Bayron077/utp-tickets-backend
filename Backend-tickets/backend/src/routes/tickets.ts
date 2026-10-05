import { Router } from "express";
import ExcelJS from "exceljs";
import type { Prisma, Ticket } from "@prisma/client";
import { prisma } from "../db";
import { config } from "../config";
import { formatearFecha, timestampLegible, hoyMedianoche, diferenciaDias } from "../utils/dates";
import { generarSiguienteId, slaBasePorPrioridad } from "../utils/ids";
import { enviarCorreoTicket } from "../mailer";

const router = Router();

function linkRespuesta(id: string) {
  return `${config.frontendUrl}/responder/${encodeURIComponent(id)}`;
}

// ============================================================
// GET /api/tickets — equivale a obtenerTodosLosTickets()
// ============================================================
router.get("/", async (_req, res) => {
  const tickets = await prisma.ticket.findMany({ orderBy: { fechaAsignacion: "desc" } });
  const hoy = hoyMedianoche();
  res.json(tickets.map((t: Ticket) => ({
    id: t.id,
    fechaAsignacion: formatearFecha(t.fechaAsignacion),
    programa: t.programa,
    facultad: t.facultad,
    tipo: t.tipo,
    prioridad: t.prioridad,
    estado: t.estado,
    responsable: t.responsable,
    fechaLimite: formatearFecha(t.fechaLimite),
    diasRestantes: diferenciaDias(t.fechaLimite, hoy),
    detalle: t.detalle,
    solicitadoPor: t.solicitadoPor || "",
    asesor: t.asesor || "",
    respuesta: t.respuesta || "",
  })));
});

// ============================================================
// GET /api/tickets/export — descarga los registros en Excel (.xlsx)
// query (todos opcionales): asesor, facultad, programa, estado, mes (1-12), anio
// mes se filtra sobre fecha_asignacion; si se envía mes sin anio, se usa el año actual.
// Debe ir ANTES de /:id para que "export" no se tome como un ID.
// ============================================================
router.get("/export", async (req, res) => {
  try {
    const filtro = (k: string) => (typeof req.query[k] === "string" && req.query[k] ? String(req.query[k]) : undefined);
    const where: Prisma.TicketWhereInput = {
      asesor: filtro("asesor"),
      facultad: filtro("facultad"),
      programa: filtro("programa"),
      estado: filtro("estado"),
    };

    const mesStr = filtro("mes");
    if (mesStr) {
      const mes = parseInt(mesStr, 10);
      const anio = parseInt(filtro("anio") || String(new Date().getFullYear()), 10);
      if (mes >= 1 && mes <= 12 && !isNaN(anio)) {
        where.fechaAsignacion = {
          gte: new Date(anio, mes - 1, 1),
          lt: new Date(anio, mes, 1),
        };
      }
    }

    const tickets = await prisma.ticket.findMany({ where, orderBy: { fechaAsignacion: "desc" } });
    const hoy = hoyMedianoche();

    const wb = new ExcelJS.Workbook();
    wb.creator = "Sistema de Tickets Posgrados UTP";
    const ws = wb.addWorksheet("Registros", { views: [{ state: "frozen", ySplit: 1 }] });

    ws.columns = [
      { header: "ID", key: "id", width: 16 },
      { header: "Fecha asignación", key: "fechaAsignacion", width: 16 },
      { header: "Programa", key: "programa", width: 40 },
      { header: "Facultad", key: "facultad", width: 30 },
      { header: "Tipo", key: "tipo", width: 28 },
      { header: "Prioridad", key: "prioridad", width: 11 },
      { header: "Estado", key: "estado", width: 18 },
      { header: "Responsable", key: "responsable", width: 30 },
      { header: "Correo responsable", key: "correoResponsable", width: 32 },
      { header: "Asesor", key: "asesor", width: 24 },
      { header: "Solicitado por", key: "solicitadoPor", width: 20 },
      { header: "SLA (días)", key: "slaAplicadoDias", width: 11 },
      { header: "Fecha límite", key: "fechaLimite", width: 14 },
      { header: "Días restantes", key: "diasRestantes", width: 14 },
      { header: "Fecha respuesta", key: "fechaRespuesta", width: 16 },
      { header: "Detalle", key: "detalle", width: 60 },
      { header: "Respuesta", key: "respuesta", width: 60 },
    ];

    for (const t of tickets) {
      ws.addRow({
        id: t.id,
        fechaAsignacion: formatearFecha(t.fechaAsignacion),
        programa: t.programa,
        facultad: t.facultad,
        tipo: t.tipo,
        prioridad: t.prioridad,
        estado: t.estado,
        responsable: t.responsable,
        correoResponsable: t.correoResponsable,
        asesor: t.asesor || "",
        solicitadoPor: t.solicitadoPor || "",
        slaAplicadoDias: t.slaAplicadoDias,
        fechaLimite: formatearFecha(t.fechaLimite),
        diasRestantes: diferenciaDias(t.fechaLimite, hoy),
        fechaRespuesta: formatearFecha(t.fechaRespuesta),
        detalle: t.detalle,
        respuesta: t.respuesta || "",
      });
    }

    const header = ws.getRow(1);
    header.font = { bold: true, color: { argb: "FFFFFFFF" } };
    header.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1A3A6B" } };
    header.alignment = { vertical: "middle" };
    ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: ws.columns.length } };

    const nombre = `registros_tickets_${formatearFecha(new Date()).split("/").reverse().join("-")}.xlsx`;
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", `attachment; filename="${nombre}"`);
    await wb.xlsx.write(res);
    res.end();
  } catch (err: any) {
    res.status(500).json({ exito: false, mensaje: "Error al exportar: " + err.message });
  }
});

// ============================================================
// GET /api/tickets/:id — equivale a obtenerTicketPorId()
// ============================================================
router.get("/:id", async (req, res) => {
  const t = await prisma.ticket.findUnique({ where: { id: req.params.id } });
  if (!t) return res.status(404).json({ mensaje: `El ID ${req.params.id} no existe en el sistema.` });
  res.json({
    id: t.id,
    fechaAsignacion: formatearFecha(t.fechaAsignacion),
    programa: t.programa,
    facultad: t.facultad,
    tipo: t.tipo,
    prioridad: t.prioridad,
    estado: t.estado,
    responsable: t.responsable,
    fechaLimite: formatearFecha(t.fechaLimite),
    diasRestantes: diferenciaDias(t.fechaLimite),
    detalle: t.detalle,
    solicitadoPor: t.solicitadoPor || "",
    respuestaPrevia: t.respuesta || "",
    asesor: t.asesor || "",
  });
});

// ============================================================
// POST /api/tickets — equivale a crearSolicitud()
// body: { programa, tipo, prioridad, solicitadoPor, detalle, slaBaseDias?, asesor }
// ============================================================
router.post("/", async (req, res) => {
  try {
    const { programa, tipo, prioridad, solicitadoPor, detalle, slaBaseDias, asesor } = req.body || {};
    if (!programa || !tipo || !prioridad || !detalle) {
      return res.status(400).json({ exito: false, mensaje: "Todos los campos son obligatorios." });
    }

    const director = await prisma.director.findUnique({ where: { programa } });
    if (!director) {
      return res.status(404).json({ exito: false, mensaje: "No se encontró el correo del director. Verifica el catálogo de programas." });
    }

    const id = await generarSiguienteId();
    const hoy = hoyMedianoche();
    const slaBase = typeof slaBaseDias === "number" && slaBaseDias > 0 ? slaBaseDias : slaBasePorPrioridad(prioridad);
    const fechaLimite = new Date(hoy);
    fechaLimite.setDate(fechaLimite.getDate() + slaBase);

    const ticket = await prisma.ticket.create({
      data: {
        id, fechaAsignacion: hoy, programa, facultad: director.facultad, tipo, prioridad,
        estado: "Pendiente", responsable: director.responsable,
        slaBaseDias: slaBase, ajustePrioridad: 0, slaAplicadoDias: slaBase,
        fechaLimite, detalle, solicitadoPor: solicitadoPor || "Agencia",
        correoResponsable: director.correo, asesor: asesor || "",
        alertaInicialEnviada: true, fechaAlertaInicial: new Date(),
      },
    });

    const timestampEnvio = timestampLegible();
    await enviarCorreoTicket({
      to: director.correo,
      tipo: "inicial", id, programa, facultad: director.facultad, tipoSol: tipo,
      fechaAsignacion: formatearFecha(hoy), fechaLimite: formatearFecha(fechaLimite),
      responsable: director.responsable, detalle, linkRespuesta: linkRespuesta(id), timestampEnvio,
    });

    res.json({ exito: true, id: ticket.id, responsable: director.responsable, mensaje: `Solicitud ${id} registrada. Correo enviado a ${director.responsable}.` });
  } catch (err: any) {
    res.status(500).json({ exito: false, mensaje: "Error del sistema: " + err.message });
  }
});

// ============================================================
// POST /api/tickets/masivo — equivale a envioMasivo()
// [CC] cada correo ya incluye automáticamente: CC_COORDINADOR + los 2 fijos
// (Director de Posgrados, Vicerrectoría Académica) + el decano de CADA facultad
// (se resuelve solo, dentro de enviarCorreoTicket -> construirCC)
// body: { tipo, detalle, prioridad, solicitadoPor?, slaBaseDias?, programas? }
// programas: string[] opcional con los nombres de programa destino.
// Si se omite o viene vacío, se envía a TODOS los programas registrados.
// ============================================================
router.post("/masivo", async (req, res) => {
  try {
    const { tipo, detalle, prioridad, solicitadoPor, slaBaseDias, programas } = req.body || {};
    if (!tipo || !detalle || !prioridad) {
      return res.status(400).json({ exito: false, mensaje: "Tipo, detalle y prioridad son obligatorios." });
    }
    if (programas !== undefined && !Array.isArray(programas)) {
      return res.status(400).json({ exito: false, mensaje: "programas debe ser un arreglo de nombres de programa." });
    }

    const directores = Array.isArray(programas) && programas.length > 0
      ? await prisma.director.findMany({ where: { programa: { in: programas } } })
      : await prisma.director.findMany();
    const hoy = hoyMedianoche();
    const timestampEnvio = timestampLegible();
    const slaBase = typeof slaBaseDias === "number" && slaBaseDias > 0 ? slaBaseDias : slaBasePorPrioridad(prioridad);
    const fechaLimite = new Date(hoy);
    fechaLimite.setDate(fechaLimite.getDate() + slaBase);

    let creados = 0;
    const errores: string[] = [];

    for (const d of directores) {
      if (!d.facultad || !d.programa || !d.correo) continue;
      try {
        const id = await generarSiguienteId();
        await prisma.ticket.create({
          data: {
            id, fechaAsignacion: hoy, programa: d.programa, facultad: d.facultad, tipo, prioridad,
            estado: "Pendiente", responsable: d.responsable,
            slaBaseDias: slaBase, ajustePrioridad: 0, slaAplicadoDias: slaBase,
            fechaLimite, detalle, solicitadoPor: solicitadoPor || "Agencia",
            correoResponsable: d.correo,
            alertaInicialEnviada: true, fechaAlertaInicial: new Date(),
          },
        });

        await enviarCorreoTicket({
          to: d.correo,
          tipo: "inicial", id, programa: d.programa, facultad: d.facultad, tipoSol: tipo,
          fechaAsignacion: formatearFecha(hoy), fechaLimite: formatearFecha(fechaLimite),
          responsable: d.responsable, detalle, linkRespuesta: linkRespuesta(id), timestampEnvio, masivo: true,
        });
        creados++;
      } catch (mailErr: any) {
        errores.push(`${d.programa}: ${mailErr.message}`);
      }
    }

    res.json({
      exito: true, creados, errores,
      mensaje: `✅ Envío masivo completado: ${creados} tickets creados y correos enviados (con copia a Dirección de Posgrados, Vicerrectoría Académica y decano de cada facultad).` +
               (errores.length > 0 ? ` ⚠️ ${errores.length} errores de correo.` : ""),
    });
  } catch (err: any) {
    res.status(500).json({ exito: false, mensaje: "Error del sistema: " + err.message });
  }
});

// ============================================================
// POST /api/tickets/:id/respuesta — equivale a procesarRespuesta()
// [F1] Si el ticket estaba vencido -> "Respondido tardío" (con constancia)
// ============================================================
router.post("/:id/respuesta", async (req, res) => {
  try {
    const { respuesta } = req.body || {};
    if (!respuesta || !String(respuesta).trim()) {
      return res.status(400).json({ exito: false, mensaje: "La respuesta no puede estar vacía." });
    }

    const t = await prisma.ticket.findUnique({ where: { id: req.params.id } });
    if (!t) return res.status(404).json({ exito: false, mensaje: "Ticket no encontrado en el sistema." });

    const diasRest = diferenciaDias(t.fechaLimite);
    const esTardia = (t.estado || "").toLowerCase().includes("venc") || diasRest < 0;
    const nuevoEstado = esTardia ? "Respondido tardío" : "Respondido";

    await prisma.ticket.update({
      where: { id: t.id },
      data: { respuesta: String(respuesta).trim(), estado: nuevoEstado, fechaRespuesta: new Date() },
    });

    const msg = esTardia
      ? "Respuesta registrada. Nota: esta solicitud estaba vencida, quedó marcada como 'Respondido tardío'."
      : "Respuesta registrada correctamente. ¡Gracias!";
    res.json({ exito: true, mensaje: msg, esTardia });
  } catch (err: any) {
    res.status(500).json({ exito: false, mensaje: "Error del sistema: " + err.message });
  }
});

// ============================================================
// POST /api/alerts/run — equivale a gestionarAlertasSLA()
// Protegido con CRON_SECRET; llamar desde un cron externo (Render Cron Job / cron-job.org)
// o desde el node-cron interno en index.ts.
// ============================================================
export async function ejecutarAlertasSLA() {
  const tickets = await prisma.ticket.findMany();
  const hoy = hoyMedianoche();
  const timestampEnvio = timestampLegible();
  let procesados = 0;

  for (const t of tickets) {
    try {
      // 1. Duplicados: mismo programa + tipo + fecha de asignación
      const duplicado = tickets.some((o: Ticket) =>
        o.id !== t.id && o.programa === t.programa && o.tipo === t.tipo &&
        o.fechaAsignacion.toDateString() === t.fechaAsignacion.toDateString()
      );
      if (duplicado) {
        if (!t.duplicado) {
          await prisma.ticket.update({ where: { id: t.id }, data: { duplicado: true, obsSistema: "Duplicado detectado automáticamente" } });
        }
        continue;
      }

      // 2. Validar correo
      const correo = (t.correoResponsable || "").trim();
      if (!correo || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) {
        await prisma.ticket.update({ where: { id: t.id }, data: { obsSistema: `Correo inválido o ausente: ${correo}` } });
        continue;
      }

      // 3. Alerta inicial (normalmente ya se envía al crear, esto es red de seguridad)
      if (!t.alertaInicialEnviada) {
        await enviarCorreoTicket({
          to: correo, tipo: "inicial", id: t.id, programa: t.programa, facultad: t.facultad, tipoSol: t.tipo,
          fechaAsignacion: formatearFecha(t.fechaAsignacion), fechaLimite: formatearFecha(t.fechaLimite),
          responsable: t.responsable, detalle: t.detalle, linkRespuesta: linkRespuesta(t.id), timestampEnvio,
        });
        await prisma.ticket.update({ where: { id: t.id }, data: { alertaInicialEnviada: true, fechaAlertaInicial: new Date() } });
      }

      if (["respondido", "gestionado", "respondido tardío"].includes((t.estado || "").toLowerCase())) continue;

      const dif = diferenciaDias(t.fechaLimite, hoy);

      // Preventiva: <= 1 día antes
      if (dif <= 1 && dif > 0 && !t.alertaPreventivaEnviada) {
        await enviarCorreoTicket({
          to: correo, tipo: "preventiva", id: t.id, programa: t.programa, facultad: t.facultad, tipoSol: t.tipo,
          fechaLimite: formatearFecha(t.fechaLimite), responsable: t.responsable, detalle: t.detalle,
          linkRespuesta: linkRespuesta(t.id), timestampEnvio,
        });
        await prisma.ticket.update({ where: { id: t.id }, data: { alertaPreventivaEnviada: true, fechaAlertaPreventiva: new Date() } });
      }

      // Vence hoy
      if (dif === 0 && !t.alertaVencimientoEnviada) {
        await enviarCorreoTicket({
          to: correo, tipo: "vencimiento", id: t.id, programa: t.programa, facultad: t.facultad, tipoSol: t.tipo,
          fechaLimite: formatearFecha(t.fechaLimite), responsable: t.responsable, detalle: t.detalle,
          linkRespuesta: linkRespuesta(t.id), timestampEnvio,
        });
        await prisma.ticket.update({ where: { id: t.id }, data: { alertaVencimientoEnviada: true, fechaAlertaVencimiento: new Date() } });
      }

      // Vencido
      if (dif < 0) {
        if (["pendiente", "en proceso"].includes((t.estado || "").toLowerCase())) {
          await prisma.ticket.update({ where: { id: t.id }, data: { estado: "Vencido" } });
        }
        if (!t.alertaVencidoEnviada) {
          await enviarCorreoTicket({
            to: correo, tipo: "vencido", id: t.id, programa: t.programa, facultad: t.facultad, tipoSol: t.tipo,
            fechaLimite: formatearFecha(t.fechaLimite), responsable: t.responsable, detalle: t.detalle,
            linkRespuesta: linkRespuesta(t.id), timestampEnvio,
          });
          await prisma.ticket.update({ where: { id: t.id }, data: { alertaVencidoEnviada: true, fechaAlertaVencido: new Date() } });
        }
      }

      procesados++;
    } catch (errFila: any) {
      await prisma.ticket.update({ where: { id: t.id }, data: { obsSistema: "Error procesando fila: " + errFila.message } }).catch(() => {});
    }
  }
  return { procesados, total: tickets.length };
}

export default router;

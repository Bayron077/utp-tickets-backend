import express from "express";
import cors from "cors";
import cron from "node-cron";
import { config } from "./config";
import ticketsRouter, { ejecutarAlertasSLA } from "./routes/tickets";
import catalogRouter from "./routes/catalog";
import dashboardRouter from "./routes/dashboard";

const app = express();

app.use(cors()); // ajusta origin: [config.frontendUrl] en producción si quieres restringirlo
app.use(express.json({ limit: "2mb" }));

app.get("/api/health", (_req, res) => res.json({ ok: true, service: "utp-posgrados-tickets-backend" }));

app.use("/api/tickets", ticketsRouter);
app.use("/api/catalog", catalogRouter);
app.use("/api/dashboard", dashboardRouter);

// ============================================================
// Equivale a "Instalar disparador" -> gestionarAlertasSLA en Apps Script.
// Protegido con CRON_SECRET para poder dispararlo también desde un cron
// externo gratuito (cron-job.org) si el free tier del host duerme el server.
// ============================================================
app.post("/api/alerts/run", async (req, res) => {
  const secret = req.header("x-cron-secret");
  if (secret !== config.cronSecret) {
    return res.status(401).json({ exito: false, mensaje: "No autorizado." });
  }
  try {
    const resultado = await ejecutarAlertasSLA();
    res.json({ exito: true, ...resultado });
  } catch (err: any) {
    res.status(500).json({ exito: false, mensaje: err.message });
  }
});

// Cron interno: corre todos los días a las 7:00am hora Colombia (ajusta si el server usa otra TZ)
cron.schedule("0 7 * * *", () => {
  console.log("[cron] Ejecutando gestionarAlertasSLA...");
  ejecutarAlertasSLA()
    .then((r) => console.log(`[cron] Listo: ${r.procesados}/${r.total} tickets procesados.`))
    .catch((err) => console.error("[cron] Error:", err));
}, { timezone: "America/Bogota" });

app.listen(config.port, () => {
  console.log(`🚀 Backend Posgrados UTP escuchando en puerto ${config.port}`);
});

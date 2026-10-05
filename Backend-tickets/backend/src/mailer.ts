import { config } from "./config";
import { prisma } from "./db";

// ============================================================
// [MAIL] Envío vía API HTTP de Brevo — reemplaza el envío por SMTP directo.
// Render bloquea el tráfico saliente a los puertos SMTP (25/465/587) en sus
// servicios web gratuitos, por lo que nodemailer + Gmail SMTP nunca llega a
// completar la conexión ahí (se queda colgado indefinidamente). La API REST
// de Brevo se llama por HTTPS (puerto 443), que sí está permitido.
// Requiere la variable de entorno BREVO_API_KEY y que el correo remitente
// (SMTP_FROM, o SMTP_USER si SMTP_FROM no está definido) esté verificado
// como "sender" en la cuenta de Brevo (Senders, Domains & Dedicated IPs).
// ============================================================
function parsearRemitente(raw: string): { name?: string; email: string } {
  const m = raw.match(/^(.*)<(.+)>$/);
  if (m) {
    const name = m[1].trim().replace(/^"|"$/g, "");
    const email = m[2].trim();
    return name ? { name, email } : { email };
  }
  return { email: raw.trim() };
}

async function enviarViaBrevo(params: { to: string; cc: string[]; subject: string; html: string }): Promise<void> {
  if (!config.brevoApiKey) {
    throw new Error("Falta la variable de entorno BREVO_API_KEY (revisa tu .env / Render).");
  }

  const sender = parsearRemitente(config.smtp.from);
  const body: Record<string, unknown> = {
    sender,
    to: [{ email: params.to }],
    subject: params.subject,
    htmlContent: params.html,
  };
  if (params.cc.length > 0) {
    body.cc = params.cc.map((email) => ({ email }));
  }

  const resp = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      accept: "application/json",
      "content-type": "application/json",
      "api-key": config.brevoApiKey,
    },
    body: JSON.stringify(body),
  });

  if (!resp.ok) {
    const texto = await resp.text().catch(() => "");
    throw new Error(`Brevo respondió ${resp.status}: ${texto || resp.statusText}`);
  }
}

// ============================================================
// [CC] Resolución de copias — puerto de tu requerimiento nuevo:
//  - ccFijos: SIEMPRE van (Director de Posgrados + Vicerrectoría Académica)
//  - + el correo del decano de la Facultad del ticket (variable), buscado
//    en la tabla `decanos` (antes: tendrías que mapearlo a mano)
//  - + CC_COORDINADOR, igual que en el Apps Script original (copia de evidencia)
// Si una facultad no tiene decano registrado, el correo se envía igual
// (con los fijos) y queda log de advertencia — nunca bloquea el envío.
// ============================================================
export async function construirCC(facultad: string): Promise<string[]> {
  const cc = [...config.ccFijos, config.ccCoordinador];
  if (facultad) {
    const decano = await prisma.decano.findUnique({ where: { facultad: facultad.trim() } });
    if (decano?.correo) {
      cc.push(decano.correo);
    } else {
      console.warn(`[CC] Advertencia: no hay decano mapeado para la facultad "${facultad}". Se envía solo con copias fijas.`);
    }
  }
  // Sin duplicados
  return [...new Set(cc.filter(Boolean))];
}

type TipoCorreo = "inicial" | "preventiva" | "vencimiento" | "vencido";

interface BuildEmailParams {
  tipo: TipoCorreo;
  id: string;
  programa: string;
  facultad: string;
  tipoSol: string;
  fechaAsignacion?: string;
  fechaLimite: string;
  responsable: string;
  detalle: string;
  linkRespuesta: string;
  timestampEnvio: string;
  masivo?: boolean;
}

/** Escapa HTML y convierte texto plano a párrafos/saltos de línea seguros para el correo. */
function textoAHtml(texto: string): string {
  const escapado = texto
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  return escapado
    .split(/\n\s*\n/) // línea en blanco = párrafo nuevo
    .map(parrafo => parrafo.trim().replace(/\n/g, "<br>"))
    .filter(parrafo => parrafo.length > 0)
    .map(parrafo => `<p style="margin:0 0 10px;text-align:justify">${parrafo}</p>`)
    .join("");
}

/** Réplica exacta (mismo HTML/diseño) de buildEmail() del Codigo.gs original */
export function buildEmail(p: BuildEmailParams): string {
  const cfg: Record<TipoCorreo, { color: string; titulo: string; icono: string; urgencia: string | null }> = {
    inicial:     { color: "#1a3a6b", titulo: "Nueva solicitud de información registrada", icono: "📋", urgencia: null },
    preventiva:  { color: "#c27803", titulo: "Solicitud próxima a vencer",                icono: "⚠️", urgencia: "Queda menos de 1 día para responder." },
    vencimiento: { color: "#d97706", titulo: "Solicitud VENCE HOY",                       icono: "🟠", urgencia: "Esta solicitud vence hoy. Por favor responda antes de finalizar el día." },
    vencido:     { color: "#c0392b", titulo: "Solicitud VENCIDA – Atención inmediata",    icono: "🔴", urgencia: "Esta solicitud superó el plazo acordado. Se requiere respuesta urgente." },
  };
  const { color, titulo, icono, urgencia } = cfg[p.tipo] || cfg.inicial;

  const tituloFinal = p.masivo ? `${titulo} · Envío masivo` : titulo;
  const filaFechaAsig = p.fechaAsignacion
    ? `<tr><td class="label">Fecha asignación</td><td>${p.fechaAsignacion}</td></tr>` : "";

  const bloqueUrgencia = urgencia
    ? `<div style="background:#fff8e1;border-left:4px solid ${color};padding:12px 16px;margin:16px 0;border-radius:0 6px 6px 0;font-size:13px;color:#333">${urgencia}</div>`
    : "";

  const bloqueEvidencia = p.tipo === "inicial" ? `
    <div style="margin-top:24px;padding:14px 16px;background:#f0f4f8;border:1px solid #cbd5e1;border-radius:8px;font-size:11px;color:#64748b;line-height:1.7">
      <strong style="display:block;margin-bottom:4px;color:#475569;font-size:12px">📄 CONSTANCIA DE REGISTRO – ${config.nombreAgencia}</strong>
      ${p.masivo ? "Esta solicitud fue enviada simultáneamente a todas las facultades mediante <strong>envío masivo</strong>.<br>" : ""}
      La solicitud <strong>${p.id}</strong> fue registrada el <strong>${p.timestampEnvio}</strong>.<br>
      Copia enviada a la Dirección de Posgrados, Vicerrectoría Académica${p.facultad ? ", el decanato de la facultad y" : " y"} ${config.ccCoordinador}.
    </div>` : `
    <div style="margin-top:24px;padding:10px 14px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px;font-size:11px;color:#94a3b8">
      Alerta generada automáticamente el ${p.timestampEnvio} — Solicitud ${p.id}
    </div>`;

  return `<!DOCTYPE html><html><head><meta charset="UTF-8">
  <style>
    body{font-family:'Segoe UI',Arial,sans-serif;background:#f0f4f8;margin:0;padding:20px}
    .card{max-width:600px;margin:0 auto;background:#fff;border-radius:10px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,.1)}
    .header{background:${color};padding:22px 28px}
    .header h1{color:#fff;margin:0;font-size:17px;font-weight:700}
    .header p{color:rgba(255,255,255,.8);margin:5px 0 0;font-size:12px;font-family:monospace}
    .body{padding:28px}
    .greeting{font-size:15px;margin:0 0 16px;color:#1e293b}
    table{width:100%;border-collapse:collapse;font-size:14px;margin:16px 0;border-radius:8px;overflow:hidden;border:1px solid #e2e8f0}
    td{padding:10px 14px;border-bottom:1px solid #f1f5f9}
    tr:last-child td{border-bottom:none}
    td.label{font-weight:600;color:#475569;background:#f8fafc;width:38%}
    .vencido-row td{background:#fff5f5;color:#c0392b;font-weight:600}
    .detalle-row td:last-child{background:#fffbeb;font-style:italic}
    .detalle-row td:last-child p:last-child{margin-bottom:0}
    .btn-wrap{text-align:center;margin:24px 0 8px}
    .btn{display:inline-block;background:#ff6a00;color:#fff;padding:15px 40px;text-decoration:none;border-radius:8px;font-size:16px;font-weight:800;letter-spacing:.3px;box-shadow:0 4px 14px rgba(255,106,0,.45);border:2px solid #e65f00}
    .footer{color:#94a3b8;font-size:11px;text-align:center;padding:0 28px 24px;line-height:1.6}
  </style>
  </head><body>
  <div class="card">
    <div class="header">
      <h1>${icono} Posgrados UTP — ${tituloFinal}</h1>
      <p>ID: ${p.id}</p>
    </div>
    <div class="body">
      <p class="greeting">Estimado/a <strong>${p.responsable}</strong>,</p>
      ${bloqueUrgencia}
      <table>
        <tr><td class="label">Programa</td><td><strong>${p.programa}</strong></td></tr>
        <tr><td class="label">Facultad</td><td>${p.facultad || "—"}</td></tr>
        <tr><td class="label">Tipo de solicitud</td><td>${p.tipoSol}</td></tr>
        ${filaFechaAsig}
        <tr class="${p.tipo === "vencido" || p.tipo === "vencimiento" ? "vencido-row" : ""}">
          <td class="label">Fecha límite</td><td>${p.fechaLimite || "—"}</td>
        </tr>
        <tr class="detalle-row">
          <td class="label" style="vertical-align:top">Información solicitada</td>
          <td>${textoAHtml(p.detalle)}</td>
        </tr>
      </table>
      <div class="btn-wrap">
        <a href="${p.linkRespuesta}" class="btn">✍️ Responder esta solicitud</a>
      </div>
      ${bloqueEvidencia}
    </div>
    <div class="footer">
      Correo generado automáticamente · ${config.nombreAgencia}<br>
      Por favor no responda directamente a este mensaje. Use el botón de arriba.
    </div>
  </div>
  </body></html>`;
}

interface EnviarCorreoParams extends BuildEmailParams {
  to: string;
}

/** Envía el correo con to + cc resuelto automáticamente (fijos + decano de facultad) */
export async function enviarCorreoTicket(p: EnviarCorreoParams): Promise<void> {
  const cc = await construirCC(p.facultad);
  const asuntos: Record<TipoCorreo, string> = {
    inicial:     `[Posgrados UTP] ${p.masivo ? "Solicitud masiva" : "Nueva solicitud"} – ${p.tipoSol} (${p.id})`,
    preventiva:  `⚠️ [Posgrados UTP] Solicitud próxima a vencer – ${p.programa}`,
    vencimiento: `🟠 [Posgrados UTP] Solicitud VENCE HOY – ${p.programa}`,
    vencido:     `🔴 [Posgrados UTP] Solicitud VENCIDA – ${p.programa}`,
  };

  await enviarViaBrevo({
    to: p.to,
    cc,
    subject: asuntos[p.tipo],
    html: buildEmail(p),
  });
}
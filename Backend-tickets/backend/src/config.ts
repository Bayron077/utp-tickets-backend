import "dotenv/config";

function required(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Falta la variable de entorno ${name} (revisa tu .env)`);
  return v;
}

export const config = {
  port: Number(process.env.PORT || 3000),
  frontendUrl: process.env.FRONTEND_URL || "http://localhost:4200",
  jwtSecret: process.env.JWT_SECRET || "dev-secret-cambiar",
  cronSecret: process.env.CRON_SECRET || "dev-cron-secret",

  smtp: {
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port: Number(process.env.SMTP_PORT || 465),
    secure: process.env.SMTP_SECURE !== "false",
    user: process.env.SMTP_USER || "",
    pass: process.env.SMTP_PASS || "",
    from: process.env.SMTP_FROM || process.env.SMTP_USER || "",
  },

  // Envío de correo vía API HTTP de Brevo (en vez de SMTP directo).
  // Render bloquea el tráfico saliente a los puertos SMTP (25/465/587) en sus
  // servicios web gratuitos, así que el envío por SMTP nunca completa ahí.
  // La API de Brevo viaja por HTTPS (puerto 443), que no está bloqueado.
  brevoApiKey: process.env.BREVO_API_KEY || "",

  // Equivalentes a las constantes del Codigo.gs original.
  // ccFijos: SIEMPRE van en copia, sin importar la facultad (Director de Posgrados + Vicerrectoría Académica)
  ccFijos: [
    process.env.CC_DIRECTOR_POSGRADOS || "director.posgrados@utp.edu.co",
    process.env.CC_VICERRECTORIA_ACADEMICA || "vicerrectoria.academica@utp.edu.co",
  ],
  ccCoordinador: process.env.CC_COORDINADOR || "coordinador@utp.edu.co",
  nombreAgencia: process.env.NOMBRE_AGENCIA || "Agencia de Posgrados UTP",
};
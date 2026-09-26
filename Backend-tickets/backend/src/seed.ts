/**
 * Seed inicial — carga MAESTRO_DIRECTORES, LISTAS (tipos) y DECANOS.
 * Edita los arrays de abajo con tus datos reales (los puedes copiar y pegar
 * directo desde tus hojas de Google Sheets) y corre: npm run seed
 */
import { prisma } from "./db";

async function main() {
  // ---- 1. MAESTRO_DIRECTORES (facultad, programa, responsable, correo) ----
  const directores: { facultad: string; programa: string; responsable: string; correo: string }[] = [
    // { facultad: "Facultad de Ingenierías", programa: "Maestría en Ingeniería de Sistemas", responsable: "Nombre Director", correo: "director@utp.edu.co" },
    // ← pega aquí todas las filas de tu MAESTRO_DIRECTORES actual
  ];

  // ---- 2. LISTAS: tipos de solicitud (tipo, días SLA, mensaje predeterminado) ----
  const tipos: { tipo: string; dias?: number; mensaje?: string }[] = [
    { tipo: "Estado inscripciones", dias: 3 },
    // ← agrega el resto de tus tipos reales
  ];

  // ---- 3. Asesores ----
  const asesores: string[] = [
    // "Nombre Asesor 1", "Nombre Asesor 2",
  ];

  // ---- 4. [NUEVO] Decanos por facultad — para la copia (CC) del envío masivo/individual ----
  const decanos: { facultad: string; correo: string; nombre?: string }[] = [
    // { facultad: "Facultad de Ingenierías", correo: "decano.ingenierias@utp.edu.co", nombre: "Nombre Decano" },
    // { facultad: "Facultad de Bellas Artes y Humanidades", correo: "decano.humanidades@utp.edu.co" },
  ];

  // ---- 5. Config de negocio (opcional; también puede quedar solo en .env) ----
  await prisma.config.upsert({
    where: { clave: "nombre_agencia" },
    update: { valor: "Agencia de Posgrados UTP" },
    create: { clave: "nombre_agencia", valor: "Agencia de Posgrados UTP" },
  });

  for (const d of directores) {
    await prisma.director.upsert({ where: { programa: d.programa }, update: d, create: d });
  }
  for (const t of tipos) {
    await prisma.tipoSolicitud.upsert({ where: { tipo: t.tipo }, update: t, create: t });
  }
  for (const nombre of asesores) {
    await prisma.asesor.upsert({ where: { nombre }, update: {}, create: { nombre } });
  }
  for (const d of decanos) {
    await prisma.decano.upsert({ where: { facultad: d.facultad }, update: d, create: d });
  }

  console.log(`Seed listo: ${directores.length} directores, ${tipos.length} tipos, ${asesores.length} asesores, ${decanos.length} decanos.`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());

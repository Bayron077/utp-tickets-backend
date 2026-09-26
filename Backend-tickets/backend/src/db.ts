import { PrismaClient } from "@prisma/client";

// Cliente único de Prisma reutilizado en toda la app (evita agotar conexiones en serverless/Render)
export const prisma = new PrismaClient();

export interface Ticket {
  id: string;
  fechaAsignacion: string;
  programa: string;
  facultad: string;
  tipo: string;
  prioridad: 'Alta' | 'Media' | 'Baja' | string;
  estado: string;
  responsable: string;
  fechaLimite: string;
  diasRestantes: number | null;
  detalle: string;
  solicitadoPor: string;
  asesor: string;
  respuesta?: string;
}

export interface TicketDetalle {
  id: string;
  fechaAsignacion: string;
  programa: string;
  facultad: string;
  tipo: string;
  prioridad: string;
  estado: string;
  responsable: string;
  fechaLimite: string;
  diasRestantes: number | null;
  detalle: string;
  solicitadoPor: string;
  respuestaPrevia: string;
  asesor: string;
}

export interface Programa {
  programa: string;
  facultad: string;
  responsable: string;
  correo: string;
}

export interface TipoSolicitud {
  tipo: string;
  dias: number | null;
  mensaje: string | null;
}

export interface RespuestaApi {
  exito: boolean;
  mensaje: string;
  id?: string;
  responsable?: string;
  esTardia?: boolean;
  creados?: number;
  errores?: string[];
}

export interface MetricasFacultadPrograma {
  nombre: string;
  facultad?: string;
  total: number;
  completados: number;
  tardio: number;
  vencido: number;
  pendiente?: number;
  pct: number;
}

export interface MetricasDashboard {
  totales: {
    total: number; pendiente: number; respondido: number; gestionado: number;
    respondidoTardio: number; vencido: number; proceso: number; completados: number;
  };
  pctCumplimiento: number;
  pctVencidos: number;
  porFacultad: MetricasFacultadPrograma[];
  porPrograma: MetricasFacultadPrograma[];
}

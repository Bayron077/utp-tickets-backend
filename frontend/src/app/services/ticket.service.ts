import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { MetricasDashboard, Programa, RespuestaApi, Ticket, TicketDetalle, TipoSolicitud } from '../models/ticket.model';

// ============================================================
// Reemplaza uno a uno los google.script.run.* del PanelAsesor/FormDirector
// original, ahora como llamadas HTTP normales al backend Node.
// ============================================================
@Injectable({ providedIn: 'root' })
export class TicketService {
  private readonly base = environment.apiUrl;

  constructor(private http: HttpClient) {}

  // equivale a obtenerTodosLosTickets()
  obtenerTodosLosTickets(): Observable<Ticket[]> {
    return this.http.get<Ticket[]>(`${this.base}/tickets`);
  }

  // equivale a obtenerTicketPorId()
  obtenerTicketPorId(id: string): Observable<TicketDetalle> {
    return this.http.get<TicketDetalle>(`${this.base}/tickets/${encodeURIComponent(id)}`);
  }

  // equivale a crearSolicitud()
  crearSolicitud(payload: {
    programa: string; tipo: string; prioridad: string; solicitadoPor: string;
    detalle: string; slaBaseDias: number | null; asesor: string;
  }): Observable<RespuestaApi> {
    return this.http.post<RespuestaApi>(`${this.base}/tickets`, payload);
  }

  // equivale a envioMasivo()
  envioMasivo(payload: {
    tipo: string; detalle: string; prioridad: string; solicitadoPor: string; slaBaseDias: number | null;
  }): Observable<RespuestaApi> {
    return this.http.post<RespuestaApi>(`${this.base}/tickets/masivo`, payload);
  }

  // equivale a procesarRespuesta()
  procesarRespuesta(id: string, respuesta: string): Observable<RespuestaApi> {
    return this.http.post<RespuestaApi>(`${this.base}/tickets/${encodeURIComponent(id)}/respuesta`, { respuesta });
  }

  // equivale a obtenerMetricasDashboard()
  obtenerMetricasDashboard(): Observable<MetricasDashboard> {
    return this.http.get<MetricasDashboard>(`${this.base}/dashboard/metrics`);
  }

  // equivale a obtenerProgramas()
  obtenerProgramas(): Observable<Programa[]> {
    return this.http.get<Programa[]>(`${this.base}/catalog/programas`);
  }

  // equivale a obtenerAsesores()
  obtenerAsesores(): Observable<string[]> {
    return this.http.get<string[]>(`${this.base}/catalog/asesores`);
  }

  // equivale a obtenerTiposSolicitud()
  obtenerTiposSolicitud(): Observable<TipoSolicitud[]> {
    return this.http.get<TipoSolicitud[]>(`${this.base}/catalog/tipos`);
  }
}

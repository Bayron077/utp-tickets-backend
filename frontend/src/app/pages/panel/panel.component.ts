import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TicketService } from '../../services/ticket.service';
import { Programa, Ticket, TipoSolicitud } from '../../models/ticket.model';
import { TopbarComponent } from '../../shared/topbar.component';

type Clasificacion = 'pendiente' | 'respondido' | 'gestionado' | 'tardio' | 'vencido' | 'proceso';

@Component({
  selector: 'app-panel',
  standalone: true,
  imports: [CommonModule, FormsModule, TopbarComponent],
  templateUrl: './panel.component.html',
  styleUrl: './panel.component.css',
})
export class PanelComponent implements OnInit {
  cargando = true;
  error = '';
  lastUpdate = '';

  allTickets: Ticket[] = [];
  filtrados: Ticket[] = [];
  expandedId: string | null = null;

  // filtros
  search = '';
  filtroEstado = '';
  filtroPrioridad = '';
  filtroSolicitante = '';
  filtroFacultad = '';
  filtroAsesor = '';

  facultades: string[] = [];
  asesoresFiltro: string[] = [];

  // métricas
  mTotal = 0; mPendiente = 0; mRespondido = 0; mGestionado = 0; mVencido = 0; mCumplimiento = 0;

  // catálogos para los modales
  programasData: Programa[] = [];
  tiposData: TipoSolicitud[] = [];
  asesoresData: string[] = [];
  catalogosCargados = false;

  // modal nueva solicitud
  modalNuevaAbierto = false;
  nPrograma = ''; nTipo = ''; nPrioridad = ''; nSolicitante = ''; nAsesor = ''; nDetalle = '';
  nFacultad = ''; nDirector = '';
  registrando = false;

  // modal envío masivo
  modalMasivoAbierto = false;
  masivoTipo = ''; masivoPrioridad = 'Media'; masivoSolicitante = 'Agencia'; masivoDetalle = '';
  enviandoMasivo = false;

  constructor(private ticketService: TicketService) {}

  ngOnInit(): void {
    this.cargarTickets();
  }

  cargarTickets(): void {
    this.cargando = true;
    this.error = '';
    this.ticketService.obtenerTodosLosTickets().subscribe({
      next: (tickets) => {
        this.allTickets = tickets;
        this.cargando = false;
        this.poblarFiltros();
        this.actualizarMetricas();
        this.aplicarFiltros();
        this.lastUpdate = 'Actualizado: ' + new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
      },
      error: (e) => {
        this.cargando = false;
        this.error = e?.error?.mensaje || e.message || 'Error al cargar los tickets.';
      },
    });
  }

  private poblarFiltros(): void {
    this.facultades = [...new Set(this.allTickets.map(t => t.facultad).filter(Boolean))].sort();
    this.asesoresFiltro = [...new Set(this.allTickets.map(t => t.asesor).filter(Boolean))].sort();
  }

  private actualizarMetricas(): void {
    let t = 0, p = 0, r = 0, g = 0, v = 0, ta = 0;
    for (const tk of this.allTickets) {
      t++;
      const c = this.clasificarEstado(tk);
      if (c === 'pendiente') p++;
      else if (c === 'respondido') r++;
      else if (c === 'gestionado') g++;
      else if (c === 'tardio') ta++;
      else if (c === 'vencido') v++;
    }
    const completados = r + g + ta;
    this.mTotal = t; this.mPendiente = p; this.mRespondido = r; this.mGestionado = g; this.mVencido = v;
    this.mCumplimiento = t > 0 ? Math.round((completados / t) * 100) : 0;
  }

  aplicarFiltros(): void {
    const search = this.search.toLowerCase();
    this.filtrados = this.allTickets.filter(t => {
      const ms = !search ||
        (t.id || '').toLowerCase().includes(search) ||
        (t.programa || '').toLowerCase().includes(search) ||
        (t.responsable || '').toLowerCase().includes(search) ||
        (t.detalle || '').toLowerCase().includes(search);
      return ms &&
        (!this.filtroEstado || t.estado === this.filtroEstado) &&
        (!this.filtroPrioridad || t.prioridad === this.filtroPrioridad) &&
        (!this.filtroSolicitante || t.solicitadoPor === this.filtroSolicitante) &&
        (!this.filtroFacultad || t.facultad === this.filtroFacultad) &&
        (!this.filtroAsesor || t.asesor === this.filtroAsesor);
    });
  }

  clasificarEstado(t: Ticket): Clasificacion {
    const e = (t.estado || '').toLowerCase();
    if (e.includes('tardí') || e.includes('tardi')) return 'tardio';
    if (e.includes('gestion')) return 'gestionado';
    if (e.includes('respond')) return 'respondido';
    if (e.includes('venc') || (t.diasRestantes !== null && t.diasRestantes! < 0)) return 'vencido';
    if (e.includes('proceso')) return 'proceso';
    return 'pendiente';
  }

  private readonly solicitanteMap: Record<string, { bg: string; color: string; icono: string }> = {
    'Agencia': { bg: '#eff6ff', color: '#1d4ed8', icono: '🏢' },
    'Dirección Posgrados': { bg: '#f5f3ff', color: '#7c3aed', icono: '🎓' },
    'Facultad': { bg: '#f0fdf4', color: '#1a7a4a', icono: '🏛️' },
  };

  solicitanteStyle(val: string): { background: string; color: string } {
    const d = this.solicitanteMap[val] || { bg: '#f1f5f9', color: '#64748b' };
    return { background: d.bg, color: d.color };
  }

  solicitanteIcono(val: string): string {
    return this.solicitanteMap[val]?.icono || '⚪';
  }

  etiquetaEstado(cls: Clasificacion, estadoOriginal: string): string {
    const lb: Record<Clasificacion, string> = {
      respondido: 'Respondido', gestionado: 'Gestionado', tardio: 'Resp. tardía',
      vencido: 'Vencido', proceso: 'En proceso', pendiente: 'Pendiente',
    };
    return lb[cls] || estadoOriginal;
  }

  toggleDetalle(id: string): void {
    this.expandedId = this.expandedId === id ? null : id;
  }

  // ---- catálogos (programas, tipos, asesores) — se cargan la primera vez que se abre un modal ----
  private cargarCatalogosSiHaceFalta(): void {
    if (this.catalogosCargados) return;
    this.ticketService.obtenerProgramas().subscribe(d => this.programasData = d);
    this.ticketService.obtenerAsesores().subscribe(d => this.asesoresData = d);
    this.ticketService.obtenerTiposSolicitud().subscribe(d => this.tiposData = d);
    this.catalogosCargados = true;
  }

  // ---- Nueva solicitud ----
  abrirNueva(): void {
    this.cargarCatalogosSiHaceFalta();
    this.modalNuevaAbierto = true;
  }

  cerrarNueva(): void {
    this.modalNuevaAbierto = false;
    this.nPrograma = this.nTipo = this.nPrioridad = this.nSolicitante = this.nAsesor = this.nDetalle = '';
    this.nFacultad = this.nDirector = '';
    this.registrando = false;
  }

  onProgramaChange(): void {
    const p = this.programasData.find(x => x.programa === this.nPrograma);
    this.nFacultad = p?.facultad || '';
    this.nDirector = p?.responsable || '';
  }

  onTipoChange(): void {
    const tipoObj = this.tiposData.find(t => t.tipo === this.nTipo);
    if (tipoObj?.mensaje) {
      const reemplazar = !this.nDetalle.trim() ||
        confirm('Este tipo de solicitud tiene un mensaje predeterminado.\n\n¿Deseas reemplazar el detalle actual con el texto sugerido?');
      if (reemplazar) this.nDetalle = tipoObj.mensaje;
    }
  }

  registrarSolicitud(): void {
    if (!this.nPrograma) { alert('Selecciona un programa.'); return; }
    if (!this.nTipo) { alert('Selecciona el tipo de solicitud.'); return; }
    if (!this.nPrioridad) { alert('Selecciona la prioridad.'); return; }
    if (!this.nSolicitante) { alert('Selecciona quién solicita.'); return; }
    if (!this.nAsesor) { alert('Selecciona el asesor que radica.'); return; }
    if (!this.nDetalle.trim()) { alert('El detalle no puede estar vacío.'); return; }

    const tipoObj = this.tiposData.find(t => t.tipo === this.nTipo);
    this.registrando = true;
    this.ticketService.crearSolicitud({
      programa: this.nPrograma, tipo: this.nTipo, prioridad: this.nPrioridad,
      solicitadoPor: this.nSolicitante, detalle: this.nDetalle.trim(),
      slaBaseDias: tipoObj?.dias ?? null, asesor: this.nAsesor,
    }).subscribe({
      next: (r) => {
        this.cerrarNueva();
        alert((r.exito ? '✅ ' : '❌ ') + r.mensaje);
        if (r.exito) this.cargarTickets();
      },
      error: (e) => {
        this.registrando = false;
        alert('Error: ' + (e?.error?.mensaje || e.message));
      },
    });
  }

  // ---- Envío masivo ----
  abrirMasivo(): void {
    this.cargarCatalogosSiHaceFalta();
    this.modalMasivoAbierto = true;
  }

  cerrarMasivo(): void {
    this.modalMasivoAbierto = false;
    this.masivoTipo = ''; this.masivoDetalle = '';
    this.enviandoMasivo = false;
  }

  onMasivoTipoChange(): void {
    const tipoObj = this.tiposData.find(t => t.tipo === this.masivoTipo);
    if (tipoObj?.mensaje) {
      const reemplazar = !this.masivoDetalle.trim() ||
        confirm('Este tipo de solicitud tiene un mensaje predeterminado.\n\n¿Deseas reemplazar el detalle actual con el texto sugerido?');
      if (reemplazar) this.masivoDetalle = tipoObj.mensaje;
    }
  }

  confirmarMasivo(): void {
    if (!this.masivoTipo) { alert('Selecciona el tipo de solicitud.'); return; }
    if (!this.masivoDetalle.trim()) { alert('El detalle no puede estar vacío.'); return; }

    const tipoObj = this.tiposData.find(t => t.tipo === this.masivoTipo);
    this.enviandoMasivo = true;
    this.ticketService.envioMasivo({
      tipo: this.masivoTipo, detalle: this.masivoDetalle.trim(), prioridad: this.masivoPrioridad,
      solicitadoPor: this.masivoSolicitante, slaBaseDias: tipoObj?.dias ?? null,
    }).subscribe({
      next: (r) => {
        this.cerrarMasivo();
        alert((r.mensaje || '') + (r.errores?.length ? '\n\nErrores:\n' + r.errores.join('\n') : ''));
        if (r.exito) this.cargarTickets();
      },
      error: (e) => {
        this.enviandoMasivo = false;
        alert('Error: ' + (e?.error?.mensaje || e.message));
      },
    });
  }
}

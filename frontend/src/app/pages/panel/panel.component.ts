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
  masivoModoTodos = true;
  masivoProgramasSeleccionados: string[] = [];
  enviandoMasivo = false;

  // modal exportar Excel
  modalExportarAbierto = false;
  expAsesor = ''; expFacultad = ''; expPrograma = ''; expEstado = ''; expMes = '';
  expAnio = String(new Date().getFullYear());
  exportando = false;

  readonly meses = [
    { valor: '1', nombre: 'Enero' }, { valor: '2', nombre: 'Febrero' }, { valor: '3', nombre: 'Marzo' },
    { valor: '4', nombre: 'Abril' }, { valor: '5', nombre: 'Mayo' }, { valor: '6', nombre: 'Junio' },
    { valor: '7', nombre: 'Julio' }, { valor: '8', nombre: 'Agosto' }, { valor: '9', nombre: 'Septiembre' },
    { valor: '10', nombre: 'Octubre' }, { valor: '11', nombre: 'Noviembre' }, { valor: '12', nombre: 'Diciembre' },
  ];

  get aniosExportar(): number[] {
    const actual = new Date().getFullYear();
    return [actual, actual - 1, actual - 2, actual - 3, actual - 4];
  }

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

  // ---- Exportar Excel ----
  abrirExportar(): void {
    this.cargarCatalogosSiHaceFalta();
    this.modalExportarAbierto = true;
  }

  cerrarExportar(): void {
    this.modalExportarAbierto = false;
    this.expAsesor = this.expFacultad = this.expPrograma = this.expEstado = this.expMes = '';
    this.expAnio = String(new Date().getFullYear());
    this.exportando = false;
  }

  // programas del catálogo, limitados a la facultad elegida (si hay una)
  get programasExportar(): Programa[] {
    return this.programasData.filter(p => !this.expFacultad || p.facultad === this.expFacultad);
  }

  get facultadesExportar(): string[] {
    return [...new Set(this.programasData.map(p => p.facultad).filter(Boolean))].sort();
  }

  onExpFacultadChange(): void {
    if (this.expPrograma && !this.programasExportar.some(p => p.programa === this.expPrograma)) this.expPrograma = '';
  }

  descargarExcel(): void {
    this.exportando = true;
    this.ticketService.exportarExcel({
      asesor: this.expAsesor, facultad: this.expFacultad, programa: this.expPrograma, estado: this.expEstado,
      mes: this.expMes, anio: this.expMes ? this.expAnio : '',
    }).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `registros_tickets_${new Date().toISOString().slice(0, 10)}.xlsx`;
        a.click();
        URL.revokeObjectURL(url);
        this.cerrarExportar();
      },
      error: () => {
        this.exportando = false;
        alert('Error al generar el archivo Excel. Intenta de nuevo.');
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
    this.masivoModoTodos = true;
    this.masivoProgramasSeleccionados = [];
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

  // facultades y sus programas, para el selector agrupado del envío masivo
  get facultadesMasivo(): { facultad: string; programas: Programa[] }[] {
    const grupos = new Map<string, Programa[]>();
    for (const p of this.programasData) {
      const lista = grupos.get(p.facultad) || [];
      lista.push(p);
      grupos.set(p.facultad, lista);
    }
    return [...grupos.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([facultad, programas]) => ({ facultad, programas }));
  }

  isMasivoProgramaSeleccionado(programa: string): boolean {
    return this.masivoProgramasSeleccionados.includes(programa);
  }

  toggleMasivoPrograma(programa: string): void {
    const i = this.masivoProgramasSeleccionados.indexOf(programa);
    if (i >= 0) this.masivoProgramasSeleccionados.splice(i, 1);
    else this.masivoProgramasSeleccionados.push(programa);
  }

  toggleMasivoFacultad(facultad: string): void {
    const programas = this.programasData.filter(p => p.facultad === facultad).map(p => p.programa);
    const todosMarcados = programas.every(p => this.isMasivoProgramaSeleccionado(p));
    if (todosMarcados) {
      this.masivoProgramasSeleccionados = this.masivoProgramasSeleccionados.filter(p => !programas.includes(p));
    } else {
      this.masivoProgramasSeleccionados = [...new Set([...this.masivoProgramasSeleccionados, ...programas])];
    }
  }

  isMasivoFacultadCompleta(facultad: string): boolean {
    const programas = this.programasData.filter(p => p.facultad === facultad).map(p => p.programa);
    return programas.length > 0 && programas.every(p => this.isMasivoProgramaSeleccionado(p));
  }

  confirmarMasivo(): void {
    if (!this.masivoTipo) { alert('Selecciona el tipo de solicitud.'); return; }
    if (!this.masivoDetalle.trim()) { alert('El detalle no puede estar vacío.'); return; }
    if (!this.masivoModoTodos && this.masivoProgramasSeleccionados.length === 0) {
      alert('Selecciona al menos un programa, o elige la opción "Enviar a todos los programas".');
      return;
    }

    const tipoObj = this.tiposData.find(t => t.tipo === this.masivoTipo);
    this.enviandoMasivo = true;
    this.ticketService.envioMasivo({
      tipo: this.masivoTipo, detalle: this.masivoDetalle.trim(), prioridad: this.masivoPrioridad,
      solicitadoPor: this.masivoSolicitante, slaBaseDias: tipoObj?.dias ?? null,
      programas: this.masivoModoTodos ? undefined : this.masivoProgramasSeleccionados,
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

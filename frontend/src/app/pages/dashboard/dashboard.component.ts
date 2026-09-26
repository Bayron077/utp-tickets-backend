import { AfterViewInit, Component, ElementRef, OnDestroy, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Chart, registerables } from 'chart.js';
import { TicketService } from '../../services/ticket.service';
import { MetricasDashboard, MetricasFacultadPrograma } from '../../models/ticket.model';
import { TopbarComponent } from '../../shared/topbar.component';

Chart.register(...registerables);

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, TopbarComponent],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css',
})
export class DashboardComponent implements AfterViewInit, OnDestroy {
  @ViewChild('donutCanvas') donutCanvas?: ElementRef<HTMLCanvasElement>;
  @ViewChild('barCanvas') barCanvas?: ElementRef<HTMLCanvasElement>;

  cargando = true;
  error = '';
  lastUpdate = '';
  data: MetricasDashboard | null = null;
  tabActual: 'facultad' | 'programa' = 'facultad';

  kpis: { cls: string; label: string; value: string | number; sub: string }[] = [];

  private donutChart?: Chart;
  private barChart?: Chart;

  constructor(private ticketService: TicketService) {}

  ngAfterViewInit(): void {
    this.cargar();
  }

  ngOnDestroy(): void {
    this.donutChart?.destroy();
    this.barChart?.destroy();
  }

  cargar(): void {
    this.cargando = true;
    this.error = '';
    this.ticketService.obtenerMetricasDashboard().subscribe({
      next: (d) => {
        this.data = d;
        this.cargando = false;
        this.construirKpis();
        setTimeout(() => { this.renderDonut(); this.renderBar(); });
        this.lastUpdate = 'Actualizado: ' + new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
      },
      error: (e) => {
        this.cargando = false;
        this.error = e?.error?.mensaje || e.message || 'Error al cargar las métricas.';
      },
    });
  }

  private construirKpis(): void {
    if (!this.data) return;
    const t = this.data.totales;
    this.kpis = [
      { cls: 'k-total',  label: 'Total',           value: t.total,             sub: 'solicitudes' },
      { cls: 'k-resp',   label: 'Respondidos',     value: t.respondido,        sub: 'a tiempo' },
      { cls: 'k-gest',   label: 'Gestionados',     value: t.gestionado,        sub: 'vía sheet' },
      { cls: 'k-tard',   label: 'Resp. tardías',   value: t.respondidoTardio,  sub: 'fuera de SLA' },
      { cls: 'k-venc',   label: 'Vencidos',        value: t.vencido,           sub: 'sin respuesta' },
      { cls: 'k-pend',   label: 'Pendientes',      value: t.pendiente,         sub: 'en curso' },
      { cls: 'k-cumpl',  label: '% Cumplimiento',  value: this.data.pctCumplimiento + '%', sub: 'respondidos/total' },
      { cls: 'k-pvenc',  label: '% Vencidos',      value: this.data.pctVencidos + '%',     sub: 'del total' },
    ];
  }

  get donutTotal(): number { return this.data?.totales.total ?? 0; }

  private renderDonut(): void {
    if (!this.data || !this.donutCanvas) return;
    const t = this.data.totales;
    this.donutChart?.destroy();
    this.donutChart = new Chart(this.donutCanvas.nativeElement, {
      type: 'doughnut',
      data: {
        labels: ['Respondido', 'Gestionado', 'Resp. tardía', 'Vencido', 'Pendiente', 'En proceso'],
        datasets: [{
          data: [t.respondido, t.gestionado, t.respondidoTardio, t.vencido, t.pendiente, t.proceso],
          backgroundColor: ['#1a7a4a', '#7c3aed', '#d97706', '#c0392b', '#c27803', '#0891b2'],
          borderWidth: 2, borderColor: '#fff',
        }],
      },
      options: {
        cutout: '65%',
        plugins: { legend: { position: 'bottom', labels: { font: { family: 'DM Sans', size: 11 }, padding: 12, boxWidth: 10 } } },
      },
    });
  }

  private renderBar(): void {
    if (!this.data || !this.barCanvas) return;
    const facs = this.data.porFacultad.slice(0, 10);
    const labels = facs.map(f => f.nombre.replace('Facultad de ', '').replace('Facultad ', ''));
    this.barChart?.destroy();
    this.barChart = new Chart(this.barCanvas.nativeElement, {
      type: 'bar',
      data: {
        labels,
        datasets: [
          { label: 'Total', data: facs.map(f => f.total), backgroundColor: '#c7d9f5', borderColor: '#2962c5', borderWidth: 1.5, borderRadius: 4 },
          { label: 'Respondidas', data: facs.map(f => f.completados), backgroundColor: '#1a7a4a', borderRadius: 4 },
          { label: 'Vencidas', data: facs.map(f => f.vencido), backgroundColor: '#c0392b', borderRadius: 4 },
        ],
      },
      options: {
        responsive: true,
        plugins: { legend: { labels: { font: { family: 'DM Sans', size: 11 } } } },
        scales: {
          x: { ticks: { font: { family: 'DM Sans', size: 10 } } },
          y: { beginAtZero: true, ticks: { stepSize: 1, font: { family: 'DM Sans', size: 10 } } },
        },
      },
    });
  }

  switchTab(tab: 'facultad' | 'programa'): void {
    this.tabActual = tab;
  }

  get filasTabla(): MetricasFacultadPrograma[] {
    if (!this.data) return [];
    return this.tabActual === 'facultad' ? this.data.porFacultad : this.data.porPrograma;
  }

  pbarColor(pct: number): string {
    return pct >= 70 ? '#1a7a4a' : pct >= 40 ? '#c27803' : '#c0392b';
  }
}

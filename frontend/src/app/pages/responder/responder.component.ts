import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { TicketService } from '../../services/ticket.service';
import { TicketDetalle } from '../../models/ticket.model';
import { parrafos } from '../../shared/texto.util';

@Component({
  selector: 'app-responder',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './responder.component.html',
  styleUrl: './responder.component.css',
})
export class ResponderComponent implements OnInit {
  cargando = true;
  errorCarga = '';
  ticket: TicketDetalle | null = null;

  esVencido = false;
  yaRespondido = false;
  esTardioPrevio = false;

  respuesta = '';
  enviando = false;

  // Formulario estructurado para el tipo "Estado inscripciones"
  tipoFecha: '' | 'Fecha tentativa' | 'Fecha de cierre' = '';
  fechaInicio = '';
  fechaFin = '';

  estadoFinal: 'exito' | 'tardio' | null = null;
  errorEnvio = '';

  constructor(private route: ActivatedRoute, private ticketService: TicketService) {}

  get esInscripciones(): boolean {
    return (this.ticket?.tipo || '').trim().toLowerCase() === 'fechas inscripción';
  }

  get detalleParrafos(): string[] {
    return parrafos(this.ticket?.detalle);
  }

  private formatearFechaInput(valor: string): string {
    if (!valor) return '';
    const [yyyy, mm, dd] = valor.split('-');
    return `${dd}/${mm}/${yyyy}`;
  }

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.cargando = false;
      this.errorCarga = 'ID de solicitud no especificado.';
      return;
    }
    this.ticketService.obtenerTicketPorId(id).subscribe({
      next: (t) => {
        this.ticket = t;
        this.cargando = false;
        const estado = (t.estado || '').toLowerCase();
        this.esVencido = estado.includes('venc') || (t.diasRestantes !== null && t.diasRestantes < 0);
        this.yaRespondido = estado.includes('respond') || estado.includes('gestion');
        this.esTardioPrevio = estado.includes('tardí') || estado.includes('tardi');
      },
      error: (e) => {
        this.cargando = false;
        this.errorCarga = e?.error?.mensaje || `El ID ${id} no existe en el sistema.`;
      },
    });
  }

  actualizarContador(): void {}

  enviarRespuesta(): void {
    if (!this.ticket) return;

    let textoRespuesta = this.respuesta.trim();

    if (this.esInscripciones) {
      if (!this.tipoFecha) { alert('Por favor seleccione una opción: "Fecha tentativa" o "Fecha de cierre".'); return; }
      if (!this.fechaInicio || !this.fechaFin) { alert('Por favor seleccione la fecha de inicio y la fecha de cierre.'); return; }
      if (this.fechaFin < this.fechaInicio) { alert('La fecha de cierre no puede ser anterior a la fecha de inicio.'); return; }

      textoRespuesta = `${this.tipoFecha}\nFecha de inicio: ${this.formatearFechaInput(this.fechaInicio)}\nFecha de cierre: ${this.formatearFechaInput(this.fechaFin)}`;
    } else if (!textoRespuesta) {
      alert('Por favor escriba una respuesta antes de enviar.');
      return;
    }

    this.enviando = true;
    this.ticketService.procesarRespuesta(this.ticket.id, textoRespuesta).subscribe({
      next: (r) => {
        this.enviando = false;
        if (r.exito) {
          this.estadoFinal = r.esTardia ? 'tardio' : 'exito';
        } else {
          this.errorEnvio = r.mensaje;
        }
      },
      error: (e) => {
        this.enviando = false;
        this.errorEnvio = e?.error?.mensaje || e.message || 'Error desconocido.';
      },
    });
  }
}

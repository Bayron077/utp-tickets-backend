import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { TicketService } from '../../services/ticket.service';
import { TicketDetalle } from '../../models/ticket.model';

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

  estadoFinal: 'exito' | 'tardio' | null = null;
  errorEnvio = '';

  constructor(private route: ActivatedRoute, private ticketService: TicketService) {}

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
    if (!this.respuesta.trim()) { alert('Por favor escriba una respuesta antes de enviar.'); return; }

    this.enviando = true;
    this.ticketService.procesarRespuesta(this.ticket.id, this.respuesta.trim()).subscribe({
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

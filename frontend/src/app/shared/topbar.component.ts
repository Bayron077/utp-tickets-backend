import { Component, Input } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

@Component({
  selector: 'app-topbar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  template: `
    <div class="topbar">
      <div class="topbar-brand">
        <img src="assets/logo-utp.png" alt="UTP" class="topbar-logo" />
        <span>Posgrados UTP</span>
        <small>{{ subtitle }}</small>
      </div>
      <div style="display:flex;align-items:center;gap:12px">
        <div class="nav-tabs">
          <a routerLink="/panel" routerLinkActive="active" class="nav-tab">📋 Panel</a>
          <a routerLink="/dashboard" routerLinkActive="active" class="nav-tab">📊 Dashboard</a>
        </div>
        <span class="last-update">{{ lastUpdate || '–' }}</span>
      </div>
    </div>
  `,
  styles: [`
    .topbar { background:#1a3a6b; padding:0 28px; height:56px; display:flex; align-items:center; justify-content:space-between; position:sticky; top:0; z-index:100; }
    .topbar-brand { display:flex; align-items:center; gap:10px; }
    .topbar-logo { height:28px; width:auto; filter:brightness(0) invert(1); } /* logo en blanco sobre el header azul */
    .topbar-brand span { font-size:15px; font-weight:700; color:#fff; font-family:'DM Sans',sans-serif; }
    .topbar-brand small { font-size:11px; color:rgba(255,255,255,.55); margin-left:4px; }
    .last-update { font-size:11px; color:rgba(255,255,255,.55); }
    .nav-tabs { display:flex; gap:4px; }
    .nav-tab { color:rgba(255,255,255,.65); text-decoration:none; font-size:13px; font-weight:600; padding:6px 14px; border-radius:6px; font-family:'DM Sans',sans-serif; transition:all .15s; border:1px solid transparent; }
    .nav-tab:hover { background:rgba(255,255,255,.1); color:#fff; }
    .nav-tab.active { background:rgba(255,255,255,.18); color:#fff; border-color:rgba(255,255,255,.2); }
  `],
})
export class TopbarComponent {
  @Input() subtitle = '';
  @Input() lastUpdate = '';
}

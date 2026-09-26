import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', redirectTo: 'panel', pathMatch: 'full' },
  { path: 'panel', loadComponent: () => import('./pages/panel/panel.component').then(m => m.PanelComponent) },
  { path: 'dashboard', loadComponent: () => import('./pages/dashboard/dashboard.component').then(m => m.DashboardComponent) },
  { path: 'responder/:id', loadComponent: () => import('./pages/responder/responder.component').then(m => m.ResponderComponent) },
  { path: '**', redirectTo: 'panel' },
];

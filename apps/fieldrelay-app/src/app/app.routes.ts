import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'mission-control',
    pathMatch: 'full'
  },
  {
    path: 'auth/sign-in',
    loadComponent: () =>
      import('./features/auth/presentation/sign-in.component').then(
        (m) => m.SignInComponent
      )
  },
  {
    path: '',
    loadComponent: () =>
      import('./layout/shell/shell.component').then((m) => m.ShellComponent),
    canActivate: [authGuard],
    children: [
      {
        path: 'mission-control',
        loadComponent: () =>
          import(
            './features/mission-control/presentation/mission-control.component'
          ).then((m) => m.MissionControlComponent)
      },
      {
        path: 'incidents',
        loadComponent: () =>
          import(
            './features/incidents/presentation/incident-list/incident-list.component'
          ).then((m) => m.IncidentListComponent)
      },
      {
        path: 'incidents/new',
        loadComponent: () =>
          import(
            './features/incidents/presentation/incident-create/incident-create.component'
          ).then((m) => m.IncidentCreateComponent)
      },
      {
        path: 'incidents/:incidentId',
        loadComponent: () =>
          import(
            './features/incidents/presentation/incident-detail/incident-detail.component'
          ).then((m) => m.IncidentDetailComponent)
      }
    ]
  },
  {
    path: '**',
    redirectTo: 'mission-control'
  }
];

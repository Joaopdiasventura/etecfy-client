import { Routes } from '@angular/router';
import { HomePage } from './features/home/home-page/home-page';
import { AuthGuard } from './core/guards/auth/auth-guard';

export const routes: Routes = [
  {
    path: '',
    canActivate: [AuthGuard],
    component: HomePage,
  },
  {
    path: 'user/access',
    loadComponent: () =>
      import('./features/user/access/access-page/access-page').then((m) => m.AccessPage),
  },
  {
    path: '**',
    loadComponent: () =>
      import('./features/not-found/not-found-page/not-found-page').then((m) => m.NotFoundPage),
  },
];

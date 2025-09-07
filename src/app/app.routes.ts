import { Routes } from '@angular/router';

export const routes: Routes = [ {
    path: '',
    redirectTo: '/',
    pathMatch: 'full'
  },
  {
    path: 'registration',
    loadComponent: () => import('./components/registration/registration.component').then(m => m.RegistrationComponent),
    title: 'הרשמה לטיסת החלל'
  },

  {
    path: '**',
    redirectTo: '/'
  }];

import { Routes } from '@angular/router';

export const routes: Routes = [ {
    path: '',
    redirectTo: '/registration',
    pathMatch: 'full'
  },
  {
    path: 'registration',
    loadComponent: () => import('./components/registration/registration.component').then(m => m.RegistrationComponent),
    title: 'הרשמה לטיסת החלל'
  },
  {
    path: 'dashboard',
    loadComponent: () => import('./components/dashboard/dashboard.component').then(m => m.DashboardComponent),
    title: 'דשבורד ניהול'
  },
  {
    path: 'candidate/:id',
    loadComponent: () => import('./components/candidate-details/candidate-details.component').then(m => m.CandidateDetailsComponent),
    title: 'פרטי מועמד'
  },
  {
    path: 'register-success',
    loadComponent: () => import('./components/register-success/register-success.component').then(m => m.RegisterSuccessComponent),
    title: 'הרשמה בוצעה בהצלחה'
  },
  {
    path: '**',
    redirectTo: '/registration'
  }];

import { Routes } from '@angular/router';
import { authGuard } from './guards/auth.guard';

export const routes: Routes = [{ 
path: '', 
redirectTo: '/home', 
pathMatch: 'full'
},
{ 
path: 'home', 
loadComponent: () => import('./components/home/home.component').then(m => m.HomeComponent), 
title: 'home page'
},
{ 
path: 'login', 
loadComponent: () => import('./components/login/login.component').then(m => m.LoginComponent), 
title: 'Login'
},
{ 
path: 'registration', 
loadComponent: () => import('./components/registration/registration.component').then(m => m.RegistrationComponent), 
title: 'Sign up for the space flight'
},
{ 
path: 'registration/:id', 
loadComponent: () => import('./components/registration/registration.component').then(m => m.RegistrationComponent), 
title: 'Space Flight Update'
},
{ 
path: 'add-edit-register', 
loadComponent: () => import('./components/add-edit-register/add-edit-register.component').then(m => m.AddEditRegisterComponent), 
title: 'editing application'
},
{ 
path: 'dashboard', 
loadComponent: () => import('./components/dashboard/dashboard.component').then(m => m.DashboardComponent), 
title: 'Management Dashboard'
 , canActivate: [authGuard]},
{ 
path: 'candidate/:id', 
loadComponent: () => import('./components/candidate-details/candidate-details.component').then(m => m.CandidateDetailsComponent), 
title: 'candidate details'
},
{ 
path: 'register-success', 
loadComponent: () => import('./components/register-success/register-success.component').then(m => m.RegisterSuccessComponent), 
title: 'Registration completed successfully'
},
{ 
path: '**', 
redirectTo: '/home'
}];
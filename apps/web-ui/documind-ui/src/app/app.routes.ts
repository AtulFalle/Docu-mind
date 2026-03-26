import { Route } from '@angular/router';
import { DashboardComponent } from './features/dashboard/dashboard';

export const appRoutes: Route[] = [
  { path: 'dashboard', component: DashboardComponent },
  { path: '', redirectTo: 'dashboard', pathMatch: 'full' }
];

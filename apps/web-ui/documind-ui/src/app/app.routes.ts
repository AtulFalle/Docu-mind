import { Route } from '@angular/router';
import { DashboardComponent } from './features/dashboard/dashboard';
import { ChatComponent } from './features/chat/chat';

export const appRoutes: Route[] = [
  { path: 'dashboard', component: DashboardComponent },
  { path: 'chat/:docId/:docName', component: ChatComponent },
  { path: 'chat', redirectTo: 'dashboard', pathMatch: 'full' },
  { path: '', redirectTo: 'dashboard', pathMatch: 'full' }
];

import { Route } from '@angular/router';
import { DashboardComponent } from './features/dashboard/dashboard';
import { ChatComponent } from './features/chat/chat';
import { InterviewsComponent } from './features/interviews/interviews';

export const appRoutes: Route[] = [
  { path: 'dashboard', component: DashboardComponent },
  { path: 'interview', component: InterviewsComponent },
  { path: 'interview/:interviewId', component: InterviewsComponent },
  { path: 'chat/:docId/:docName', component: ChatComponent },
  { path: 'chat', redirectTo: 'dashboard', pathMatch: 'full' },
  { path: '', redirectTo: 'dashboard', pathMatch: 'full' }
];

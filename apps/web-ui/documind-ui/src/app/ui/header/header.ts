import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, NavigationEnd } from '@angular/router';
import { signal, effect } from '@angular/core';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatTabsModule } from '@angular/material/tabs';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatToolbarModule,
    MatTabsModule,
    MatIconModule
  ],
  templateUrl: './header.html',
  styleUrl: './header.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HeaderComponent {
  private readonly router = inject(Router);

  readonly activeTab = signal(0);

  constructor() {
    effect(() => {
      this.router.events.subscribe(event => {
        if (event instanceof NavigationEnd) {
          if (event.url.includes('interview')) {
            this.activeTab.set(1);
          } else {
            this.activeTab.set(0);
          }
        }
      });
    });
  }

  onTabChange(index: number): void {
    this.activeTab.set(index);
    if (index === 0) {
      this.router.navigate(['/dashboard']);
    } else {
      this.router.navigate(['/interview']);
    }
  }
}

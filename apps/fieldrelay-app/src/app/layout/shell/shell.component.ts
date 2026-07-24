import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { TopbarComponent } from '../topbar/topbar.component';
import { SidebarComponent } from '../sidebar/sidebar.component';
import { BottomNavComponent } from '../bottom-nav/bottom-nav.component';

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [
    CommonModule,
    RouterOutlet,
    TopbarComponent,
    SidebarComponent,
    BottomNavComponent
  ],
  template: `
    <div class="app-shell-container">
      <app-topbar></app-topbar>
      <div class="app-shell-body">
        <app-sidebar></app-sidebar>
        <main class="app-content-canvas" id="main-content" tabIndex="-1">
          <router-outlet></router-outlet>
        </main>
      </div>
      <app-bottom-nav></app-bottom-nav>
    </div>
  `,
  styles: [`
    .app-shell-container {
      display: flex;
      flex-direction: column;
      height: 100vh;
      min-height: 0;
      overflow: hidden;
      background-color: var(--fr-color-bg);
      color: var(--fr-color-text);
    }
    .app-shell-body {
      display: flex;
      flex: 1;
      min-height: 0;
      overflow: hidden;
      position: relative;
    }
    .app-content-canvas {
      flex: 1;
      min-width: 0;
      overflow-y: auto;
      padding: var(--fr-space-lg);
      max-width: 2200px;
      margin: 0 auto;
      width: 100%;
    }
    @media (max-width: 767px) {
      .app-content-canvas {
        padding: var(--fr-space-md);
        padding-bottom: calc(var(--fr-shell-mobile-bottom-nav) + env(safe-area-inset-bottom) + var(--fr-space-md));
      }
    }
  `]
})
export class ShellComponent {}

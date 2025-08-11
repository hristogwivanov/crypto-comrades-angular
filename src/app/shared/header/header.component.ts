import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { AuthService } from '../../services/auth.service';
import { User } from '../../models/user.interface';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <header class="header">
      <nav class="navbar">
        <div class="nav-brand">
          <a routerLink="/home" class="brand-link">
            <img src="/crypto-logo.svg" alt="Crypto Comrades" class="brand-logo">
            <span class="brand-text">Crypto Comrades</span>
          </a>
        </div>

        <div class="nav-menu" [class.nav-menu-open]="isMenuOpen">
          <div class="nav-links">
            <a routerLink="/home" routerLinkActive="active" class="nav-link">Home</a>
            <a routerLink="/market" routerLinkActive="active" class="nav-link">Market</a>
            <a routerLink="/posts" routerLinkActive="active" class="nav-link">Community</a>
            <a routerLink="/portfolios" routerLinkActive="active" class="nav-link">Portfolios</a>
          </div>

          <div class="nav-actions">
            <div *ngIf="currentUser; else guestActions" class="user-menu">
              <div class="user-info" (click)="toggleUserMenu()">
                <img [src]="currentUser.avatar || '/default-avatar.svg'" 
                     [alt]="currentUser.username" 
                     class="user-avatar">
                <span class="username">{{ currentUser.username }}</span>
                <svg class="dropdown-icon" [class.rotated]="isUserMenuOpen" width="12" height="12">
                  <path d="M6 9L1 4h10z" fill="currentColor"/>
                </svg>
              </div>
              
              <div class="dropdown-menu" [class.show]="isUserMenuOpen">
                <a routerLink="/dashboard" class="dropdown-item">Dashboard</a>
                <a routerLink="/dashboard/portfolio" class="dropdown-item">My Portfolio</a>
                <a routerLink="/dashboard/my-posts" class="dropdown-item">My Posts</a>
                <a routerLink="/dashboard/profile" class="dropdown-item">Profile</a>
                <hr class="dropdown-divider">
                <button (click)="logout()" class="dropdown-item logout-btn">Logout</button>
              </div>
            </div>

            <ng-template #guestActions>
              <div class="auth-buttons">
                <a routerLink="/auth/login" class="btn btn-outline">Login</a>
                <a routerLink="/auth/register" class="btn btn-primary">Sign Up</a>
              </div>
            </ng-template>
          </div>
        </div>

        <button class="nav-toggle" (click)="toggleMenu()" [class.open]="isMenuOpen">
          <span></span>
          <span></span>
          <span></span>
        </button>
      </nav>
    </header>
  `,
  styleUrl: './header.component.css'
})
export class HeaderComponent implements OnInit, OnDestroy {
  currentUser: User | null = null;
  isAuthenticated = false;
  isMenuOpen = false;
  isUserMenuOpen = false;
  private destroy$ = new Subject<void>();

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.authService.currentUser$
      .pipe(takeUntil(this.destroy$))
      .subscribe(user => this.currentUser = user);

    this.authService.isAuthenticated$
      .pipe(takeUntil(this.destroy$))
      .subscribe(authenticated => this.isAuthenticated = authenticated);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  toggleMenu(): void {
    this.isMenuOpen = !this.isMenuOpen;
  }

  toggleUserMenu(): void {
    this.isUserMenuOpen = !this.isUserMenuOpen;
  }

  logout(): void {
    this.authService.logout().subscribe(() => {
      this.router.navigate(['/home']);
      this.isUserMenuOpen = false;
    });
  }
}

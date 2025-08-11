import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Observable, of } from 'rxjs';
import { map, take, catchError } from 'rxjs/operators';
import { CryptoService } from '../../services/crypto.service';
import { PostService } from '../../services/post.service';
import { AuthService } from '../../services/auth.service';
import { CryptoCurrency } from '../../models/crypto.interface';
import { Post } from '../../models/post.interface';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="home-container">
      <section class="hero-section">
        <div class="hero-content">
          <h1>Welcome to Crypto Comrades</h1>
          <p>Your ultimate destination for cryptocurrency insights, portfolio management, and community discussions.</p>
          <div class="hero-actions">
            <a routerLink="/market" class="btn btn-primary">Explore Market</a>
            <a routerLink="/posts" class="btn btn-secondary">Read Posts</a>
          </div>
        </div>
      </section>

      <section class="features-section">
        <div class="container">
          <h2>Platform Features</h2>
          <div class="features-grid">
            <div class="feature-card">
              <h3>🚀 Market Tracking</h3>
              <p>Track real-time cryptocurrency prices and market data</p>
              <a routerLink="/market" class="feature-link">View Market</a>
            </div>
            <div class="feature-card">
              <h3>💼 Portfolio Management</h3>
              <p>Manage your crypto holdings and track performance</p>
              <a routerLink="/portfolios" class="feature-link">View Portfolios</a>
            </div>
            <div class="feature-card">
              <h3>💬 Community Posts</h3>
              <p>Share insights and discuss crypto trends with the community</p>
              <a routerLink="/posts" class="feature-link">Read Posts</a>
            </div>
            <div class="feature-card" *ngIf="!(isAuthenticated$ | async)">
              <h3>👥 Join Community</h3>
              <p>Sign up to create posts, manage portfolios, and interact with others</p>
              <a routerLink="/auth/register" class="feature-link">Get Started</a>
            </div>
            <div class="feature-card" *ngIf="isAuthenticated$ | async">
              <h3>📊 Your Dashboard</h3>
              <p>Access your personal dashboard and manage your account</p>
              <a routerLink="/dashboard" class="feature-link">Go to Dashboard</a>
            </div>
          </div>
        </div>
      </section>

      <section class="trending-section" *ngIf="topCryptos$ | async as cryptos">
        <div class="container">
          <h2>Trending Cryptocurrencies</h2>
          <div class="crypto-grid">
            <div class="crypto-card" *ngFor="let crypto of cryptos" [routerLink]="['/crypto', crypto.id]">
              <img [src]="crypto.image" [alt]="crypto.name" class="crypto-logo">
              <div class="crypto-info">
                <h4>{{ crypto.name }}</h4>
                <p class="crypto-symbol">{{ crypto.symbol | uppercase }}</p>
                <p class="crypto-price">{{ crypto.currentPrice | number:'1.2-2' }}</p>
                <p class="crypto-change" 
                   [class.positive]="crypto.priceChangePercentage24h > 0"
                   [class.negative]="crypto.priceChangePercentage24h < 0">
                  {{ crypto.priceChangePercentage24h | number:'1.2-2' }}%
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section class="recent-posts-section" *ngIf="recentPosts$ | async as posts">
        <div class="container">
          <h2>Recent Community Posts</h2>
          <div class="posts-preview">
            <div class="post-card" *ngFor="let post of posts" [routerLink]="['/posts', post.id]">
              <div class="post-header">
                <img [src]="post.author.avatar || '/assets/default-avatar.svg'" 
                     [alt]="post.author.username" class="author-avatar">
                <div class="post-meta">
                  <h4>{{ post.title }}</h4>
                  <p class="author-info">by {{ post.author.username }} • {{ post.createdAt | date:'short' }}</p>
                </div>
              </div>
              <p class="post-excerpt">{{ post.content | slice:0:150 }}...</p>
              <div class="post-stats">
                <span class="likes">👍 {{ post.likes }}</span>
                <span class="comments">💬 {{ post.comments.length }}</span>
              </div>
            </div>
          </div>
          <div class="view-all">
            <a routerLink="/posts" class="btn btn-outline">View All Posts</a>
          </div>
        </div>
      </section>
    </div>
  `,
  styleUrls: ['./home.component.css']
})
export class HomeComponent implements OnInit {
  isAuthenticated$!: Observable<boolean>;
  topCryptos$!: Observable<CryptoCurrency[]>;
  recentPosts$!: Observable<Post[]>;

  constructor(
    private cryptoService: CryptoService,
    private postService: PostService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.isAuthenticated$ = this.authService.isAuthenticated$;
    
    // Add error handling for API calls
    this.topCryptos$ = this.cryptoService.getTopCryptos().pipe(
      map(cryptos => cryptos.slice(0, 6)),
      catchError((error: any) => {
        console.warn('Failed to load crypto data:', error);
        return of([]); // Return empty array on error
      })
    );

    this.recentPosts$ = this.postService.getPosts().pipe(
      map(posts => posts.slice(0, 3)),
      catchError((error: any) => {
        console.warn('Failed to load posts data:', error);
        return of([]); // Return empty array on error
      })
    );
  }
}

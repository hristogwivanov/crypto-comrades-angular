import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Observable, Subject, combineLatest } from 'rxjs';
import { takeUntil, switchMap, map, catchError } from 'rxjs/operators';
import { of } from 'rxjs';
import { CryptoService } from '../../services/crypto.service';
import { AuthService } from '../../services/auth.service';
import { CryptoCurrency } from '../../models/crypto.interface';

@Component({
  selector: 'app-crypto-details',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="crypto-details-container">
      <div class="back-navigation">
        <a routerLink="/market" class="back-btn">← Back to Market</a>
      </div>

      <div class="loading" *ngIf="loading">
        <div class="spinner"></div>
        <p>Loading cryptocurrency details...</p>
      </div>

      <div class="error-message" *ngIf="error">
        <h2>Error Loading Data</h2>
        <p>{{ error }}</p>
        <button (click)="loadCryptoDetails()" class="retry-btn">Try Again</button>
      </div>

      <div class="crypto-details" *ngIf="crypto$ | async as crypto">
        <div class="crypto-header">
          <div class="crypto-basic-info">
            <img [src]="crypto.image" [alt]="crypto.name" class="crypto-logo-large">
            <div class="crypto-title">
              <h1>{{ crypto.name }}</h1>
              <span class="crypto-symbol">{{ crypto.symbol | uppercase }}</span>
              <span class="crypto-rank">Rank #{{ crypto.marketCapRank }}</span>
            </div>
          </div>
          
          <div class="crypto-price-info">
            <div class="current-price">
              <span class="price">{{ '$' + (crypto.currentPrice | number:'1.2-8') }}</span>
              <span class="change" 
                    [ngClass]="{
                      'positive': crypto.priceChangePercentage24h > 0,
                      'negative': crypto.priceChangePercentage24h < 0
                    }">
                {{ crypto.priceChangePercentage24h > 0 ? '+' : '' }}{{ crypto.priceChangePercentage24h | number:'1.2-2' }}%
              </span>
            </div>
            <div class="price-change-24h">
              <span class="label">24h Change:</span>
              <span class="value" 
                    [class.positive]="crypto.priceChange24h > 0"
                    [class.negative]="crypto.priceChange24h < 0">
                {{ '$' + (crypto.priceChange24h | number:'1.2-8') }}
              </span>
            </div>
          </div>
        </div>

        <div class="crypto-stats-grid">
          <div class="stat-card">
            <h3>Market Cap</h3>
            <p class="stat-value">{{ '$' + (crypto.marketCap | number:'1.0-0') }}</p>
            <span class="stat-change"
                  [class.positive]="crypto.marketCapChangePercentage24h > 0"
                  [class.negative]="crypto.marketCapChangePercentage24h < 0">
              {{ crypto.marketCapChangePercentage24h > 0 ? '+' : '' }}{{ crypto.marketCapChangePercentage24h | number:'1.2-2' }}%
            </span>
          </div>

          <div class="stat-card">
            <h3>24h Volume</h3>
            <p class="stat-value">{{ '$' + (crypto.totalVolume | number:'1.0-0') }}</p>
            <span class="stat-label">Trading Volume</span>
          </div>

          <div class="stat-card">
            <h3>Circulating Supply</h3>
            <p class="stat-value">{{ crypto.circulatingSupply | number:'1.0-0' }}</p>
            <span class="stat-label">{{ crypto.symbol | uppercase }}</span>
          </div>

          <div class="stat-card" *ngIf="crypto.totalSupply">
            <h3>Total Supply</h3>
            <p class="stat-value">{{ crypto.totalSupply | number:'1.0-0' }}</p>
            <span class="stat-label">{{ crypto.symbol | uppercase }}</span>
          </div>

          <div class="stat-card" *ngIf="crypto.maxSupply">
            <h3>Max Supply</h3>
            <p class="stat-value">{{ crypto.maxSupply | number:'1.0-0' }}</p>
            <span class="stat-label">{{ crypto.symbol | uppercase }}</span>
          </div>

          <div class="stat-card" *ngIf="crypto.fullyDilutedValuation">
            <h3>Fully Diluted Valuation</h3>
            <p class="stat-value">{{ '$' + (crypto.fullyDilutedValuation | number:'1.0-0') }}</p>
          </div>
        </div>

        <div class="price-ranges">
          <div class="range-card">
            <h3>24h High/Low</h3>
            <div class="price-range">
              <div class="range-item">
                <span class="label">High:</span>
                <span class="high-price">{{ '$' + (crypto.high24h | number:'1.2-8') }}</span>
              </div>
              <div class="range-item">
                <span class="label">Low:</span>
                <span class="low-price">{{ '$' + (crypto.low24h | number:'1.2-8') }}</span>
              </div>
            </div>
          </div>

          <div class="range-card">
            <h3>All-Time High</h3>
            <div class="ath-info">
              <div class="ath-price">{{ '$' + (crypto.ath | number:'1.2-8') }}</div>
              <div class="ath-change" 
                   [class.negative]="crypto.athChangePercentage < 0">
                {{ crypto.athChangePercentage | number:'1.2-2' }}%
              </div>
              <div class="ath-date">{{ crypto.athDate | date:'mediumDate' }}</div>
            </div>
          </div>

          <div class="range-card">
            <h3>All-Time Low</h3>
            <div class="atl-info">
              <div class="atl-price">{{ '$' + (crypto.atl | number:'1.2-8') }}</div>
              <div class="atl-change" 
                   [class.positive]="crypto.atlChangePercentage > 0">
                +{{ crypto.atlChangePercentage | number:'1.2-2' }}%
              </div>
              <div class="atl-date">{{ crypto.atlDate | date:'mediumDate' }}</div>
            </div>
          </div>
        </div>



        <div class="last-updated">
          <small>Last updated: {{ crypto.lastUpdated | date:'medium' }}</small>
        </div>
      </div>
    </div>
  `,
  styleUrls: ['./crypto-details.component.css']
})
export class CryptoDetailsComponent implements OnInit, OnDestroy {
  crypto$!: Observable<CryptoCurrency | null>;
  isAuthenticated$!: Observable<boolean>;
  loading = false;
  error: string | null = null;

  private destroy$ = new Subject<void>();

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private cryptoService: CryptoService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.isAuthenticated$ = this.authService.isAuthenticated$;
    this.loadCryptoDetails();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadCryptoDetails(): void {
    this.loading = true;
    this.error = null;

    this.crypto$ = this.route.params.pipe(
      switchMap(params => {
        const cryptoId = params['id'];
        if (!cryptoId) {
          this.router.navigate(['/market']);
          return of(null);
        }

        return this.cryptoService.getCryptocurrencyById(cryptoId).pipe(
          catchError(err => {
            console.error('Error loading crypto details:', err);
            this.error = `Failed to load details for cryptocurrency. Please try again.`;
            this.loading = false;
            return of(null);
          })
        );
      }),
      takeUntil(this.destroy$)
    );

    this.crypto$.subscribe({
      next: (crypto) => {
        this.loading = false;
        if (!crypto && !this.error) {
          this.error = 'Cryptocurrency not found.';
        }
      },
      error: (err) => {
        this.loading = false;
        this.error = 'An unexpected error occurred while loading the cryptocurrency details.';
        console.error('Crypto details error:', err);
      }
    });
  }
}

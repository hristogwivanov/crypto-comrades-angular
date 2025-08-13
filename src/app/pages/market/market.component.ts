import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Observable, Subject } from 'rxjs';
import { takeUntil, debounceTime, distinctUntilChanged, switchMap, startWith, map } from 'rxjs/operators';
import { CryptoService } from '../../services/crypto.service';
import { CryptoCurrency } from '../../models/crypto.interface';

@Component({
  selector: 'app-market',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  template: `
    <div class="market-container">
      <div class="market-header">
        <h1>Cryptocurrency Market</h1>
        <p>Explore real-time cryptocurrency prices and market data</p>
      </div>

      <div class="market-controls">
        <div class="search-container">
          <input 
            type="text" 
            placeholder="Search cryptocurrencies..." 
            [(ngModel)]="searchTerm"
            (input)="onSearchChange($event)"
            class="search-input">
        </div>
        
        <div class="filter-container">
          <select [(ngModel)]="sortBy" (change)="onSortChange()" class="sort-select">
            <option value="market_cap">Market Cap</option>
            <option value="current_price">Price</option>
            <option value="price_change_percentage_24h">24h Change</option>
            <option value="total_volume">Volume</option>
          </select>
          
          <button 
            class="sort-direction-btn"
            (click)="toggleSortDirection()"
            [class.ascending]="sortDirection === 'asc'"
            [class.descending]="sortDirection === 'desc'">
            {{ sortDirection === 'asc' ? '↑' : '↓' }}
          </button>
        </div>
      </div>

      <div class="market-stats" *ngIf="cryptos$ | async as cryptos">
        <div class="stat-card">
          <h3>Total Cryptocurrencies</h3>
          <p>{{ cryptos.length }}</p>
        </div>
        <div class="stat-card">
          <h3>Market Leaders</h3>
          <p>{{ getMarketLeaders(cryptos) }}</p>
        </div>
        <div class="stat-card">
          <h3>Top Gainer (24h)</h3>
          <p>{{ getTopGainer(cryptos) }}</p>
        </div>
        <div class="stat-card">
          <h3>Top Loser (24h)</h3>
          <p>{{ getTopLoser(cryptos) }}</p>
        </div>
      </div>

      <div class="crypto-table-container">
        <div class="loading" *ngIf="loading">
          <div class="spinner"></div>
          <p>Loading market data...</p>
        </div>

        <div class="error-message" *ngIf="error">
          <p>{{ error }}</p>
          <button (click)="loadCryptos()" class="retry-btn">Retry</button>
        </div>

        <div class="crypto-table" *ngIf="filteredCryptos$ | async as cryptos">
          <div class="table-header">
            <div class="rank-col">Rank</div>
            <div class="name-col">Name</div>
            <div class="price-col">Price</div>
            <div class="change-col">24h Change</div>
            <div class="market-cap-col">Market Cap</div>
            <div class="volume-col">Volume (24h)</div>
            <div class="action-col">Action</div>
          </div>

          <div class="table-row" *ngFor="let crypto of cryptos; trackBy: trackByCrypto">
            <div class="rank-col">
              <span class="rank">#{{ crypto.marketCapRank }}</span>
            </div>
            
            <div class="name-col">
              <div class="crypto-info">
                <img [src]="crypto.image" [alt]="crypto.name" class="crypto-logo">
                <div class="crypto-details">
                  <span class="crypto-name">{{ crypto.name }}</span>
                  <span class="crypto-symbol">{{ crypto.symbol | uppercase }}</span>
                </div>
              </div>
            </div>
            
            <div class="price-col">
              <span class="price">{{ crypto.currentPrice | number:'1.2-8' }}</span>
            </div>
            
            <div class="change-col">
              <span class="change" 
                    [class.positive]="crypto.priceChangePercentage24h > 0"
                    [class.negative]="crypto.priceChangePercentage24h < 0">
                {{ crypto.priceChangePercentage24h | number:'1.2-2' }}%
              </span>
            </div>
            
            <div class="market-cap-col">
              <span class="market-cap">{{ crypto.marketCap | number:'1.0-0' }}</span>
            </div>
            
            <div class="volume-col">
              <span class="volume">{{ crypto.totalVolume | number:'1.0-0' }}</span>
            </div>
            
            <div class="action-col">
              <a [routerLink]="['/crypto', crypto.id]" class="view-btn">View Details</a>
            </div>
          </div>

          <div class="no-results" *ngIf="cryptos.length === 0">
            <p>No cryptocurrencies found matching your search.</p>
          </div>
        </div>
      </div>
    </div>
  `,
  styleUrls: ['./market.component.css']
})
export class MarketComponent implements OnInit, OnDestroy {
  cryptos$!: Observable<CryptoCurrency[]>;
  filteredCryptos$!: Observable<CryptoCurrency[]>;
  
  searchTerm: string = '';
  sortBy: string = 'market_cap';
  sortDirection: 'asc' | 'desc' = 'desc';
  loading: boolean = false;
  error: string | null = null;

  private destroy$ = new Subject<void>();
  private searchSubject = new Subject<string>();

  constructor(private cryptoService: CryptoService) {}

  ngOnInit(): void {
    this.loadCryptos();
    this.setupSearch();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadCryptos(): void {
    this.loading = true;
    this.error = null;
    
    this.cryptos$ = this.cryptoService.getTopCryptos().pipe(
      takeUntil(this.destroy$)
    );

    this.cryptos$.subscribe({
      next: () => {
        this.loading = false;
        this.applyFilters();
      },
      error: (err) => {
        this.loading = false;
        this.error = 'Failed to load cryptocurrency data. Please try again.';
        console.error('Error loading cryptos:', err);
      }
    });
  }

  setupSearch(): void {
    this.filteredCryptos$ = this.searchSubject.pipe(
      startWith(''),
      debounceTime(300),
      distinctUntilChanged(),
      switchMap(searchTerm => {
        return this.cryptos$.pipe(
          takeUntil(this.destroy$)
        );
      })
    );
  }

  onSearchChange(event: any): void {
    const value = event.target.value;
    this.searchTerm = value;
    this.searchSubject.next(value);
    this.applyFilters();
  }

  onSortChange(): void {
    this.applyFilters();
  }

  toggleSortDirection(): void {
    this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    this.applyFilters();
  }

  applyFilters(): void {
    if (!this.cryptos$) return;

    this.filteredCryptos$ = this.cryptos$.pipe(
      map((cryptos: CryptoCurrency[]) => {
        // Filter by search term
        let filteredCryptos = cryptos.filter((crypto: CryptoCurrency) => 
          crypto.name.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
          crypto.symbol.toLowerCase().includes(this.searchTerm.toLowerCase())
        );

        // Sort by selected criteria
        filteredCryptos = filteredCryptos.sort((a: CryptoCurrency, b: CryptoCurrency) => {
          let aValue: any;
          let bValue: any;

          switch (this.sortBy) {
            case 'current_price':
              aValue = a.currentPrice;
              bValue = b.currentPrice;
              break;
            case 'price_change_percentage_24h':
              aValue = a.priceChangePercentage24h;
              bValue = b.priceChangePercentage24h;
              break;
            case 'market_cap':
              aValue = a.marketCap;
              bValue = b.marketCap;
              break;
            case 'total_volume':
              aValue = a.totalVolume;
              bValue = b.totalVolume;
              break;
            default:
              aValue = a.marketCap;
              bValue = b.marketCap;
          }

          // Handle null/undefined values for other sort criteria
          if (aValue == null) aValue = 0;
          if (bValue == null) bValue = 0;

          const comparison = aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
          return this.sortDirection === 'asc' ? comparison : -comparison;
        });

        // Limit to top 100 results
        return filteredCryptos.slice(0, 100);
      }),
      takeUntil(this.destroy$)
    );
  }

  trackByCrypto(index: number, crypto: CryptoCurrency): string {
    return crypto.id;
  }

  getMarketLeaders(cryptos: CryptoCurrency[]): string {
    if (!cryptos || cryptos.length === 0) return 'N/A';
    return cryptos.slice(0, 3).map(c => c.symbol.toUpperCase()).join(', ');
  }

  getTopGainer(cryptos: CryptoCurrency[]): string {
    if (!cryptos || cryptos.length === 0) return 'N/A';
    const topGainer = cryptos.reduce((prev, current) => 
      (prev.priceChangePercentage24h > current.priceChangePercentage24h) ? prev : current
    );
    return `${topGainer.symbol.toUpperCase()} (+${topGainer.priceChangePercentage24h.toFixed(2)}%)`;
  }

  getTopLoser(cryptos: CryptoCurrency[]): string {
    if (!cryptos || cryptos.length === 0) return 'N/A';
    const topLoser = cryptos.reduce((prev, current) => 
      (prev.priceChangePercentage24h < current.priceChangePercentage24h) ? prev : current
    );
    return `${topLoser.symbol.toUpperCase()} (${topLoser.priceChangePercentage24h.toFixed(2)}%)`;
  }
}

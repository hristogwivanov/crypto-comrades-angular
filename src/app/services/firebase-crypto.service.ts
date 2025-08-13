import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map, switchMap, combineLatest, of, forkJoin } from 'rxjs';
import { CryptoCurrency, Portfolio, PortfolioHolding } from '../models/crypto.interface';
import { FirebaseService } from './firebase.service';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root'
})
export class FirebaseCryptoService {

  // CoinGecko API for real-time crypto data
  private readonly COINGECKO_API = 'https://api.coingecko.com/api/v3';

  constructor(
    private http: HttpClient,
    private firebaseService: FirebaseService,
    private authService: AuthService
  ) {}

  // CRYPTO DATA OPERATIONS (External API)

  /**
   * Get cryptocurrency data from CoinGecko
   */
  getCryptocurrencies(limit: number = 100): Observable<CryptoCurrency[]> {
    return this.http.get<any[]>(
      `${this.COINGECKO_API}/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=${limit}&page=1`
    ).pipe(
      map(coins => coins.map(coin => this.mapCoinGeckoToCrypto(coin)))
    );
  }

  /**
   * Get specific cryptocurrency by ID
   */
  getCryptocurrency(id: string): Observable<CryptoCurrency> {
    return this.http.get<any>(
      `${this.COINGECKO_API}/coins/${id}`
    ).pipe(
      map(coin => this.mapCoinGeckoDetailsToCrypto(coin))
    );
  }

  /**
   * Search cryptocurrencies
   */
  searchCryptocurrencies(query: string): Observable<CryptoCurrency[]> {
    return this.http.get<any>(
      `${this.COINGECKO_API}/search?query=${query}`
    ).pipe(
      switchMap(result => {
        if (!result.coins || result.coins.length === 0) {
          return of([]);
        }
        
        // Get detailed data for found coins
        const coinIds = result.coins.slice(0, 10).map((coin: any) => coin.id).join(',');
        return this.http.get<any[]>(
          `${this.COINGECKO_API}/coins/markets?vs_currency=usd&ids=${coinIds}`
        ).pipe(
          map(coins => coins.map(coin => this.mapCoinGeckoToCrypto(coin)))
        );
      })
    );
  }

  /**
   * Get trending cryptocurrencies
   */
  getTrendingCryptocurrencies(): Observable<CryptoCurrency[]> {
    return this.http.get<any>(`${this.COINGECKO_API}/search/trending`).pipe(
      switchMap(result => {
        const coinIds = result.coins.map((coin: any) => coin.item.id).join(',');
        return this.http.get<any[]>(
          `${this.COINGECKO_API}/coins/markets?vs_currency=usd&ids=${coinIds}`
        ).pipe(
          map(coins => coins.map(coin => this.mapCoinGeckoToCrypto(coin)))
        );
      })
    );
  }

  // PORTFOLIO OPERATIONS (Firebase)

  /**
   * Create a new portfolio
   */
  createPortfolio(portfolioData: Omit<Portfolio, 'id' | 'createdAt' | 'updatedAt' | 'totalValue'>): Observable<string> {
    const portfolio: Omit<Portfolio, 'id'> = {
      ...portfolioData,
      totalValue: 0,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    return this.firebaseService.add('portfolios', portfolio);
  }

  /**
   * Get user's portfolios
   */
  getUserPortfolios(userId: string): Observable<Portfolio[]> {
    return this.firebaseService.getAll<Portfolio>('portfolios',
      this.firebaseService.where('userId', '==', userId),
      this.firebaseService.orderBy('createdAt', 'desc')
    );
  }

  /**
   * Get current user's portfolios
   */
  getCurrentUserPortfolios(): Observable<Portfolio[]> {
    return this.authService.currentUser$.pipe(
      switchMap(user => {
        if (!user) return of([]);
        return this.getUserPortfolios(user.id);
      })
    );
  }

  /**
   * Get portfolio by ID
   */
  getPortfolioById(portfolioId: string): Observable<Portfolio | null> {
    return this.firebaseService.get<Portfolio>('portfolios', portfolioId);
  }

  /**
   * Update portfolio
   */
  updatePortfolio(portfolioId: string, updates: Partial<Portfolio>): Observable<void> {
    return this.firebaseService.update('portfolios', portfolioId, {
      ...updates,
      updatedAt: new Date()
    });
  }

  /**
   * Delete portfolio
   */
  deletePortfolio(portfolioId: string): Observable<void> {
    // First delete all holdings in this portfolio
    return this.getPortfolioHoldings(portfolioId).pipe(
      switchMap(holdings => {
        const deleteHoldings = holdings.map(holding => 
          this.firebaseService.delete('portfolio_holdings', holding.id)
        );
        
        return forkJoin(deleteHoldings.length > 0 ? deleteHoldings : [of(void 0)]).pipe(
          switchMap(() => this.firebaseService.delete('portfolios', portfolioId))
        );
      })
    );
  }

  // PORTFOLIO HOLDINGS OPERATIONS

  /**
   * Add holding to portfolio
   */
  addHolding(holdingData: Omit<PortfolioHolding, 'id' | 'createdAt' | 'updatedAt' | 'currentPrice' | 'totalValue' | 'profitLoss' | 'profitLossPercentage'>): Observable<string> {
    return this.getCryptocurrency(holdingData.cryptoId).pipe(
      switchMap(crypto => {
        const currentPrice = crypto.currentPrice;
        const totalValue = holdingData.amount * currentPrice;
        const totalCost = holdingData.amount * holdingData.averageBuyPrice;
        const profitLoss = totalValue - totalCost;
        const profitLossPercentage = totalCost > 0 ? (profitLoss / totalCost) * 100 : 0;

        const holding: Omit<PortfolioHolding, 'id'> = {
          ...holdingData,
          currentPrice,
          totalValue,
          profitLoss,
          profitLossPercentage,
          createdAt: new Date(),
          updatedAt: new Date()
        };

        return this.firebaseService.add('portfolio_holdings', holding).pipe(
          switchMap(holdingId => {
            // Update portfolio total value
            this.updatePortfolioTotalValue(holdingData.portfolioId!).subscribe();
            return of(holdingId);
          })
        );
      })
    );
  }

  /**
   * Get portfolio holdings
   */
  getPortfolioHoldings(portfolioId: string): Observable<PortfolioHolding[]> {
    return this.firebaseService.getAll<PortfolioHolding>('portfolio_holdings',
      this.firebaseService.where('portfolioId', '==', portfolioId),
      this.firebaseService.orderBy('createdAt', 'desc')
    );
  }

  /**
   * Get user's all holdings
   */
  getUserHoldings(userId: string): Observable<PortfolioHolding[]> {
    return this.firebaseService.getAll<PortfolioHolding>('portfolio_holdings',
      this.firebaseService.where('userId', '==', userId),
      this.firebaseService.orderBy('createdAt', 'desc')
    );
  }

  /**
   * Update holding
   */
  updateHolding(holdingId: string, updates: Partial<PortfolioHolding>): Observable<void> {
    return this.firebaseService.get<PortfolioHolding>('portfolio_holdings', holdingId).pipe(
      switchMap(holding => {
        if (!holding) throw new Error('Holding not found');

        // Recalculate values if amount or average buy price changed
        if (updates.amount !== undefined || updates.averageBuyPrice !== undefined) {
          return this.getCryptocurrency(holding.cryptoId).pipe(
            switchMap(crypto => {
              const amount = updates.amount ?? holding.amount;
              const avgBuyPrice = updates.averageBuyPrice ?? holding.averageBuyPrice;
              const currentPrice = crypto.currentPrice;
              const totalValue = amount * currentPrice;
              const totalCost = amount * avgBuyPrice;
              const profitLoss = totalValue - totalCost;
              const profitLossPercentage = totalCost > 0 ? (profitLoss / totalCost) * 100 : 0;

              const calculatedUpdates = {
                ...updates,
                currentPrice,
                totalValue,
                profitLoss,
                profitLossPercentage,
                updatedAt: new Date()
              };

              return this.firebaseService.update('portfolio_holdings', holdingId, calculatedUpdates).pipe(
                switchMap(() => {
                  // Update portfolio total value
                  this.updatePortfolioTotalValue(holding.portfolioId!).subscribe();
                  return of(void 0);
                })
              );
            })
          );
        }

        return this.firebaseService.update('portfolio_holdings', holdingId, {
          ...updates,
          updatedAt: new Date()
        });
      })
    );
  }

  /**
   * Delete holding
   */
  deleteHolding(holdingId: string): Observable<void> {
    return this.firebaseService.get<PortfolioHolding>('portfolio_holdings', holdingId).pipe(
      switchMap(holding => {
        if (!holding) throw new Error('Holding not found');
        
        return this.firebaseService.delete('portfolio_holdings', holdingId).pipe(
          switchMap(() => {
            // Update portfolio total value
            if (holding.portfolioId) {
              this.updatePortfolioTotalValue(holding.portfolioId).subscribe();
            }
            return of(void 0);
          })
        );
      })
    );
  }

  /**
   * Update portfolio total value based on current holdings
   */
  private updatePortfolioTotalValue(portfolioId: string): Observable<void> {
    return this.getPortfolioHoldings(portfolioId).pipe(
      switchMap(holdings => {
        // Get current prices for all holdings
        const cryptoIds = [...new Set(holdings.map(h => h.cryptoId))];
        
        if (cryptoIds.length === 0) {
          return this.updatePortfolio(portfolioId, { totalValue: 0 });
        }

        return this.http.get<any[]>(
          `${this.COINGECKO_API}/coins/markets?vs_currency=usd&ids=${cryptoIds.join(',')}`
        ).pipe(
          map(cryptos => {
            const priceMap = new Map(
              cryptos.map(crypto => [crypto.id, crypto.current_price])
            );

            const totalValue = holdings.reduce((sum, holding) => {
              const currentPrice = priceMap.get(holding.cryptoId) || holding.currentPrice;
              return sum + (holding.amount * currentPrice);
            }, 0);

            return totalValue;
          }),
          switchMap(totalValue => 
            this.updatePortfolio(portfolioId, { totalValue })
          )
        );
      })
    );
  }

  /**
   * Get public portfolios
   */
  getPublicPortfolios(limit: number = 20): Observable<Portfolio[]> {
    return this.firebaseService.getAll<Portfolio>('portfolios',
      this.firebaseService.where('isPublic', '==', true),
      this.firebaseService.orderBy('totalValue', 'desc'),
      this.firebaseService.limit(limit)
    );
  }

  /**
   * Get portfolio with holdings
   */
  getPortfolioWithHoldings(portfolioId: string): Observable<{portfolio: Portfolio | null, holdings: PortfolioHolding[]}> {
    return combineLatest([
      this.getPortfolioById(portfolioId),
      this.getPortfolioHoldings(portfolioId)
    ]).pipe(
      map(([portfolio, holdings]) => ({ portfolio, holdings }))
    );
  }

  // HELPER METHODS

  /**
   * Map CoinGecko API response to CryptoCurrency interface
   */
  private mapCoinGeckoToCrypto(coin: any): CryptoCurrency {
    return {
      id: coin.id,
      symbol: coin.symbol.toUpperCase(),
      name: coin.name,
      image: coin.image,
      currentPrice: coin.current_price || 0,
      marketCap: coin.market_cap || 0,
      marketCapRank: coin.market_cap_rank || 0,
      fullyDilutedValuation: coin.fully_diluted_valuation,
      totalVolume: coin.total_volume || 0,
      high24h: coin.high_24h || 0,
      low24h: coin.low_24h || 0,
      priceChange24h: coin.price_change_24h || 0,
      priceChangePercentage24h: coin.price_change_percentage_24h || 0,
      marketCapChange24h: coin.market_cap_change_24h || 0,
      marketCapChangePercentage24h: coin.market_cap_change_percentage_24h || 0,
      circulatingSupply: coin.circulating_supply || 0,
      totalSupply: coin.total_supply,
      maxSupply: coin.max_supply,
      ath: coin.ath || 0,
      athChangePercentage: coin.ath_change_percentage || 0,
      athDate: new Date(coin.ath_date || Date.now()),
      atl: coin.atl || 0,
      atlChangePercentage: coin.atl_change_percentage || 0,
      atlDate: new Date(coin.atl_date || Date.now()),
      lastUpdated: new Date(coin.last_updated || Date.now())
    };
  }

  /**
   * Map CoinGecko detailed API response to CryptoCurrency interface
   */
  private mapCoinGeckoDetailsToCrypto(coin: any): CryptoCurrency {
    const marketData = coin.market_data || {};
    
    return {
      id: coin.id,
      symbol: coin.symbol.toUpperCase(),
      name: coin.name,
      image: coin.image?.large || coin.image?.small || '',
      currentPrice: marketData.current_price?.usd || 0,
      marketCap: marketData.market_cap?.usd || 0,
      marketCapRank: marketData.market_cap_rank || 0,
      fullyDilutedValuation: marketData.fully_diluted_valuation?.usd,
      totalVolume: marketData.total_volume?.usd || 0,
      high24h: marketData.high_24h?.usd || 0,
      low24h: marketData.low_24h?.usd || 0,
      priceChange24h: marketData.price_change_24h || 0,
      priceChangePercentage24h: marketData.price_change_percentage_24h || 0,
      marketCapChange24h: marketData.market_cap_change_24h || 0,
      marketCapChangePercentage24h: marketData.market_cap_change_percentage_24h || 0,
      circulatingSupply: marketData.circulating_supply || 0,
      totalSupply: marketData.total_supply,
      maxSupply: marketData.max_supply,
      ath: marketData.ath?.usd || 0,
      athChangePercentage: marketData.ath_change_percentage?.usd || 0,
      athDate: new Date(marketData.ath_date?.usd || Date.now()),
      atl: marketData.atl?.usd || 0,
      atlChangePercentage: marketData.atl_change_percentage?.usd || 0,
      atlDate: new Date(marketData.atl_date?.usd || Date.now()),
      lastUpdated: new Date(coin.last_updated || Date.now())
    };
  }
}

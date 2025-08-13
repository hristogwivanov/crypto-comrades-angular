import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, BehaviorSubject, timer } from 'rxjs';
import { map, catchError, switchMap, shareReplay } from 'rxjs/operators';
import { CryptoCurrency, Portfolio, PortfolioHolding, Transaction } from '../models/crypto.interface';

@Injectable({
  providedIn: 'root'
})
export class CryptoService {
  private readonly API_URL = 'https://crypto-comrades-api.netlify.app';
  private readonly COINGECKO_API = 'https://api.coingecko.com/api/v3';

  private marketDataSubject = new BehaviorSubject<CryptoCurrency[]>([]);
  public marketData$ = this.marketDataSubject.asObservable();

  constructor(private http: HttpClient) {
    this.startMarketDataPolling();
  }

  private startMarketDataPolling(): void {
    timer(0, 60000).pipe(
      switchMap(() => this.fetchMarketData()),
      catchError((error) => {
        console.error('Market data polling error:', error);
        return [];
      })
    ).subscribe(data => {
      this.marketDataSubject.next(data);
    });
  }

  private fetchMarketData(): Observable<CryptoCurrency[]> {
    const params = new HttpParams()
      .set('vs_currency', 'usd')
      .set('order', 'volume_desc')
      .set('per_page', '100')
      .set('page', '1')
      .set('sparkline', 'false')
      .set('price_change_percentage', '24h');

    return this.http.get<any[]>(`${this.COINGECKO_API}/coins/markets`, { params })
      .pipe(
        map(data => data.map(coin => this.mapCoinGeckoData(coin))),
        shareReplay(1)
      );
  }

  getTopCryptocurrencies(limit: number = 20): Observable<CryptoCurrency[]> {
    return this.marketData$.pipe(
      map(data => data.slice(0, limit))
    );
  }

  getCryptocurrencyById(id: string): Observable<CryptoCurrency> {
    return this.http.get<any>(`${this.COINGECKO_API}/coins/${id}`)
      .pipe(
        map(data => this.mapDetailedCoinData(data))
      );
  }

  getTopCryptos(limit: number = 100): Observable<CryptoCurrency[]> {
    return this.marketData$.pipe(
      map(data => data.slice(0, limit))
    );
  }

  searchCryptocurrencies(query: string): Observable<CryptoCurrency[]> {
    return this.marketData$.pipe(
      map(data => data.filter(crypto => 
        crypto.name.toLowerCase().includes(query.toLowerCase()) ||
        crypto.symbol.toLowerCase().includes(query.toLowerCase())
      ))
    );
  }

  getUserPortfolio(userId: string): Observable<Portfolio> {
    return this.http.get<Portfolio>(`${this.API_URL}/portfolios/${userId}`)
      .pipe(
        catchError(() => this.createEmptyPortfolio(userId))
      );
  }

  createPortfolioHolding(holding: Omit<PortfolioHolding, 'id' | 'createdAt' | 'updatedAt'>): Observable<PortfolioHolding> {
    return this.http.post<PortfolioHolding>(`${this.API_URL}/portfolio/holdings`, holding);
  }

  updatePortfolioHolding(id: string, holding: Partial<PortfolioHolding>): Observable<PortfolioHolding> {
    return this.http.put<PortfolioHolding>(`${this.API_URL}/portfolio/holdings/${id}`, holding);
  }

  deletePortfolioHolding(id: string): Observable<boolean> {
    return this.http.delete(`${this.API_URL}/portfolio/holdings/${id}`)
      .pipe(map(() => true));
  }

  addTransaction(transaction: Omit<Transaction, 'id' | 'createdAt'>): Observable<Transaction> {
    return this.http.post<Transaction>(`${this.API_URL}/transactions`, transaction);
  }

  getUserTransactions(userId: string): Observable<Transaction[]> {
    return this.http.get<Transaction[]>(`${this.API_URL}/transactions/${userId}`);
  }

  getPublicPortfolios(): Observable<Portfolio[]> {
    return this.http.get<Portfolio[]>(`${this.API_URL}/portfolios/public`);
  }

  private mapCoinGeckoData(coin: any): CryptoCurrency {
    return {
      id: coin.id,
      symbol: coin.symbol,
      name: coin.name,
      image: coin.image,
      currentPrice: coin.current_price,
      marketCap: coin.market_cap,
      marketCapRank: coin.market_cap_rank,
      fullyDilutedValuation: coin.fully_diluted_valuation,
      totalVolume: coin.total_volume,
      high24h: coin.high_24h,
      low24h: coin.low_24h,
      priceChange24h: coin.price_change_24h,
      priceChangePercentage24h: coin.price_change_percentage_24h,
      marketCapChange24h: coin.market_cap_change_24h,
      marketCapChangePercentage24h: coin.market_cap_change_percentage_24h,
      circulatingSupply: coin.circulating_supply,
      totalSupply: coin.total_supply,
      maxSupply: coin.max_supply,
      ath: coin.ath,
      athChangePercentage: coin.ath_change_percentage,
      athDate: new Date(coin.ath_date),
      atl: coin.atl,
      atlChangePercentage: coin.atl_change_percentage,
      atlDate: new Date(coin.atl_date),
      lastUpdated: new Date(coin.last_updated)
    };
  }

  private mapDetailedCoinData(coin: any): CryptoCurrency {
    return {
      id: coin.id,
      symbol: coin.symbol,
      name: coin.name,
      image: coin.image?.large || coin.image?.small,
      currentPrice: coin.market_data?.current_price?.usd || 0,
      marketCap: coin.market_data?.market_cap?.usd || 0,
      marketCapRank: coin.market_cap_rank || 0,
      fullyDilutedValuation: coin.market_data?.fully_diluted_valuation?.usd,
      totalVolume: coin.market_data?.total_volume?.usd || 0,
      high24h: coin.market_data?.high_24h?.usd || 0,
      low24h: coin.market_data?.low_24h?.usd || 0,
      priceChange24h: coin.market_data?.price_change_24h || 0,
      priceChangePercentage24h: coin.market_data?.price_change_percentage_24h || 0,
      marketCapChange24h: coin.market_data?.market_cap_change_24h || 0,
      marketCapChangePercentage24h: coin.market_data?.market_cap_change_percentage_24h || 0,
      circulatingSupply: coin.market_data?.circulating_supply || 0,
      totalSupply: coin.market_data?.total_supply,
      maxSupply: coin.market_data?.max_supply,
      ath: coin.market_data?.ath?.usd || 0,
      athChangePercentage: coin.market_data?.ath_change_percentage?.usd || 0,
      athDate: new Date(coin.market_data?.ath_date?.usd || Date.now()),
      atl: coin.market_data?.atl?.usd || 0,
      atlChangePercentage: coin.market_data?.atl_change_percentage?.usd || 0,
      atlDate: new Date(coin.market_data?.atl_date?.usd || Date.now()),
      lastUpdated: new Date(coin.last_updated || Date.now())
    };
  }

  private createEmptyPortfolio(userId: string): Observable<Portfolio> {
    const emptyPortfolio: Portfolio = {
      id: `portfolio_${userId}`,
      userId,
      name: 'My Portfolio',
      description: 'Your cryptocurrency portfolio',
      isPublic: false,
      holdings: [],
      totalValue: 0,
      totalProfitLoss: 0,
      totalProfitLossPercentage: 0,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    return new Observable(observer => {
      observer.next(emptyPortfolio);
      observer.complete();
    });
  }
}

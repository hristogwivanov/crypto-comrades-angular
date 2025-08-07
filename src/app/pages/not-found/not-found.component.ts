import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-not-found',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="not-found-container">
      <div class="not-found-content">
        <div class="error-code">404</div>
        <h1>Oops! Page Not Found</h1>
        <p>The page you're looking for seems to have vanished into the crypto void.</p>
        
        <div class="suggestions">
          <h3>Here's what you can do:</h3>
          <ul>
            <li>Check the URL for typos</li>
            <li>Go back to the previous page</li>
            <li>Visit our homepage</li>
            <li>Explore the crypto market</li>
          </ul>
        </div>

        <div class="action-buttons">
          <a routerLink="/" class="btn btn-primary">
            <span class="btn-icon">🏠</span>
            Go Home
          </a>
          <a routerLink="/market" class="btn btn-secondary">
            <span class="btn-icon">📈</span>
            Browse Market
          </a>
          <a routerLink="/posts" class="btn btn-outline">
            <span class="btn-icon">💬</span>
            Community Posts
          </a>
          <button (click)="goBack()" class="btn btn-outline">
            <span class="btn-icon">←</span>
            Go Back
          </button>
        </div>

        <div class="fun-facts">
          <h3>Fun Crypto Fact</h3>
          <p class="crypto-fact">{{ randomCryptoFact }}</p>
        </div>

        <div class="search-suggestion">
          <p>Looking for something specific?</p>
          <div class="popular-links">
            <a routerLink="/market" class="popular-link">Market Data</a>
            <a routerLink="/posts" class="popular-link">Community Posts</a>
            <a routerLink="/portfolios" class="popular-link">Public Portfolios</a>
            <a routerLink="/auth/login" class="popular-link">Login</a>
            <a routerLink="/auth/register" class="popular-link">Sign Up</a>
          </div>
        </div>
      </div>

      <div class="floating-elements">
        <div class="floating-crypto bitcoin">₿</div>
        <div class="floating-crypto ethereum">Ξ</div>
        <div class="floating-crypto litecoin">Ł</div>
        <div class="floating-crypto ripple">◉</div>
      </div>
    </div>
  `,
  styleUrls: ['./not-found.component.css']
})
export class NotFoundComponent {
  randomCryptoFact: string;

  private cryptoFacts = [
    "The first Bitcoin transaction was for two Papa John's pizzas worth 10,000 BTC!",
    "Satoshi Nakamoto's identity remains unknown to this day.",
    "There will only ever be 21 million Bitcoin in existence.",
    "Ethereum introduced smart contracts to the blockchain world.",
    "The term 'HODL' came from a misspelled 'hold' in a Bitcoin forum post.",
    "Cryptocurrency mining consumes more energy than some small countries.",
    "The first known commercial Bitcoin transaction was in 2010.",
    "Dogecoin started as a joke but became a serious cryptocurrency.",
    "Blockchain technology has applications beyond cryptocurrencies.",
    "The crypto market never sleeps - it trades 24/7/365!"
  ];

  constructor() {
    this.randomCryptoFact = this.getRandomCryptoFact();
  }

  goBack(): void {
    if (window.history.length > 1) {
      window.history.back();
    } else {
      window.location.href = '/';
    }
  }

  private getRandomCryptoFact(): string {
    const randomIndex = Math.floor(Math.random() * this.cryptoFacts.length);
    return this.cryptoFacts[randomIndex];
  }
}

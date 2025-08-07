import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'cryptoFormat',
  standalone: true
})
export class CryptoFormatPipe implements PipeTransform {

  transform(value: number | null | undefined, type: 'price' | 'percent' | 'volume' | 'marketCap' = 'price'): string {
    if (value === null || value === undefined || isNaN(value)) {
      return 'N/A';
    }

    switch (type) {
      case 'price':
        return this.formatPrice(value);
      case 'percent':
        return this.formatPercent(value);
      case 'volume':
        return this.formatVolume(value);
      case 'marketCap':
        return this.formatMarketCap(value);
      default:
        return value.toString();
    }
  }

  private formatPrice(value: number): string {
    if (value >= 1) {
      return `$${value.toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      })}`;
    } else if (value >= 0.01) {
      return `$${value.toLocaleString('en-US', {
        minimumFractionDigits: 4,
        maximumFractionDigits: 4
      })}`;
    } else {
      return `$${value.toLocaleString('en-US', {
        minimumFractionDigits: 6,
        maximumFractionDigits: 8
      })}`;
    }
  }

  private formatPercent(value: number): string {
    const formatted = Math.abs(value).toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
    
    const sign = value >= 0 ? '+' : '-';
    return `${sign}${formatted}%`;
  }

  private formatVolume(value: number): string {
    if (value >= 1e12) {
      return `$${(value / 1e12).toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      })}T`;
    } else if (value >= 1e9) {
      return `$${(value / 1e9).toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      })}B`;
    } else if (value >= 1e6) {
      return `$${(value / 1e6).toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      })}M`;
    } else if (value >= 1e3) {
      return `$${(value / 1e3).toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      })}K`;
    } else {
      return `$${value.toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      })}`;
    }
  }

  private formatMarketCap(value: number): string {
    if (value >= 1e12) {
      return `$${(value / 1e12).toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      })} trillion`;
    } else if (value >= 1e9) {
      return `$${(value / 1e9).toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      })} billion`;
    } else if (value >= 1e6) {
      return `$${(value / 1e6).toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      })} million`;
    } else if (value >= 1e3) {
      return `$${(value / 1e3).toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      })} thousand`;
    } else {
      return `$${value.toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      })}`;
    }
  }
}

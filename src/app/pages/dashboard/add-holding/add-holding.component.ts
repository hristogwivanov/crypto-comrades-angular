import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { CryptoService } from '../../../services/crypto.service';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-add-holding',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterModule],
  templateUrl: './add-holding.component.html',
  styleUrls: ['./add-holding.component.css']
})
export class AddHoldingComponent implements OnInit {
  holdingForm: FormGroup;
  availableCryptos = [
    { id: 'bitcoin', symbol: 'BTC', name: 'Bitcoin' },
    { id: 'ethereum', symbol: 'ETH', name: 'Ethereum' },
    { id: 'ripple', symbol: 'XRP', name: 'XRP' }
  ];
  
  isSubmitting = false;

  constructor(
    private fb: FormBuilder,
    private cryptoService: CryptoService,
    private authService: AuthService,
    private router: Router
  ) {
    this.holdingForm = this.fb.group({
      cryptocurrency: ['', Validators.required],
      amount: ['', [Validators.required, Validators.min(0.00000001)]],
      purchasePrice: ['', [Validators.required, Validators.min(0.01)]]
    });
  }

  ngOnInit(): void {
  }

  onSubmit(): void {
    if (this.holdingForm.invalid) {
      this.markFormGroupTouched();
      return;
    }

    this.isSubmitting = true;
    const formValue = this.holdingForm.value;
    const selectedCrypto = this.availableCryptos.find(crypto => crypto.id === formValue.cryptocurrency);
    
    if (!selectedCrypto) {
      console.error('Selected cryptocurrency not found');
      this.isSubmitting = false;
      return;
    }

    // Get current user
    this.authService.getCurrentUser().subscribe({
      next: (user) => {
        if (!user) {
          console.error('User not authenticated');
          this.isSubmitting = false;
          return;
        }

        const amount = parseFloat(formValue.amount);
        const purchasePrice = parseFloat(formValue.purchasePrice);
        const totalValue = amount * purchasePrice;

        const holding = {
          userId: user.id,
          portfolioId: `portfolio_${user.id}`, // Default portfolio ID
          cryptoId: selectedCrypto.id,
          symbol: selectedCrypto.symbol,
          name: selectedCrypto.name,
          amount: amount,
          averageBuyPrice: purchasePrice,
          currentPrice: purchasePrice, // Will be updated with real-time data
          totalValue: totalValue,
          profitLoss: 0, // Initial profit/loss is 0
          profitLossPercentage: 0 // Initial profit/loss percentage is 0
        };

        // Create the portfolio holding
        this.cryptoService.createPortfolioHolding(holding).subscribe({
          next: (response) => {

            this.router.navigate(['/dashboard/portfolio']);
          },
          error: (error) => {
            console.error('Error adding holding:', error);
            this.isSubmitting = false;
            // You could add user-friendly error handling here
          }
        });
      },
      error: (error) => {
        console.error('Error getting user:', error);
        this.isSubmitting = false;
      }
    });
  }

  private markFormGroupTouched(): void {
    Object.keys(this.holdingForm.controls).forEach(key => {
      const control = this.holdingForm.get(key);
      control?.markAsTouched();
    });
  }

  // Helper methods for template
  isFieldInvalid(fieldName: string): boolean {
    const field = this.holdingForm.get(fieldName);
    return field ? field.invalid && field.touched : false;
  }

  getFieldError(fieldName: string): string {
    const field = this.holdingForm.get(fieldName);
    if (field?.errors && field.touched) {
      if (field.errors['required']) return `${fieldName} is required`;
      if (field.errors['min']) return `${fieldName} must be greater than ${field.errors['min'].min}`;
    }
    return '';
  }
}

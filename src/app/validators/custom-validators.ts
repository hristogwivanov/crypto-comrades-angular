import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

export class CustomValidators {
  
  static strongPassword(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const value = control.value;
      
      if (!value) {
        return null; // Let required validator handle empty values
      }
      
      const hasMinLength = value.length >= 8;
      const hasUpperCase = /[A-Z]/.test(value);
      const hasLowerCase = /[a-z]/.test(value);
      const hasNumber = /[0-9]/.test(value);
      const hasSpecialChar = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(value);
      
      const passwordValid = hasMinLength && hasUpperCase && hasLowerCase && hasNumber && hasSpecialChar;
      
      if (!passwordValid) {
        return {
          strongPassword: {
            hasMinLength,
            hasUpperCase,
            hasLowerCase,
            hasNumber,
            hasSpecialChar
          }
        };
      }
      
      return null;
    };
  }
  
  static confirmPassword(passwordControlName: string): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const password = control.parent?.get(passwordControlName);
      const confirmPassword = control.value;
      
      if (!password || !confirmPassword) {
        return null;
      }
      
      return password.value !== confirmPassword ? { confirmPassword: true } : null;
    };
  }
  
  static noWhitespaceOnly(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const value = control.value;
      
      if (!value) {
        return null; // Let required validator handle empty values
      }
      
      const isWhitespaceOnly = typeof value === 'string' && value.trim().length === 0;
      return isWhitespaceOnly ? { whitespaceOnly: true } : null;
    };
  }
  
  static validTags(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const value = control.value;
      
      if (!value) {
        return null;
      }
      
      const tags = value.split(',').map((tag: string) => tag.trim()).filter((tag: string) => tag.length > 0);
      
      // Check for too many tags
      if (tags.length > 10) {
        return { tooManyTags: { max: 10, actual: tags.length } };
      }
      
      // Check for invalid tag format
      const invalidTags = tags.filter((tag: string) => !/^[a-zA-Z0-9\-_]+$/.test(tag));
      if (invalidTags.length > 0) {
        return { invalidTagFormat: { invalidTags } };
      }
      
      // Check for duplicate tags
      const uniqueTags = [...new Set(tags.map((tag: string) => tag.toLowerCase()))];
      if (uniqueTags.length !== tags.length) {
        return { duplicateTags: true };
      }
      
      return null;
    };
  }
  
  static validCryptoSymbols(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const value = control.value;
      
      if (!value) {
        return null;
      }
      
      const symbols = value.split(',').map((symbol: string) => symbol.trim().toUpperCase()).filter((symbol: string) => symbol.length > 0);
      
      // Check for too many symbols
      if (symbols.length > 10) {
        return { tooManySymbols: { max: 10, actual: symbols.length } };
      }
      
      // Check for invalid symbol format (typically 2-10 uppercase letters)
      const invalidSymbols = symbols.filter((symbol: string) => !/^[A-Z]{1,10}$/.test(symbol));
      if (invalidSymbols.length > 0) {
        return { invalidSymbolFormat: { invalidSymbols } };
      }
      
      // Check for duplicate symbols
      const uniqueSymbols = [...new Set(symbols)];
      if (uniqueSymbols.length !== symbols.length) {
        return { duplicateSymbols: true };
      }
      
      return null;
    };
  }
  
  static profanityFilter(): ValidatorFn {
    // Simple profanity filter - in a real app, you'd use a more comprehensive solution
    const profanityWords = [
      'spam', 'scam', 'fake', 'phishing', 'malware', 'virus',
      // Add more words as needed - this is just a basic example
    ];
    
    return (control: AbstractControl): ValidationErrors | null => {
      const value = control.value;
      
      if (!value || typeof value !== 'string') {
        return null;
      }
      
      const lowerValue = value.toLowerCase();
      const foundProfanity = profanityWords.find(word => lowerValue.includes(word));
      
      return foundProfanity ? { profanity: { word: foundProfanity } } : null;
    };
  }
  
  static validImageUrl(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const value = control.value;
      
      if (!value) {
        return null; // Optional field
      }
      
      // Check if it's a valid URL
      try {
        const url = new URL(value);
        
        // Check if it's HTTP or HTTPS
        if (!['http:', 'https:'].includes(url.protocol)) {
          return { invalidImageUrl: { reason: 'Protocol must be HTTP or HTTPS' } };
        }
        
        // Check if it looks like an image URL
        const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'];
        const hasImageExtension = imageExtensions.some(ext => 
          url.pathname.toLowerCase().endsWith(ext)
        );
        
        // Also allow common image hosting domains without file extensions
        const imageHostingDomains = ['imgur.com', 'i.imgur.com', 'unsplash.com', 'images.unsplash.com'];
        const isImageHostingDomain = imageHostingDomains.some(domain => 
          url.hostname.includes(domain)
        );
        
        if (!hasImageExtension && !isImageHostingDomain) {
          return { invalidImageUrl: { reason: 'URL should point to an image file or be from a known image hosting service' } };
        }
        
        return null;
      } catch (error) {
        return { invalidImageUrl: { reason: 'Invalid URL format' } };
      }
    };
  }
  
  static minWords(minWords: number): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const value = control.value;
      
      if (!value) {
        return null;
      }
      
      const wordCount = value.trim().split(/\s+/).filter((word: string) => word.length > 0).length;
      
      return wordCount < minWords ? { minWords: { required: minWords, actual: wordCount } } : null;
    };
  }
  
  static maxWords(maxWords: number): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const value = control.value;
      
      if (!value) {
        return null;
      }
      
      const wordCount = value.trim().split(/\s+/).filter((word: string) => word.length > 0).length;
      
      return wordCount > maxWords ? { maxWords: { max: maxWords, actual: wordCount } } : null;
    };
  }
  
  static validUsername(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const value = control.value;
      
      if (!value) {
        return null;
      }
      
      // Username should be 3-20 characters, alphanumeric plus underscore and hyphen
      const usernamePattern = /^[a-zA-Z0-9_-]{3,20}$/;
      
      if (!usernamePattern.test(value)) {
        return { invalidUsername: true };
      }
      
      // Should not start or end with special characters
      if (value.startsWith('_') || value.startsWith('-') || value.endsWith('_') || value.endsWith('-')) {
        return { invalidUsername: true };
      }
      
      // Should not contain consecutive special characters
      if (/__|-_|_-|--/.test(value)) {
        return { invalidUsername: true };
      }
      
      return null;
    };
  }
}

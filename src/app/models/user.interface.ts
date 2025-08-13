export interface User {
  id: string;
  email: string;
  username: string;
  firstName: string;
  lastName: string;
  avatar?: string;
  createdAt: Date;
  isEmailVerified: boolean;
}

export interface UserProfile extends User {
  // Profile information
  bio?: string;
  displayName?: string;
  location?: string;
  website?: string;
  
  // Account metadata
  updatedAt?: Date;
  lastActiveAt?: Date;
  isActive: boolean;
  
  // Crypto-specific profile data
  favoriteCoins?: string[];
  tradingExperience?: 'beginner' | 'intermediate' | 'advanced';
  
  // Portfolio references
  portfolios: string[];
  totalPortfolioValue?: number;
  
  // Social features
  followersCount?: number;
  followingCount?: number;
  postsCount?: number;
  
  // Legacy compatibility
  joinedDate: Date;
  portfolioPublic: boolean;
  
  // Settings/preferences
  preferences?: UserPreferences;
  
  // Privacy settings
  privacy?: UserPrivacy;
}

export interface UserPreferences {
  theme?: 'light' | 'dark';
  currency?: 'USD' | 'EUR' | 'BTC';
  notifications?: {
    email: boolean;
    portfolio: boolean;
    social: boolean;
  };
}

export interface UserPrivacy {
  profileVisibility: 'public' | 'private';
  portfolioVisibility: 'public' | 'private' | 'friends';
  showHoldings: boolean;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterCredentials extends LoginCredentials {
  firstName: string;
  lastName: string;
  username: string;
  confirmPassword: string;
}

export interface AuthResponse {
  user: User;
  token: string;
  refreshToken: string;
  expiresIn: number;
}

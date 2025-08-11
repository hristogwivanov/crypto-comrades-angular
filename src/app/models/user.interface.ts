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
  bio?: string;
  location?: string;
  website?: string;
  totalPortfolioValue: number;
  joinedDate: Date;
  portfolioPublic: boolean;
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

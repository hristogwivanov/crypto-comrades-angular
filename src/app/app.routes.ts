import { Routes } from '@angular/router';
import { AuthGuard } from './guards/auth.guard';
import { GuestGuard } from './guards/guest.guard';

export const routes: Routes = [
  {
    path: '',
    redirectTo: '/home',
    pathMatch: 'full'
  },
  {
    path: 'home',
    loadComponent: () => import('./pages/home/home.component').then(m => m.HomeComponent)
  },
  {
    path: 'market',
    loadComponent: () => import('./pages/market/market.component').then(m => m.MarketComponent)
  },
  {
    path: 'crypto/:id',
    loadComponent: () => import('./pages/crypto-details/crypto-details.component').then(m => m.CryptoDetailsComponent)
  },
  {
    path: 'posts',
    loadComponent: () => import('./pages/posts/posts.component').then(m => m.PostsComponent)
  },
  {
    path: 'posts/:id',
    loadComponent: () => import('./pages/post-details/post-details.component').then(m => m.PostDetailsComponent)
  },
  {
    path: 'profile',
    canActivate: [AuthGuard],
    loadComponent: () => import('./pages/user-profile/user-profile.component').then(m => m.UserProfileComponent)
  },
  {
    path: 'user/:username',
    loadComponent: () => import('./pages/user-profile/user-profile.component').then(m => m.UserProfileComponent)
  },
  {
    path: 'portfolios',
    loadComponent: () => import('./pages/public-portfolios/public-portfolios.component').then(m => m.PublicPortfoliosComponent)
  },
  {
    path: 'auth',
    canActivate: [GuestGuard],
    children: [
      {
        path: 'login',
        loadComponent: () => import('./pages/auth/login/login.component').then(m => m.LoginComponent)
      },
      {
        path: 'register',
        loadComponent: () => import('./pages/auth/register/register.component').then(m => m.RegisterComponent)
      }
    ]
  },
  {
    path: 'dashboard',
    canActivate: [AuthGuard],
    children: [
      {
        path: '',
        loadComponent: () => import('./pages/dashboard/dashboard.component').then(m => m.DashboardComponent)
      },
      {
        path: 'portfolio',
        loadComponent: () => import('./pages/dashboard/portfolio/portfolio.component').then(m => m.PortfolioComponent)
      },
      {
        path: 'portfolio/add-holding',
        loadComponent: () => import('./pages/dashboard/add-holding/add-holding.component').then(m => m.AddHoldingComponent)
      },
      {
        path: 'portfolio/edit-holding/:id',
        loadComponent: () => import('./pages/dashboard/edit-holding/edit-holding.component').then(m => m.EditHoldingComponent)
      },
      {
        path: 'my-posts',
        loadComponent: () => import('./pages/dashboard/my-posts/my-posts.component').then(m => m.MyPostsComponent)
      },
      {
        path: 'create-post',
        loadComponent: () => import('./pages/dashboard/create-post/create-post.component').then(m => m.CreatePostComponent)
      },
      {
        path: 'edit-post/:id',
        loadComponent: () => import('./pages/dashboard/edit-post/edit-post.component').then(m => m.EditPostComponent)
      },
      {
        path: 'profile',
        loadComponent: () => import('./pages/dashboard/profile/profile.component').then(m => m.ProfileComponent)
      }
    ]
  },
  {
    path: '**',
    loadComponent: () => import('./pages/not-found/not-found.component').then(m => m.NotFoundComponent)
  }
];

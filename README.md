# 🚀 Crypto Comrades - Angular Single Page Application

[![Angular](https://img.shields.io/badge/Angular-20+-red.svg)](https://angular.io/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8+-blue.svg)](https://www.typescriptlang.org/)
[![RxJS](https://img.shields.io/badge/RxJS-7.8+-purple.svg)](https://rxjs.dev/)
[![Firebase](https://img.shields.io/badge/Firebase-Hosted-orange.svg)](https://firebase.google.com/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

## 🌐 **LIVE APP**: [https://crypto-comrades.web.app](https://crypto-comrades.web.app)

A comprehensive cryptocurrency community platform built with Angular 20+. This Single Page Application (SPA) provides users with real-time crypto market data, portfolio management, and a vibrant community for sharing insights and analysis.

**🔥 Now deployed live on Firebase Hosting with automatic CI/CD deployment!**

## 🌟 Features

### Public Features
- **🏠 Home Dashboard**: Welcome page with platform overview, trending cryptocurrencies, and recent posts
- **📈 Market Data**: Real-time cryptocurrency prices, market cap, volume, and 24h changes
- **🔍 Crypto Details**: Detailed information for individual cryptocurrencies with charts and statistics
- **💬 Community Posts**: Browse and read community-generated content and analysis
- **📖 Post Details**: In-depth view of posts with comments, likes/dislikes, and related content
- **🔐 Authentication**: Secure login and registration system

### Private Features (Authenticated Users)
- **📊 Personal Dashboard**: User statistics, portfolio overview, and quick actions
- **💼 Portfolio Management**: Track cryptocurrency holdings and performance
- **✍️ Create Posts**: Share insights, analysis, and thoughts with the community
- **📝 Manage Posts**: Edit, delete, and manage your own posts with user-specific permissions
- **👤 Profile Management**: Update personal information and preferences
- **🔒 Private Posts**: Create posts visible only to yourself

## 🛠️ Technical Stack

### Frontend Technologies
- **Angular 20+**: Latest version with standalone components
- **TypeScript 5.2+**: Strong typing and modern JavaScript features
- **RxJS 7.8+**: Reactive programming with Observables
- **Angular Reactive Forms**: Form validation and management
- **Angular Router**: Client-side routing with guards
- **CSS3**: Modern styling with flexbox and grid layouts

### Key Angular Concepts Implemented
- **Standalone Components**: Modern Angular architecture
- **TypeScript Interfaces**: Strong typing for all data models
- **Observables & RxJS Operators**: map, takeUntil, debounceTime, distinctUntilChanged, switchMap, startWith
- **Lifecycle Hooks**: OnInit, OnDestroy for proper component lifecycle management
- **Custom Pipes**: cryptoFormat, timeAgo for data transformation
- **Route Guards**: AuthGuard and GuestGuard for access control
- **Reactive Forms**: Comprehensive form validation and user input handling
- **Custom Validators**: Strong password, username, profanity filter, and content validation
- **Services**: Modular service architecture for API calls and state management
- **Error Handling**: Comprehensive error management throughout the application

## 🚦 Routing Structure

### Public Routes
- `/` → Home page
- `/market` → Cryptocurrency market catalog
- `/market/:id` → Individual crypto details
- `/posts` → Community posts catalog
- `/posts/:id` → Individual post details
- `/user/:username` → Public user profile pages
- `/auth/login` → User login
- `/auth/register` → User registration

### Private Routes (Requires Authentication)
- `/dashboard` → User dashboard
- `/dashboard/create-post` → Create new post
- `/dashboard/edit-post/:id` → Edit existing post
- `/dashboard/my-posts` → Manage user posts
- `/dashboard/portfolio` → Portfolio management
- `/dashboard/profile` → User profile settings

### Special Routes
- `**` → 404 Not Found page

## 🔒 Security & Permissions

### Route Guards
- **AuthGuard**: Protects private routes, redirects to login if not authenticated
- **GuestGuard**: Redirects authenticated users away from login/register pages

### User Permissions
- **Guests**: Can view public content (market, posts, crypto details)
- **Authenticated Users**: Full access to personal dashboard and content creation
- **Content Ownership**: Users can only edit/delete their own posts
- **Privacy Controls**: Users can create private posts visible only to themselves

## 🚀 Quick Start

### Prerequisites
- Node.js 20+ and npm
- Angular CLI 20+

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/hristogwivanov/crypto-comrades-angular.git
   cd crypto-comrades-angular
   ```

2. **Install dependencies**
   ```bash
   npm install --legacy-peer-deps
   ```

3. **Start development server**
   ```bash
   ng serve
   ```

4. **Open in browser**
   Navigate to `http://localhost:4200/`

## 🌐 **LIVE DEPLOYMENT**

### 🔗 **Production URL**: [https://crypto-comrades.web.app](https://crypto-comrades.web.app)

The application is deployed on **Firebase Hosting** with automatic CI/CD pipeline via **GitHub Actions**.

### 🔄 **Automatic Deployment**
- **Every push to `main` branch** triggers automatic deployment
- **GitHub Actions** handles build and deployment process
- **Zero-downtime deployments** with Firebase Hosting
- **Pull Request previews** available for testing changes

### 🛠️ **Deployment Architecture**
- **Frontend**: Angular 20 SPA hosted on Firebase Hosting
- **Backend**: Firebase services (Authentication, Firestore, Storage)
- **CI/CD**: GitHub Actions with Firebase deployment
- **Build**: Angular production build with optimization

### 📋 **Deployment Process**
1. Push changes to `main` branch
2. GitHub Actions automatically triggers
3. Dependencies installed with `npm ci --legacy-peer-deps`
4. Angular production build created in `dist/browser/`
5. Firebase Hosting deployment with SPA routing
6. Live app updated at [crypto-comrades.web.app](https://crypto-comrades.web.app)

### Demo Credentials
For testing purposes, you can use these demo login credentials:
- **Username**: `demo@crypto-comrades.com`
- **Password**: `DemoPass123!`

## 🧪 Development

### Code Scaffolding
```bash
# Generate a new component
ng generate component component-name

# Generate other Angular elements
ng generate directive|pipe|service|class|guard|interface|enum|module
```

### Build
```bash
# Development build
ng build

# Production build
ng build --prod
```

### Testing
```bash
# Run unit tests
ng test
```

## 📋 Assignment Requirements Compliance

✅ **Single Page Application**: Built with Angular 20+  
✅ **Public & Private Areas**: Clear separation with route guards  
✅ **3+ Dynamic Pages**: Market, Posts, Crypto Details, Dashboard, etc.  
✅ **Catalog & Details Views**: Market↔Crypto Details, Posts↔Post Details  
✅ **Full CRUD Operations**: Posts (Create, Read, Update, Delete)  
✅ **User-Specific Permissions**: Users can only edit/delete their own posts  
✅ **Guest Access**: Guests can view but not modify content  
✅ **Client-Side Routing**: 4+ pages with parameterized routes  
✅ **TypeScript Strong Typing**: All components use proper typing  
✅ **2+ Interfaces**: CryptoCurrency, Post, User, and more  
✅ **Observables & RxJS**: Extensive use of reactive programming  
✅ **2+ RxJS Operators**: map, takeUntil, debounceTime, switchMap, etc.  
✅ **Lifecycle Hooks**: OnInit, OnDestroy implementation  
✅ **Custom Pipes**: cryptoFormat, timeAgo  
✅ **Route Guards**: AuthGuard, GuestGuard  
✅ **Error Handling**: Comprehensive error management  
✅ **Data Validation**: Custom validators and form validation  
✅ **External CSS**: All components have dedicated stylesheets  

## 🎯 Bonus Features

- **🎨 Modern UI/UX**: Professional design with animations
- **📱 Responsive Design**: Mobile-first approach
- **🔍 Search & Filtering**: Advanced content discovery
- **📊 Data Visualization**: Market statistics and trends
- **💾 Local Storage**: User preferences persistence
- **🚀 Performance**: Optimized loading and rendering
- **♿ Accessibility**: WCAG compliance considerations

## 📄 License

This project is licensed under the MIT License.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

**Built using Angular 20+ and TypeScript**

To build the project run:

```bash
ng build
```

This will compile your project and store the build artifacts in the `dist/` directory. By default, the production build optimizes your application for performance and speed.

## Running unit tests

To execute unit tests with the [Karma](https://karma-runner.github.io) test runner, use the following command:

```bash
ng test
```


## Additional Resources

For more information on using the Angular CLI, including detailed command references, visit the [Angular CLI Overview and Command Reference](https://angular.dev/tools/cli) page.

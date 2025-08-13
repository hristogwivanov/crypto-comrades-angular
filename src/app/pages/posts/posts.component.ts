import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Observable, Subject, BehaviorSubject, combineLatest } from 'rxjs';
import { takeUntil, debounceTime, distinctUntilChanged, switchMap, startWith, map } from 'rxjs/operators';
import { FirebasePostsService } from '../../services/firebase-posts.service';
import { AuthService } from '../../services/auth.service';
import { Post } from '../../models/post.interface';

@Component({
  selector: 'app-posts',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  template: `
    <div class="posts-container">
      <div class="posts-header">
        <h1>Community Posts</h1>
        <p>Share insights, discuss trends, and connect with fellow crypto enthusiasts</p>
        <div class="header-actions" *ngIf="isAuthenticated$ | async">
          <a routerLink="/dashboard/create-post" class="btn btn-primary">Create New Post</a>
        </div>
      </div>

      <div class="posts-controls">
        <div class="search-container">
          <input 
            type="text" 
            placeholder="Search posts..." 
            [(ngModel)]="searchTerm"
            (input)="onSearchChange($event)"
            class="search-input">
        </div>
        
        <div class="filter-container">
          <select [(ngModel)]="filterBy" (change)="onFilterChange()" class="filter-select">
            <option value="all">All Posts</option>
            <option value="public">Public Posts</option>
            <option value="recent">Recent Posts</option>
            <option value="popular">Popular Posts</option>
          </select>
          
          <select [(ngModel)]="sortBy" (change)="onSortChange()" class="sort-select">
            <option value="createdAt">Latest First</option>
            <option value="likes">Most Liked</option>
            <option value="comments">Most Comments</option>
            <option value="title">Title A-Z</option>
          </select>
        </div>
      </div>

      <div class="posts-stats" *ngIf="filteredPosts$ | async as posts">
        <div class="stat-item">
          <span class="stat-number">{{ posts.length }}</span>
          <span class="stat-label">Total Posts</span>
        </div>
        <div class="stat-item">
          <span class="stat-number">{{ getTotalLikes(posts) }}</span>
          <span class="stat-label">Total Likes</span>
        </div>
        <div class="stat-item">
          <span class="stat-number">{{ getTotalDislikes(posts) }}</span>
          <span class="stat-label">Total Dislikes</span>
        </div>
        <div class="stat-item">
          <span class="stat-number">{{ getTotalComments(posts) }}</span>
          <span class="stat-label">Total Comments</span>
        </div>
        <div class="stat-item">
          <span class="stat-number">{{ getUniqueAuthors(posts) }}</span>
          <span class="stat-label">Contributors</span>
        </div>
      </div>

      <div class="loading" *ngIf="loading">
        <div class="spinner"></div>
        <p>Loading posts...</p>
      </div>

      <div class="error-message" *ngIf="error">
        <p>{{ error }}</p>
        <button (click)="loadPosts()" class="retry-btn">Retry</button>
      </div>

      <div class="posts-grid" *ngIf="filteredPosts$ | async as posts">
        <div class="post-card" *ngFor="let post of posts; trackBy: trackByPost" [routerLink]="['/posts', post.id]" 
             style="display: flex !important; flex-direction: column !important; min-height: 400px !important;">
          <div class="post-header">
            <div class="author-info">
              <img [src]="post.author.avatar || '/default-avatar.svg'" 
                   [alt]="post.author.username" class="author-avatar">
              <div class="author-details">
                <span class="author-name">{{ post.author.username }}</span>
                <span class="post-date">{{ post.createdAt | date:'short' }}</span>
              </div>
            </div>
            <div class="post-visibility">
              <span class="visibility-badge private" *ngIf="!post.isPublic">
                Private
              </span>
            </div>
          </div>

          <div class="post-content" style="flex-grow: 1 !important;">
            <h3 class="post-title">{{ post.title }}</h3>
            <p class="post-excerpt">{{ post.content | slice:0:200 }}...</p>
            
            <div class="post-tags" *ngIf="post.tags && Array.isArray(post.tags) && post.tags.length > 0">
              <span class="tag" *ngFor="let tag of post.tags.slice(0, 3)">{{ tag }}</span>
              <span class="more-tags" *ngIf="post.tags.length > 3">+{{ post.tags.length - 3 }} more</span>
            </div>

            <div class="crypto-mentions" *ngIf="post.cryptoMentions && Array.isArray(post.cryptoMentions) && post.cryptoMentions.length > 0">
              <span class="mention-label">Mentions:</span>
              <span class="crypto-mention" *ngFor="let mention of post.cryptoMentions.slice(0, 3)">
                {{ mention | uppercase }}
              </span>
              <span class="more-mentions" *ngIf="post.cryptoMentions.length > 3">
                +{{ post.cryptoMentions.length - 3 }} more
              </span>
            </div>
          </div>

          <div class="post-image" *ngIf="post.imageUrl">
            <img [src]="post.imageUrl" [alt]="post.title" class="post-img">
          </div>

          <div class="post-footer" style="margin-top: auto !important; flex-shrink: 0 !important;">
            <div class="post-stats">
              <div class="stat-item">
                <span class="stat-icon">👍</span>
                <span class="stat-count">{{ post.likes }}</span>
              </div>
              <div class="stat-item">
                <span class="stat-icon">👎</span>
                <span class="stat-count">{{ post.dislikes }}</span>
              </div>
              <div class="stat-item">
                <span class="stat-icon">💬</span>
                <span class="stat-count">{{ post.comments.length }}</span>
              </div>
            </div>
            <div class="post-actions">
              <span class="read-more">Read More →</span>
            </div>
          </div>
        </div>

        <div class="no-posts" *ngIf="posts.length === 0">
          <div class="empty-state">
            <h3>No Posts Found</h3>
            <p *ngIf="searchTerm">No posts match your search criteria.</p>
            <p *ngIf="!searchTerm">Be the first to share your crypto insights!</p>
            <a routerLink="/dashboard/create-post" 
               class="btn btn-primary" 
               *ngIf="isAuthenticated$ | async">Create First Post</a>
            <a routerLink="/auth/register" 
               class="btn btn-primary" 
               *ngIf="!(isAuthenticated$ | async)">Join Community</a>
          </div>
        </div>
      </div>

      <div class="guest-cta" *ngIf="!(isAuthenticated$ | async)">
        <div class="cta-content">
          <h3>Join the Crypto Community</h3>
          <p>Sign up to create posts, engage with others, and share your cryptocurrency insights</p>
          <div class="cta-actions">
            <a routerLink="/auth/register" class="btn btn-primary">Sign Up Free</a>
            <a routerLink="/auth/login" class="btn btn-outline">Log In</a>
          </div>
        </div>
      </div>
    </div>
  `,
  styleUrls: ['./posts.component.css']
})
export class PostsComponent implements OnInit, OnDestroy {
  posts$!: Observable<Post[]>;
  filteredPosts$!: Observable<Post[]>;
  isAuthenticated$!: Observable<boolean>;
  
  searchTerm: string = '';
  filterBy: string = 'all';
  sortBy: 'newest' | 'oldest' | 'most-liked' = 'newest';
  loading = false;
  error: string | null = null;
  selectedTag = '';
  selectedCrypto = '';
  totalCommentsCount = 0;

  // Make Array accessible in template
  Array = Array;

  private destroy$ = new Subject<void>();
  private searchSubject = new BehaviorSubject<string>('');
  private filterSubject = new BehaviorSubject<string>('all');
  private sortSubject = new BehaviorSubject<string>('newest');

  constructor(
    private firebasePostsService: FirebasePostsService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.isAuthenticated$ = this.authService.isAuthenticated$;
    this.loadPosts();
    this.setupFilters();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadPosts(): void {
    this.loading = true;
    this.error = null;
    
    this.posts$ = this.firebasePostsService.getAllPosts().pipe(
      takeUntil(this.destroy$)
    );

    this.posts$.subscribe({
      next: (posts) => {
        this.loading = false;
        // Load total comments count for all posts
        this.loadTotalCommentsCount(posts);
      },
      error: (err) => {
        this.loading = false;
        this.error = 'Failed to load posts. Please try again.';
        console.error('Error loading posts:', err);
      }
    });
  }

  loadTotalCommentsCount(posts: Post[]): void {
    this.firebasePostsService.getTotalCommentsCount(posts).pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: (count) => {
        this.totalCommentsCount = typeof count === 'number' ? count : 0;
      },
      error: (err) => {
        console.error('Error loading comment counts:', err);
        this.totalCommentsCount = 0;
      }
    });
  }

  setupFilters(): void {
    this.filteredPosts$ = combineLatest([
      this.posts$,
      this.searchSubject.pipe(debounceTime(300), distinctUntilChanged()),
      this.filterSubject,
      this.sortSubject
    ]).pipe(
      map(([posts, search, filter, sort]) => {
        let filtered = posts;

        // Apply search filter
        if (search.trim()) {
          const searchLower = search.toLowerCase();
          filtered = filtered.filter((post: Post) => 
            post.title.toLowerCase().includes(searchLower) ||
            post.content.toLowerCase().includes(searchLower) ||
            post.author.username.toLowerCase().includes(searchLower) ||
            post.tags.some((tag: string) => tag.toLowerCase().includes(searchLower)) ||
            (post.cryptoMentions && post.cryptoMentions.some((mention: string) => 
              mention.toLowerCase().includes(searchLower)))
          );
        }

        // Apply category filter
        switch (filter) {
          case 'public':
            filtered = filtered.filter((post: Post) => post.isPublic);
            break;
          case 'recent':
            const weekAgo = new Date();
            weekAgo.setDate(weekAgo.getDate() - 7);
            filtered = filtered.filter((post: Post) => new Date(post.createdAt) >= weekAgo);
            break;
          case 'popular':
            filtered = filtered.filter((post: Post) => post.likes >= 5 || post.comments.length >= 3);
            break;
        }

        // Apply sorting
        filtered.sort((a: Post, b: Post) => {
          switch (sort) {
            case 'likes':
              return b.likes - a.likes;
            case 'comments':
              return b.comments.length - a.comments.length;
            case 'title':
              return a.title.localeCompare(b.title);
            case 'createdAt':
            default:
              return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
          }
        });

        return filtered;
      }),
      takeUntil(this.destroy$)
    );
  }

  onSearchChange(event: any): void {
    const value = event.target.value;
    this.searchTerm = value;
    this.searchSubject.next(value);
  }

  onFilterChange(): void {
    this.filterSubject.next(this.filterBy);
  }

  onSortChange(): void {
    this.sortSubject.next(this.sortBy);
  }

  trackByPost(index: number, post: Post): string {
    return post.id;
  }

  getTotalLikes(posts: Post[]): number {
    return posts.reduce((total, post) => total + post.likes, 0);
  }

  getTotalDislikes(posts: Post[]): number {
    return posts.reduce((total, post) => total + post.dislikes, 0);
  }

  getTotalComments(posts: Post[]): number {
    // Dynamic comment counting happens in loadTotalComments()
    // This returns the cached value
    return this.totalCommentsCount;
  }

  getUniqueAuthors(posts: Post[]): number {
    const uniqueAuthors = new Set(posts.map(post => post.author.username));
    return uniqueAuthors.size;
  }
}

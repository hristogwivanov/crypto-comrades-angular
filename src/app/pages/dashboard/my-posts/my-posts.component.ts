import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Observable, Subject, BehaviorSubject, combineLatest, of } from 'rxjs';
import { takeUntil, map, startWith, debounceTime, distinctUntilChanged, switchMap } from 'rxjs/operators';
import { FirebasePostsService } from '../../../services/firebase-posts.service';
import { AuthService } from '../../../services/auth.service';
import { Post } from '../../../models/post.interface';
import { User } from '../../../models/user.interface';

@Component({
  selector: 'app-my-posts',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  template: `
    <div class="my-posts-container">
      <div class="page-header">
        <div class="header-content">
          <h1>My Posts</h1>
          <p>Manage your cryptocurrency insights and discussions</p>
        </div>
        <div class="header-actions">
          <a routerLink="/dashboard/create-post" class="btn btn-primary">
            <span class="btn-icon">✍️</span>
            Create New Post
          </a>
        </div>
      </div>

      <div class="posts-stats" *ngIf="userPosts$ | async as posts">
        <div class="stat-item">
          <div class="stat-number">{{ posts.length }}</div>
          <div class="stat-label">Total Posts</div>
        </div>
        <div class="stat-item">
          <div class="stat-number">{{ getPublicPosts(posts) }}</div>
          <div class="stat-label">Public Posts</div>
        </div>
        <div class="stat-item">
          <div class="stat-number">{{ getTotalLikes(posts) }}</div>
          <div class="stat-label">Total Likes</div>
        </div>
        <div class="stat-item">
          <div class="stat-number">{{ getTotalComments(posts) }}</div>
          <div class="stat-label">Total Comments</div>
        </div>
      </div>

      <div class="posts-controls">
        <div class="search-container">
          <input 
            type="text" 
            placeholder="Search your posts..." 
            [(ngModel)]="searchTerm"
            (input)="onSearchChange($event)"
            class="search-input">
        </div>
        
        <div class="filter-container">
          <select [(ngModel)]="filterBy" (change)="onFilterChange()" class="filter-select">
            <option value="all">All Posts</option>
            <option value="public">Public Only</option>
            <option value="private">Private Only</option>
            <option value="popular">Popular (5+ likes)</option>
            <option value="recent">Recent (Last 7 days)</option>
          </select>
          
          <select [(ngModel)]="sortBy" (change)="onSortChange()" class="sort-select">
            <option value="createdAt">Newest First</option>
            <option value="updatedAt">Recently Updated</option>
            <option value="likes">Most Liked</option>
            <option value="comments">Most Comments</option>
            <option value="title">Title A-Z</option>
          </select>
        </div>
      </div>

      <div class="loading" *ngIf="loading">
        <div class="spinner"></div>
        <p>Loading your posts...</p>
      </div>

      <div class="error-message" *ngIf="error">
        <p>{{ error }}</p>
        <button (click)="loadPosts()" class="retry-btn">Retry</button>
      </div>

      <div class="posts-section" *ngIf="filteredPosts$ | async as posts">
        <div class="posts-grid" *ngIf="posts.length > 0">
          <div class="post-card" *ngFor="let post of posts; trackBy: trackByPost">
            <div class="post-header">
              <div class="post-meta">
                <h3 class="post-title" [routerLink]="['/posts', post.id]">{{ post.title }}</h3>
                <div class="post-dates">
                  <span class="created-date">Created: {{ post.createdAt | date:'short' }}</span>
                  <span class="updated-date" *ngIf="post.updatedAt !== post.createdAt">
                    Updated: {{ post.updatedAt | date:'short' }}
                  </span>
                </div>
              </div>
              
              <div class="post-status">
                <span class="visibility-badge private" 
                      *ngIf="!post.isPublic">
                  Private
                </span>
              </div>
            </div>

            <div class="post-content">
              <p class="post-excerpt">{{ post.content | slice:0:200 }}...</p>
              
              <div class="post-tags" *ngIf="post.tags.length > 0">
                <span class="tag" *ngFor="let tag of post.tags.slice(0, 4)">{{ tag }}</span>
                <span class="more-tags" *ngIf="post.tags.length > 4">+{{ post.tags.length - 4 }}</span>
              </div>

              <div class="crypto-mentions" *ngIf="post.cryptoMentions && post.cryptoMentions.length > 0">
                <span class="mention-label">Crypto:</span>
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

            <div class="post-footer">
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
                <a [routerLink]="['/posts', post.id]" class="action-btn view-btn">
                  <span class="btn-icon">👁️</span>
                  View
                </a>
                <a [routerLink]="['/dashboard/edit-post', post.id]" class="action-btn edit-btn">
                  <span class="btn-icon">✏️</span>
                  Edit
                </a>
                <button (click)="deletePost(post)" class="action-btn delete-btn" [disabled]="deletingPostId === post.id">
                  <span class="btn-icon">🗑️</span>
                  {{ deletingPostId === post.id ? 'Deleting...' : 'Delete' }}
                </button>
              </div>
            </div>
          </div>
        </div>

        <div class="no-posts" *ngIf="posts.length === 0">
          <div class="empty-state">
            <div class="empty-icon">📝</div>
            <h3>{{ getEmptyStateTitle() }}</h3>
            <p>{{ getEmptyStateMessage() }}</p>
            <a routerLink="/dashboard/create-post" class="btn btn-primary" *ngIf="!searchTerm && filterBy === 'all'">
              Create Your First Post
            </a>
            <button (click)="clearFilters()" class="btn btn-outline" *ngIf="searchTerm || filterBy !== 'all'">
              Clear Filters
            </button>
          </div>
        </div>
      </div>

      <div class="quick-actions">
        <div class="quick-actions-header">
          <h3>Quick Actions</h3>
        </div>
        <div class="actions-list">
          <a routerLink="/dashboard/create-post" class="quick-action">
            <span class="action-icon">✍️</span>
            <div class="action-content">
              <h4>Write New Post</h4>
              <p>Share your latest crypto insights</p>
            </div>
          </a>
          <a routerLink="/posts" class="quick-action">
            <span class="action-icon">🌐</span>
            <div class="action-content">
              <h4>Browse Community</h4>
              <p>See what others are discussing</p>
            </div>
          </a>
          <a routerLink="/market" class="quick-action">
            <span class="action-icon">📈</span>
            <div class="action-content">
              <h4>Check Market</h4>
              <p>Get latest crypto prices</p>
            </div>
          </a>
        </div>
      </div>
    </div>
  `,
  styleUrls: ['./my-posts.component.css']
})
export class MyPostsComponent implements OnInit, OnDestroy {
  userPosts$!: Observable<Post[]>;
  filteredPosts$!: Observable<Post[]>;
  
  searchTerm: string = '';
  filterBy: string = 'all';
  sortBy: string = 'createdAt';
  loading: boolean = false;
  error: string | null = null;
  deletingPostId: string | null = null;

  private destroy$ = new Subject<void>();
  private searchSubject = new BehaviorSubject<string>('');
  private filterSubject = new BehaviorSubject<string>('all');
  private sortSubject = new BehaviorSubject<string>('createdAt');

  constructor(
    private firebasePostsService: FirebasePostsService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
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
    
    // Use FirebasePostsService method that includes private posts for current user
    this.userPosts$ = this.firebasePostsService.getCurrentUserPosts().pipe(
      takeUntil(this.destroy$)
    );

    this.userPosts$.subscribe({
      next: () => {
        this.loading = false;
      },
      error: (err) => {
        this.loading = false;
        this.error = 'Failed to load your posts. Please try again.';
        console.error('Error loading user posts:', err);
      }
    });
  }

  setupFilters(): void {
    this.filteredPosts$ = combineLatest([
      this.userPosts$,
      this.searchSubject.pipe(debounceTime(300), distinctUntilChanged()),
      this.filterSubject,
      this.sortSubject
    ]).pipe(
      map(([posts, search, filter, sort]) => {
        let filtered = posts;

        // Apply search filter
        if (search.trim()) {
          const searchLower = search.toLowerCase();
          filtered = filtered.filter(post => 
            post.title.toLowerCase().includes(searchLower) ||
            post.content.toLowerCase().includes(searchLower) ||
            post.tags.some(tag => tag.toLowerCase().includes(searchLower)) ||
            (post.cryptoMentions && post.cryptoMentions.some(mention => 
              mention.toLowerCase().includes(searchLower)))
          );
        }

        // Apply category filter
        switch (filter) {
          case 'public':
            filtered = filtered.filter(post => post.isPublic);
            break;
          case 'private':
            filtered = filtered.filter(post => !post.isPublic);
            break;
          case 'popular':
            filtered = filtered.filter(post => post.likes >= 5);
            break;
          case 'recent':
            const weekAgo = new Date();
            weekAgo.setDate(weekAgo.getDate() - 7);
            filtered = filtered.filter(post => new Date(post.createdAt) >= weekAgo);
            break;
        }

        // Apply sorting
        filtered.sort((a, b) => {
          switch (sort) {
            case 'updatedAt':
              return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
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
      startWith([]),
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

  deletePost(post: Post): void {
    if (!confirm(`Are you sure you want to delete "${post.title}"? This action cannot be undone.`)) {
      return;
    }

    this.deletingPostId = post.id;
    
    this.firebasePostsService.deletePost(post.id).pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: () => {
        this.deletingPostId = null;
        this.loadPosts(); // Reload posts after deletion
      },
      error: (err) => {
        this.deletingPostId = null;
        console.error('Error deleting post:', err);
        alert('Failed to delete post. Please try again.');
      }
    });
  }

  clearFilters(): void {
    this.searchTerm = '';
    this.filterBy = 'all';
    this.sortBy = 'createdAt';
    this.searchSubject.next('');
    this.filterSubject.next('all');
    this.sortSubject.next('createdAt');
  }

  trackByPost(index: number, post: Post): string {
    return post.id;
  }

  getPublicPosts(posts: Post[]): number {
    return posts.filter(post => post.isPublic).length;
  }

  getTotalLikes(posts: Post[]): number {
    return posts.reduce((total, post) => total + post.likes, 0);
  }

  getTotalComments(posts: Post[]): number {
    return posts.reduce((total, post) => total + post.comments.length, 0);
  }

  getEmptyStateTitle(): string {
    if (this.searchTerm) {
      return 'No posts found';
    }
    if (this.filterBy !== 'all') {
      return `No ${this.filterBy} posts`;
    }
    return "You haven't created any posts yet";
  }

  getEmptyStateMessage(): string {
    if (this.searchTerm) {
      return `No posts match your search for "${this.searchTerm}".`;
    }
    if (this.filterBy !== 'all') {
      return `You don't have any ${this.filterBy} posts matching the current filter.`;
    }
    return 'Start sharing your cryptocurrency insights with the community!';
  }
}

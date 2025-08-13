import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute } from '@angular/router';
import { Observable, Subject, combineLatest } from 'rxjs';
import { takeUntil, map, switchMap } from 'rxjs/operators';
import { AuthService } from '../../services/auth.service';
import { FirebasePostsService } from '../../services/firebase-posts.service';
import { FirebaseUserService } from '../../services/firebase-user.service';
import { User, UserProfile } from '../../models/user.interface';
import { Post } from '../../models/post.interface';

@Component({
  selector: 'app-user-profile',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="profile-container">
      <div class="profile-header" *ngIf="profileUser">
        <div class="profile-info">
          <div class="avatar-section">
            <img [src]="profileUser.avatar || '/default-avatar.svg'" 
                 [alt]="profileUser.username" 
                 class="profile-avatar">
          </div>
          <div class="user-details">
            <h1 class="username">{{ profileUser.username }}</h1>
            <p class="email" *ngIf="isOwnProfile">{{ profileUser.email }}</p>
            <p class="member-since" *ngIf="getMemberSinceDate()">
              Member since {{ getMemberSinceDate() | date:'MMMM yyyy' }}
            </p>
          </div>
        </div>
      </div>

      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-number">{{ userStats?.totalPosts || 0 }}</div>
          <div class="stat-label">Posts</div>
        </div>
        <div class="stat-card">
          <div class="stat-number">{{ userStats?.publicPosts || 0 }}</div>
          <div class="stat-label">Public Posts</div>
        </div>
        <div class="stat-card">
          <div class="stat-number">{{ userStats?.totalLikes || 0 }}</div>
          <div class="stat-label">Total Likes</div>
        </div>
        <div class="stat-card">
          <div class="stat-number">{{ userStats?.totalComments || 0 }}</div>
          <div class="stat-label">Comments Made</div>
        </div>
      </div>

      <div class="recent-activity">
        <div class="section-header">
          <h2>Recent Posts</h2>
        </div>
        
        <div class="loading" *ngIf="loading">
          <div class="spinner"></div>
          <p>Loading posts...</p>
        </div>

        <div class="posts-preview" *ngIf="!loading">
          <div class="post-card" *ngFor="let post of recentPosts">
            <div class="post-header">
              <h3 class="post-title">
                {{ post.title }}
              </h3>
              <span class="post-date">{{ post.createdAt | date:'MMM d, yyyy' }}</span>
            </div>
            <p class="post-content-preview">{{ getPostPreview(post.content) }}</p>
            <div class="post-meta">
              <span class="post-visibility" [class.public]="post.isPublic" [class.private]="!post.isPublic">
                {{ post.isPublic ? 'Public' : 'Private' }}
              </span>
              <div class="post-engagement">
                <span class="likes">👍 {{ post.likes }}</span>
                <span class="comments">💬 {{ post.comments.length || 0 }}</span>
              </div>
            </div>
          </div>

          <div class="no-posts" *ngIf="recentPosts.length === 0">
            <p *ngIf="isOwnProfile">No posts yet.</p>
            <p *ngIf="!isOwnProfile">{{ profileUser?.username }} hasn't posted anything yet.</p>
          </div>
        </div>
      </div>


    </div>
  `,
  styleUrls: ['./user-profile.component.css']
})
export class UserProfileComponent implements OnInit, OnDestroy {
  currentUser: User | null = null;
  profileUser: UserProfile | User | null = null;
  recentPosts: Post[] = [];
  userStats: any = null;
  loading = false;
  isOwnProfile = false;
  
  private destroy$ = new Subject<void>();

  constructor(
    private authService: AuthService,
    private postsService: FirebasePostsService,
    private userService: FirebaseUserService,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.loadUserData();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadUserData(): void {
    this.loading = true;

    // Get current user for authentication checks
    this.authService.currentUser$
      .pipe(takeUntil(this.destroy$))
      .subscribe(user => {
        this.currentUser = user;
      });

    // Check route to determine if viewing own profile or another user's profile
    this.route.params
      .pipe(
        takeUntil(this.destroy$),
        switchMap(params => {
          const username = params['username'];
          if (username) {
            // Viewing another user's profile via /user/:username
            this.isOwnProfile = false;
            return this.userService.getUserByUsername(username);
          } else {
            // Viewing own profile via /profile
            this.isOwnProfile = true;
            return this.authService.currentUser$;
          }
        })
      )
      .subscribe(user => {
        if (user) {
          this.profileUser = user;
          this.loadUserPosts(user.id);
        } else if (!this.isOwnProfile) {
          // User not found
          this.loading = false;
        }
      });
  }

  loadUserPosts(userId: string): void {
    const postsObservable = this.isOwnProfile 
      ? this.postsService.getCurrentUserPosts()
      : this.postsService.getPostsByUserId(userId, false); // Only public posts for other users

    postsObservable
      .pipe(takeUntil(this.destroy$))
      .subscribe(posts => {
        this.recentPosts = posts.slice(0, 3); // Show only 3 most recent posts
        this.calculateUserStats(posts);
        this.loading = false;
      });
  }

  calculateUserStats(posts: Post[]): void {
    this.userStats = {
      totalPosts: posts.length,
      publicPosts: posts.filter(post => post.isPublic).length,
      totalLikes: posts.reduce((sum, post) => sum + (post.likes || 0), 0),
      totalComments: posts.reduce((sum, post) => sum + (post.comments.length || 0), 0)
    };
  }

  getPostPreview(content: string): string {
    return content.length > 150 ? content.substring(0, 150) + '...' : content;
  }

  getMemberSinceDate(): Date | null {
    if (!this.profileUser) return null;
    
    // For UserProfile objects, check joinedDate first, then createdAt
    if ('joinedDate' in this.profileUser && this.profileUser.joinedDate) {
      return this.profileUser.joinedDate;
    }
    
    // For both User and UserProfile objects, createdAt should exist
    return this.profileUser.createdAt || null;
  }
}

import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Observable, Subject } from 'rxjs';
import { takeUntil, switchMap, catchError, take, filter, tap } from 'rxjs/operators';
import { of } from 'rxjs';
import { FirebasePostsService } from '../../services/firebase-posts.service';
import { AuthService } from '../../services/auth.service';
import { Post, Comment } from '../../models/post.interface';

@Component({
  selector: 'app-post-details',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  template: `
    <div class="post-details-container">
      <div class="back-navigation">
        <a routerLink="/posts" class="back-btn">← Back to Posts</a>
      </div>

      <div class="loading" *ngIf="loading">
        <div class="spinner"></div>
        <p>Loading post...</p>
      </div>

      <div class="error-message" *ngIf="error">
        <h2>Error Loading Post</h2>
        <p>{{ error }}</p>
        <button (click)="loadPost()" class="retry-btn">Try Again</button>
      </div>

      <div class="post-details" *ngIf="post$ | async as post">
        <article class="post-content">
          <header class="post-header">
            <div class="author-info">
              <img [src]="post.author.avatar || '/default-avatar.svg'" 
                   [alt]="post.author.username" class="author-avatar">
              <div class="author-details">
                <h4 class="author-name">{{ post.author.username }}</h4>
                <time class="post-date">{{ post.createdAt | date:'full' }}</time>
                <span class="last-updated" *ngIf="post.updatedAt !== post.createdAt">
                  Updated: {{ post.updatedAt | date:'short' }}
                </span>
              </div>
            </div>
            
            <div class="post-meta">
              <span class="visibility-badge private" *ngIf="!post.isPublic">
                Private
              </span>
              <div class="post-actions" *ngIf="canEditPost(post)">
                <a [routerLink]="['/dashboard/edit-post', post.id]" class="edit-btn">Edit</a>
                <button (click)="deletePost(post.id)" class="delete-btn" 
                        [disabled]="deletingPost">Delete</button>
              </div>
            </div>
          </header>

          <div class="post-body">
            <h1 class="post-title">{{ post.title }}</h1>
            
            <div class="post-image" *ngIf="post.imageUrl">
              <img [src]="post.imageUrl" [alt]="post.title" class="post-img">
            </div>
            
            <div class="post-text">
              <p *ngFor="let paragraph of getPostParagraphs(post.content)">{{ paragraph }}</p>
            </div>

          </div>

          <footer class="post-footer">
            <div class="post-tags" *ngIf="getPostTags(post).length > 0">
              <h4>Tags:</h4>
              <div class="tags-list">
                <span class="tag" *ngFor="let tag of getPostTags(post)">{{ tag }}</span>
              </div>
            </div>

            <div class="crypto-mentions" *ngIf="getPostCryptoMentions(post).length > 0">
              <h4>Crypto Mentions:</h4>
              <div class="mentions-list">
                <a class="crypto-mention" 
                   *ngFor="let mention of getPostCryptoMentions(post)"
                   [routerLink]="['/crypto', mention.toLowerCase()]">
                  {{ mention | uppercase }}
                </a>
              </div>
            </div>

            <div class="interaction-stats">
              <div class="stat-group">
                <span class="stat-item clickable" 
                      *ngIf="isAuthenticated$ | async"
                      (click)="likePost(post.id)"
                      [class.liked]="hasLiked"
                      [class.disabled]="submittingInteraction"
                      title="Like this post">
                  <span class="stat-icon">👍</span>
                  <span class="stat-count">{{ post.likes }}</span>
                  <span class="stat-label">Likes</span>
                </span>
                <span class="stat-item" *ngIf="!(isAuthenticated$ | async)">
                  <span class="stat-icon">👍</span>
                  <span class="stat-count">{{ post.likes }}</span>
                  <span class="stat-label">Likes</span>
                </span>
                
                <span class="stat-item clickable" 
                      *ngIf="isAuthenticated$ | async"
                      (click)="dislikePost(post.id)"
                      [class.disliked]="hasDisliked"
                      [class.disabled]="submittingInteraction"
                      title="Dislike this post">
                  <span class="stat-icon">👎</span>
                  <span class="stat-count">{{ post.dislikes }}</span>
                  <span class="stat-label">Dislikes</span>
                </span>
                <span class="stat-item" *ngIf="!(isAuthenticated$ | async)">
                  <span class="stat-icon">👎</span>
                  <span class="stat-count">{{ post.dislikes }}</span>
                  <span class="stat-label">Dislikes</span>
                </span>
                
                <span class="stat-item">
                  <span class="stat-icon">💬</span>
                  <span class="stat-count">{{ getPostComments(post).length }}</span>
                  <span class="stat-label">Comments</span>
                </span>
              </div>
            </div>

            <div class="guest-interaction" *ngIf="!(isAuthenticated$ | async)">
              <p>
                <a routerLink="/auth/login">Log in</a> or 
                <a routerLink="/auth/register">sign up</a> to like and comment
              </p>
            </div>
          </footer>
        </article>

        <section class="comments-section">
          <div class="comments-header">
            <h3>Comments ({{ getPostComments(post).length }})</h3>
          </div>

          <div class="comment-form" *ngIf="isAuthenticated$ | async">
            <form (ngSubmit)="submitComment()" #commentForm="ngForm">
              <div class="form-group">
                <textarea 
                  name="commentContent"
                  [(ngModel)]="newComment" 
                  placeholder="Share your thoughts..."
                  class="comment-textarea"
                  rows="3"
                  required
                  #commentTextarea="ngModel"></textarea>
                <div class="form-error" *ngIf="commentTextarea.invalid && commentTextarea.touched">
                  Comment is required
                </div>
              </div>
              <div class="form-actions">
                <button type="submit" 
                        class="btn btn-primary" 
                        [disabled]="commentForm.invalid || submittingComment">
                  {{ submittingComment ? 'Posting...' : 'Post Comment' }}
                </button>
              </div>
            </form>
          </div>

          <div class="comments-list">
            <div class="comment" *ngFor="let comment of getPostComments(post); trackBy: trackByComment">
              <div class="comment-header">
                <img [src]="comment.author.avatar || '/default-avatar.svg'" 
                     [alt]="comment.author.username" class="comment-avatar">
                <div class="comment-meta">
                  <span class="comment-author">{{ comment.author.username }}</span>
                  <time class="comment-date">{{ comment.createdAt | date:'short' }}</time>
                </div>
              </div>
              
              <div class="comment-body">
                <p>{{ comment.content }}</p>
              </div>
              
              <div class="comment-footer">
                <div class="comment-stats">
                  <span (click)="likeComment(comment.id)" 
                        class="comment-stat-icon like-icon" 
                        *ngIf="isAuthenticated$ | async"
                        title="Like this comment">
                    👍 {{ comment.likes }}
                  </span>
                  <span class="comment-stat-display" *ngIf="!(isAuthenticated$ | async)">
                    👍 {{ comment.likes }}
                  </span>
                  
                  <span (click)="dislikeComment(comment.id)" 
                        class="comment-stat-icon dislike-icon" 
                        *ngIf="isAuthenticated$ | async"
                        title="Dislike this comment">
                    👎 {{ comment.dislikes }}
                  </span>
                  <span class="comment-stat-display" *ngIf="!(isAuthenticated$ | async)">
                    👎 {{ comment.dislikes }}
                  </span>
                </div>
                
                <div class="comment-actions" *ngIf="canDeleteComment(comment, post)">
                  <button class="delete-btn" 
                          (click)="deleteComment(comment.id)" 
                          title="Delete comment"
                          [disabled]="deletingComment">
                    Delete
                  </button>
                </div>
              </div>
            </div>

            <div class="no-comments" *ngIf="getPostComments(post).length === 0">
              <p>No comments yet. Be the first to share your thoughts!</p>
            </div>
          </div>
        </section>

        <section class="related-posts" *ngIf="relatedPosts.length > 0">
          <h3>Related Posts</h3>
          <div class="related-posts-grid">
            <a class="related-post" 
               *ngFor="let relatedPost of relatedPosts" 
               [routerLink]="['/posts', relatedPost.id]">
              <h4>{{ relatedPost.title }}</h4>
              <p>by {{ relatedPost.author.username }}</p>
              <span class="related-post-date">{{ relatedPost.createdAt | date:'short' }}</span>
            </a>
          </div>
        </section>
      </div>
    </div>
  `,
  styleUrls: ['./post-details.component.css']
})
export class PostDetailsComponent implements OnInit, OnDestroy {
  post$!: Observable<Post | null>;
  isAuthenticated$!: Observable<boolean>;
  loading = false;
  error: string | null = null;
  
  newComment: string = '';
  submittingComment = false;
  submittingInteraction = false;
  deletingPost = false;
  deletingComment = false;
  
  hasLiked = false;
  hasDisliked = false;
  relatedPosts: Post[] = [];

  private destroy$ = new Subject<void>();

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private firebasePostsService: FirebasePostsService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.isAuthenticated$ = this.authService.isAuthenticated$;
    this.loadPost();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadPost(): void {
    this.loading = true;
    this.error = null;

    this.post$ = this.route.params.pipe(
      switchMap(params => {
        const postId = params['id'];
        if (!postId) {
          this.router.navigate(['/posts']);
          return of(null);
        }

        return this.firebasePostsService.getPostById(postId).pipe(
          catchError(err => {
            console.error('Error loading post details:', err);
            this.error = `Failed to load post. Please try again.`;
            this.loading = false;
            return of(null);
          })
        );
      }),
      takeUntil(this.destroy$)
    );

    this.post$.subscribe({
      next: (post: any) => {
        this.loading = false;
        if (!post && !this.error) {
          this.error = 'Post not found.';
        } else if (post) {
          this.loadRelatedPosts(post);
        }
      },
      error: (err: any) => {
        this.loading = false;
        this.error = 'An unexpected error occurred while loading the post.';
        console.error('Post details error:', err);
      }
    });
  }

  loadRelatedPosts(currentPost: Post): void {
    this.firebasePostsService.getAllPosts(6).pipe(
      takeUntil(this.destroy$),
      catchError(err => {
        console.error('Error loading related posts:', err);
        return of([]);
      })
    ).subscribe({
      next: (posts) => {
        try {
          this.relatedPosts = posts
            .filter(p => p.id !== currentPost.id)
            .filter(p => {
              const currentTags = this.getPostTags(currentPost);
              const postTags = this.getPostTags(p);
              return currentTags.some(tag => postTags.includes(tag));
            })
            .filter(p => {
              const currentMentions = this.getPostCryptoMentions(currentPost);
              const postMentions = this.getPostCryptoMentions(p);
              return currentMentions.length > 0 && currentMentions.some(mention => postMentions.includes(mention));
            })
            .slice(0, 3);
        } catch (error) {
          console.error('Error filtering related posts:', error);
          this.relatedPosts = [];
        }
      },
      error: (err) => {
        console.error('Related posts subscription error:', err);
        this.relatedPosts = [];
      }
    });
  }

  canEditPost(post: Post): boolean {
    let currentUser: any = null;
    this.authService.currentUser$.pipe(take(1)).subscribe(user => {
      currentUser = user;
    });
    return currentUser !== null && currentUser.id === post.userId;
  }

  getPostParagraphs(content: string): string[] {
    return content.split('\n\n').filter(p => p.trim().length > 0);
  }

  getPostTags(post: Post): string[] {
    if (!post || !post.tags) {
      return [];
    }
    
    // Handle both arrays and objects with numeric keys
    if (Array.isArray(post.tags)) {
      return post.tags;
    }
    
    // Convert object with numeric keys to array (Firestore issue)
    if (typeof post.tags === 'object') {
      return Object.values(post.tags).filter((val): val is string => typeof val === 'string');
    }
    
    return [];
  }

  getPostCryptoMentions(post: Post): string[] {
    if (!post || !post.cryptoMentions) {
      return [];
    }
    
    // Handle both arrays and objects with numeric keys
    if (Array.isArray(post.cryptoMentions)) {
      return post.cryptoMentions;
    }
    
    // Convert object with numeric keys to array (Firestore issue)
    if (typeof post.cryptoMentions === 'object') {
      return Object.values(post.cryptoMentions).filter((val): val is string => typeof val === 'string');
    }
    
    return [];
  }

  getPostComments(post: Post): Comment[] {
    if (!post || !post.comments) return [];
    // Ensure it's an array, not an object
    return Array.isArray(post.comments) ? post.comments : [];
  }

  submitComment(): void {
    console.log('submitComment called');
    
    if (!this.newComment.trim()) {
      console.log('Empty comment, returning');
      return;
    }

    console.log('Comment content:', this.newComment.trim());
    this.submittingComment = true;
    
    // Get current user data first
    this.authService.getCurrentUser().pipe(
      take(1),
      tap((user: any) => console.log('Current user from auth service:', user)),
      filter((user): user is any => user !== null),
      switchMap(user => {
        const commentData = {
          content: this.newComment.trim(),
          userId: user.id,
          postId: this.getCurrentPostId(),
          author: { 
            username: user.username || user.email?.split('@')[0] || 'Anonymous',
            avatar: user.avatar || '/default-avatar.svg'
          }
        };
        
        console.log('Adding comment with data:', commentData);
        return this.firebasePostsService.addComment(this.getCurrentPostId(), commentData);
      }),
      takeUntil(this.destroy$)
    ).subscribe({
      next: (commentId) => {
        console.log('Comment added successfully with ID:', commentId);
        this.newComment = '';
        this.submittingComment = false;
        this.loadPost();
      },
      error: (err: any) => {
        console.error('Error submitting comment:', err);
        this.submittingComment = false;
      }
    });
  }

  likePost(postId: string): void {
    this.submittingInteraction = true;
    
    this.firebasePostsService.interactWithPost(postId, 'like').pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: () => {
        this.submittingInteraction = false;
        this.hasLiked = true;
        this.hasDisliked = false;
        this.loadPost();
      },
      error: (err: any) => {
        console.error('Error liking post:', err);
        this.submittingInteraction = false;
      }
    });
  }

  dislikePost(postId: string): void {
    this.submittingInteraction = true;
    
    this.firebasePostsService.interactWithPost(postId, 'dislike').pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: () => {
        this.submittingInteraction = false;
        this.hasDisliked = true;
        this.hasLiked = false;
        this.loadPost();
      },
      error: (err: any) => {
        console.error('Error disliking post:', err);
        this.submittingInteraction = false;
      }
    });
  }

  deletePost(postId: string): void {
    if (!confirm('Are you sure you want to delete this post? This action cannot be undone.')) {
      return;
    }

    this.deletingPost = true;
    
    this.firebasePostsService.deletePost(postId).pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: () => {
        this.router.navigate(['/posts']);
      },
      error: (err: any) => {
        console.error('Error deleting post:', err);
        this.deletingPost = false;
        this.error = 'Failed to delete post. Please try again.';
      }
    });
  }

  likeComment(commentId: string): void {
    this.post$.pipe(
      take(1),
      filter((post: Post | null): post is Post => post !== null)
    ).subscribe(post => {
      this.firebasePostsService.addComment(post.id, {
        content: 'like',
        userId: '',
        postId: post.id,
        author: { username: '', avatar: '' }
      }).pipe(
        takeUntil(this.destroy$)
      ).subscribe({
        next: () => this.loadPost(),
        error: (err) => console.error('Error liking comment:', err)
      });
    });
  }

  dislikeComment(commentId: string): void {
    this.post$.pipe(
      take(1),
      filter((post: Post | null): post is Post => post !== null)
    ).subscribe(post => {
      this.firebasePostsService.addComment(post.id, {
        content: 'dislike',
        userId: '',
        postId: post.id,
        author: { username: '', avatar: '' }
      }).pipe(
        takeUntil(this.destroy$)
      ).subscribe({
        next: () => this.loadPost(),
        error: (err) => console.error('Error disliking comment:', err)
      });
    });
  }

  trackByComment(index: number, comment: Comment): string {
    return comment.id;
  }

  canDeleteComment(comment: Comment, post: Post): boolean {
    // Get current user synchronously
    const currentUser = this.authService.getCurrentUser();
    let user: any = null;
    
    // Subscribe briefly to get current user
    currentUser.pipe(take(1)).subscribe(u => user = u);
    
    if (!user) return false;
    
    // User can delete their own comments or if they own the post
    return comment.userId === user.id || post.userId === user.id;
  }

  deleteComment(commentId: string): void {
    if (!confirm('Are you sure you want to delete this comment?')) {
      return;
    }

    this.deletingComment = true;
    
    this.firebasePostsService.deleteComment(this.getCurrentPostId(), commentId).pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: () => {
        console.log('Comment deleted successfully');
        this.deletingComment = false;
        this.loadPost(); // Reload post to update comments
      },
      error: (err: any) => {
        console.error('Error deleting comment:', err);
        this.deletingComment = false;
        alert('Failed to delete comment. Please try again.');
      }
    });
  }

  private getCurrentPostId(): string {
    return this.route.snapshot.params['id'];
  }
}

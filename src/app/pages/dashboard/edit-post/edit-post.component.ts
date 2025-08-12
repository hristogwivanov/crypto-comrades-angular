import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, Router, ActivatedRoute } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Subject, of, Observable } from 'rxjs';
import { takeUntil, debounceTime, distinctUntilChanged, switchMap } from 'rxjs/operators';
import { FirebasePostsService } from '../../../services/firebase-posts.service';
import { CryptoService } from '../../../services/crypto.service';
import { AuthService } from '../../../services/auth.service';
import { Post, UpdatePostRequest } from '../../../models/post.interface';
import { CryptoCurrency } from '../../../models/crypto.interface';
import { User } from '../../../models/user.interface';

@Component({
  selector: 'app-edit-post',
  standalone: true,
  imports: [CommonModule, RouterLink, ReactiveFormsModule],
  template: `
    <div class="edit-post-container">
      <div class="page-header">
        <div class="header-content">
          <h1>Edit Post</h1>
          <p>Update your cryptocurrency insights</p>
        </div>
        <div class="header-actions">
          <a routerLink="/dashboard/my-posts" class="btn btn-outline">← My Posts</a>
        </div>
      </div>

      <div class="loading" *ngIf="loading && !post">
        <div class="spinner"></div>
        <p>Loading post...</p>
      </div>

      <div class="error-message" *ngIf="error">
        <p>{{ error }}</p>
        <button (click)="loadPost()" class="retry-btn">Try Again</button>
      </div>

      <div class="edit-post-form-container" *ngIf="post && editPostForm">
        <form [formGroup]="editPostForm" (ngSubmit)="onSubmit()" class="edit-post-form">
          <div class="form-section">
            <h2>Post Details</h2>
            
            <div class="form-group">
              <label for="title" class="form-label">Title *</label>
              <input 
                type="text" 
                id="title"
                formControlName="title"
                class="form-input"
                [class.error]="titleControl?.invalid && titleControl?.touched"
                placeholder="Enter an engaging title for your post">
              <div class="form-error" *ngIf="titleControl?.invalid && titleControl?.touched">
                <small *ngIf="titleControl?.errors?.['required']">Title is required</small>
                <small *ngIf="titleControl?.errors?.['minlength']">Title must be at least 10 characters</small>
                <small *ngIf="titleControl?.errors?.['maxlength']">Title cannot exceed 200 characters</small>
              </div>
              <div class="form-hint">
                <small>{{ titleControl?.value?.length || 0 }}/200 characters</small>
              </div>
            </div>

            <div class="form-group">
              <label for="content" class="form-label">Content *</label>
              <textarea 
                id="content"
                formControlName="content"
                class="form-textarea"
                [class.error]="contentControl?.invalid && contentControl?.touched"
                placeholder="Write your detailed thoughts, analysis, or insights about cryptocurrency..."
                rows="12"></textarea>
              <div class="form-error" *ngIf="contentControl?.invalid && contentControl?.touched">
                <small *ngIf="contentControl?.errors?.['required']">Content is required</small>
                <small *ngIf="contentControl?.errors?.['minlength']">Content must be at least 50 characters</small>
                <small *ngIf="contentControl?.errors?.['maxlength']">Content cannot exceed 5000 characters</small>
              </div>
              <div class="form-hint">
                <small>{{ contentControl?.value?.length || 0 }}/5000 characters</small>
              </div>
            </div>

            <div class="form-group">
              <label for="imageUrl" class="form-label">Image URL (Optional)</label>
              <input 
                type="url" 
                id="imageUrl"
                formControlName="imageUrl"
                class="form-input"
                [class.error]="imageUrlControl?.invalid && imageUrlControl?.touched"
                placeholder="https://example.com/image.jpg">
              <div class="form-error" *ngIf="imageUrlControl?.invalid && imageUrlControl?.touched">
                <small *ngIf="imageUrlControl?.errors?.['url']">Please enter a valid URL</small>
              </div>
              <div class="form-hint">
                <small>Add an image to make your post more engaging</small>
              </div>
            </div>
          </div>

          <div class="form-section">
            <h2>Categorization</h2>
            
            <div class="form-group">
              <label for="tags" class="form-label">Tags</label>
              <input 
                type="text" 
                id="tags"
                formControlName="tags"
                class="form-input"
                placeholder="bitcoin, trading, analysis, defi, nft (separate with commas)">
              <div class="form-hint">
                <small>Add relevant tags to help others discover your post. Separate multiple tags with commas.</small>
              </div>
              <div class="tags-preview" *ngIf="parsedTags.length > 0">
                <span class="tag-preview" *ngFor="let tag of parsedTags">{{ tag }}</span>
              </div>
            </div>

            <div class="form-group">
              <label for="cryptoMentions" class="form-label">Crypto Mentions</label>
              <input 
                type="text" 
                id="cryptoMentions"
                formControlName="cryptoMentions"
                class="form-input"
                placeholder="BTC, ETH, ADA, DOT (separate with commas)"
                (input)="onCryptoMentionsChange($event)">
              <div class="form-hint">
                <small>Mention specific cryptocurrencies discussed in your post</small>
              </div>
              <div class="crypto-suggestions" *ngIf="cryptoSuggestions.length > 0">
                <div class="suggestion-label">Suggestions:</div>
                <button 
                  type="button"
                  class="crypto-suggestion" 
                  *ngFor="let crypto of cryptoSuggestions"
                  (click)="addCryptoMention(crypto.symbol)">
                  <img [src]="crypto.image" [alt]="crypto.name" class="crypto-logo-small">
                  {{ crypto.symbol | uppercase }}
                  <span class="crypto-name-small">{{ crypto.name }}</span>
                </button>
              </div>
              <div class="mentions-preview" *ngIf="parsedCryptoMentions.length > 0">
                <span class="mention-preview" *ngFor="let mention of parsedCryptoMentions">
                  {{ mention | uppercase }}
                </span>
              </div>
            </div>
          </div>

          <div class="form-section">
            <h2>Visibility & Publishing</h2>
            
            <div class="form-group">
              <div class="visibility-options">
                <label class="radio-option">
                  <input type="radio" formControlName="isPublic" [value]="true" class="radio-input">
                  <div class="radio-content">
                    <div class="radio-header">
                      <span class="radio-icon">🌍</span>
                      <span class="radio-title">Public Post</span>
                    </div>
                    <p class="radio-description">Everyone can see this post and it will appear in the public feed</p>
                  </div>
                </label>
                
                <label class="radio-option">
                  <input type="radio" formControlName="isPublic" [value]="false" class="radio-input">
                  <div class="radio-content">
                    <div class="radio-header">
                      <span class="radio-icon">🔒</span>
                      <span class="radio-title">Private Post</span>
                    </div>
                    <p class="radio-description">Only you can see this post in your personal dashboard</p>
                  </div>
                </label>
              </div>
            </div>
          </div>

          <div class="post-info" *ngIf="post">
            <div class="info-item">
              <strong>Created:</strong> {{ post.createdAt | date:'full' }}
            </div>
            <div class="info-item" *ngIf="post.updatedAt !== post.createdAt">
              <strong>Last Updated:</strong> {{ post.updatedAt | date:'full' }}
            </div>
            <div class="info-item">
              <strong>Likes:</strong> {{ post.likes }} | <strong>Comments:</strong> {{ post.comments.length }}
            </div>
          </div>

          <div class="form-error" *ngIf="submitError">
            <small>{{ submitError }}</small>
          </div>

          <div class="form-actions">
            <button 
              type="button" 
              routerLink="/dashboard/my-posts" 
              class="btn btn-outline">
              Cancel
            </button>
            <button 
              type="button" 
              (click)="saveDraft()" 
              class="btn btn-secondary"
              [disabled]="isSubmitting">
              Save Draft
            </button>
            <button 
              type="submit" 
              class="btn btn-primary"
              [disabled]="editPostForm.invalid || isSubmitting || !hasChanges()">
              {{ isSubmitting ? 'Updating...' : 'Update Post' }}
            </button>
          </div>
        </form>

        <div class="post-preview" *ngIf="showPreview">
          <h3>Preview</h3>
          <div class="preview-card">
            <div class="preview-header">
              <img [src]="(currentUser$ | async)?.avatar || '/default-avatar.svg'" 
                   [alt]="(currentUser$ | async)?.username" class="preview-avatar">
              <div class="preview-meta">
                <span class="preview-author">{{ (currentUser$ | async)?.username }}</span>
                <span class="preview-date">{{ now | date:'short' }}</span>
                <span class="preview-updated">Updated</span>
              </div>
              <span class="preview-visibility" 
                    [class.public]="editPostForm.value.isPublic"
                    [class.private]="!editPostForm.value.isPublic">
                {{ editPostForm.value.isPublic ? 'Public' : 'Private' }}
              </span>
            </div>
            <h4 class="preview-title">{{ editPostForm.value.title || post.title }}</h4>
            <div class="preview-content">{{ editPostForm.value.content || post.content }}</div>
            <div class="preview-image" *ngIf="editPostForm.value.imageUrl">
              <img [src]="editPostForm.value.imageUrl" [alt]="editPostForm.value.title" class="preview-img">
            </div>
            <div class="preview-tags" *ngIf="parsedTags.length > 0">
              <span class="preview-tag" *ngFor="let tag of parsedTags">{{ tag }}</span>
            </div>
            <div class="preview-mentions" *ngIf="parsedCryptoMentions.length > 0">
              <span class="preview-mention" *ngFor="let mention of parsedCryptoMentions">
                {{ mention | uppercase }}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div class="form-toggle" *ngIf="post && editPostForm">
        <button 
          type="button" 
          class="preview-toggle"
          (click)="togglePreview()">
          {{ showPreview ? 'Hide Preview' : 'Show Preview' }}
        </button>
      </div>
    </div>
  `,
  styleUrls: ['./edit-post.component.css']
})
export class EditPostComponent implements OnInit, OnDestroy {
  editPostForm!: FormGroup;
  post: Post | null = null;
  originalPost: Post | null = null;
  isSubmitting = false;
  loading = false;
  submitError: string | null = null;
  error: string | null = null;
  showPreview = false;
  now = new Date();
  
  parsedTags: string[] = [];
  parsedCryptoMentions: string[] = [];
  cryptoSuggestions: CryptoCurrency[] = [];
  currentUser$!: Observable<User | null>;

  private destroy$ = new Subject<void>();
  private postId: string | null = null;

  constructor(
    private fb: FormBuilder,
    private firebasePostsService: FirebasePostsService,
    private cryptoService: CryptoService,
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.currentUser$ = this.authService.currentUser$;
    this.route.params.pipe(
      switchMap(params => {
        this.postId = params['id'];
        if (!this.postId) {
          this.router.navigate(['/dashboard/my-posts']);
          return of(null);
        }
        return this.firebasePostsService.getPostById(this.postId);
      }),
      takeUntil(this.destroy$)
    ).subscribe({
      next: (post) => {
        if (post && this.canEditPost(post)) {
          this.post = post;
          this.originalPost = { ...post };
          this.initializeForm();
          this.setupFormWatchers();
          this.loadCryptoSuggestions();
        } else {
          this.error = 'Post not found or you do not have permission to edit it.';
        }
      },
      error: (err) => {
        console.error('Error loading post:', err);
        this.error = 'Failed to load post. Please try again.';
      }
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  get titleControl() { return this.editPostForm?.get('title'); }
  get contentControl() { return this.editPostForm?.get('content'); }
  get imageUrlControl() { return this.editPostForm?.get('imageUrl'); }
  get tagsControl() { return this.editPostForm?.get('tags'); }
  get cryptoMentionsControl() { return this.editPostForm?.get('cryptoMentions'); }

  initializeForm(): void {
    if (!this.post) return;

    // Safely get arrays
    const safeTags = this.getPostTags(this.post);
    const safeCryptoMentions = this.getPostCryptoMentions(this.post);

    this.editPostForm = this.fb.group({
      title: [this.post.title, [Validators.required, Validators.minLength(10), Validators.maxLength(200)]],
      content: [this.post.content, [Validators.required, Validators.minLength(50), Validators.maxLength(5000)]],
      imageUrl: [this.post.imageUrl || '', [Validators.pattern(/^https?:\/\/.+/)]],
      tags: [safeTags.join(', ')],
      cryptoMentions: [safeCryptoMentions.join(', ')],
      isPublic: [this.post.isPublic]
    });

    // Initialize parsed arrays
    this.parsedTags = this.parseTags(safeTags.join(', '));
    this.parsedCryptoMentions = this.parseCryptoMentions(safeCryptoMentions.join(', '));
  }

  setupFormWatchers(): void {
    // Watch tags input
    this.tagsControl?.valueChanges.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      takeUntil(this.destroy$)
    ).subscribe(value => {
      this.parsedTags = this.parseTags(value);
    });

    // Watch crypto mentions input
    this.cryptoMentionsControl?.valueChanges.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      takeUntil(this.destroy$)
    ).subscribe(value => {
      this.parsedCryptoMentions = this.parseCryptoMentions(value);
    });
  }

  loadPost(): void {
    if (!this.postId) return;
    
    this.loading = true;
    this.error = null;
    
    this.firebasePostsService.getPostById(this.postId).pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: (post) => {
        this.loading = false;
        if (post && this.canEditPost(post)) {
          this.post = post;
          this.originalPost = { ...post };
          this.initializeForm();
        } else {
          this.error = 'Post not found or you do not have permission to edit it.';
        }
      },
      error: (err) => {
        this.loading = false;
        this.error = 'Failed to load post. Please try again.';
        console.error('Error loading post:', err);
      }
    });
  }

  loadCryptoSuggestions(): void {
    this.cryptoService.getTopCryptos().pipe(
      takeUntil(this.destroy$)
    ).subscribe(cryptos => {
      this.cryptoSuggestions = cryptos.slice(0, 10);
    });
  }

  canEditPost(post: Post): boolean {
    let currentUser: any = null;
    this.authService.currentUser$.pipe(takeUntil(this.destroy$)).subscribe(user => {
      currentUser = user;
    });
    return currentUser !== null && currentUser.id === post.userId;
  }

  onCryptoMentionsChange(event: any): void {
    // This will trigger the form value change subscription
  }

  addCryptoMention(symbol: string): void {
    const currentMentions = this.cryptoMentionsControl?.value;
    const mentions = currentMentions ? currentMentions.split(',').map((m: string) => m.trim()) : [];
    
    if (!mentions.some((m: string) => m.toLowerCase() === symbol.toLowerCase())) {
      mentions.push(symbol.toUpperCase());
      this.cryptoMentionsControl?.setValue(mentions.join(', '));
    }
  }

  getPostTags(post: Post): string[] {
    if (!post || !post.tags) return [];
    // Ensure it's an array, not an object
    return Array.isArray(post.tags) ? post.tags : [];
  }

  getPostCryptoMentions(post: Post): string[] {
    if (!post || !post.cryptoMentions) return [];
    // Ensure it's an array, not an object
    return Array.isArray(post.cryptoMentions) ? post.cryptoMentions : [];
  }

  parseTags(tagsString: string): string[] {
    if (!tagsString) return [];
    return tagsString.split(',')
      .map(tag => tag.trim().toLowerCase())
      .filter(tag => tag.length > 0)
      .slice(0, 10);
  }

  parseCryptoMentions(mentionsString: string): string[] {
    if (!mentionsString) return [];
    return mentionsString.split(',')
      .map(mention => mention.trim().toUpperCase())
      .filter(mention => mention.length > 0)
      .slice(0, 10);
  }

  togglePreview(): void {
    this.showPreview = !this.showPreview;
  }

  saveDraft(): void {
    alert('Draft saved! (This is a demo feature)');
  }

  hasChanges(): boolean {
    if (!this.editPostForm || !this.originalPost) return false;
    
    const formValue = this.editPostForm.value;
    const currentTags = this.parseTags(formValue.tags);
    const currentCryptoMentions = this.parseCryptoMentions(formValue.cryptoMentions);
    
    return (
      formValue.title !== this.originalPost.title ||
      formValue.content !== this.originalPost.content ||
      formValue.imageUrl !== (this.originalPost.imageUrl || '') ||
      formValue.isPublic !== this.originalPost.isPublic ||
      JSON.stringify(currentTags) !== JSON.stringify(this.originalPost.tags) ||
      JSON.stringify(currentCryptoMentions) !== JSON.stringify(this.originalPost.cryptoMentions || [])
    );
  }

  onSubmit(): void {
    if (this.editPostForm.invalid || !this.post) {
      this.markFormGroupTouched();
      return;
    }

    this.isSubmitting = true;
    this.submitError = null;

    const formValue = this.editPostForm.value;
    const updateRequest: Partial<UpdatePostRequest> = {
      title: formValue.title.trim(),
      content: formValue.content.trim(),
      imageUrl: formValue.imageUrl?.trim() || undefined,
      tags: this.parsedTags,
      cryptoMentions: this.parsedCryptoMentions.length > 0 ? this.parsedCryptoMentions : undefined,
      isPublic: formValue.isPublic
    };

    this.firebasePostsService.updatePost(this.post.id, updateRequest).pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: () => {
        this.isSubmitting = false;
        // Navigate to the updated post
        this.router.navigate(['/posts', this.post!.id]);
      },
      error: (error: any) => {
        this.isSubmitting = false;
        console.error('Error updating post:', error);
        
        this.submitError = 'Failed to update post. Please check your connection and try again.';
      }
    });
  }

  private markFormGroupTouched(): void {
    Object.keys(this.editPostForm.controls).forEach(key => {
      const control = this.editPostForm.get(key);
      control?.markAsTouched();
    });
  }
}

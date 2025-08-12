import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Subject, Observable } from 'rxjs';
import { takeUntil, debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { FirebasePostsService } from '../../../services/firebase-posts.service';
import { CryptoService } from '../../../services/crypto.service';
import { AuthService } from '../../../services/auth.service';
import { Post } from '../../../models/post.interface';
import { CryptoCurrency } from '../../../models/crypto.interface';

@Component({
  selector: 'app-create-post',
  standalone: true,
  imports: [CommonModule, RouterLink, ReactiveFormsModule],
  template: `
    <div class="create-post-container">
      <div class="page-header">
        <div class="header-content">
          <h1>Create New Post</h1>
          <p>Share your cryptocurrency insights with the community</p>
        </div>
        <div class="header-actions">
          <a routerLink="/dashboard/my-posts" class="btn btn-outline">← My Posts</a>
        </div>
      </div>

      <div class="create-post-form-container">
        <form [formGroup]="createPostForm" (ngSubmit)="onSubmit()" class="create-post-form">
          <div class="form-section">
            <h2>Post Details</h2>
            
            <div class="form-group">
              <label for="title" class="form-label">Title *</label>
              <input 
                type="text" 
                id="title"
                formControlName="title"
                class="form-input"
                [class.error]="titleControl.invalid && titleControl.touched"
                placeholder="Enter an engaging title for your post">
              <div class="form-error" *ngIf="titleControl.invalid && titleControl.touched">
                <small *ngIf="titleControl.errors?.['required']">Title is required</small>
                <small *ngIf="titleControl.errors?.['minlength']">Title must be at least 10 characters</small>
                <small *ngIf="titleControl.errors?.['maxlength']">Title cannot exceed 200 characters</small>
              </div>
              <div class="form-hint">
                <small>{{ titleControl.value?.length || 0 }}/200 characters</small>
              </div>
            </div>

            <div class="form-group">
              <label for="content" class="form-label">Content *</label>
              <textarea 
                id="content"
                formControlName="content"
                class="form-textarea"
                [class.error]="contentControl.invalid && contentControl.touched"
                placeholder="Write your detailed thoughts, analysis, or insights about cryptocurrency..."
                rows="12"></textarea>
              <div class="form-error" *ngIf="contentControl.invalid && contentControl.touched">
                <small *ngIf="contentControl.errors?.['required']">Content is required</small>
                <small *ngIf="contentControl.errors?.['minlength']">Content must be at least 50 characters</small>
                <small *ngIf="contentControl.errors?.['maxlength']">Content cannot exceed 5000 characters</small>
              </div>
              <div class="form-hint">
                <small>{{ contentControl.value?.length || 0 }}/5000 characters</small>
              </div>
            </div>

            <div class="form-group">
              <label for="imageUrl" class="form-label">Image URL (Optional)</label>
              <input 
                type="url" 
                id="imageUrl"
                formControlName="imageUrl"
                class="form-input"
                [class.error]="imageUrlControl.invalid && imageUrlControl.touched"
                placeholder="https://example.com/image.jpg">
              <div class="form-error" *ngIf="imageUrlControl.invalid && imageUrlControl.touched">
                <small *ngIf="imageUrlControl.errors?.['url']">Please enter a valid URL</small>
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
              type="submit" 
              class="btn btn-primary"
              [disabled]="createPostForm.invalid || isSubmitting">
              {{ isSubmitting ? 'Publishing...' : 'Publish Post' }}
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
              </div>
              <span class="preview-visibility" 
                    [class.public]="createPostForm.value.isPublic"
                    [class.private]="!createPostForm.value.isPublic">
                {{ createPostForm.value.isPublic ? 'Public' : 'Private' }}
              </span>
            </div>
            <h4 class="preview-title">{{ createPostForm.value.title || 'Post Title' }}</h4>
            <div class="preview-content">{{ createPostForm.value.content || 'Post content will appear here...' }}</div>
            <div class="preview-image" *ngIf="createPostForm.value.imageUrl">
              <img [src]="createPostForm.value.imageUrl" [alt]="createPostForm.value.title" class="preview-img">
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

      <div class="form-toggle">
        <button 
          type="button" 
          class="preview-toggle"
          (click)="togglePreview()">
          {{ showPreview ? 'Hide Preview' : 'Show Preview' }}
        </button>
      </div>
    </div>
  `,
  styleUrls: ['./create-post.component.css']
})
export class CreatePostComponent implements OnInit, OnDestroy {
  createPostForm: FormGroup;
  isSubmitting = false;
  submitError: string | null = null;
  showPreview = false;
  now = new Date();
  
  parsedTags: string[] = [];
  parsedCryptoMentions: string[] = [];
  cryptoSuggestions: CryptoCurrency[] = [];
  currentUser$!: Observable<any>;
  currentUser: any = null;

  private destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private firebasePostsService: FirebasePostsService,
    private cryptoService: CryptoService,
    private authService: AuthService,
    private router: Router
  ) {
    this.createPostForm = this.fb.group({
      title: ['', [Validators.required, Validators.minLength(10), Validators.maxLength(200)]],
      content: ['', [Validators.required, Validators.minLength(50), Validators.maxLength(5000)]],
      imageUrl: ['', [Validators.pattern(/^https?:\/\/.+/)]],
      tags: [''],
      cryptoMentions: [''],
      isPublic: [true]
    });
  }

  ngOnInit(): void {
    this.currentUser$ = this.authService.currentUser$;
    this.authService.currentUser$.pipe(takeUntil(this.destroy$)).subscribe(user => {
      this.currentUser = user;
    });
    this.setupFormWatchers();
    this.loadCryptoSuggestions();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  get titleControl() { return this.createPostForm.get('title')!; }
  get contentControl() { return this.createPostForm.get('content')!; }
  get imageUrlControl() { return this.createPostForm.get('imageUrl')!; }
  get tagsControl() { return this.createPostForm.get('tags')!; }
  get cryptoMentionsControl() { return this.createPostForm.get('cryptoMentions')!; }

  setupFormWatchers(): void {
    // Watch tags input
    this.tagsControl.valueChanges.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      takeUntil(this.destroy$)
    ).subscribe(value => {
      this.parsedTags = this.parseTags(value);
    });

    // Watch crypto mentions input
    this.cryptoMentionsControl.valueChanges.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      takeUntil(this.destroy$)
    ).subscribe(value => {
      this.parsedCryptoMentions = this.parseCryptoMentions(value);
    });
  }

  loadCryptoSuggestions(): void {
    this.cryptoService.getTopCryptos().pipe(
      takeUntil(this.destroy$)
    ).subscribe(cryptos => {
      this.cryptoSuggestions = cryptos.slice(0, 10);
    });
  }

  onCryptoMentionsChange(event: any): void {
    // This will trigger the form value change subscription
  }

  addCryptoMention(symbol: string): void {
    const currentMentions = this.cryptoMentionsControl.value;
    const mentions = currentMentions ? currentMentions.split(',').map((m: string) => m.trim()) : [];
    
    if (!mentions.some((m: string) => m.toLowerCase() === symbol.toLowerCase())) {
      mentions.push(symbol.toUpperCase());
      this.cryptoMentionsControl.setValue(mentions.join(', '));
    }
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

  onSubmit(): void {
    if (this.createPostForm.invalid) {
      this.markFormGroupTouched();
      return;
    }

    this.isSubmitting = true;
    this.submitError = null;

    const formValue = this.createPostForm.value;
    const postData = this.buildPostData(formValue);

    this.firebasePostsService.createPost(postData).pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: (postId: string) => {
        this.isSubmitting = false;
        this.router.navigate(['/posts', postId]);
      },
      error: (error: any) => {
        this.isSubmitting = false;
        console.error('Error creating post:', error);
        
        if (error.status === 400) {
          this.submitError = 'Invalid post data. Please check your input and try again.';
        } else if (error.status === 401) {
          this.submitError = 'You must be logged in to create a post.';
        } else {
          this.submitError = 'Failed to create post. Please check your connection and try again.';
        }
      }
    });
  }

  private buildPostData(formValue: any): any {
    const postData: any = {
      title: formValue.title.trim(),
      content: formValue.content.trim(),
      tags: this.parsedTags,
      cryptoMentions: this.parsedCryptoMentions.length > 0 ? this.parsedCryptoMentions : [],
      isPublic: formValue.isPublic,
      userId: this.currentUser?.id || '',
      author: this.createAuthorObject()
    };

    if (formValue.imageUrl?.trim()) {
      postData.imageUrl = formValue.imageUrl.trim();
    }

    return postData;
  }

  private createAuthorObject(): any {
    const authorObj: any = {
      id: this.currentUser?.id || '',
      username: this.currentUser?.username || ''
    };
    
    if (this.currentUser?.avatar) {
      authorObj.avatar = this.currentUser.avatar;
    }
    
    return authorObj;
  }

  private markFormGroupTouched(): void {
    Object.keys(this.createPostForm.controls).forEach(key => {
      const control = this.createPostForm.get(key);
      control?.markAsTouched();
    });
  }
}

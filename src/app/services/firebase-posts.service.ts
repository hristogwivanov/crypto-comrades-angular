import { Injectable } from '@angular/core';
import { Observable, map, switchMap, combineLatest, of, catchError } from 'rxjs';
import { Post, Comment, PostInteraction } from '../models/post.interface';
import { FirebaseService } from './firebase.service';
import { FirebaseAuthService } from './firebase-auth.service';

@Injectable({
  providedIn: 'root'
})
export class FirebasePostsService {

  constructor(
    private firebaseService: FirebaseService,
    private authService: FirebaseAuthService
  ) {}

  // POST OPERATIONS

  /**
   * Create a new post
   */
  createPost(postData: Omit<Post, 'id' | 'createdAt' | 'updatedAt' | 'likes' | 'dislikes' | 'comments'>): Observable<string> {
    const post: any = {
      title: postData.title,
      content: postData.content,
      tags: postData.tags,
      cryptoMentions: postData.cryptoMentions,
      isPublic: postData.isPublic,
      userId: postData.userId,
      author: postData.author,
      likes: 0,
      dislikes: 0,
      comments: [],
      createdAt: new Date(),
      updatedAt: new Date()
    };

    if (postData.imageUrl) {
      post.imageUrl = postData.imageUrl;
    }

    return this.firebaseService.add('posts', post);
  }

  /**
   * Get all posts (public posts or user's own posts)
   */
  getAllPosts(limitCount?: number): Observable<Post[]> {
    if (limitCount) {
      return this.firebaseService.getAll<Post>('posts',
        this.firebaseService.where('isPublic', '==', true),
        this.firebaseService.orderBy('createdAt', 'desc'),
        this.firebaseService.limit(limitCount)
      );
    } else {
      return this.firebaseService.getAll<Post>('posts',
        this.firebaseService.where('isPublic', '==', true),
        this.firebaseService.orderBy('createdAt', 'desc')
      );
    }
  }

  /**
   * Get posts by user ID
   */
  getPostsByUserId(userId: string, includePrivate: boolean = false): Observable<Post[]> {
    const constraints = [
      this.firebaseService.where('userId', '==', userId),
      this.firebaseService.orderBy('createdAt', 'desc')
    ];

    if (!includePrivate) {
      constraints.push(this.firebaseService.where('isPublic', '==', true));
    }

    return this.firebaseService.getAll<Post>('posts', ...constraints);
  }

  /**
   * Get current user's posts
   */
  getCurrentUserPosts(): Observable<Post[]> {
    return this.authService.currentUser$.pipe(
      switchMap(user => {
        if (!user) return of([]);
        return this.getPostsByUserId(user.id, true); // Include private posts for current user
      })
    );
  }

  /**
   * Get post by ID
   */
  getPostById(postId: string): Observable<Post | null> {
    return this.firebaseService.get<Post>('posts', postId).pipe(
      switchMap(post => {
        if (!post) return of(null);
        
        // Fetch comments for this post
        return this.getPostComments(postId).pipe(
          map(comments => ({
            ...post,
            comments: comments
          }))
        );
      })
    );
  }

  /**
   * Update post
   */
  updatePost(postId: string, updates: Partial<Post>): Observable<void> {
    return this.firebaseService.update('posts', postId, {
      ...updates,
      updatedAt: new Date()
    });
  }

  /**
   * Delete post
   */
  deletePost(postId: string): Observable<void> {
    return this.firebaseService.delete('posts', postId);
  }

  /**
   * Search posts by title or content
   */
  searchPosts(searchTerm: string): Observable<Post[]> {
    // Note: Firestore doesn't support full-text search natively
    // This is a basic implementation - consider using Algolia or similar for advanced search
    return this.getAllPosts().pipe(
      map(posts => posts.filter(post => 
        post.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        post.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
        post.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
      ))
    );
  }

  /**
   * Get posts by crypto mentions
   */
  getPostsByCrypto(cryptoSymbol: string): Observable<Post[]> {
    return this.firebaseService.getAll<Post>('posts',
      this.firebaseService.where('cryptoMentions', 'array-contains', cryptoSymbol.toUpperCase()),
      this.firebaseService.where('isPublic', '==', true),
      this.firebaseService.orderBy('createdAt', 'desc')
    );
  }

  /**
   * Get posts by tags
   */
  getPostsByTag(tag: string): Observable<Post[]> {
    return this.firebaseService.getAll<Post>('posts',
      this.firebaseService.where('tags', 'array-contains', tag.toLowerCase()),
      this.firebaseService.where('isPublic', '==', true),
      this.firebaseService.orderBy('createdAt', 'desc')
    );
  }

  // COMMENT OPERATIONS

  /**
   * Add comment to post
   */
  addComment(postId: string, commentData: Omit<Comment, 'id' | 'createdAt' | 'updatedAt' | 'likes' | 'dislikes'>): Observable<string> {
    const comment: Omit<Comment, 'id'> = {
      ...commentData,
      postId,
      likes: 0,
      dislikes: 0,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    return this.firebaseService.addToSubcollection('posts', postId, 'comments', comment);
  }

  /**
   * Get comments for a post
   */
  getPostComments(postId: string): Observable<Comment[]> {
    return this.firebaseService.getSubcollection<Comment>(
      'posts', 
      postId, 
      'comments',
      this.firebaseService.orderBy('createdAt', 'asc')
    );
  }

  /**
   * Get comment count for a single post
   */
  getPostCommentCount(postId: string): Observable<number> {
    return this.getPostComments(postId).pipe(
      map(comments => comments.length)
    );
  }

  /**
   * Get total comment count for multiple posts - simplified approach
   */
  getTotalCommentsCount(posts: Post[]): Observable<number> {
    if (!posts || posts.length === 0) return of(0);
    
    // Simple approach: count comments sequentially
    let totalCount = 0;
    let processedPosts = 0;
    
    return new Observable<number>(observer => {
      posts.forEach(post => {
        this.getPostComments(post.id).subscribe({
          next: (comments) => {
            totalCount += comments.length;
            processedPosts++;
            
            // When all posts are processed, emit the total
            if (processedPosts === posts.length) {
              observer.next(totalCount);
              observer.complete();
            }
          },
          error: (err) => {
            console.error(`Error getting comments for post ${post.id}:`, err);
            processedPosts++;
            
            // Continue even if one post fails
            if (processedPosts === posts.length) {
              observer.next(totalCount);
              observer.complete();
            }
          }
        });
      });
    });
  }

  /**
   * Update comment
   */
  updateComment(postId: string, commentId: string, updates: Partial<Comment>): Observable<void> {
    return this.firebaseService.update(`posts/${postId}/comments`, commentId, {
      ...updates,
      updatedAt: new Date()
    });
  }

  /**
   * Delete comment
   */
  deleteComment(postId: string, commentId: string): Observable<void> {
    return this.firebaseService.delete(`posts/${postId}/comments`, commentId);
  }

  /**
   * Like or dislike a comment
   */
  interactWithComment(postId: string, commentId: string, type: 'like' | 'dislike'): Observable<void> {
    return this.authService.currentUser$.pipe(
      switchMap(user => {
        if (!user) throw new Error('User must be logged in to interact with comments');

        // Check if user already interacted with this comment
        return this.getUserCommentInteraction(postId, commentId, user.id).pipe(
          switchMap(existingInteraction => {
            if (existingInteraction) {
              if (existingInteraction.type === type) {
                // Remove the interaction (unlike/undislike)
                return this.removeCommentInteraction(postId, commentId, user.id, existingInteraction.id);
              } else {
                // Update the interaction type
                return this.updateCommentInteraction(postId, commentId, user.id, existingInteraction.id, type);
              }
            } else {
              // Create new interaction
              return this.createCommentInteraction(postId, commentId, user.id, type);
            }
          })
        );
      })
    );
  }

  /**
   * Get user's interaction with a comment
   */
  getUserCommentInteraction(postId: string, commentId: string, userId: string): Observable<any | null> {
    return this.firebaseService.getAll<any>('comment_interactions',
      this.firebaseService.where('postId', '==', postId),
      this.firebaseService.where('commentId', '==', commentId),
      this.firebaseService.where('userId', '==', userId)
    ).pipe(
      map(interactions => interactions.length > 0 ? interactions[0] : null)
    );
  }

  /**
   * Create comment interaction
   */
  private createCommentInteraction(postId: string, commentId: string, userId: string, type: 'like' | 'dislike'): Observable<void> {
    const interaction = {
      postId,
      commentId,
      userId,
      type,
      createdAt: new Date()
    };

    return this.firebaseService.add('comment_interactions', interaction).pipe(
      switchMap(() => this.updateCommentCounts(postId, commentId, type, 1))
    );
  }

  /**
   * Update comment interaction
   */
  private updateCommentInteraction(postId: string, commentId: string, userId: string, interactionId: string, newType: 'like' | 'dislike'): Observable<void> {
    return this.getUserCommentInteraction(postId, commentId, userId).pipe(
      switchMap(existingInteraction => {
        if (!existingInteraction) throw new Error('Interaction not found');
        
        const oldType = existingInteraction.type;
        
        return this.firebaseService.update('comment_interactions', interactionId, {
          type: newType,
          updatedAt: new Date()
        }).pipe(
          switchMap(() => combineLatest([
            this.updateCommentCounts(postId, commentId, oldType, -1),
            this.updateCommentCounts(postId, commentId, newType, 1)
          ])),
          map(() => void 0)
        );
      })
    );
  }

  /**
   * Remove comment interaction
   */
  private removeCommentInteraction(postId: string, commentId: string, userId: string, interactionId: string): Observable<void> {
    return this.getUserCommentInteraction(postId, commentId, userId).pipe(
      switchMap(interaction => {
        if (!interaction) throw new Error('Interaction not found');
        
        return this.firebaseService.delete('comment_interactions', interactionId).pipe(
          switchMap(() => this.updateCommentCounts(postId, commentId, interaction.type, -1))
        );
      })
    );
  }

  /**
   * Update comment like/dislike counts
   */
  private updateCommentCounts(postId: string, commentId: string, type: 'like' | 'dislike', increment: number): Observable<void> {
    return this.getCommentById(postId, commentId).pipe(
      switchMap(comment => {
        if (!comment) throw new Error('Comment not found');
        
        const updates: Partial<Comment> = {};
        if (type === 'like') {
          updates.likes = Math.max(0, (comment.likes || 0) + increment);
        } else {
          updates.dislikes = Math.max(0, (comment.dislikes || 0) + increment);
        }
        
        return this.updateComment(postId, commentId, updates);
      })
    );
  }

  /**
   * Get comment by ID
   */
  private getCommentById(postId: string, commentId: string): Observable<Comment | null> {
    return this.firebaseService.get<Comment>(`posts/${postId}/comments`, commentId);
  }

  // INTERACTION OPERATIONS (LIKES/DISLIKES)

  /**
   * Like or dislike a post
   */
  interactWithPost(postId: string, type: 'like' | 'dislike'): Observable<void> {
    return this.authService.currentUser$.pipe(
      switchMap(user => {
        if (!user) throw new Error('User must be logged in to interact with posts');

        // First, check if user already interacted with this post
        return this.getUserPostInteraction(postId, user.id).pipe(
          switchMap(existingInteraction => {
            if (existingInteraction) {
              if (existingInteraction.type === type) {
                // Remove the interaction (unlike/undislike)
                return this.removePostInteraction(postId, user.id, existingInteraction.id);
              } else {
                // Update the interaction type
                return this.updatePostInteraction(postId, user.id, existingInteraction.id, type);
              }
            } else {
              // Create new interaction
              return this.createPostInteraction(postId, user.id, type);
            }
          })
        );
      })
    );
  }

  /**
   * Get user's interaction with a post
   */
  getUserPostInteraction(postId: string, userId: string): Observable<PostInteraction | null> {
    return this.firebaseService.getAll<PostInteraction>('post_interactions',
      this.firebaseService.where('postId', '==', postId),
      this.firebaseService.where('userId', '==', userId)
    ).pipe(
      map(interactions => interactions.length > 0 ? interactions[0] : null)
    );
  }

  /**
   * Create post interaction
   */
  private createPostInteraction(postId: string, userId: string, type: 'like' | 'dislike'): Observable<void> {
    const interaction: Omit<PostInteraction, 'id'> = {
      postId,
      userId,
      type,
      createdAt: new Date()
    };

    return this.firebaseService.add('post_interactions', interaction).pipe(
      switchMap(() => this.updatePostCounts(postId, type, 1))
    );
  }

  /**
   * Update post interaction
   */
  private updatePostInteraction(postId: string, userId: string, interactionId: string, newType: 'like' | 'dislike'): Observable<void> {
    return this.getUserPostInteraction(postId, userId).pipe(
      switchMap(existingInteraction => {
        if (!existingInteraction) throw new Error('Interaction not found');
        
        const oldType = existingInteraction.type;
        
        return this.firebaseService.update('post_interactions', interactionId, {
          type: newType,
          updatedAt: new Date()
        }).pipe(
          switchMap(() => combineLatest([
            this.updatePostCounts(postId, oldType, -1),
            this.updatePostCounts(postId, newType, 1)
          ])),
          map(() => void 0)
        );
      })
    );
  }

  /**
   * Remove post interaction
   */
  private removePostInteraction(postId: string, userId: string, interactionId: string): Observable<void> {
    return this.getUserPostInteraction(postId, userId).pipe(
      switchMap(interaction => {
        if (!interaction) throw new Error('Interaction not found');
        
        return this.firebaseService.delete('post_interactions', interactionId).pipe(
          switchMap(() => this.updatePostCounts(postId, interaction.type, -1))
        );
      })
    );
  }

  /**
   * Update post like/dislike counts
   */
  private updatePostCounts(postId: string, type: 'like' | 'dislike', increment: number): Observable<void> {
    return this.getPostById(postId).pipe(
      switchMap(post => {
        if (!post) throw new Error('Post not found');
        
        const updates: Partial<Post> = {};
        if (type === 'like') {
          updates.likes = Math.max(0, post.likes + increment);
        } else {
          updates.dislikes = Math.max(0, post.dislikes + increment);
        }
        
        return this.firebaseService.update('posts', postId, updates);
      })
    );
  }

  /**
   * Get trending posts (most liked in last 7 days)
   */
  getTrendingPosts(limit: number = 10): Observable<Post[]> {
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);

    return this.firebaseService.getAll<Post>('posts',
      this.firebaseService.where('isPublic', '==', true),
      this.firebaseService.where('createdAt', '>=', weekAgo),
      this.firebaseService.orderBy('createdAt', 'desc'),
      this.firebaseService.limit(50) // Get more and sort by likes
    ).pipe(
      map(posts => posts
        .sort((a, b) => (b.likes - b.dislikes) - (a.likes - a.dislikes))
        .slice(0, limit)
      )
    );
  }
}

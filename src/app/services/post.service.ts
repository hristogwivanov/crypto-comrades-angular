import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { map, tap, catchError } from 'rxjs/operators';
import { Post, Comment, PostInteraction, CreatePostRequest, UpdatePostRequest } from '../models/post.interface';

@Injectable({
  providedIn: 'root'
})
export class PostService {
  private readonly API_URL = 'https://crypto-comrades-api.netlify.app';
  
  private postsSubject = new BehaviorSubject<Post[]>([]);
  public posts$ = this.postsSubject.asObservable();

  constructor(private http: HttpClient) {}

  getPosts(): Observable<Post[]> {
    return this.getAllPosts(1, 100);
  }

  getAllPosts(page: number = 1, limit: number = 10): Observable<Post[]> {
    const params = new HttpParams()
      .set('page', page.toString())
      .set('limit', limit.toString())
      .set('sort', '-createdAt');

    return this.http.get<Post[]>(`${this.API_URL}/posts`, { params })
      .pipe(
        tap(posts => this.postsSubject.next(posts))
      );
  }

  getPostById(id: string): Observable<Post> {
    return this.http.get<Post>(`${this.API_URL}/posts/${id}`);
  }

  getUserPosts(userId: string): Observable<Post[]> {
    return this.http.get<Post[]>(`${this.API_URL}/posts/user/${userId}`);
  }

  createPost(postData: CreatePostRequest): Observable<Post> {
    return this.http.post<Post>(`${this.API_URL}/posts`, postData)
      .pipe(
        tap(newPost => {
          const currentPosts = this.postsSubject.value;
          this.postsSubject.next([newPost, ...currentPosts]);
        })
      );
  }

  updatePost(id: string, postData: Partial<UpdatePostRequest>): Observable<Post> {
    return this.http.put<Post>(`${this.API_URL}/posts/${id}`, postData)
      .pipe(
        tap(updatedPost => {
          const currentPosts = this.postsSubject.value;
          const index = currentPosts.findIndex(p => p.id === id);
          if (index !== -1) {
            currentPosts[index] = updatedPost;
            this.postsSubject.next([...currentPosts]);
          }
        })
      );
  }

  deletePost(id: string): Observable<boolean> {
    return this.http.delete(`${this.API_URL}/posts/${id}`)
      .pipe(
        map(() => true),
        tap(() => {
          const currentPosts = this.postsSubject.value;
          const filteredPosts = currentPosts.filter(p => p.id !== id);
          this.postsSubject.next(filteredPosts);
        })
      );
  }

  likePost(postId: string): Observable<PostInteraction> {
    return this.http.post<PostInteraction>(`${this.API_URL}/posts/${postId}/like`, {})
      .pipe(
        tap(() => this.updatePostInteraction(postId, 'like'))
      );
  }

  dislikePost(postId: string): Observable<PostInteraction> {
    return this.http.post<PostInteraction>(`${this.API_URL}/posts/${postId}/dislike`, {})
      .pipe(
        tap(() => this.updatePostInteraction(postId, 'dislike'))
      );
  }

  removeInteraction(postId: string): Observable<boolean> {
    return this.http.delete(`${this.API_URL}/posts/${postId}/interaction`)
      .pipe(
        map(() => true),
        tap(() => this.updatePostInteraction(postId, 'remove'))
      );
  }

  addComment(postId: string, content: string): Observable<Comment> {
    return this.http.post<Comment>(`${this.API_URL}/posts/${postId}/comments`, { content })
      .pipe(
        tap(newComment => {
          const currentPosts = this.postsSubject.value;
          const post = currentPosts.find(p => p.id === postId);
          if (post) {
            post.comments.push(newComment);
            this.postsSubject.next([...currentPosts]);
          }
        })
      );
  }

  updateComment(postId: string, commentId: string, content: string): Observable<Comment> {
    return this.http.put<Comment>(`${this.API_URL}/posts/${postId}/comments/${commentId}`, { content });
  }

  deleteComment(postId: string, commentId: string): Observable<boolean> {
    return this.http.delete(`${this.API_URL}/posts/${postId}/comments/${commentId}`)
      .pipe(
        map(() => true),
        tap(() => {
          const currentPosts = this.postsSubject.value;
          const post = currentPosts.find(p => p.id === postId);
          if (post) {
            post.comments = post.comments.filter(c => c.id !== commentId);
            this.postsSubject.next([...currentPosts]);
          }
        })
      );
  }

  likeComment(postId: string, commentId: string): Observable<boolean> {
    return this.http.post(`${this.API_URL}/posts/${postId}/comments/${commentId}/like`, {})
      .pipe(map(() => true));
  }

  dislikeComment(postId: string, commentId: string): Observable<boolean> {
    return this.http.post(`${this.API_URL}/posts/${postId}/comments/${commentId}/dislike`, {})
      .pipe(map(() => true));
  }

  searchPosts(query: string): Observable<Post[]> {
    const params = new HttpParams().set('search', query);
    return this.http.get<Post[]>(`${this.API_URL}/posts/search`, { params });
  }

  getPostsByTag(tag: string): Observable<Post[]> {
    return this.http.get<Post[]>(`${this.API_URL}/posts/tag/${tag}`);
  }

  getTrendingPosts(): Observable<Post[]> {
    return this.http.get<Post[]>(`${this.API_URL}/posts/trending`);
  }

  private updatePostInteraction(postId: string, action: 'like' | 'dislike' | 'remove'): void {
    const currentPosts = this.postsSubject.value;
    const post = currentPosts.find(p => p.id === postId);
    
    if (post) {
      switch (action) {
        case 'like':
          post.likes += 1;
          break;
        case 'dislike':
          post.dislikes += 1;
          break;
        case 'remove':
          break;
      }
      this.postsSubject.next([...currentPosts]);
    }
  }
}

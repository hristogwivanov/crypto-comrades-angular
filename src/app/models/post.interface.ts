export interface Post {
  id: string;
  userId: string;
  author: {
    username: string;
    avatar?: string;
  };
  title: string;
  content: string;
  cryptoMentions?: string[];
  imageUrl?: string;
  likes: number;
  dislikes: number;
  comments: Comment[];
  tags: string[];
  isPublic: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Comment {
  id: string;
  postId: string;
  userId: string;
  author: {
    username: string;
    avatar?: string;
  };
  content: string;
  likes: number;
  dislikes: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface PostInteraction {
  id: string;
  postId: string;
  userId: string;
  type: 'like' | 'dislike';
  createdAt: Date;
}

export interface CreatePostRequest {
  title: string;
  content: string;
  cryptoMentions?: string[];
  imageUrl?: string;
  tags: string[];
  isPublic: boolean;
}

export interface UpdatePostRequest extends Partial<CreatePostRequest> {
  id: string;
}

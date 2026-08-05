export type UserRole = 'admin' | 'editor' | 'reporter' | 'colunista';

export interface User {
  id: string;
  name: string;
  email: string;
  avatar: string;
  role: UserRole;
  bio: string;
  active: boolean;
  createdAt: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  color: string; // HEX or Tailwind color
  description: string;
  iconName?: string;
  order: number;
}

export interface Comment {
  id: string;
  articleId: string;
  authorName: string;
  authorAvatar?: string;
  content: string;
  createdAt: string;
  likes: number;
}

export interface Article {
  id: string;
  title: string;
  subtitle: string; // Linha fina
  slug: string;
  categoryId: string;
  categoryName: string;
  authorId: string;
  authorName: string;
  authorAvatar: string;
  coverImage: string;
  imageCaption?: string;
  imageCredit?: string;
  content: string; // Rich text / paragraphs / headings
  excerpt: string;
  publishedAt: string;
  updatedAt?: string;
  status: 'published' | 'draft' | 'archived';
  isFeatured: boolean; // Destaque principal
  isSecondary?: boolean; // Destaque secundário
  isBreaking?: boolean; // Plantão / Urgente
  views: number;
  shares: number;
  tags: string[];
}

export type ViewMode = 'home' | 'article' | 'admin' | 'category';

export interface AIResponse {
  result: string;
  error?: string;
}

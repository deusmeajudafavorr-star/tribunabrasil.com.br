import { Article, Category, User, Comment } from '../types';
import { INITIAL_ARTICLES, INITIAL_CATEGORIES, INITIAL_USERS, INITIAL_COMMENTS } from '../data/initialData';
import {
  saveArticleToFirebase,
  deleteArticleFromFirebase,
  incrementArticleViewsFirebase,
  incrementArticleSharesFirebase,
  saveCategoryToFirebase,
  deleteCategoryFromFirebase,
  saveUserToFirebase,
  deleteUserFromFirebase,
  addCommentToFirebase,
  likeCommentFirebase,
} from './firebase';

const ARTICLES_KEY = 'portal_metropoles_articles_v1';
const CATEGORIES_KEY = 'portal_metropoles_categories_v1';
const USERS_KEY = 'portal_metropoles_users_v1';
const COMMENTS_KEY = 'portal_metropoles_comments_v1';

export const storage = {
  // --- ARTICLES ---
  getArticles(): Article[] {
    try {
      const data = localStorage.getItem(ARTICLES_KEY);
      if (!data) {
        localStorage.setItem(ARTICLES_KEY, JSON.stringify(INITIAL_ARTICLES));
        return INITIAL_ARTICLES;
      }
      return JSON.parse(data);
    } catch {
      return INITIAL_ARTICLES;
    }
  },

  getArticleBySlug(slug: string): Article | undefined {
    const articles = this.getArticles();
    return articles.find((a) => a.slug === slug || a.id === slug);
  },

  saveArticle(article: Article): Article {
    const articles = this.getArticles();
    const index = articles.findIndex((a) => a.id === article.id);

    // If making this featured, un-feature other articles
    if (article.isFeatured) {
      articles.forEach((a) => {
        if (a.id !== article.id) a.isFeatured = false;
      });
    }

    const updatedArticle = {
      ...article,
      updatedAt: new Date().toISOString(),
    };

    if (index >= 0) {
      articles[index] = updatedArticle;
    } else {
      articles.unshift(updatedArticle);
    }

    localStorage.setItem(ARTICLES_KEY, JSON.stringify(articles));
    
    // Sync live to Firebase Realtime Database
    saveArticleToFirebase(updatedArticle).catch((err) =>
      console.error('Firebase sync error saving article:', err)
    );

    return updatedArticle;
  },

  deleteArticle(id: string): boolean {
    const articles = this.getArticles();
    const filtered = articles.filter((a) => a.id !== id);
    localStorage.setItem(ARTICLES_KEY, JSON.stringify(filtered));

    // Sync live to Firebase Realtime Database
    deleteArticleFromFirebase(id).catch((err) =>
      console.error('Firebase sync error deleting article:', err)
    );

    return true;
  },

  incrementViews(id: string): void {
    const articles = this.getArticles();
    const article = articles.find((a) => a.id === id);
    if (article) {
      article.views = (article.views || 0) + 1;
      localStorage.setItem(ARTICLES_KEY, JSON.stringify(articles));
    }
    // Sync live to Firebase
    incrementArticleViewsFirebase(id).catch((err) =>
      console.error('Firebase sync error incrementing views:', err)
    );
  },

  incrementShares(id: string): void {
    const articles = this.getArticles();
    const article = articles.find((a) => a.id === id);
    if (article) {
      article.shares = (article.shares || 0) + 1;
      localStorage.setItem(ARTICLES_KEY, JSON.stringify(articles));
    }
    // Sync live to Firebase
    incrementArticleSharesFirebase(id).catch((err) =>
      console.error('Firebase sync error incrementing shares:', err)
    );
  },

  // --- CATEGORIES ---
  getCategories(): Category[] {
    try {
      const data = localStorage.getItem(CATEGORIES_KEY);
      if (!data) {
        localStorage.setItem(CATEGORIES_KEY, JSON.stringify(INITIAL_CATEGORIES));
        return INITIAL_CATEGORIES;
      }
      return JSON.parse(data);
    } catch {
      return INITIAL_CATEGORIES;
    }
  },

  saveCategory(category: Category): Category {
    const categories = this.getCategories();
    const index = categories.findIndex((c) => c.id === category.id);
    if (index >= 0) {
      categories[index] = category;
    } else {
      categories.push(category);
    }
    localStorage.setItem(CATEGORIES_KEY, JSON.stringify(categories));

    // Sync live to Firebase
    saveCategoryToFirebase(category).catch((err) =>
      console.error('Firebase sync error saving category:', err)
    );

    return category;
  },

  deleteCategory(id: string): boolean {
    const categories = this.getCategories();
    const filtered = categories.filter((c) => c.id !== id);
    localStorage.setItem(CATEGORIES_KEY, JSON.stringify(filtered));

    // Sync live to Firebase
    deleteCategoryFromFirebase(id).catch((err) =>
      console.error('Firebase sync error deleting category:', err)
    );

    return true;
  },

  // --- USERS / AUTHORS ---
  getUsers(): User[] {
    try {
      const data = localStorage.getItem(USERS_KEY);
      if (!data) {
        localStorage.setItem(USERS_KEY, JSON.stringify(INITIAL_USERS));
        return INITIAL_USERS;
      }
      return JSON.parse(data);
    } catch {
      return INITIAL_USERS;
    }
  },

  saveUser(user: User): User {
    const users = this.getUsers();
    const index = users.findIndex((u) => u.id === user.id);
    if (index >= 0) {
      users[index] = user;
    } else {
      users.push(user);
    }
    localStorage.setItem(USERS_KEY, JSON.stringify(users));

    // Sync live to Firebase
    saveUserToFirebase(user).catch((err) =>
      console.error('Firebase sync error saving user:', err)
    );

    return user;
  },

  deleteUser(id: string): boolean {
    const users = this.getUsers();
    const filtered = users.filter((u) => u.id !== id);
    localStorage.setItem(USERS_KEY, JSON.stringify(filtered));

    // Sync live to Firebase
    deleteUserFromFirebase(id).catch((err) =>
      console.error('Firebase sync error deleting user:', err)
    );

    return true;
  },

  // --- COMMENTS ---
  getComments(articleId: string): Comment[] {
    try {
      const data = localStorage.getItem(COMMENTS_KEY);
      const all: Comment[] = data ? JSON.parse(data) : INITIAL_COMMENTS;
      return all.filter((c) => c.articleId === articleId);
    } catch {
      return INITIAL_COMMENTS.filter((c) => c.articleId === articleId);
    }
  },

  addComment(articleId: string, authorName: string, content: string): Comment {
    const newComment: Comment = {
      id: 'comm-' + Date.now(),
      articleId,
      authorName: authorName.trim() || 'Leitor Anônimo',
      content: content.trim(),
      createdAt: new Date().toISOString(),
      likes: 0,
    };

    try {
      const data = localStorage.getItem(COMMENTS_KEY);
      const all: Comment[] = data ? JSON.parse(data) : INITIAL_COMMENTS;
      all.unshift(newComment);
      localStorage.setItem(COMMENTS_KEY, JSON.stringify(all));
    } catch (e) {
      console.error(e);
    }

    // Sync live to Firebase
    addCommentToFirebase(newComment).catch((err) =>
      console.error('Firebase sync error adding comment:', err)
    );

    return newComment;
  },

  likeComment(commentId: string): void {
    try {
      const data = localStorage.getItem(COMMENTS_KEY);
      const all: Comment[] = data ? JSON.parse(data) : INITIAL_COMMENTS;
      const target = all.find((c) => c.id === commentId);
      if (target) {
        target.likes += 1;
        localStorage.setItem(COMMENTS_KEY, JSON.stringify(all));
      }
    } catch (e) {
      console.error(e);
    }

    // Sync live to Firebase
    likeCommentFirebase(commentId).catch((err) =>
      console.error('Firebase sync error liking comment:', err)
    );
  },

  // Sync state from Firebase snapshot to LocalStorage cache
  updateLocalStorageArticles(articles: Article[]): void {
    localStorage.setItem(ARTICLES_KEY, JSON.stringify(articles));
  },
  updateLocalStorageCategories(categories: Category[]): void {
    localStorage.setItem(CATEGORIES_KEY, JSON.stringify(categories));
  },
  updateLocalStorageUsers(users: User[]): void {
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
  },

  resetToDefaults(): void {
    localStorage.setItem(ARTICLES_KEY, JSON.stringify(INITIAL_ARTICLES));
    localStorage.setItem(CATEGORIES_KEY, JSON.stringify(INITIAL_CATEGORIES));
    localStorage.setItem(USERS_KEY, JSON.stringify(INITIAL_USERS));
    localStorage.setItem(COMMENTS_KEY, JSON.stringify(INITIAL_COMMENTS));
  },
};


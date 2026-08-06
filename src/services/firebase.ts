import { initializeApp } from 'firebase/app';
import { getDatabase, ref, onValue, set, remove, get } from 'firebase/database';
import { Article, Category, User, Comment } from '../types';
import { INITIAL_ARTICLES, INITIAL_CATEGORIES, INITIAL_USERS, INITIAL_COMMENTS } from '../data/initialData';

const firebaseConfig = {
  databaseURL: 'https://notaziavoz-default-rtdb.firebaseio.com',
};

// Initialize Firebase App
const app = initializeApp(firebaseConfig, 'notaziavoz-app');
export const db = getDatabase(app);

// Helper to convert object or array from RTDB into array
function toArray<T>(val: Record<string, T> | T[] | null | undefined): T[] {
  if (!val) return [];
  if (Array.isArray(val)) return val.filter(Boolean);
  return Object.values(val).filter(Boolean);
}

// Automatic Seeding and Syncing to ensure all articles (initial + generated) exist in Firebase
export async function syncAllLocalArticlesToFirebase(localArticles: Article[] = []): Promise<void> {
  try {
    const articlesRef = ref(db, 'articles');
    const snapshot = await get(articlesRef);
    const existingData = snapshot.exists() ? snapshot.val() : {};
    
    const articlesMap: Record<string, Article> = {};
    if (Array.isArray(existingData)) {
      existingData.filter(Boolean).forEach((a: Article) => {
        if (a && a.id) articlesMap[a.id] = a;
      });
    } else if (typeof existingData === 'object' && existingData !== null) {
      Object.values(existingData).filter(Boolean).forEach((a: any) => {
        if (a && a.id) articlesMap[a.id] = a as Article;
      });
    }

    let hasChanges = false;

    // 1. Ensure INITIAL_ARTICLES are present in Firebase
    INITIAL_ARTICLES.forEach((a) => {
      if (!articlesMap[a.id]) {
        articlesMap[a.id] = a;
        hasChanges = true;
      }
    });

    // 2. Ensure localArticles (e.g., generated or edited in browser) are present in Firebase
    localArticles.forEach((a) => {
      if (a && a.id) {
        if (!articlesMap[a.id] || JSON.stringify(articlesMap[a.id]) !== JSON.stringify(a)) {
          articlesMap[a.id] = a;
          hasChanges = true;
        }
      }
    });

    if (hasChanges || !snapshot.exists()) {
      console.log('Syncing all local & initial articles to Firebase RTDB...');
      await set(articlesRef, articlesMap);
    }
  } catch (err) {
    console.error('Error syncing articles to Firebase RTDB:', err);
  }
}

export async function seedInitialDataIfEmpty(): Promise<void> {
  try {
    await syncAllLocalArticlesToFirebase();

    const categoriesRef = ref(db, 'categories');
    const catSnapshot = await get(categoriesRef);
    if (!catSnapshot.exists()) {
      console.log('Seeding initial categories to Firebase...');
      const catObj: Record<string, Category> = {};
      INITIAL_CATEGORIES.forEach((c) => {
        catObj[c.id] = c;
      });
      await set(ref(db, 'categories'), catObj);
    }

    const usersRef = ref(db, 'users');
    const userSnapshot = await get(usersRef);
    if (!userSnapshot.exists()) {
      console.log('Seeding initial users to Firebase...');
      const userObj: Record<string, User> = {};
      INITIAL_USERS.forEach((u) => {
        userObj[u.id] = u;
      });
      await set(ref(db, 'users'), userObj);
    }

    const commentsRef = ref(db, 'comments');
    const commSnapshot = await get(commentsRef);
    if (!commSnapshot.exists()) {
      console.log('Seeding initial comments to Firebase...');
      const commObj: Record<string, Comment> = {};
      INITIAL_COMMENTS.forEach((cm) => {
        commObj[cm.id] = cm;
      });
      await set(ref(db, 'comments'), commObj);
    }
  } catch (err) {
    console.error('Error checking/seeding Firebase RTDB:', err);
  }
}

// Realtime Listeners
export function subscribeArticles(callback: (articles: Article[]) => void) {
  const articlesRef = ref(db, 'articles');
  return onValue(
    articlesRef,
    (snapshot) => {
      const data = snapshot.val();
      callback(toArray<Article>(data));
    },
    (error) => {
      console.error('Articles subscription error:', error);
    }
  );
}

export function subscribeCategories(callback: (categories: Category[]) => void) {
  const categoriesRef = ref(db, 'categories');
  return onValue(
    categoriesRef,
    (snapshot) => {
      const data = snapshot.val();
      callback(toArray<Category>(data));
    },
    (error) => {
      console.error('Categories subscription error:', error);
    }
  );
}

export function subscribeUsers(callback: (users: User[]) => void) {
  const usersRef = ref(db, 'users');
  return onValue(
    usersRef,
    (snapshot) => {
      const data = snapshot.val();
      callback(toArray<User>(data));
    },
    (error) => {
      console.error('Users subscription error:', error);
    }
  );
}

export function subscribeComments(articleId: string, callback: (comments: Comment[]) => void) {
  const commentsRef = ref(db, 'comments');
  return onValue(
    commentsRef,
    (snapshot) => {
      const data = snapshot.val();
      const allComments = toArray<Comment>(data);
      callback(allComments.filter((c) => c.articleId === articleId));
    },
    (error) => {
      console.error('Comments subscription error:', error);
    }
  );
}

// Articles Operations
export async function saveArticleToFirebase(article: Article): Promise<void> {
  // Save specific article
  const articleRef = ref(db, `articles/${article.id}`);
  await set(articleRef, article);

  // If making featured, un-feature others
  if (article.isFeatured) {
    const allRef = ref(db, 'articles');
    const snapshot = await get(allRef);
    if (snapshot.exists()) {
      const articlesMap = snapshot.val() as Record<string, Article>;
      Object.keys(articlesMap).forEach((id) => {
        if (id !== article.id && articlesMap[id].isFeatured) {
          set(ref(db, `articles/${id}/isFeatured`), false);
        }
      });
    }
  }
}

export async function deleteArticleFromFirebase(id: string): Promise<void> {
  const articleRef = ref(db, `articles/${id}`);
  await remove(articleRef);
}

export async function incrementArticleViewsFirebase(id: string): Promise<void> {
  const viewRef = ref(db, `articles/${id}/views`);
  const snapshot = await get(viewRef);
  const current = snapshot.exists() ? (snapshot.val() as number) : 0;
  await set(viewRef, current + 1);
}

export async function incrementArticleSharesFirebase(id: string): Promise<void> {
  const shareRef = ref(db, `articles/${id}/shares`);
  const snapshot = await get(shareRef);
  const current = snapshot.exists() ? (snapshot.val() as number) : 0;
  await set(shareRef, current + 1);
}

// Categories Operations
export async function saveCategoryToFirebase(category: Category): Promise<void> {
  const catRef = ref(db, `categories/${category.id}`);
  await set(catRef, category);
}

export async function deleteCategoryFromFirebase(id: string): Promise<void> {
  const catRef = ref(db, `categories/${id}`);
  await remove(catRef);
}

// Users Operations
export async function saveUserToFirebase(user: User): Promise<void> {
  const userRef = ref(db, `users/${user.id}`);
  await set(userRef, user);
}

export async function deleteUserFromFirebase(id: string): Promise<void> {
  const userRef = ref(db, `users/${id}`);
  await remove(userRef);
}

// Comments Operations
export async function addCommentToFirebase(comment: Comment): Promise<void> {
  const commentRef = ref(db, `comments/${comment.id}`);
  await set(commentRef, comment);
}

export async function likeCommentFirebase(commentId: string): Promise<void> {
  const likeRef = ref(db, `comments/${commentId}/likes`);
  const snapshot = await get(likeRef);
  const current = snapshot.exists() ? (snapshot.val() as number) : 0;
  await set(likeRef, current + 1);
}

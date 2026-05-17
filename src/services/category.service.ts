import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  updateDoc,
  writeBatch,
  getDocs,
} from 'firebase/firestore';
import { auth, db } from './firebase';
import type { Category, CategoryInput } from '../types';

function requireUid(): string {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error('[categoryService] User not authenticated');
  return uid;
}

const path = () => collection(db, 'users', requireUid(), 'categories');

const DEFAULTS: CategoryInput[] = [
  { name: 'Alimentação', icon: '🍔', color: '#FF6B6B', type: 'expense' },
  { name: 'Transporte', icon: '🚗', color: '#4DABF7', type: 'expense' },
  { name: 'Moradia', icon: '🏠', color: '#FFA94D', type: 'expense' },
  { name: 'Lazer', icon: '🎮', color: '#9775FA', type: 'expense' },
  { name: 'Saúde', icon: '💊', color: '#51CF66', type: 'expense' },
  { name: 'Educação', icon: '📚', color: '#FCC419', type: 'expense' },
  { name: 'Compras', icon: '🛍️', color: '#E64980', type: 'expense' },
  { name: 'Outros', icon: '💸', color: '#94a3b8', type: 'expense' },
  { name: 'Salário', icon: '💼', color: '#37B24D', type: 'income' },
  { name: 'Freelance', icon: '💻', color: '#1098AD', type: 'income' },
  { name: 'Investimentos', icon: '📈', color: '#7048E8', type: 'income' },
];

export const categoryService = {
  subscribe(callback: (items: Category[]) => void): () => void {
    const q = query(path(), orderBy('name'));
    return onSnapshot(q, (snap) => {
      const items = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Category, 'id'>) }));
      callback(items);
    });
  },

  async create(data: CategoryInput) {
    return addDoc(path(), data);
  },

  async update(id: string, data: Partial<CategoryInput>) {
    return updateDoc(doc(path(), id), data);
  },

  async remove(id: string) {
    return deleteDoc(doc(path(), id));
  },

  async ensureDefaults() {
    const existing = await getDocs(path());
    if (!existing.empty) return;
    const batch = writeBatch(db);
    for (const cat of DEFAULTS) {
      batch.set(doc(path()), cat);
    }
    await batch.commit();
  },
};

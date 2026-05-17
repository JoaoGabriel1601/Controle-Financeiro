import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  updateDoc,
} from 'firebase/firestore';
import { auth, db } from './firebase';
import type { Budget, BudgetInput } from '../types';

function requireUid(): string {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error('[budgetService] User not authenticated');
  return uid;
}

const path = () => collection(db, 'users', requireUid(), 'budgets');

export const budgetService = {
  subscribe(callback: (items: Budget[]) => void): () => void {
    const q = query(path());
    return onSnapshot(q, (snap) => {
      const items = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Budget, 'id'>) }));
      callback(items);
    });
  },

  async create(data: BudgetInput) {
    return addDoc(path(), data);
  },

  async update(id: string, data: Partial<BudgetInput>) {
    return updateDoc(doc(path(), id), data);
  },

  async remove(id: string) {
    return deleteDoc(doc(path(), id));
  },
};

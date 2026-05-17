import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
} from 'firebase/firestore';
import { auth, db } from './firebase';
import type { Account, AccountInput } from '../types';

function requireUid(): string {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error('[accountService] User not authenticated');
  return uid;
}

const path = () => collection(db, 'users', requireUid(), 'accounts');

export const accountService = {
  subscribe(callback: (items: Account[]) => void): () => void {
    const q = query(path(), orderBy('createdAt', 'asc'));
    return onSnapshot(q, (snap) => {
      const items = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Account, 'id'>) }));
      callback(items);
    });
  },

  async create(data: AccountInput) {
    return addDoc(path(), { ...data, createdAt: serverTimestamp() });
  },

  async update(id: string, data: Partial<AccountInput>) {
    return updateDoc(doc(path(), id), data);
  },

  async remove(id: string) {
    return deleteDoc(doc(path(), id));
  },
};

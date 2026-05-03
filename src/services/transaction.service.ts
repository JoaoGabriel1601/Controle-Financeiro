import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  Timestamp,
  updateDoc,
} from 'firebase/firestore';
import { auth, db } from './firebase';
import type { Transaction, TransactionInput } from '../types';

const path = () => collection(db, 'users', auth.currentUser!.uid, 'transactions');

function toTimestamp(value: Date | Timestamp): Timestamp {
  if (value instanceof Timestamp) return value;
  return Timestamp.fromDate(value);
}

export const transactionService = {
  subscribe(callback: (items: Transaction[]) => void): () => void {
    const q = query(path(), orderBy('date', 'desc'));
    return onSnapshot(q, (snap) => {
      const items = snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<Transaction, 'id'>),
      }));
      callback(items);
    });
  },

  async create(data: Omit<TransactionInput, 'date'> & { date: Date | Timestamp }) {
    return addDoc(path(), {
      ...data,
      date: toTimestamp(data.date),
      createdAt: serverTimestamp(),
    });
  },

  async update(id: string, data: Partial<Omit<TransactionInput, 'date'>> & { date?: Date | Timestamp }) {
    const payload: Record<string, unknown> = { ...data };
    if (data.date) payload.date = toTimestamp(data.date);
    return updateDoc(doc(path(), id), payload);
  },

  async remove(id: string) {
    return deleteDoc(doc(path(), id));
  },
};

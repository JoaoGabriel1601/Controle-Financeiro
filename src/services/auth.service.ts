import {
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
  type User as FirebaseUser,
} from 'firebase/auth';
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { auth, db, googleProvider } from './firebase';

async function ensureUserDocument(user: FirebaseUser, name?: string): Promise<void> {
  const ref = doc(db, 'users', user.uid);
  const snap = await getDoc(ref);
  if (snap.exists()) return;

  await setDoc(ref, {
    name: name ?? user.displayName ?? user.email?.split('@')[0] ?? 'Usuário',
    email: user.email ?? '',
    photoURL: user.photoURL ?? null,
    createdAt: serverTimestamp(),
  });
}

export const authService = {
  async loginWithGoogle() {
    const result = await signInWithPopup(auth, googleProvider);
    await ensureUserDocument(result.user);
    return result.user;
  },

  async loginWithEmail(email: string, password: string) {
    const result = await signInWithEmailAndPassword(auth, email, password);
    await ensureUserDocument(result.user);
    return result.user;
  },

  async registerWithEmail(name: string, email: string, password: string) {
    const result = await createUserWithEmailAndPassword(auth, email, password);
    if (name) {
      await updateProfile(result.user, { displayName: name });
    }
    await ensureUserDocument(result.user, name);
    return result.user;
  },

  async logout() {
    return signOut(auth);
  },

  onAuthStateChanged(callback: (user: FirebaseUser | null) => void) {
    return onAuthStateChanged(auth, callback);
  },

  currentUser() {
    return auth.currentUser;
  },
};

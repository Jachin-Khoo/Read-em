/* ==========================================================================
   Read'Em Auth Service (src/store/auth.js)
   Firebase Authentication + Firestore user profiles.
   ========================================================================== */

import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as fbSignOut,
  onAuthStateChanged,
  updateProfile,
} from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { auth, db } from './firebase.js';

let _cachedProfile = null; // { uid, email, displayName, role, createdAt }
const listeners = new Set();

const notifyListeners = () => listeners.forEach((cb) => cb(_cachedProfile));

async function loadProfile(firebaseUser) {
  if (!firebaseUser) {
    _cachedProfile = null;
    return null;
  }
  const snap = await getDoc(doc(db, 'users', firebaseUser.uid));
  _cachedProfile = snap.exists()
    ? { uid: firebaseUser.uid, email: firebaseUser.email, ...snap.data() }
    : { uid: firebaseUser.uid, email: firebaseUser.email, displayName: firebaseUser.displayName, role: 'student' };
  return _cachedProfile;
}

// Restore session on page load — Firebase handles persistence automatically.
onAuthStateChanged(auth, async (firebaseUser) => {
  await loadProfile(firebaseUser);
  notifyListeners();
});

export const Auth = {
  async signUp(email, password, role, displayName) {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    const name = displayName || email.split('@')[0];
    await updateProfile(cred.user, { displayName: name });
    const profile = {
      uid: cred.user.uid,
      email: cred.user.email,
      displayName: name,
      role: role || 'student',
      createdAt: new Date().toISOString(),
    };
    await setDoc(doc(db, 'users', cred.user.uid), profile);
    _cachedProfile = profile;
    notifyListeners();
    return { uid: cred.user.uid, role: profile.role };
  },

  async signIn(email, password) {
    const cred = await signInWithEmailAndPassword(auth, email, password);
    await loadProfile(cred.user);
    notifyListeners();
    return { uid: cred.user.uid, role: _cachedProfile?.role };
  },

  async signOut() {
    await fbSignOut(auth);
    _cachedProfile = null;
    notifyListeners();
  },

  async getUserRole(uid) {
    if (_cachedProfile?.uid === uid) return _cachedProfile.role;
    const snap = await getDoc(doc(db, 'users', uid));
    return snap.exists() ? snap.data().role : null;
  },

  async getUserDisplayName(uid) {
    if (_cachedProfile?.uid === uid) return _cachedProfile.displayName || _cachedProfile.email?.split('@')[0] || uid;
    const snap = await getDoc(doc(db, 'users', uid));
    return snap.exists() ? (snap.data().displayName || snap.data().email?.split('@')[0] || uid) : uid;
  },

  onAuthChange(callback) {
    listeners.add(callback);
    setTimeout(() => callback(_cachedProfile), 0);
    return () => listeners.delete(callback);
  },

  getCurrentUser() {
    return _cachedProfile;
  },
};

/* Связь с Firebase: вход по паролю, бортжурналы обоих пилотов и рапорты технику в Firestore.
   Подключается из app.js, только если в CONFIG.firebase указаны настройки проекта. */
import { initializeApp } from 'https://www.gstatic.com/firebasejs/12.12.0/firebase-app.js';
import {
  getAuth, onAuthStateChanged, signInWithEmailAndPassword, signOut as fbSignOut, updatePassword,
} from 'https://www.gstatic.com/firebasejs/12.12.0/firebase-auth.js';
import {
  initializeFirestore, persistentLocalCache, persistentMultipleTabManager,
  doc, collection, onSnapshot, setDoc, deleteDoc, getDoc, serverTimestamp,
} from 'https://www.gstatic.com/firebasejs/12.12.0/firebase-firestore.js';

let auth, store, unsubs = [];

// onUser(null | { uid, email, passwordChanged }), onSorties(все вылеты), onReports(все рапорты), onError(ошибка)
export function init(config, { onUser, onSorties, onReports, onError }) {
  const app = initializeApp(config);
  auth = getAuth(app);
  store = initializeFirestore(app, { localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }) });

  onAuthStateChanged(auth, async user => {
    unsubs.forEach(stop => stop());
    unsubs = [];
    if (!user) return onUser(null);
    let passwordChanged = true; // без связи не заставляем менять пароль повторно
    try {
      passwordChanged = (await getDoc(doc(store, 'pilots', user.uid))).exists();
    } catch (e) {
      onError(e);
    }
    onUser({ uid: user.uid, email: user.email, passwordChanged });
    unsubs.push(onSnapshot(collection(store, 'sorties'), snap => onSorties(snap.docs.map(d => d.data())), onError));
    unsubs.push(onSnapshot(collection(store, 'reports'), snap => onReports(snap.docs.map(d => d.data())), onError));
  });
}

export const signIn = (email, password) => signInWithEmailAndPassword(auth, email, password);
export const signOut = () => fbSignOut(auth);

// Одноразовый ключ заменяется паролем; отметка в pilots/{uid} говорит, что ключ больше не нужен
export async function setPassword(password) {
  await updatePassword(auth.currentUser, password);
  await setDoc(doc(store, 'pilots', auth.currentUser.uid), { passwordSetAt: serverTimestamp() });
}

export const saveSortie = s => setDoc(doc(store, 'sorties', s.id), { ...s, uid: auth.currentUser.uid });
export const deleteSortie = id => deleteDoc(doc(store, 'sorties', id));

export const saveReport = r => setDoc(doc(store, 'reports', r.id), { ...r, uid: auth.currentUser.uid });
export const deleteReport = id => deleteDoc(doc(store, 'reports', id));

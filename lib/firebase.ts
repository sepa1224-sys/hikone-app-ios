import { initializeApp, getApp, getApps } from 'firebase/app'
import { getAuth, setPersistence, indexedDBLocalPersistence } from 'firebase/auth'
const firebaseConfig = {
  apiKey: 'AIzaSyD_BYx2ZFr92Ias4nRQ8R9YVAb5tgfl_MY',
  authDomain: 'hikoneapp.firebaseapp.com',
  projectId: 'hikoneapp',
  storageBucket: 'hikoneapp.firebasestorage.app',
  messagingSenderId: '139491332086',
  appId: '1:139491332086:web:db308b4481027fc1a6c1d7',
  measurementId: 'G-506WK1BLCV'
}
const app = getApps().length ? getApp() : initializeApp(firebaseConfig)
export const auth = getAuth(app)
void setPersistence(auth, indexedDBLocalPersistence)

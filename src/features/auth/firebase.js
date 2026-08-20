import {initializeApp} from "firebase/app"
import {getAuth, GoogleAuthProvider} from "firebase/auth"
import {getDatabase} from "firebase/database"
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyB1mIcsEAmTrA3t867-d5N-QPGacl5fKEU",
  authDomain: "agri-monitor-36080.firebaseapp.com",
  projectId: "agri-monitor-36080",
  storageBucket: "agri-monitor-36080.firebasestorage.app",
  messagingSenderId: "856520364939",
  appId: "1:856520364939:web:160a99ad6253c59253958e",
  databaseURL:"https://agri-monitor-36080-default-rtdb.firebaseio.com/",
};
export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getDatabase(app);
export const fdb = getFirestore(app)
export const Googleprovider = new GoogleAuthProvider();
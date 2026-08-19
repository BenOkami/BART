import { initializeApp } from "firebase/app";
import { doc, getFirestore } from "firebase/firestore";

// Configuração do projeto (fornecida pelo usuário)
const firebaseConfig = {
  apiKey: "AIzaSyDNwLs01DmXwCXcT87iKfjA9obzYsVoWLI",
  authDomain: "everlan.firebaseapp.com",
  projectId: "everlan",
  storageBucket: "everlan.firebasestorage.app",
  messagingSenderId: "730759749008",
  appId: "1:730759749008:web:31dd258e6245ff49a7a715",
};

export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);

/** Coleções usadas pelo placar */
export const COL = {
  teams: "teams",
  sellers: "sellers",
  entries: "entries",
} as const;

/** Documento único com as regras de pontuação */
export const SETTINGS_DOC = doc(db, "settings", "app");

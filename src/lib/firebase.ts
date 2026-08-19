import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

/* ------------------------------------------------------------------ */
/* Configuração do Firebase (projeto everlan)                          */
/* ------------------------------------------------------------------ */

const firebaseConfig = {
  apiKey: "AIzaSyDNwLs01DmXwCXcT87iKfjA9obzYsVoWLI",
  authDomain: "everlan.firebaseapp.com",
  projectId: "everlan",
  storageBucket: "everlan.firebasestorage.app",
  messagingSenderId: "730759749008",
  appId: "1:730759749008:web:31dd258e6245ff49a7a715",
};

const app = initializeApp(firebaseConfig);

/** Firestore — fonte única dos dados compartilhados do placar. */
export const db = getFirestore(app);

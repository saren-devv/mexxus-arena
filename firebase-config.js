// Firebase Configuration
const firebaseConfig = {
    apiKey: "AIzaSyCAfggBB19H0yjFiR-mh0bERbumJVBEWmA",
    authDomain: "taekwondo-zarumilla.firebaseapp.com",
    projectId: "taekwondo-zarumilla",
    storageBucket: "taekwondo-zarumilla.firebasestorage.app",
    messagingSenderId: "441200799480",
    appId: "1:441200799480:web:ea293d7bec8fdbcfcf550d",
    measurementId: "G-2SY5G99J76"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Initialize Firebase services
const auth = firebase.auth();
const db = firebase.firestore();
const storage = firebase.storage();

// Make services available globally
window.firebaseAuth = auth;
window.firebaseDB = db;
window.firebaseStorage = storage;

console.log('🔥 Firebase inicializado correctamente');
console.log('📊 Proyecto:', firebaseConfig.projectId); 
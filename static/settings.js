import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";
import {
  getFirestore,
  doc,
  getDoc,
  setDoc
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";

// --- Firebase Config ---
const firebaseConfig = {
  apiKey: "AIzaSyCofMBIvGlQRaKsPc9k7MkwjhBkdzoHo84",
  authDomain: "calorie-mate-4503.firebaseapp.com",
  projectId: "calorie-mate-4503",
  appId: "1:788288090415:web:9db8031566a7f40aaab1da"
};
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// --- DOM Elements ---
const mealsToggle = document.getElementById('toggle-meals');
console.log('mealsToggle:', mealsToggle);
const darkToggle = document.getElementById('toggle-dark');
const logoutBtn = document.getElementById('logout-btn');

// --- Dark Mode Logic ---
function applyDarkMode(isDark) {
  const html = document.documentElement;
  if (isDark) {
    html.classList.add('dark');
    localStorage.setItem('darkMode', 'true');
  } else {
    html.classList.remove('dark');
    localStorage.setItem('darkMode', 'false');
  }
}
// On load, apply dark mode from localStorage (default: dark)
applyDarkMode(localStorage.getItem('darkMode') !== 'false');
if (darkToggle) {
  darkToggle.checked = localStorage.getItem('darkMode') !== 'false';
  darkToggle.addEventListener('change', () => {
    applyDarkMode(darkToggle.checked);
  });
}

// --- Auth and Settings Logic ---
onAuthStateChanged(auth, async user => {
  if (!user) {
    window.location.href = '/login';
    return;
  }
  const userRef = doc(db, 'Users', user.uid);
  let userSnap;
  let mealsEnabled = true;
  try {
    userSnap = await getDoc(userRef);
    mealsEnabled = userSnap.exists() && userSnap.data().mealsEnabled !== undefined ? userSnap.data().mealsEnabled : true;
  } catch (e) {
    console.error('Error fetching user mealsEnabled:', e);
    mealsEnabled = true;
  }
  // Always sync localStorage with Firestore value for this user (user-specific key)
  localStorage.setItem(`mealsEnabled_${user.uid}`, String(mealsEnabled));
  window.dispatchEvent(new Event('mealsEnabledChanged'));
  if (mealsToggle) {
    // Defensive: remove all listeners by replacing node
    const newMealsToggle = mealsToggle.cloneNode(true);
    mealsToggle.parentNode.replaceChild(newMealsToggle, mealsToggle);
    // Update the global reference so future code uses the right node
    window.mealsToggle = newMealsToggle;
    newMealsToggle.checked = mealsEnabled;
    // Add event listener to update only mealsEnabled in Firestore
    newMealsToggle.addEventListener('change', async () => {
      const checked = newMealsToggle.checked;
      newMealsToggle.disabled = true;
      try {
        // Save mealsEnabled directly at Users/{uid}/mealsEnabled
        await setDoc(userRef, { mealsEnabled: checked }, { merge: true });
        localStorage.setItem(`mealsEnabled_${user.uid}`, String(checked));
        window.dispatchEvent(new Event('mealsEnabledChanged'));
        console.log('mealsEnabled set to:', checked);
      } catch (e) {
        console.error('Failed to update mealsEnabled in Firestore:', e);
      } finally {
        newMealsToggle.disabled = false;
      }
    });
    // Save to localStorage for nav use (on page load)
    localStorage.setItem(`mealsEnabled_${user.uid}`, String(newMealsToggle.checked));
    window.dispatchEvent(new Event('mealsEnabledChanged'));
    console.log('mealsEnabled initialized to:', newMealsToggle.checked);
  }
});

// --- Logout Logic ---
if (logoutBtn) {
  logoutBtn.addEventListener('click', async () => {
    await signOut(auth);
    window.location.href = '/login';
  });
} 
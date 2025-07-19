import { auth, db } from './firebase-config.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js';
import { doc, getDoc, setDoc } from 'https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js';

const profileForm = document.getElementById('profileForm');
const messageDiv = document.getElementById('message');
const loadingDiv = document.getElementById('loading');

function showLoading(show) {
  if (loadingDiv) loadingDiv.style.display = show ? 'block' : 'none';
}

function showMessage(msg, type = 'success') {
  if (!messageDiv) return;
  messageDiv.innerHTML = `<span class="${type === 'success' ? 'text-green-400' : 'text-red-400'} font-semibold">${msg}</span>`;
}

function getValue(id) {
  const el = document.getElementById(id);
  if (!el) throw new Error(`Missing field: ${id}`);
  return el.value;
}

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = '/login';
    return;
  }
  showLoading(true);
  // Fetch user profile from Firestore
  const userDocRef = doc(db, 'Users', user.uid);
  try {
    const userDocSnap = await getDoc(userDocRef);
    if (userDocSnap.exists()) {
      const data = userDocSnap.data();
      if (document.getElementById('name')) document.getElementById('name').value = data.name || '';
      if (document.getElementById('age')) document.getElementById('age').value = data.age || '';
      if (document.getElementById('gender')) document.getElementById('gender').value = data.gender || '';
      if (document.getElementById('height')) document.getElementById('height').value = data.height || '';
      if (document.getElementById('weight')) document.getElementById('weight').value = data.weight || '';
      if (document.getElementById('activity_level')) document.getElementById('activity_level').value = data.activity_level || '';
      if (document.getElementById('goal')) document.getElementById('goal').value = data.goal || '';
      if (document.getElementById('region')) document.getElementById('region').value = data.region || '';
    }
    showLoading(false);
  } catch (err) {
    showLoading(false);
    showMessage('Failed to load profile: ' + err.message, 'error');
  }

  profileForm.onsubmit = async function(e) {
    e.preventDefault();
    showMessage('');
    showLoading(true);
    try {
      // Validate fields
      const name = getValue('name').trim();
      const age = parseInt(getValue('age'));
      const gender = getValue('gender');
      const height = parseFloat(getValue('height'));
      const weight = parseFloat(getValue('weight'));
      const activity_level = getValue('activity_level');
      const goal = getValue('goal');
      const region = getValue('region').trim();
      if (!name || !age || !gender || !height || !weight || !activity_level || !goal || !region) {
        showLoading(false);
        showMessage('Please fill in all fields.', 'error');
        return;
      }
      const updatedData = {
        name, age, gender, height, weight, activity_level, goal, region,
        updated_at: new Date().toISOString()
      };
      console.log('Attempting to update profile with:', updatedData);
      await setDoc(userDocRef, updatedData, { merge: true });
      showLoading(false);
      showMessage('Profile updated successfully!', 'success');
      window.location.replace('/dashboard');
    } catch (err) {
      showLoading(false);
      showMessage(err.message ? err.message : 'Failed to update profile.', 'error');
      console.error('Profile update error:', err);
    }
  };
}); 
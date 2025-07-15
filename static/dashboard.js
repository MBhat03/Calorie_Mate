import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import { getFirestore, collection, getDocs, query, orderBy, doc, getDoc } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";

// Initialize Firebase
const firebaseConfig = {
  apiKey: "AIzaSyCofMBIvGlQRaKsPc9k7MkwjhBkdzoHo84",
  authDomain: "calorie-mate-4503.firebaseapp.com",
  projectId: "calorie-mate-4503",
  storageBucket: "calorie-mate-4503.firebasestorage.app",
  messagingSenderId: "788288090415",
  appId: "1:788288090415:web:9db8031566a7f40aaab1da"

};
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

async function refreshDashboard() {
    const user = auth.currentUser;
    if (!user) return;
  
    try {
      const userDoc = await getDoc(doc(db, 'Users', user.uid));
      if (!userDoc.exists()) return;
  
      const data = userDoc.data();
      document.getElementById('userName').textContent = data.name || '--';
      document.getElementById('userAgeDash').textContent = data.age || '--';
      document.getElementById('userGender').textContent = data.gender || '--';
      document.getElementById('userHeight').textContent = data.height || '--';
      document.getElementById('userGoal').textContent = data.goal || '--';
  
      const weightsRef = collection(db, `Users/${user.uid}/weights`);
      const snapshot = await getDocs(query(weightsRef, orderBy("date", "asc")));
  
      const dates = [], weights = [];
      snapshot.forEach(doc => {
        const w = doc.data();
        dates.push(new Date(w.date).toLocaleDateString());
        weights.push(w.weight);
      });
  
      const latest = weights.length > 0 ? weights[weights.length - 1] : data.weight;
      document.getElementById('userCurrentWeight').textContent = latest || '--';
  
      const canvas = document.getElementById('weightChart');
      if (canvas) {
        const ctx = canvas.getContext('2d');
        // ✅ Safely destroy previous chart
        if (window.weightChart instanceof Chart) {
          window.weightChart.destroy();
        }
  
        window.weightChart = new Chart(ctx, {
          type: 'line',
          data: {
            labels: dates,
            datasets: [{
              label: 'Weight (kg)',
              data: weights,
              borderColor: '#4F46E5',
              backgroundColor: 'rgba(99, 102, 241, 0.2)',
              tension: 0.3,
              pointRadius: 4,
              fill: true
            }]
          },
          options: {
            responsive: true,
            plugins: {
              title: { display: true, text: 'Weight Progress', color: '#fff' },
              legend: { labels: { color: '#fff' } }
            },
            scales: {
              x: { ticks: { color: '#fff' }, title: { display: true, text: 'Date', color: '#fff' } },
              y: { ticks: { color: '#fff' }, title: { display: true, text: 'Weight (kg)', color: '#fff' } }
            }
          }
        });
      }
    } catch (error) {
      console.error('Dashboard error:', error);
    }
  }

  window.refreshDashboard = refreshDashboard;
  window.showDashboard = function () {
    showScreen('dashboard');
    setTimeout(refreshDashboard, 300);
  };
  
  onAuthStateChanged(auth, (user) => {
    if (user) {
      refreshDashboard();
    } else {
      window.location.href = "/login"; // or wherever you want
    }
  });
  
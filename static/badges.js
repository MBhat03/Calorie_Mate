import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";
import { getFirestore, doc, getDoc, collection, getDocs } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";

// Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyCofMBIvGlQRaKsPc9k7MkwjhBkdzoHo84",
  authDomain: "calorie-mate-4503.firebaseapp.com",
  projectId: "calorie-mate-4503",
  storageBucket: "calorie-mate-4503.appspot.com",
  messagingSenderId: "788288090415",
  appId: "1:788288090415:web:9db8031566a7f40aaab1da"
};

// Init
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Modal data (hardcoded)
const badgeMeta = {
  "Adventure Begins!": { anime: "Bayblade", character: "Tyson Granger" },
  "Plus Ultra Setup!": { anime: "My Hero Academia", character: "Izuku Midoriya" },
  "First Log no Jutsu": { anime: "Naruto", character: "Naruto Uzumaki" },
  "Science Upgrade!": { anime: "Dr. Stone", character: "Senku Ishigami" },
  "Breathing Consistency": { anime: "Demon Slayer", character: "Tanjiro Kamado" },
  "Kaio-ken x3!": { anime: "Dragon Ball Z", character: "Goku" },
  "Bankai Dedication": { anime: "Bleach", character: "Ichigo Kurosaki" },
  "One Punch Habit": { anime: "One Punch Man", character: "Saitama" },
  "Saiyan Pride": { anime: "Dragon Ball Z", character: "Vegeta" },
  "Fullmetal Discipline": { anime: "Fullmetal Alchemist", character: "Edward Elric" },
  "Humanity's Strongest": { anime: "Attack on Titan", character: "Levi Ackerman" },
  "Ora Ora Consistency": { anime: "JoJo's Bizarre Adventure", character: "Jotaro Kujo" },
  "Return by Death": { anime: "Re:Zero", character: "Subaru Natsuki" },
  "Slime Evolution": { anime: "That Time I Got Reincarnated as a Slime", character: "Rimuru Tempest" },
  "Fire Dragon's Roar": { anime: "Fairy Tail", character: "Natsu Dragneel" },
  "Overlord's Record": { anime: "Overlord", character: "Ainz Ooal Gown" },
  "Wings of Freedom": { anime: "Attack on Titan", character: "Survey Corps" },
  "Godspeed Progress": { anime: "Hunter x Hunter", character: "Killua Zoldyck" },
  "Copy Cat Technique": { anime: "Naruto", character: "Kakashi Hatake" },
  "100% Dedication": { anime: "Mob Psycho 100", character: "Mob" },
  "Symbol of Peace": { anime: "My Hero Academia", character: "All Might" },
  "Power-Up Start!": { anime: "One Piece", character: "Monkey D. Luffy" },
  "Muscle Power Up": { anime: "Baki", character: "Baki" },
  "Hardened Resolve": { anime: "Black Clover", character: "Asta" },
  "Berserker Mode": { anime: "Berserk", character: "Guts" },
};

// Badge logic conditions (fixed to match all HTML badges)
const badgeConditions = {
  "Adventure Begins!": user => !!user,
  "Plus Ultra Setup!": user => !!user?.region,
  "First Log no Jutsu": (user, logs) => logs.length >= 1,
  "Science Upgrade!": user => !!user?.updated, // Assuming this checks if user updated their profile
  "Breathing Consistency": (user, logs) => checkStreak(logs) >= 1,
  "Kaio-ken x3!": (user, logs) => checkStreak(logs) >= 3,
  "Bankai Dedication": (user, logs) => checkStreak(logs) >= 7,
  "One Punch Habit": (user, logs) => checkStreak(logs) >= 21,
  "Saiyan Pride": (user, logs) => checkStreak(logs) >= 30,
  "Fullmetal Discipline": (user, logs) => checkStreak(logs) >= 60,
  "Humanity's Strongest": (user, logs) => checkStreak(logs) >= 90,
  "Ora Ora Consistency": (user, logs) => checkStreak(logs) >= 120,
  "Return by Death": (user, logs) => missedAfterStreak(logs, 3),
  "Slime Evolution": (user, logs) => logs.length >= 10,
  "Fire Dragon's Roar": (user, logs) => logs.length >= 20,
  "Overlord's Record": (user, logs) => logs.length >= 30,
  "Wings of Freedom": (user, logs) => weightChange(logs) <= -1,
  "Godspeed Progress": (user, logs) => weightChange(logs) <= -2,
  "Copy Cat Technique": (user, logs) => weightChange(logs) <= -3,
  "100% Dedication": (user, logs) => weightChange(logs) <= -4,
  "Symbol of Peace": (user, logs) => weightChange(logs) <= -5,
  "Power-Up Start!": (user, logs) => weightChange(logs) >= 1,
  "Muscle Power Up": (user, logs) => weightChange(logs) >= 2,
  "Hardened Resolve": (user, logs) => weightChange(logs) >= 3,
  "Berserker Mode": (user, logs) => weightChange(logs) >= 5,
};

// Badge utilities
function checkStreak(logs) {
  if (logs.length === 0) return 0;
  logs.sort((a, b) => b.date.localeCompare(a.date));
  let streak = 1;
  for (let i = 1; i < logs.length; i++) {
    const prev = new Date(logs[i - 1].date);
    const curr = new Date(logs[i].date);
    if ((prev - curr) / (1000 * 3600 * 24) === 1) streak++;
    else break;
  }
  return streak;
}

function missedAfterStreak(logs, n) {
  logs.sort((a, b) => new Date(a.date) - new Date(b.date));
  let streak = 1;
  for (let i = 1; i < logs.length; i++) {
    const diff = (new Date(logs[i].date) - new Date(logs[i - 1].date)) / (1000 * 3600 * 24);
    if (diff === 1) streak++;
    else {
      if (streak >= n) return true;
      streak = 1;
    }
  }
  return false;
}

function weightChange(logs) {
  if (logs.length < 2) return 0;
  logs.sort((a, b) => new Date(a.date) - new Date(b.date));
  return logs[logs.length - 1].weight - logs[0].weight;
}

// UI: modal setup
function openBadgeModal(card) {
  const title = card.querySelector(".badge-title").innerText;
  const description = card.querySelector(".badge-description").innerText;
  const img = card.querySelector("img").src;
  const anime = badgeMeta[title]?.anime || "Unknown";
  const character = badgeMeta[title]?.character || "Unknown";
  const isUnlocked = card.classList.contains("unlocked");

  const modal = document.getElementById("badgeModal");
  console.log("Title:", title);
  console.log("Description:", description);
  console.log("Image:", img);
  console.log("Modal found?", !!modal);
  if (modal) {
    modal.querySelector(".modal-badge-image").src = img;
    modal.querySelector(".modal-badge-title").innerText = title;
    modal.querySelector(".modal-badge-description").innerText = description;
    modal.querySelector("#modalBadgeAnime").innerText = anime;
    modal.querySelector("#modalBadgeCharacter").innerText = character;
    modal.querySelector("#modalBadgeStatus").innerText = isUnlocked ? "Unlocked" : "Locked";
    modal.querySelector("#modalBadgeDate").innerText = isUnlocked ? "Recently unlocked!" : "Not yet unlocked";
    modal.classList.remove("hidden");
    modal.classList.add("active");
  }
}
window.openBadgeModal = openBadgeModal;

function closeBadgeModal() {
  const modal = document.getElementById('badgeModal');
  if (modal) {
    modal.classList.remove('active');
    modal.classList.add('hidden');
    document.body.style.overflow = 'auto';
  }
}
window.closeBadgeModal = closeBadgeModal;

// Close modal when clicking outside
const modal = document.getElementById('badgeModal');
if (modal) {
  modal.addEventListener('click', function(event) {
    if (event.target === modal) {
      closeBadgeModal();
    }
  });
}

// Load badge logic
onAuthStateChanged(auth, async (user) => {
  if (!user) return;

  const uid = user.uid;
  const userSnap = await getDoc(doc(db, "Users", uid));
  const userData = userSnap.data();

  const logsSnap = await getDocs(collection(db, "Users", uid, "weights"));
  const logs = logsSnap.docs.map(d => d.data());

  let unlocked = 0;
  const badgeCards = Array.from(document.querySelectorAll(".badge-card"));
  console.log("Total badges found:", badgeCards.length);
  
  // Debug: Log all badge titles and their conditions
  badgeCards.forEach(card => {
    const title = card.querySelector(".badge-title")?.innerText;
    const hasCondition = badgeConditions[title] !== undefined;
    console.log(`Badge: "${title}" - Has condition: ${hasCondition}`);
    if (!hasCondition) {
      console.warn(`⚠️ Missing condition for badge: "${title}"`);
    }
  });

  badgeCards.forEach(card => {
    const title = card.querySelector(".badge-title")?.innerText;
    const wasLocked = card.classList.contains("locked");
    
    // Check if condition exists and evaluate it
    const unlockedNow = badgeConditions[title] ? badgeConditions[title](userData, logs) : false;

    const statusIcon = card.querySelector(".badge-unlock-status");

    if (unlockedNow) {
      card.classList.remove("locked");
      card.classList.add("unlocked");
      if (statusIcon) {
        statusIcon.classList.remove("locked");
        statusIcon.classList.add("unlocked");
        statusIcon.innerText = "✅";
      }
      if (wasLocked) {
        card.classList.add("animate-unlock");
        const sparkle = document.createElement("div");
        sparkle.className = "sparkle-effect";
        sparkle.innerHTML = "✨";
        card.appendChild(sparkle);
        setTimeout(() => {
          card.classList.remove("animate-unlock");
          if (sparkle.parentNode) {
            sparkle.parentNode.removeChild(sparkle);
          }
        }, 2000);
      }
      unlocked++;
    } else {
      card.classList.remove("unlocked");
      card.classList.add("locked");
      if (statusIcon) {
        statusIcon.classList.remove("unlocked");
        statusIcon.classList.add("locked");
        statusIcon.innerText = "🔒";
      }
    }
  });

  // Update counter - NOW DYNAMIC!
  const total = badgeCards.length;
  console.log(`Badge count: ${unlocked} / ${total}`);
  
  // Update both the counter and progress bar
  const badgeCountElement = document.getElementById("badgeCount");
  const progressFillElement = document.getElementById("progressFill");
  
  if (badgeCountElement) {
    badgeCountElement.innerText = `${unlocked} / ${total} badges unlocked`;
  }
  
  if (progressFillElement) {
    progressFillElement.style.width = `${(unlocked / total) * 100}%`;
  }
});
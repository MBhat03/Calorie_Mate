/**
 * A simple seedable pseudo-random number generator (PRNG).
 * This is used to create a deterministic shuffle.
 * @param {number} a - Seed part 1.
 * @param {number} b - Seed part 2.
 * @param {number} c - Seed part 3.
 * @param {number} d - Seed part 4.
 * @returns {function(): number} - A function that returns a random number between 0 and 1.
 */
function sfc32(a, b, c, d) {
    return function () {
        a |= 0;
        b |= 0;
        c |= 0;
        d |= 0;
        var t = (a + b) | 0;
        a = b ^ (b >>> 9);
        b = c + (c << 3) | 0;
        c = (c << 21) | (c >>> 11);
        d = (d + 1) | 0;
        t = (t + d) | 0;
        c = (c + t) | 0;
        return (t >>> 0) / 4294967296;
    };
}

/**
 * Shuffles an array in a deterministic way using a seed.
 * @param {Array<any>} array - The array to shuffle.
 * @param {string} seed - The seed for the shuffle.
 * @returns {Array<any>} - The shuffled array.
 */
function shuffle(array, seed) {
    let a = 0x9e3779b9,
        b = 0x243f6a88,
        c = 0xb7e15162,
        d = seed.length;
    for (let i = 0; i < seed.length; i++) {
        a += seed.charCodeAt(i);
        b += seed.charCodeAt(i);
        c += seed.charCodeAt(i);
    }
    const rand = sfc32(a, b, c, d);

    let currentIndex = array.length;
    let randomIndex;

    while (currentIndex !== 0) {
        randomIndex = Math.floor(rand() * currentIndex);
        currentIndex--;

        [array[currentIndex], array[randomIndex]] = [array[randomIndex], array[currentIndex]];
    }

    return array;
}

/**
 * Fetches quotes, selects one for the day, and displays it.
 */
async function displayDailyQuote() {
    try {
        const response = await fetch('/static/quotes.json');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const quotes = await response.json();

        // Deterministically shuffle the quotes to ensure the order is the same for all users.
        const shuffledQuotes = shuffle(quotes, "CalorieMateDailyQuoteSeed");

        // Use the day of the year to get a consistent daily index.
        const now = new Date();
        const startOfYear = new Date(now.getFullYear(), 0, 0);
        const diff = (now - startOfYear) + ((startOfYear.getTimezoneOffset() - now.getTimezoneOffset()) * 60 * 1000);
        const oneDay = 1000 * 60 * 60 * 24;
        const dayOfYear = Math.floor(diff / oneDay);

        const quoteIndex = dayOfYear % shuffledQuotes.length;
        const dailyQuote = shuffledQuotes[quoteIndex];

        const quoteTextEl = document.getElementById('quote-text');
        const quoteAuthorEl = document.getElementById('quote-author');

        if (quoteTextEl && quoteAuthorEl && dailyQuote) {
            quoteTextEl.innerHTML = `<i class="fas fa-quote-left fa-xs mr-2"></i>${dailyQuote.text}<i class="fas fa-quote-right fa-xs ml-2"></i>`;
            quoteAuthorEl.textContent = `— ${dailyQuote.author}`;
        }
    } catch (error) {
        console.error('Error displaying daily quote:', error);
        const quoteTextEl = document.getElementById('quote-text');
        if (quoteTextEl) {
            quoteTextEl.textContent = "Stay motivated on your journey!";
        }
        const quoteAuthorEl = document.getElementById('quote-author');
        if (quoteAuthorEl) {
            quoteAuthorEl.textContent = "— Calorie Mate";
        }
    }
}

document.addEventListener('DOMContentLoaded', displayDailyQuote); 
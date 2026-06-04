import * as auth from '../auth.js';
import api from '../api.js';
import * as util from '../utils.js';

async function init() {
    document.body.style.visibility = 'hidden';

    if (!auth.isLoggedIn()) {
        //try refresh
        try {
            const data = await api.post('/api/auth/refresh', null, {
                credentials: 'include',
            });

            auth.setToken(data.access_token);
        } catch (error) {
            //Error while loading current page. Redirect to login page.
            window.location.replace('./index.html');
            return;
        }
    }

    //load page content
    document.body.style.visibility = 'visible';
    const user = util.extractUserData(auth.getToken());
    const username = document.querySelector('.Header__username');
    username.textContent = user.name;

    try {
        //update stats
        await updateStats();

        //load decks
        await loadDecks();
    } catch (error) {}
}

async function loadDecks() {
    try {
        const decks = await api.get('/api/decks', {
            Authorization: `Bearer ${auth.getToken()}`,
        });

        const addDeck = document.querySelector('.DeckCard--addDeck');
        const response = await fetch('templates.html');
        const htmlText = await response.text();
        const parser = new DOMParser();
        const doc = parser.parseFromString(htmlText, 'text/html');
        const deckCardTemplate = doc.getElementById('deck-card-template');

        decks.forEach((deck) => {
            const card = deckCardTemplate.content.cloneNode(true);

            const title = card.querySelector('.CardItem__title');
            title.textContent = deck.name;

            const desc = card.querySelector('.CardItem__sub');
            desc.textContent = deck.description;

            const cardsCount = card.querySelector(
                '.CardItem__meta .Count__totalCardsValue',
            );
            cardsCount.textContent = `${deck.total_cards} cards`;

            const cardsDue = card.querySelector(
                '.CardItem__meta .Count__dueTodayValue',
            );
            cardsDue.textContent = `${deck.due_today} due`;

            const chip = card.querySelector('.CardItem__chip');
            chip.textContent = `${deck.due_today} due`;

            const status = deck.due_today / deck.total_cards;

            if (status > 0.7) {
                chip.classList.add('High');
            } else if (status > 0.4) {
                chip.classList.add('Med');
            } else {
                chip.classList.add('Low');
            }

            addDeck.before(card);
        });
    } catch (error) {
        const deckGrid = document.querySelector('.DeckGrid');
        const deckError = document.createElement('p');
        deckError.classList.add('CardList__error');
        deckError.textContent = 'Unable to load the decks at the moment.';
        deckGrid.before(deckError);
    }
}

async function updateStats() {
    const totalDecks = document.querySelector('.DashboardStats__totalDecks');
    const cardsDue = document.querySelector('.DashboardStats__cardsDue');
    const dayStreak = document.querySelector('.DashboardStats__dayStreak');

    try {
        const data = await api.get('/api/decks/stats', {
            Authorization: `Bearer ${auth.getToken()}`,
        });

        totalDecks.textContent = data.stats.total_decks;
        cardsDue.textContent = data.stats.due_today;
        dayStreak.textContent = data.stats.streak;
    } catch (error) {
        totalDecks.textContent = '--';
        cardsDue.textContent = '--';
        dayStreak.textContent = '--';
    }
}

document.addEventListener('DOMContentLoaded', init);

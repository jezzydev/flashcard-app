import * as auth from '../auth.js';
import { requireAuth } from '../auth-init.js';
import api from '../api.js';
import * as util from '../utils.js';

async function init() {
    const token = await requireAuth();

    if (!token) return;

    //load page content
    const params = new URLSearchParams(window.location.search);
    const deckId = params.get('id');

    if (!deckId) {
        window.location.href = 'dashboard.html';
        return;
    }

    await loadDeckInfo(deckId);
    await loadDeckStats(deckId);
    await loadDeckCards(deckId);
}

async function loadDeckInfo(deckId) {
    const breadcrumbText = document.querySelector('.Breadcrumb__text');
    const headerDeckName = document.querySelector('.DeckHeader__deckName');
    const headerDeckDesc = document.querySelector('.DeckHeader__deckDesc');

    try {
        const res = await api.get(`/api/decks/${deckId}`);

        if (!res.ok) {
            const resError = await res.json();

            console.error(
                resError.message || `HTTP Error! Status: ${res.status}`,
            );

            showPageError(resError.message);
            return;
        }

        const data = await res.json();
        breadcrumbText.textContent = data.name;
        headerDeckName.textContent = data.name;
        headerDeckDesc.textContent = data.description;

        document.querySelector('.Page__loading').hidden = true;
        document.querySelector('.Page__content').hidden = false;
    } catch (error) {
        console.error(`Fetch error: ${error}`);
        document.querySelector('.Page__loading').hidden = true;
        showPageError(
            'Something went wrong loading this deck. Check your connection and try again.',
        );
    }
}

async function loadDeckStats(deckId) {
    const totalCards = document.querySelector('.DeckStats__totalCards');
    const cardsDue = document.querySelector('.DeckStats__cardsDue');
    const retentionRate = document.querySelector('.DeckStats__retentionRate');
    const dayStreak = document.querySelector('.DeckStats__dayStreak');

    try {
        const res = await api.get(`/api/decks/${deckId}/stats`);

        if (!res.ok) {
            const resError = await res.json();
            console.error(
                resError.message || `HTTP Error! Status: ${res.status}`,
            );
            totalCards.textContent = '--';
            cardsDue.textContent = '--';
            retentionRate.textContent = '--';
            dayStreak.textContent = '--';
            return;
        }

        const data = await res.json();
        totalCards.textContent = data.stats.total_cards;
        cardsDue.textContent = data.stats.due_today;
        retentionRate.textContent = data.stats.retention_rate + '%';
        dayStreak.textContent = data.stats.streak;
    } catch (error) {
        console.error(`Fetch error: ${error}`);
        totalCards.textContent = '--';
        cardsDue.textContent = '--';
        retentionRate.textContent = '--';
        dayStreak.textContent = '--';
    }
}

async function loadDeckCards(deckId) {
    try {
        const res = await api.get(`/api/decks/${deckId}/cards`);

        if (!res.ok) {
            const resError = await res.json();
            console.error(
                resError.message || `HTTP Error! Status: ${res.status}`,
            );
            showCardsSectionError(resError.message);
            return;
        }

        const cards = await res.json();

        //render cards
        const cardsList = document.querySelector('.CardsList');
        const cardTemplate = await util.fetchTemplate(
            'templates.html',
            'card-template',
        );

        cards.forEach((card) => {
            const fragment = createCardItem(card, cardTemplate);
            cardsList.append(fragment);
        });
    } catch (error) {
        console.error(`Fetch error: ${error}`);
        showCardsSectionError(
            'Something went wrong loading the cards. Check your connection and try again.',
        );
    }
}

function createCardItem(card, template) {
    const fragment = template.content.cloneNode(true);
    const cardItem = fragment.querySelector('.CardItem');

    const question = cardItem.querySelector('.CardItem__title');
    question.textContent = card.front;

    const answer = cardItem.querySelector('.CardItem__sub');
    answer.textContent = card.back;

    return fragment;
}

function showPageError(msg) {
    document.querySelector('.Page__content').hidden = true;

    const pageError = document.getElementById('deck-page-error');
    pageError.hidden = false;

    const errorMsg = document.querySelector('.PageError__message');
    errorMsg.textContent = msg;
}

function showCardsSectionError(msg) {
    const cardsList = document.querySelector('.CardsList');
    const div = document.createElement('div');
    const cardsError = document.createElement('p');
    cardsError.classList.add('CardList__error');
    cardsError.textContent = msg;
    div.append(cardsError);
    cardsList.innerHTML = '';
    cardsList.append(div);
}

await init();

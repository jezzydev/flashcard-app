import { requireAuth } from '../auth-init.js';
import api from '../api.js';
import * as util from '../utils.js';

let deckId;
let cardsToStudy = [];
let studySessionId = -1;

async function init() {
    const token = await requireAuth();

    if (!token) return;

    deckId = parseInt(
        new URLSearchParams(window.location.search).get('deckId'),
        10,
    );

    if (!deckId) {
        window.location.href = 'dashboard.html';
        return;
    }

    //load page content
    setupBackToDeckLinks(deckId);
    await loadDeckInfo(deckId);
    await loadDeckStats(deckId);
    await loadDueCards(deckId);
    await startStudySession(deckId);
}

async function loadDeckInfo(id) {
    const breadcrumbDeckName = document.querySelector('.Breadcrumb__deckName');
    const flashcardDeckLabel = document.querySelector('.Flashcard__deckLabel');

    try {
        const res = await api.get(`/api/decks/${id}`);

        if (!res.ok) {
            const resError = await res.json();
            console.error(
                resError.message || `HTTP Error! Status: ${res.status}`,
            );

            showPageError(resError.message);
            return;
        }

        const data = await res.json();
        breadcrumbDeckName.textContent = data.name;
        flashcardDeckLabel.textContent = data.name;

        document.querySelector('.Page__loading').hidden = true;
        document.querySelector('.Page__content').hidden = false;
    } catch (error) {
        console.error(`Fetch error: ${error}`);
        document.querySelector('.Page__loading').hidden = true;
        showPageError(
            'Something went wrong loading info for this deck. Check your connection and try again.',
        );
    }
}

async function loadDeckStats(id) {
    //Deck Overview
    const totalCards = document.querySelector(
        '.DeckStatsPanel .DeckStats__totalCards',
    );
    const cardsDue = document.querySelector(
        '.DeckStatsPanel .DeckStats__cardsDue',
    );
    const retentionRate = document.querySelector(
        '.DeckStatsPanel .DeckStats__retentionRate',
    );

    //Session Stats
    const totalDue = document.querySelector(
        '.SessionStatsPanel .SessionStats__totalDue',
    );
    const dayStreak = document.querySelector(
        '.SessionStatsPanel .SessionStats__dayStreak',
    );

    try {
        const res = await api.get(`/api/decks/${id}/stats`);

        if (!res.ok) {
            const resError = await res.json();
            console.error(
                resError.message || `HTTP Error! Status: ${res.status}`,
            );

            totalCards.textContent = '--';
            cardsDue.textContent = '--';
            retentionRate.textContent = '--';
            progressTotal.textContent = '0';
            totalDue.textContent = '0';
            dayStreak.textContent = '0';
            return;
        }

        const data = await res.json();
        totalCards.textContent = data.stats.total_cards;
        cardsDue.textContent = data.stats.due_today;
        retentionRate.textContent = data.stats.retention_rate + '%';
        totalDue.textContent = data.stats.due_today;
        dayStreak.textContent = data.stats.streak;
    } catch (error) {
        console.error(`Fetch error: ${error}`);
        totalCards.textContent = '--';
        cardsDue.textContent = '--';
        retentionRate.textContent = '--';
        totalDue.textContent = '0';
        dayStreak.textContent = '0';
    }
}

async function loadDueCards(id) {
    try {
        const res = await api.get(`/api/decks/${id}/study`);

        if (!res.ok) {
            const resError = await res.json();
            console.error(
                resError.message || `HTTP Error! Status: ${res.status}`,
            );

            showFlashcardSectionMsg(resError.message, true);
            return;
        }

        cardsToStudy = await res.json();

        //Progress
        const progressTotal = document.querySelector(
            '.StudyProgressCount__totalDueCount',
        );
        progressTotal.textContent = cardsToStudy.length;

        loadNextQuestion(cardsToStudy);
    } catch (error) {
        console.error(`Fetch error: ${error}`);
        showFlashcardSectionMsg(
            'Something went wrong while loading cards. Check your connection or try again later.',
            true,
        );
    }
}

function loadNextQuestion(cards) {
    const next = cards.find((c) => c.rating === undefined);
    if (next) {
        loadCardDetails(next);
        showQuestionFace();

        document.querySelector('.Flashcard').hidden = false;
        document.querySelector('.Flashcard__sectionMsg').hidden = true;
        enableAnswerButton();
    } else {
        //nothing to review
        document.querySelector('.Flashcard').hidden = true;
        showFlashcardSectionMsg('No cards due today');
        disableAnswerButton();
        disableRatingbuttons();
        showSessionComplete();
    }
}

function loadCardDetails(card) {
    const flashcard = document.querySelector('.Flashcard');
    const question = document.querySelector('.Flashcard__question');
    flashcard.dataset.cardId = card.id;
    question.textContent = card.front;

    const answer = document.querySelector('.Flashcard__answer');
    answer.textContent = card.back;
}

function showQuestionFace() {
    const flashcard = document.querySelector('.Flashcard');
    flashcard.classList.remove('Flashcard--answerFace');
    flashcard.classList.add('Flashcard--questionFace');

    const ratingsCont = document.querySelector('.RatingsContainer');
    ratingsCont.classList.remove('show');
}

function showAnswerFace() {
    const flashcard = document.querySelector('.Flashcard');
    flashcard.classList.remove('Flashcard--questionFace');
    flashcard.classList.add('Flashcard--answerFace');

    const ratingsCont = document.querySelector('.RatingsContainer');
    ratingsCont.classList.add('show');
}

function showSessionComplete() {
    const panel = document.querySelector('.SessionCompletePanel');
    panel.classList.add('show');
}

async function startStudySession(id) {
    try {
        const res = await api.post('/api/study/sessions', {
            deck_id: id,
        });

        if (!res.ok) {
            const resError = await res.json();
            console.error(
                resError.message || `HTTP Error! Status: ${res.status}`,
            );

            showPageError(resError.message);
            return;
        }

        const data = await res.json();
        studySessionId = data.study_session.id;
    } catch (error) {
        console.error(`Fetch error: ${error}`);
        showPageError(
            'Something went wrong starting the study session. Check your connection or try again later.',
        );
    }
}

function setupBackToDeckLinks(id) {
    const links = document.querySelectorAll('.Link__backToDeck');
    links.forEach((l) => (l.href = `deck.html?id=${id}`));
}

function showPageError(msg) {
    document.querySelector('.Page__content').hidden = true;

    const pageError = document.getElementById('study-page-error');
    pageError.hidden = false;

    const errorMsg = document.querySelector('.PageError__message');
    errorMsg.textContent = msg;
}

function showFlashcardSectionMsg(msg, isError = false) {
    const flashcard = document.querySelector('.Flashcard');
    flashcard.style.display = 'none';

    const section = document.querySelector('.Flashcard__sectionMsg');
    const sectionMsg = document.querySelector(
        '.Flashcard__sectionMsg .SectionMsg__message',
    );

    sectionMsg.textContent = msg;
    section.classList.add('show');

    if (isError) section.classList.add('error');
}

function disableAnswerButton() {
    const cont = document.querySelector('.Answer__showAnswerBtn');
    cont.disabled = true;
}

function enableAnswerButton() {
    const cont = document.querySelector('.Answer__showAnswerBtn');
    cont.disabled = false;
}

function disableRatingbuttons() {
    const buttons = document.querySelectorAll('.RatingBtn');
    buttons.forEach((b) => (b.disabled = true));
}

//Answer and Rating buttons handlers
const answerBtn = document.getElementById('show-answer-btn');
answerBtn.addEventListener('click', (e) => {
    e.preventDefault();
    showAnswerFace();
    e.currentTarget.disabled = true;
});

const ratingButtons = document.querySelectorAll('.RatingBtn');
ratingButtons.forEach((b) =>
    b.addEventListener('click', async (e) => {
        e.preventDefault();

        const rating = parseInt(e.currentTarget.dataset.rating);
        const cardId = parseInt(
            document.querySelector('.Flashcard').dataset.cardId,
        );

        const card = cardsToStudy.find((c) => c.id === cardId);
        card.rating = rating;

        const cardsReviewed = cardsToStudy.filter(
            (c) => c.rating !== undefined,
        );

        try {
            const res = await api.post(
                `/api/study/sessions/${studySessionId}/review`,
                {
                    card_id: cardId,
                    rating: rating,
                },
            );

            if (!res.ok) {
                const resError = await res.json();
                console.error(
                    resError.message || `HTTP Error! Status: ${res.status}`,
                );

                showFlashcardSectionMsg(resError.message, true);
                return;
            }

            updateProgressAndStats(
                rating,
                cardsReviewed.length,
                cardsReviewed.filter((c) => c.rating >= 3).length,
                cardsToStudy.length,
            );

            loadNextQuestion(cardsToStudy);
        } catch (error) {
            console.error(`Fetch error: ${error}`);
            showFlashcardSectionMsg(
                'Something went wrong rating the cards. Check your connection and try again.',
            );
        }
    }),
);

function updateProgressAndStats(rating, reviewedCnt, correctCnt, totalDue) {
    //Progress Bar
    const progressCurrent = document.querySelector(
        '.StudyProgressCount__currentCount',
    );
    progressCurrent.textContent = reviewedCnt;

    const progressFill = document.querySelector('.StudyProgressBar__fill');
    progressFill.style.width = `${(reviewedCnt / totalDue) * 100}%`;

    //Session Stats
    const reviewedCount = document.querySelector(
        '.SessionStats__reviewedCount',
    );
    reviewedCount.textContent = reviewedCnt;

    const correctStat = document.querySelector('.SessionStats__correctCount');
    correctStat.textContent = correctCnt;

    //Rating breakdown
    let br = 'easy';
    if (rating === 0) br = 'again';
    else if (rating === 2) br = 'hard';
    else if (rating === 4) br = 'good';

    const brCount = document.querySelector(
        `#breakdown-${br} .Breakdown__count`,
    );
    brCount.textContent = parseInt(brCount.textContent) + 1;

    const brRows = document.querySelectorAll('.Breakdown__row');
    brRows.forEach((row) => {
        const cnt = parseInt(
            row.querySelector('.Breakdown__count').textContent,
        );
        const fill = row.querySelector('.Breakdown__barFill');
        const w = ((cnt / reviewedCnt) * 100).toFixed(0);
        fill.style.width = `${w}%`;
    });
}

//Logout
const logoutBtn = document.querySelector('.Logout');
logoutBtn.addEventListener('click', async (e) => {
    try {
        e.preventDefault();
        await api.logout();
        window.location.replace('index.html');
        return;
    } catch (error) {
        console.error(`Fetch error: ${error}`);
        showPageError('Error while logging out.');
    }
});

await init();

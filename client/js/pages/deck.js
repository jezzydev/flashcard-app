import { requireAuth } from '../auth-init.js';
import api from '../api.js';
import * as util from '../utils.js';

let deckId;

async function init() {
    const token = await requireAuth();

    if (!token) return;

    deckId = parseInt(
        new URLSearchParams(window.location.search).get('id'),
        10,
    );

    if (!deckId) {
        window.location.href = 'dashboard.html';
        return;
    }

    //load page content
    await loadDeckInfo(deckId);
    await loadDeckStats(deckId);
    await loadDeckCards(deckId);

    const studyBtn = document.querySelector('.Deck__studyBtn');
    studyBtn.href = `study.html/deckId=${deckId}`;
    studyBtn.addEventListener('click', (e) => {
        e.preventDefault();
        window.location.href = `study.html?deckId=${deckId}`;
    });

    const totalCards = parseInt(
        document.querySelector('.DeckStats__totalCards').textContent,
        10,
    );

    const cardsDue = parseInt(
        document.querySelector('.DeckStats__cardsDue').textContent,
        10,
    );

    if (
        isNaN(totalCards) ||
        totalCards === 0 ||
        isNaN(cardsDue) ||
        cardsDue === 0
    ) {
        studyBtn.setAttribute('aria-disabled', true);
        studyBtn.classList.add('disabled');
    }
}

async function loadDeckInfo(id) {
    const breadcrumbDeckName = document.querySelector('.Breadcrumb__deckName');
    const headerDeckName = document.querySelector('.DeckHeader__deckName');
    const headerDeckDesc = document.querySelector('.DeckHeader__deckDesc');

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

async function loadDeckStats(id) {
    const totalCards = document.querySelector('.DeckStats__totalCards');
    const cardsDue = document.querySelector('.DeckStats__cardsDue');
    const retentionRate = document.querySelector('.DeckStats__retentionRate');
    const dayStreak = document.querySelector('.DeckStats__dayStreak');

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

async function loadDeckCards(id) {
    try {
        const res = await api.get(`/api/decks/${id}/cards`);

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
        const cardsCount = document.querySelector('.Cards__count');
        const cardTemplate = await util.fetchTemplate(
            'templates.html',
            'card-template',
        );

        cardsCount.textContent = `${cards.length} CARDS`;
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

    cardItem.dataset.id = card.id;

    const question = cardItem.querySelector('.CardItem__title');
    question.textContent = card.front;

    const answer = cardItem.querySelector('.CardItem__sub');
    answer.textContent = card.back;

    //ease bar
    const percent = calcEasePercent(card.ease_factor);
    const easeFill = cardItem.querySelector('.EaseBar__fill');
    easeFill.style.width = `${percent}%`;
    const easeLabel = cardItem.querySelector('.EaseBar__label');
    easeLabel.textContent = `EF ${Number(card.ease_factor).toFixed(1)}`;

    //reps and interval
    const repInt = cardItem.querySelector('.Meta__repInt');
    repInt.textContent = `Rep ${card.repetitions} - Int ${card.interval}d`;

    //due info
    const dueInfo = cardItem.querySelector('.CardItem__dueInfo');
    const diff = calcDueInfo(card.due_date);

    if (diff <= 0) {
        dueInfo.textContent = 'Due today';
        dueInfo.classList.add('High');
    } else if (diff === 1) {
        dueInfo.textContent = 'Due tomorrow';
        dueInfo.classList.add('Med');
    } else {
        dueInfo.textContent = `Due in ${diff} days`;
        if (diff >= 2 && diff <= 5) {
            dueInfo.classList.add('Med');
        } else {
            dueInfo.classList.add('Low');
        }
    }

    //card menu
    const menuBtn = cardItem.querySelector('.CardItem__menuBtn');
    menuBtn.addEventListener('click', (e) => {
        //prevent click from immediately  bubbling to the document
        e.stopPropagation();

        const menu = cardItem.querySelector('.DropdownMenu');

        //close all other open menus first
        document.querySelectorAll('.DropdownMenu.Open').forEach((m) => {
            if (m !== menu) m.classList.remove('Open');
        });

        menu.classList.toggle('Open');
    });

    //edit btn
    const editBtn = cardItem.querySelector('.DropdownItem--editBtn');
    editBtn.addEventListener('click', () => {
        closeDropdownMenu(cardItem);
        openEditCardModal(cardItem);
    });

    //delete btn
    const deleteBtn = cardItem.querySelector('.DropdownItem--deleteBtn');
    deleteBtn.addEventListener('click', () => {
        closeDropdownMenu(cardItem);
        openDeleteCardModal(cardItem);
    });

    return fragment;
}

function calcEasePercent(easeFactor) {
    const MIN_EASE = 1.3;
    const DISPLAY_MAX = 3.5; //cap only for the bar display

    return Math.min(
        ((easeFactor - MIN_EASE) / (DISPLAY_MAX - MIN_EASE)) * 100,
        100,
    );
}

function calcDueInfo(dueDate) {
    const date = new Date(dueDate);
    date.setHours(0, 0, 0, 0);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return (date.getTime() - today.getTime()) / 86_400_000;
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

function closeDropdownMenu(card) {
    const menu = card.querySelector('.DropdownMenu');
    menu.classList.remove('Open');
}

//Add Card
const addCardSubmitBtn = document.getElementById('add-card-submit-btn');
addCardSubmitBtn.addEventListener('click', async (e) => {
    e.preventDefault();

    const addCardQuestion = document.getElementById('add-card-front');
    const addCardQuestionError = document.getElementById(
        'add-card-front-error',
    );
    const addCardAnswer = document.getElementById('add-card-back');
    const addCardAnswerError = document.getElementById('add-card-back-error');

    const formError = document.getElementById('add-card-form-error');

    const isValidQuestion = validateQuestion(
        addCardQuestion,
        addCardQuestionError,
    );
    const isValidAnswer = validateAnswer(addCardAnswer, addCardAnswerError);

    if (isValidQuestion && isValidAnswer) {
        try {
            const res = await api.post(`/api/decks/${deckId}/cards`, {
                front: addCardQuestion.value,
                back: addCardAnswer.value,
            });

            if (!res.ok) {
                const resError = await res.json();
                formError.textContent = res.message;
                formError.classList.add('show');
                return;
            }

            clearAddCardFields();
            await loadDeckStats(deckId);
            clearCards();
            await loadDeckCards(deckId);
        } catch (error) {
            console.error(`Fetch error: ${error}`);
            formError.textContent = 'Failed to create card.';
            formError.classList.add('show');
        }
    }
});

function clearAddCardFields() {
    const addCardQuestion = document.getElementById('add-card-front');
    addCardQuestion.value = '';
    addCardQuestion.classList.remove('isSuccess', 'isError');

    const addCardQuestionError = document.getElementById(
        'add-card-front-error',
    );
    addCardQuestionError.textContent = '';
    addCardQuestionError.classList.remove('show');

    const addCardAnswer = document.getElementById('add-card-back');
    addCardAnswer.value = '';
    addCardAnswer.classList.remove('isSuccess', 'isError');

    const addCardAnswerError = document.getElementById('add-card-back-error');
    addCardAnswerError.textContent = '';
    addCardAnswerError.classList.remove('show');

    const formError = document.getElementById('add-card-form-error');
    formError.textContent = '';
    formError.classList.remove('show');
}

//Edit Card Modal
const editCardSubmitBtn = document.getElementById('edit-card-submit-btn');

editCardSubmitBtn.addEventListener('click', async (e) => {
    e.preventDefault();

    const editCardId = document.getElementById('edit-card-id');
    const editCardQuestion = document.getElementById('edit-card-front');
    const editCardQuestionError = document.getElementById(
        'edit-card-front-error',
    );
    const editCardAnswer = document.getElementById('edit-card-back');
    const editCardAnswerError = document.getElementById('edit-card-back-error');

    const isValidQuestion = validateQuestion(
        editCardQuestion,
        editCardQuestionError,
    );
    const isValidAnswer = validateAnswer(editCardAnswer, editCardAnswerError);

    if (isValidQuestion && isValidAnswer) {
        try {
            const res = await api.put(`/api/cards/${editCardId.value}`, {
                front: editCardQuestion.value,
                back: editCardAnswer.value,
            });

            if (!res.ok) {
                const resError = await res.json();
                const formError = document.getElementById(
                    'edit-card-form-error',
                );
                formError.textContent = resError.message;
                formError.classList.add('show');
                return;
            }

            //close modal and reload cards list
            util.closeParentModal(editCardSubmitBtn);

            clearCards();
            await loadDeckCards(deckId);
        } catch (error) {
            console.error(`Fetch Error: ${error}`);
            formError.textContent = 'Failed to edit card.';
            formError.classList.add('show');
        }
    }
});

function openEditCardModal(card) {
    const question = card.querySelector('.CardItem__title');
    const answer = card.querySelector('.CardItem__sub');

    const editCardId = document.getElementById('edit-card-id');
    editCardId.value = card.dataset.id;

    const editCardQuestion = document.getElementById('edit-card-front');
    editCardQuestion.value = question.textContent;
    editCardQuestion.classList.remove('isSuccess', 'isError');

    const editCardQuestionError = document.getElementById(
        'edit-card-front-error',
    );
    editCardQuestionError.textContent = '';
    editCardQuestionError.classList.remove('show');

    const editCardAnswer = document.getElementById('edit-card-back');
    editCardAnswer.value = answer.textContent;
    editCardAnswer.classList.remove('isSuccess', 'isError');

    const editCardAnswerError = document.getElementById('edit-card-back-error');
    editCardAnswerError.textContent = '';
    editCardAnswerError.classList.remove('show');

    const formError = document.getElementById('edit-card-form-error');
    formError.textContent = '';
    formError.classList.remove('show');

    editCardQuestion.focus();

    const editModal = document.getElementById('edit-modal');
    editModal.classList.add('Open');
}

//Delete Card Modal
const deleteCardConfBtn = document.getElementById(
    'delete-card-conf-delete-btn',
);

deleteCardConfBtn.addEventListener('click', async (e) => {
    e.preventDefault();

    const deleteCardId = document.getElementById('delete-card-id');
    const deleteCardError = document.getElementById('delete-card-error');

    try {
        const res = await api.delete(`/api/cards/${deleteCardId.value}`);

        if (!res.ok) {
            const resError = await res.json();
            deleteCardError.textContent = resError.message;
            deleteCardError.classList.add('show');
            return;
        }

        //close modal and reload decks list
        util.closeParentModal(deleteCardConfBtn);

        await loadDeckStats(deckId);
        clearCards();
        await loadDeckCards(deckId);
    } catch (error) {
        console.error(`Fetch error: ${error}`);
        deleteCardError.textContent = 'Failed to delete card.';
        deleteCardError.classList.add('show');
    }
});

function openDeleteCardModal(card) {
    const deleteCardId = document.getElementById('delete-card-id');
    const deleteCardError = document.getElementById('delete-card-error');

    deleteCardId.value = card.dataset.id;
    deleteCardError.textContent = '';
    deleteCardError.classList.remove('show');

    const deleteModal = document.getElementById('delete-modal');
    deleteModal.classList.add('Open');
}

function validateQuestion(input, error) {
    if (!input.value) {
        util.showErrorMsg(input, error, 'Question is required.');
        return false;
    }

    util.clearErrorMsg(input, error);
    input.classList.add('isSuccess');
    return true;
}

function validateAnswer(input, error) {
    if (!input.value) {
        util.showErrorMsg(input, error, 'Answer is required.');
        return false;
    }

    util.clearErrorMsg(input, error);
    input.classList.add('isSuccess');
    return true;
}

function clearCards() {
    const cards = document.querySelectorAll('.CardItem');
    cards.forEach((c) => c.remove());
}

//Modal close and cancel buttons
const modalCancelButtons = document.querySelectorAll(
    '.Modal__overlay .Btn--cancel',
);
util.triggerCloseModal(modalCancelButtons);

const modalCloseButtons = document.querySelectorAll('.Modal__closeBtn');
util.triggerCloseModal(modalCloseButtons);

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

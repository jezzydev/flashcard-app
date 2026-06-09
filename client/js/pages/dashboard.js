import * as auth from '../auth.js';
import api from '../api.js';
import * as util from '../utils.js';

async function init() {
    document.body.style.visibility = 'hidden';

    if (!auth.isLoggedIn()) {
        const newToken = await api.tryRefresh();
        if (!newToken) {
            window.location.replace('./index.html');
            return;
        }

        auth.setAccessToken(newToken);
    }

    //load page content
    document.body.style.visibility = 'visible';
    const user = util.extractUserData(auth.getAccessToken());
    const username = document.querySelector('.Header__username');
    username.textContent = user.name;

    //update stats
    await updateStats();

    //load decks
    await loadDecks();
}

async function loadDecks() {
    try {
        const res = await api.get('/api/decks');

        if (!res.ok) {
            const resError = await res.json();
            console.error(
                resError.message || `HTTP Error! Status: ${res.status}`,
            );
            showDecksError();
            return;
        }

        const decks = await res.json();

        //render decks
        const addDeck = document.querySelector('.DeckCard--addDeck');
        const response = await fetch('templates.html');
        const htmlText = await response.text();
        const parser = new DOMParser();
        const doc = parser.parseFromString(htmlText, 'text/html');
        const deckCardTemplate = doc.getElementById('deck-card-template');

        decks.forEach((deck) => {
            const fragment = createDeckCardItem(deck, deckCardTemplate);
            //add each deck before the addDeck card
            addDeck.before(fragment);
        });

        document.addEventListener('click', (e) => {
            if (!e.target.closest('.CardItem')) {
                document.querySelectorAll('.DropdownMenu.Open').forEach((m) => {
                    m.classList.remove('Open');
                });
            }
        });
    } catch (error) {
        console.error(`Fetch error: ${error}`);
        showDecksError();
    }
}

function createDeckCardItem(deck, template) {
    const fragment = template.content.cloneNode(true);
    const card = fragment.querySelector('.CardItem');
    card.dataset.id = deck.id;

    const link = card.querySelector('a.DeckCardLink');
    link.href = `deck.html?id=${deck.id}`;

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

    const menuBtn = card.querySelector('.CardItem__menuBtn');
    menuBtn.addEventListener('click', (e) => {
        //prevent click from immediately  bubbling to the document
        e.stopPropagation();

        const menu = card.querySelector('.DropdownMenu');

        //close all other open menus first
        document.querySelectorAll('.DropdownMenu.Open').forEach((m) => {
            if (m !== menu) m.classList.remove('Open');
        });

        menu.classList.toggle('Open');
    });

    const editBtn = card.querySelector('.DropdownItem--editBtn');
    editBtn.addEventListener('click', () => {
        closeDropdownMenu(card);
        openEditDeckModal(card);
    });

    const deleteBtn = card.querySelector('.DropdownItem--deleteBtn');
    deleteBtn.addEventListener('click', () => {
        closeDropdownMenu(card);
        openDeleteDeckModal(card);
    });

    return fragment;
}

function clearDecks() {
    const decks = document.querySelectorAll('.DeckGrid .DeckCard');
    decks.forEach((li) => li.remove());
}

function showDecksError() {
    const deckGrid = document.querySelector('.DeckGrid');
    const deckError = document.createElement('p');
    deckError.classList.add('CardList__error');
    deckError.textContent = 'Failed to load decks.';
    deckGrid.before(deckError);
}

async function updateStats() {
    const totalDecks = document.querySelector('.DashboardStats__totalDecks');
    const cardsDue = document.querySelector('.DashboardStats__cardsDue');
    const dayStreak = document.querySelector('.DashboardStats__dayStreak');

    try {
        const res = await api.get('/api/decks/stats');

        if (!res.ok) {
            const resError = await res.json();
            console.error(
                resError.message || `HTTP Error! Status: ${res.status}`,
            );
            totalDecks.textContent = '--';
            cardsDue.textContent = '--';
            dayStreak.textContent = '--';
            return;
        }

        const data = await res.json();
        totalDecks.textContent = data.stats.total_decks;
        cardsDue.textContent = data.stats.due_today;
        dayStreak.textContent = data.stats.streak;
    } catch (error) {
        console.error(`Fetch error: ${error}`);
        totalDecks.textContent = '--';
        cardsDue.textContent = '--';
        dayStreak.textContent = '--';
    }
}

//Add Deck Modal
const addDeckCardBtn = document.querySelector('.DeckCard__addDeckBtn');
const addDeckBtn = document.getElementById('add-deck-btn');
const addDeckSubmitBtn = document.getElementById('add-deck-submit-btn');
addDeckCardBtn.addEventListener('click', openAddDeckModal);
addDeckBtn.addEventListener('click', openAddDeckModal);

addDeckSubmitBtn.addEventListener('click', async (e) => {
    e.preventDefault();

    const addDeckName = document.getElementById('add-deck-name');
    const addDeckNameError = document.getElementById('add-deck-name-error');
    const addDeckDesc = document.getElementById('add-deck-description');
    const description = addDeckDesc.value || undefined;

    const isValidDeckName = validateDeckName(addDeckName, addDeckNameError);

    //submit form
    if (isValidDeckName) {
        try {
            const res = await api.post('/api/decks', {
                name: addDeckName.value,
                ...(description !== undefined && { description }),
            });

            if (!res.ok) {
                const resError = await res.json();
                addDeckNameError.textContent = resError.message;
                addDeckNameError.classList.add('show');
                return;
            }

            //close modal and reload decks list
            closeModalParent(addDeckSubmitBtn);

            await updateStats();
            clearDecks();
            await loadDecks();
        } catch (error) {
            console.error(`Fetch error: ${error}`);
            addDeckNameError.textContent = 'Failed to create deck.';
            addDeckNameError.classList.add('show');
        }
    }
});

function openAddDeckModal() {
    const addDeckName = document.getElementById('add-deck-name');
    const addDeckNameError = document.getElementById('add-deck-name-error');
    const addDeckDesc = document.getElementById('add-deck-description');

    addDeckName.value = '';
    addDeckDesc.value = '';
    addDeckNameError.textContent = '';
    addDeckNameError.classList.remove('show');
    addDeckName.focus();

    const addModal = document.getElementById('add-modal');
    addModal.classList.add('Open');
}

//Edit Deck Modal
const editDeckSubmitBtn = document.getElementById('edit-deck-submit-btn');

editDeckSubmitBtn.addEventListener('click', async (e) => {
    e.preventDefault();

    const editDeckId = document.getElementById('edit-deck-id');
    const editDeckName = document.getElementById('edit-deck-name');
    const editDeckNameError = document.getElementById('edit-deck-name-error');
    const editDeckDesc = document.getElementById('edit-deck-description');

    const isValidDeckName = validateDeckName(editDeckName, editDeckNameError);

    if (isValidDeckName) {
        try {
            const res = await api.put(`/api/decks/${editDeckId.value}`, {
                name: editDeckName.value,
                description: editDeckDesc.value,
            });

            if (!res.ok) {
                const resError = await res.json();
                editDeckNameError.textContent = resError.message;
                editDeckNameError.classList.add('show');
                return;
            }

            //close modal and reload decks list
            closeModalParent(editDeckSubmitBtn);

            await updateStats();
            clearDecks();
            await loadDecks();
        } catch (error) {
            console.error(`Fetch error: ${error}`);
            editDeckNameError.textContent = 'Failed to edit deck.';
            editDeckNameError.classList.add('show');
        }
    }
});

function openEditDeckModal(card) {
    const editDeckId = document.getElementById('edit-deck-id');
    const editDeckName = document.getElementById('edit-deck-name');
    const editDeckNameError = document.getElementById('edit-deck-name-error');
    const editDeckDesc = document.getElementById('edit-deck-description');

    const name = card.querySelector('.CardItem__title');
    const desc = card.querySelector('.CardItem__sub');

    editDeckId.value = card.dataset.id;
    editDeckName.value = name.textContent;
    editDeckDesc.value = desc.textContent;
    editDeckNameError.textContent = '';
    editDeckNameError.classList.remove('show');
    editDeckName.focus();

    const editModal = document.getElementById('edit-modal');
    editModal.classList.add('Open');
}

//Delete Deck Model
const deleteDeckConfBtn = document.getElementById('confirm-delete-deck-btn');
deleteDeckConfBtn.addEventListener('click', async (e) => {
    e.preventDefault();

    const deleteDeckId = document.getElementById('delete-deck-id');

    try {
        const res = await api.delete(`/api/decks/${deleteDeckId.value}`);

        if (!res.ok) {
            const resError = await res.json();
            const deleteDeckError =
                document.getElementById('delete-deck-error');
            deleteDeckError.textContent = resError.message;
            deleteDeckError.classList.add('show');
            return;
        }

        //close modal and reload decks list
        closeModalParent(deleteDeckConfBtn);

        await updateStats();
        clearDecks();
        await loadDecks();
    } catch (error) {
        const deleteDeckError = document.getElementById('delete-deck-error');
        console.error(`Fetch error: ${error}`);
        deleteDeckError.textContent = 'Failed to delete deck.';
        deleteDeckError.classList.add('show');
    }
});

function openDeleteDeckModal(card) {
    const deleteDeckid = document.getElementById('delete-deck-id');
    const deleteDeckError = document.getElementById('delete-deck-error');

    deleteDeckid.value = card.dataset.id;
    deleteDeckError.textContent = '';
    deleteDeckError.classList.remove('show');

    const deleteModal = document.getElementById('delete-modal');
    deleteModal.classList.add('Open');
}

function closeModalParent(elem) {
    const modal = elem.closest('.Modal__overlay');
    modal.classList.remove('Open');
}

function closeDropdownMenu(card) {
    const menu = card.querySelector('.DropdownMenu');
    menu.classList.remove('Open');
}

function validateDeckName(input, error) {
    if (!input.value) {
        util.showErrorMsg(input, error, 'Deck name is required.');
        return false;
    }

    let name = input.value.trim();
    if (name.length < 1 || name.length > 255) {
        util.showErrorMsg(input, error, 'Deck name must be 1-255 characters.');
        return false;
    }

    util.clearErrorMsg(input, error);
    input.classList.add('isSuccess');
    return true;
}

//Modal close and cancel buttons
const modalCancelButtons = document.querySelectorAll(
    '.Modal__overlay .Btn--cancel',
);
const modalCloseButtons = document.querySelectorAll('.Modal__closeBtn');

modalCancelButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
        closeModalParent(btn);
    });
});

modalCloseButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
        closeModalParent(btn);
    });
});

await init();

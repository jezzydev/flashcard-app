export const calculateNextReview = (card, rating) => {
    // Simplified SM-2 implementation
    // rating: 0=complete blackout, 1=incorrect, 2=incorrect but familiar,
    // 3=correct with difficulty, 4=correct, 5=perfect
    if (rating < 3) {
        //Failed - reset interval
        card.interval = 1;
        card.repetitions = 0;
    } else {
        //Passed
        if (card.repetitions === 0) card.interval = 1;
        else if (card.repetitions === 1) card.interval = 6;
        else card.interval = Math.round(card.interval * card.ease_factor);
        card.repetitions += 1;
    }

    //Update ease factor (min 1.3)
    card.ease_factor = Math.max(
        1.3,
        card.ease_factor + 0.1 - (5 - rating) * (0.08 + (5 - rating) * 0.02),
    );
    const date = new Date();
    date.setDate(date.getDate() + card.interval);
    card.due_date = date;
    return card;
};

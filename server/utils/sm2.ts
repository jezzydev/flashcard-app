import { Card } from '../types/index.js';

export const calculateNextReview = (
    card: Card,
    rating: 0 | 1 | 2 | 3 | 4 | 5,
): {
    interval: number;
    easeFactor: number;
    repetitions: number;
    dueDate: Date;
} => {
    const nextReview = {
        interval: card.interval,
        easeFactor: card.easeFactor,
        repetitions: card.repetitions,
        dueDate: card.dueDate,
    };

    // Simplified SM-2 implementation
    // rating: 0=complete blackout, 1=incorrect, 2=incorrect but familiar,
    // 3=correct with difficulty, 4=correct, 5=perfect

    //Failed - reset interval
    if (rating < 3) {
        nextReview.interval = 1;
        nextReview.repetitions = 0;
    } else {
        //Passed
        if (card.repetitions === 0) nextReview.interval = 1;
        else if (card.repetitions === 1) nextReview.interval = 6;
        else nextReview.interval = Math.round(card.interval * card.easeFactor);

        nextReview.repetitions += 1;
    }

    //Update ease factor (min 1.3)
    nextReview.easeFactor = Math.max(
        1.3,
        card.easeFactor +
            0.1 -
            (5 - rating) * Number((0.08 + (5 - rating) * 0.02).toFixed(1)),
    );

    const date = new Date();
    date.setDate(date.getDate() + nextReview.interval);
    nextReview.dueDate = date;

    return nextReview;
};

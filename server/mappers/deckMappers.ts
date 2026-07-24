import {
    RawDeckStats,
    DeckStats,
    RawDeckSummary,
    DeckSummary,
    RawUserStats,
    UserStats,
} from '../types/index.js';

export function toDeckStats(row: RawDeckStats): DeckStats {
    return {
        totalCards: Number(row.totalCards),
        dueToday: Number(row.dueToday),
        retentionRate: Number(row.retentionRate),
        streak: 0,
    };
}

export function toDeckSummary(row: RawDeckSummary): DeckSummary {
    return {
        ...row,
        totalCards: Number(row.totalCards),
        dueToday: Number(row.dueToday),
    };
}

export function toUserStats(row: RawUserStats): UserStats {
    return {
        userId: row.userId,
        totalDecks: Number(row.totalDecks),
        dueToday: Number(row.dueToday),
        streak: 0,
    };
}

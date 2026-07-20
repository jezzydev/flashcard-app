import { JwtPayload } from 'jsonwebtoken';

// ---- User ----
export interface User {
    id: number;
    email: string;
    passwordHash: string;
    name: string;
    tokenVersion: number;
    createdAt: Date;
}
export type CreateUser = Pick<User, 'name' | 'email'> & { password: string };
export type LoginUser = Pick<User, 'email'> & { password: string };
export type UserTokenVersion = Pick<User, 'id' | 'email' | 'tokenVersion'>;
export type BasicUserInfo = Pick<User, 'id' | 'name' | 'email'>;

// ---- Deck ----
export interface Deck {
    id: number;
    userId: number;
    name: string;
    description: string;
    createdAt: Date;
}

// ---- Card ----
export interface Card {
    id: number;
    deckId: number;
    front: string;
    back: string;
    interval: number;
    easeFactor: number;
    repetitions: number;
    dueDate: Date;
    createdAt: Date;
}

// ---- Study Sessions ----
export interface StudySession {
    id: number;
    userId: number;
    deckId: number;
    startedAt: Date;
    completedAt: Date;
    cardsReviewed: number;
    cardsCorrect: number;
}

export interface SessionReview {
    id: number;
    sessionId: number;
    cardId: number;
    rating: 0 | 1 | 2 | 3 | 4 | 5;
    reviewedAt: Date;
}

// ---- Auth ----
export interface RefreshToken {
    id: number;
    userId: number;
    tokenHash: string;
    createdAt: Date;
    expiresAt: Date;
    revokedAt: Date;
}

declare module 'jsonwebtoken' {
    export interface JwtPayload {
        email?: string;
        name?: string;
        tokenVersion?: number;
    }
}

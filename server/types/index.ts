import { Jwt, JwtPayload } from 'jsonwebtoken';
import { Request } from 'express';

export interface AuthenticatedRequest extends Request {
    user: AuthPayload;
}

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
export type UserBasicInfo = Pick<User, 'id' | 'email' | 'name'>;
export interface UserStats {
    totalDecks: number;
    dueToday: number;
    streak: number;
}

// ---- Deck ----
export interface Deck {
    id: number;
    userId: number;
    name: string;
    description: string;
    createdAt: Date;
}
export type CreateDeck = Pick<Deck, 'name'> &
    Partial<Pick<Deck, 'description'>>;
export type UpdateDeck = Partial<CreateDeck>;

export type DeckSummary = Pick<
    Deck,
    'id' | 'name' | 'description' | 'createdAt'
> & { totalCards: number; dueToday: number };
export type DeckBasicInfo = Pick<Deck, 'id' | 'name' | 'description'>;

export interface DeckStats {
    totalCards: number;
    dueToday: number;
    retentionRate: number;
    streak: number;
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
export type CreateCard = Pick<Card, 'front' | 'back'>;
export type UpdateCard = Partial<CreateCard>;
export type CardBasicInfo = Pick<Card, 'id' | 'front' | 'back'>;

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

export interface StudyDate {
    studyDate: Date;
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
    revokedAt?: Date;
}

declare module 'jsonwebtoken' {
    export interface JwtPayload {
        email?: string;
        name?: string;
        tokenVersion?: number;
    }
}

export type AuthPayload = Required<
    Pick<JwtPayload, 'sub' | 'email' | 'name' | 'tokenVersion'>
>;

export type RefreshTokenKeys = 'sub' | 'email' | 'name' | 'jti' | 'exp';
export type RefreshTokenPayload = Required<Pick<JwtPayload, RefreshTokenKeys>> &
    Omit<JwtPayload, RefreshTokenKeys>;

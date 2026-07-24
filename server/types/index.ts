import { Jwt, JwtPayload } from 'jsonwebtoken';

type Stringify<T, K extends keyof T> = Omit<T, K> & { [P in K]: string };

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
    userId: number;
    totalDecks: number;
    dueToday: number;
    streak: number;
}
export type RawUserStats = Stringify<
    Omit<UserStats, 'streak'>,
    'totalDecks' | 'dueToday'
>;

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
export type RawDeckSummary = Stringify<DeckSummary, 'totalCards' | 'dueToday'>;

export type DeckBasicInfo = Pick<Deck, 'id' | 'name' | 'description'>;

export interface DeckStats {
    totalCards: number;
    dueToday: number;
    retentionRate: number;
    streak: number;
}
export type RawDeckStats = Stringify<
    Omit<DeckStats, 'streak'>,
    'totalCards' | 'dueToday' | 'retentionRate'
>;

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
export type CreateStudySession = Pick<StudySession, 'deckId'>;

export type StudySessionBasicInfo = Pick<StudySession, 'id' | 'startedAt'>;

export interface StudyDate {
    studyDate: Date;
}

export type CardRating = 0 | 1 | 2 | 3 | 4 | 5;
export interface SessionReview {
    id: number;
    sessionId: number;
    cardId: number;
    rating: CardRating;
    reviewedAt: Date;
}
export type CreateSessionReview = Pick<SessionReview, 'cardId' | 'rating'>;

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

declare module 'express-serve-static-core' {
    interface Request {
        user?: AuthPayload;
    }
}

// export interface AuthenticatedRequest extends Request {
//     user: AuthPayload;
// }

export type AuthPayload = Required<
    Pick<JwtPayload, 'sub' | 'email' | 'name' | 'tokenVersion'>
>;

export type RefreshTokenKeys = 'sub' | 'email' | 'name' | 'jti' | 'exp';
export type RefreshTokenPayload = Required<Pick<JwtPayload, RefreshTokenKeys>> &
    Omit<JwtPayload, RefreshTokenKeys>;

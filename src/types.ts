export type FiatType = "RUB" | "USD" | "CASH_RU";

export interface User {
    id: string;
    username: string;
    createdAt: string;
}

export interface Exchange {
    id: string;
    userId: string;
    fromCurrency: string; // e.g., USDT
    network: string; // e.g., TRC-20
    toType: FiatType;
    amountUsd: number;
    status: "pending" | "in_chat" | "completed" | "cancelled";
    createdAt: string;
}

export interface Message {
    id: string;
    exchangeId: string;
    sender: "user" | "admin";
    text: string;
    createdAt: string;
}

export interface Wallet {
    id: string;
    currency: string; // e.g., USDT
    network: string; // e.g., TRC-20
    address: string;
    updatedAt: string;
}



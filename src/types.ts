export type Currency = "BRL" | "GBP" | "USD";

export interface Entry {
  account: string;
  amount: number; // always stored in BRL
  month: string;
  originalCurrency?: Currency;
  originalAmount?: number;
}

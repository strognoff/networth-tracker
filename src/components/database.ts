import initSqlJs from "sql.js";
import type { Database } from "sql.js";
import type { Entry } from "../types";

const DB_STORAGE_KEY = "networth_db";

/** Helper: convert base64 string to Uint8Array (browser safe) */
function base64ToUint8Array(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) bytes[i] = binaryString.charCodeAt(i);
  return bytes;
}

/** Helper: convert Uint8Array to base64 string */
function uint8ArrayToBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunkSize = 0x8000; // improve performance on large arrays
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode.apply(null, Array.from(chunk));
  }
  return btoa(binary);
}

export async function initDatabase(): Promise<Database> {
  const SQL = await initSqlJs({
    locateFile: (_file) => `/sql-wasm.wasm`,
  });

  const fileBuffer = localStorage.getItem(DB_STORAGE_KEY);
  const db = fileBuffer
    ? new SQL.Database(base64ToUint8Array(fileBuffer))
    : new SQL.Database();

  db.run(`CREATE TABLE IF NOT EXISTS entries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    month TEXT NOT NULL,
    account TEXT NOT NULL,
    amount REAL NOT NULL,
    original_currency TEXT,
    original_amount REAL
  );`);

  // Migrate existing databases that lack the new columns
  try {
    db.run(`ALTER TABLE entries ADD COLUMN original_currency TEXT;`);
  } catch (_) { /* column already exists */ }
  try {
    db.run(`ALTER TABLE entries ADD COLUMN original_amount REAL;`);
  } catch (_) { /* column already exists */ }

  return db;
}

export function saveDatabase(db: Database): void {
  const data = db.export();
  const base64 = uint8ArrayToBase64(data);
  localStorage.setItem(DB_STORAGE_KEY, base64);
}

export function getEntries(db: Database): Entry[] {
  const res = db.exec(
    "SELECT month, account, amount, original_currency, original_amount FROM entries ORDER BY month DESC;"
  );
  if (res.length === 0) return [];
  const values = res[0].values;
  return values.map(([month, account, amount, originalCurrency, originalAmount]) => ({
    month: month as string,
    account: account as string,
    amount: amount as number,
    originalCurrency: originalCurrency != null ? (originalCurrency as import("../types").Currency) : undefined,
    originalAmount: (originalAmount as number | null) ?? undefined,
  }));
}

export function addEntry(db: Database, entry: Entry): void {
  db.run(
    "INSERT INTO entries (month, account, amount, original_currency, original_amount) VALUES (?, ?, ?, ?, ?);",
    [
      entry.month,
      entry.account,
      entry.amount,
      entry.originalCurrency ?? null,
      entry.originalAmount ?? null,
    ]
  );
  saveDatabase(db);
}

export function deleteEntry(db: Database, index: number): void {
  db.run(
    `DELETE FROM entries WHERE id = (
      SELECT id FROM entries ORDER BY month DESC LIMIT 1 OFFSET ?
    );`,
    [index]
  );
  saveDatabase(db);
}

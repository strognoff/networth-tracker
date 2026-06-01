import React, { useEffect, useState } from "react";
import AddEntryForm from "./components/AddEntryForm";
import NetWorthDisplay from "./components/NetWorthDisplay";
import { initDatabase, getEntries, addEntry, deleteEntry } from "./components/database";
import type { Entry } from "./types";

/** Exchange rates TO BRL (i.e. 1 unit of currency = X BRL) */
export interface ExchangeRates {
  GBP: number;
  USD: number;
}

export type RatesStatus = "loading" | "live" | "fallback";

const DEFAULT_RATES: ExchangeRates = {
  GBP: 7.14,  // ~1 GBP = 7.14 BRL
  USD: 5.70,  // ~1 USD = 5.70 BRL
};

const App: React.FC = () => {
  const [db, setDb] = useState<any>(null);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [exchangeRates, setExchangeRates] = useState<ExchangeRates>(DEFAULT_RATES);
  const [ratesStatus, setRatesStatus] = useState<RatesStatus>("loading");
  const [ratesUpdatedAt, setRatesUpdatedAt] = useState<Date | null>(null);

  // ⚙️ Initialize the database on load
  useEffect(() => {
    const setupDb = async () => {
      const database = await initDatabase();
      setDb(database);
      setEntries(getEntries(database));
    };
    setupDb();
  }, []);

  // 💱 Fetch current exchange rates via @fawazahmed0/currency-api (jsDelivr CDN)
  // Source: https://github.com/fawazahmed0/exchange-api — free, MIT, no API key required.
  // Response shape: { date, brl: { gbp: <1 BRL in GBP>, usd: <1 BRL in USD>, ... } }
  // Invert each value to get the foreign→BRL rate we need.
  useEffect(() => {
    const fetchExchangeRate = async () => {
      try {
        const response = await fetch(
          "https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/brl.min.json"
        );
        const data = await response.json();
        if (data.brl) {
          const brlToGbp = data.brl.gbp as number | undefined;
          const brlToUsd = data.brl.usd as number | undefined;

          // Values are "1 BRL = X foreign", so invert to get "1 foreign = X BRL"
          setExchangeRates({
            GBP: brlToGbp ? 1 / brlToGbp : DEFAULT_RATES.GBP,
            USD: brlToUsd ? 1 / brlToUsd : DEFAULT_RATES.USD,
          });
          setRatesStatus("live");
          setRatesUpdatedAt(new Date());
        } else {
          setRatesStatus("fallback");
        }
      } catch (error) {
        console.warn("Failed to fetch exchange rate, using default:", error);
        setRatesStatus("fallback");
      }
    };
    fetchExchangeRate();
  }, []);

  // ➕ Add a new entry
  const handleAddEntry = (entry: Entry) => {
    if (!db) return;
    addEntry(db, entry);
    setEntries(getEntries(db));
  };

  // ❌ Delete an entry
  const handleDeleteEntry = (index: number) => {
    if (!db) return;
    deleteEntry(db, index);
    setEntries(getEntries(db));
  };

  // 📂 When user uploads a new DB
  const handleDatabaseImport = (newDb: any) => {
    setDb(newDb);
    setEntries(getEntries(newDb));
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0a102a] via-[#10193a] to-[#0a102a] text-white p-6">
      <div className="max-w-5xl mx-auto space-y-10">
        {/* Entry form */}
        <AddEntryForm
          onAddEntry={handleAddEntry}
          entries={entries}
          exchangeRates={exchangeRates}
        />

        {/* Display panel including projections & DB controls */}
        <NetWorthDisplay
          entries={entries}
          onDeleteEntry={handleDeleteEntry}
          db={db}
          onDatabaseImport={handleDatabaseImport}
          exchangeRates={exchangeRates}
          ratesStatus={ratesStatus}
          ratesUpdatedAt={ratesUpdatedAt}
        />
      </div>
    </div>
  );
};

export default App;

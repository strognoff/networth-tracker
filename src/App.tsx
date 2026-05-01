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

const DEFAULT_RATES: ExchangeRates = {
  GBP: 7.14,  // ~1 GBP = 7.14 BRL
  USD: 5.70,  // ~1 USD = 5.70 BRL
};

const App: React.FC = () => {
  const [db, setDb] = useState<any>(null);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [brlToGbp, setBrlToGbp] = useState<number>(1 / DEFAULT_RATES.GBP);
  const [exchangeRates, setExchangeRates] = useState<ExchangeRates>(DEFAULT_RATES);

  // ⚙️ Initialize the database on load
  useEffect(() => {
    const setupDb = async () => {
      const database = await initDatabase();
      setDb(database);
      setEntries(getEntries(database));
    };
    setupDb();
  }, []);

  // 💱 Fetch current exchange rates (BRL as base → derive toBRL rates)
  useEffect(() => {
    const fetchExchangeRate = async () => {
      try {
        const response = await fetch(
          "https://api.exchangerate-api.com/v4/latest/BRL"
        );
        const data = await response.json();
        if (data.rates) {
          const gbpRate = data.rates.GBP as number | undefined;
          const usdRate = data.rates.USD as number | undefined;

          if (gbpRate) setBrlToGbp(gbpRate);

          // Rates returned are BRL→foreign, invert to get foreign→BRL
          setExchangeRates({
            GBP: gbpRate ? 1 / gbpRate : DEFAULT_RATES.GBP,
            USD: usdRate ? 1 / usdRate : DEFAULT_RATES.USD,
          });
        }
      } catch (error) {
        console.warn("Failed to fetch exchange rate, using default:", error);
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
          brlToGbp={brlToGbp}
        />
      </div>
    </div>
  );
};

export default App;

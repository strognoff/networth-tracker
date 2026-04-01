import React, { useEffect, useState } from "react";
import AddEntryForm from "./components/AddEntryForm";
import NetWorthDisplay from "./components/NetWorthDisplay";
import { initDatabase, getEntries, addEntry, deleteEntry } from "./components/database";
import type { Entry } from "./types";

const App: React.FC = () => {
  const [db, setDb] = useState<any>(null);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [brlToGbp, setBrlToGbp] = useState<number>(0.14); // Default fallback rate

  // ⚙️ Initialize the database on load
  useEffect(() => {
    const setupDb = async () => {
      const database = await initDatabase();
      setDb(database);
      setEntries(getEntries(database));
    };
    setupDb();
  }, []);

  // 💱 Fetch current BRL to GBP exchange rate
  useEffect(() => {
    const fetchExchangeRate = async () => {
      try {
        const response = await fetch(
          "https://api.exchangerate-api.com/v4/latest/BRL"
        );
        const data = await response.json();
        if (data.rates && data.rates.GBP) {
          setBrlToGbp(data.rates.GBP);
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
        <AddEntryForm onAddEntry={handleAddEntry} entries={entries} />

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
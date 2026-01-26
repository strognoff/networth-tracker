import React, { useState, useMemo } from "react";
import type { Entry } from "../types";

interface Props {
  onAddEntry: (entry: Entry) => void;
  entries?: Entry[];
}

const AddEntryForm: React.FC<Props> = ({ onAddEntry, entries = [] }) => {
  const [account, setAccount] = useState("");
  const [amount, setAmount] = useState<number | "">("");
  const [month, setMonth] = useState("");

  const accountOptions = useMemo(
    () => Array.from(new Set(entries.map((e) => e.account))).sort(),
    [entries]
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!account || !month || amount === "") return;
    onAddEntry({ account, amount: Number(amount), month });
    setAccount("");
    setAmount("");
    setMonth("");
  };

  /** Safer CSV parser for quoted cells */
  const parseCSVLine = (line: string): string[] => {
    const result: string[] = [];
    let current = "", inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (c === '"') inQuotes = !inQuotes;
      else if (c === "," && !inQuotes) {
        result.push(current.trim());
        current = "";
      } else current += c;
    }
    result.push(current.trim());
    return result;
  };

  const handleCSVImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    const lines = text.trim().split(/\r?\n/);
    if (lines.length < 2) return alert("CSV must include header + data rows");

    const header = parseCSVLine(lines[0]);
    const months = header.slice(1);
    const dataRows = lines.slice(1);
    let addedCount = 0;

    dataRows.forEach((line) => {
      const cols = parseCSVLine(line);
      if (!cols.length) return;
      const accountName = cols[0].replace(/"/g, "").trim();
      months.forEach((monthLabel, i) => {
        let cell = (cols[i + 1] || "").trim().replace(/[£$," ]/g, "");
        const value = Number(cell);
        const cleanMonth = monthLabel.replace(/[\u2011-\u2015–]/g, "-").trim();
        if (!isNaN(value) && value !== 0 && /^\d{4}-\d{2}$/.test(cleanMonth)) {
          onAddEntry({ account: accountName, amount: value, month: cleanMonth });
          addedCount++;
        }
      });
    });

    alert(`✅ Imported ${addedCount} entries successfully!`);
    e.target.value = "";
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="relative rounded-2xl shadow-lg bg-white/80 backdrop-blur-sm border border-indigo-100 p-8 space-y-6 transition hover:shadow-2xl hover:scale-[1.01]"
    >
      {/* Header */}
      <div className="text-center bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 text-white rounded-xl py-3 mb-4 shadow-md">
        <h2 className="text-xl font-bold tracking-wide">➕ Add New Entry</h2>
      </div>

      {/* Account */}
      <div>
        <label
          htmlFor="account"
          className="block text-sm font-semibold text-gray-700 mb-1"
        >
          Bank / Account
        </label>
        <input
          id="account"
          list="accounts"
          type="text"
          placeholder="e.g. Savings Account"
          value={account}
          onChange={(e) => setAccount(e.target.value)}
          required
          className="w-full rounded-lg border border-gray-300 p-2.5 text-gray-800 bg-gray-50 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition"
        />
        <datalist id="accounts">
          {accountOptions.map((a) => (
            <option key={a} value={a} />
          ))}
        </datalist>
      </div>

      {/* Amount */}
      <div>
        <label
          htmlFor="amount"
          className="block text-sm font-semibold text-gray-700 mb-1"
        >
          Amount
        </label>
        <input
          id="amount"
          type="number"
          placeholder="0.00"
          value={amount}
          onChange={(e) =>
            setAmount(e.target.value === "" ? "" : Number(e.target.value))
          }
          required
          className="w-full rounded-lg border border-gray-300 p-2.5 text-gray-800 bg-gray-50 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition"
        />
      </div>

      {/* Month */}
      <div>
        <label
          htmlFor="month"
          className="block text-sm font-semibold text-gray-700 mb-1"
        >
          Month
        </label>
        <input
          id="month"
          type="month"
          value={month}
          onChange={(e) => setMonth(e.target.value)}
          required
          className="w-full rounded-lg border border-gray-300 p-2.5 text-gray-800 bg-gray-50 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition"
        />
      </div>

      {/* Submit */}
      <button
        type="submit"
        className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-2.5 rounded-lg font-semibold hover:from-indigo-700 hover:to-purple-700 focus:ring-2 focus:ring-offset-1 focus:ring-indigo-500 transition-transform active:scale-[0.98]"
      >
        Add Entry
      </button>

      {/* CSV Import */}
      <div className="pt-5 border-t border-gray-200">
        <label
          htmlFor="csv-upload"
          className="block text-sm font-semibold text-gray-700 mb-2"
        >
          📤 Import from CSV
        </label>
        <input
  id="csv-upload"
  type="file"
  accept=".csv"
  onChange={handleCSVImport}
  className="w-full text-black file:mr-4 file:py-2.5 file:px-4 file:border-0 file:text-sm file:font-semibold file:bg-gradient-to-r file:from-indigo-600 file:to-purple-600 file:text-white hover:file:from-indigo-700 hover:file:to-purple-700 rounded-lg cursor-pointer transition"
/>
      </div>
    </form>
  );
};

export default AddEntryForm;
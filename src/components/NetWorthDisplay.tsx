import React, { useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Line,
  ResponsiveContainer,
  LineChart,
} from "recharts";
import type { Entry } from "../types";

interface Props {
  entries: Entry[];
  onDeleteEntry?: (idx: number) => void;
  db?: any; // Database reference
  onDatabaseImport?: (newDb: any) => void;
}

const NetWorthDisplay: React.FC<Props> = ({
  entries,
  onDeleteEntry,
  db,
  onDatabaseImport,
}) => {
  // 🧮 Group by year
  const groupedByYear = entries.reduce<Record<string, Entry[]>>((acc, entry) => {
    const year = entry.month.split("-")[0];
    if (!acc[year]) acc[year] = [];
    acc[year].push(entry);
    return acc;
  }, {});

  const sortedYears = Object.keys(groupedByYear).sort().reverse();
  const [expandedYears, setExpandedYears] = useState<Set<string>>(
    new Set(sortedYears)
  );

  const toggleYear = (year: string) => {
    setExpandedYears((prev) => {
      const next = new Set(prev);
      next.has(year) ? next.delete(year) : next.add(year);
      return next;
    });
  };

  // 🧮 Current total (latest month)
  const latestMonthAll = entries.map((e) => e.month).sort().reverse()[0];
  const grandTotal = entries
    .filter((e) => e.month === latestMonthAll)
    .reduce((sum, e) => sum + e.amount, 0);

  // 📊 Real data — totals per month
  const realChartData = [...new Set(entries.map((e) => e.month))]
    .sort()
    .map((month) => ({
      month,
      monthLabel: new Date(month + "-01").toLocaleDateString("default", {
        month: "short",
        year: "2-digit",
      }),
      total: entries
        .filter((e) => e.month === month)
        .reduce((sum, e) => sum + e.amount, 0),
    }));

  // 🔮 Projection — simple average trend extrapolation
  let projectedData: { month: string; monthLabel: string; projectedTotal: number }[] = [];
  if (realChartData.length >= 2) {
    const lastFive = realChartData.slice(-5);
    const differences = lastFive
      .map((_, i, arr) => (i > 0 ? arr[i].total - arr[i - 1].total : null))
      .filter((n) => n !== null) as number[];
    const avgChange =
      differences.length > 0
        ? differences.reduce((a, b) => a + b, 0) / differences.length
        : 0;

    const lastMonth = lastFive[lastFive.length - 1];
    const lastDate = new Date(lastMonth.month + "-01");

    for (let i = 1; i <= 5; i++) {
      const next = new Date(lastDate);
      next.setMonth(next.getMonth() + i);
      const futureKey = `${next.getFullYear()}-${String(
        next.getMonth() + 1
      ).padStart(2, "0")}`;
      projectedData.push({
        month: futureKey,
        monthLabel: next.toLocaleDateString("default", {
          month: "short",
          year: "2-digit",
        }),
        projectedTotal: lastMonth.total + avgChange * i,
      });
    }
  }

  const combinedData = [
    ...realChartData.map((d) => ({ ...d, projectedTotal: null })),
    ...projectedData,
  ];

  // 💾 Export DB
  const handleExportDatabase = () => {
    if (!db) return alert("Database not loaded yet!");
    const binary = db.export();
    const blob = new Blob([binary], { type: "application/octet-stream" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "networth-tracker.sqlite";
    a.click();
    URL.revokeObjectURL(url);
  };

  // 📂 Import DB
  const handleImportDatabase = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const buffer = await file.arrayBuffer();

    const initSqlJs = (await import("sql.js")).default;
    const SQL = await initSqlJs({ locateFile: (f) => `/sql-wasm.wasm` });
    const newDb = new SQL.Database(new Uint8Array(buffer));

    if (onDatabaseImport) onDatabaseImport(newDb);
    alert("✅ Database imported successfully!");
  };

  // 🎨 Per-account chart prep
  const colorPalette = [
    "#A78BFA",
    "#60A5FA",
    "#34D399",
    "#FBBF24",
    "#F87171",
    "#F472B6",
  ];

  const accounts = Array.from(new Set(entries.map((e) => e.account))).sort();
  const allMonths = [...new Set(entries.map((e) => e.month))].sort();

  const perAccountData = allMonths.map((month) => {
    const obj: Record<string, any> = {
      month,
      monthLabel: new Date(month + "-01").toLocaleDateString("default", {
        month: "short",
        year: "2-digit",
      }),
    };
    accounts.forEach((acc) => {
      obj[acc] = entries
        .filter((e) => e.month === month && e.account === acc)
        .reduce((sum, e) => sum + e.amount, 0);
    });
    return obj;
  });

  const [expandedAccounts, setExpandedAccounts] = useState<Set<string>>(
    new Set(accounts)
  );
  const toggleAccount = (acc: string) => {
    setExpandedAccounts((prev) => {
      const next = new Set(prev);
      next.has(acc) ? next.delete(acc) : next.add(acc);
      return next;
    });
  };
  const displayedAccounts = Array.from(expandedAccounts);

  return (
    <div className="space-y-10 text-slate-100">
      {/* 💰 Summary Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white shadow-lg">
        <div className="relative p-8 text-center space-y-2">
          <span className="text-sm uppercase opacity-80">Current Net Worth</span>
          <h2 className="text-6xl font-extrabold">
            R${grandTotal.toLocaleString("pt-BR")}
          </h2>
          {latestMonthAll && (
            <span className="text-indigo-200 text-sm">
              as of{" "}
              {new Date(latestMonthAll + "-01").toLocaleDateString("default", {
                month: "long",
                year: "numeric",
              })}
            </span>
          )}
        </div>
      </div>

      {/* 📈 Net worth bar + projection chart */}
      {combinedData.length > 0 && (
        <div className="bg-slate-800/70 rounded-3xl border border-slate-700 p-6">
          <h3 className="text-indigo-300 font-bold text-lg mb-4">
            Monthly Net Worth Trend
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={combinedData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
              <XAxis dataKey="monthLabel" tick={{ fill: "#CBD5E1", fontSize: 10 }} />
              <YAxis tick={{ fill: "#CBD5E1", fontSize: 10 }} />
              <Tooltip
                contentStyle={{
                  background: "#1e293b",
                  border: "1px solid #334155",
                  borderRadius: "8px",
                  color: "white",
                  fontSize: "12px",
                }}
                formatter={(v?: number) =>
                  `R$${(v ?? 0).toLocaleString("pt-BR")}`
                }
              />
              <defs>
                <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#60A5FA" />
                  <stop offset="100%" stopColor="#1E3A8A" />
                </linearGradient>
              </defs>
              <Bar dataKey="total" fill="url(#chartGradient)" radius={[8, 8, 0, 0]} />
              <Line
                type="monotone"
                dataKey="total"
                stroke="#38BDF8"
                strokeWidth={2}
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="projectedTotal"
                stroke="#67E8F9"
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={false}
                name="Projected"
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* 🗓 Year Cards */}
      <div className="space-y-8">
        {sortedYears.map((year) => {
          const yearEntries = groupedByYear[year];
          const groupedMonths = yearEntries.reduce<Record<string, Entry[]>>(
            (acc, e) => {
              if (!acc[e.month]) acc[e.month] = [];
              acc[e.month].push(e);
              return acc;
            },
            {}
          );
          const sortedMonths = Object.keys(groupedMonths).sort().reverse();

          const lastMonth = sortedMonths[0];
          const yearEndTotal = groupedMonths[lastMonth].reduce(
            (s, e) => s + e.amount,
            0
          );
          const isExpanded = expandedYears.has(year);

          return (
            <div
              key={year}
              className="rounded-2xl bg-slate-900/70 shadow-lg border border-slate-700"
            >
              <button
                onClick={() => toggleYear(year)}
                className="w-full px-6 py-4 text-left bg-gradient-to-r from-indigo-900 to-blue-900 flex justify-between text-white"
              >
                <h3 className="text-xl font-bold">{year}</h3>
                <p className="text-indigo-300 font-semibold">
                  Year-end: R${yearEndTotal.toLocaleString("pt-BR")}
                </p>
                <span
                  className={`ml-3 ${isExpanded ? "rotate-180" : ""} transition-transform`}
                >
                  ▼
                </span>
              </button>

              <div
                className={`overflow-hidden transition-all ${
                  isExpanded ? "max-h-[1500px] opacity-100" : "max-h-0 opacity-0"
                }`}
              >
                <div className="grid md:grid-cols-2 gap-6 p-6">
                  {sortedMonths.map((month) => {
                    const mEntries = groupedMonths[month];
                    const total = mEntries.reduce((s, e) => s + e.amount, 0);
                    const monthLabel = new Date(month + "-01").toLocaleDateString(
                      "default",
                      { month: "long", year: "numeric" }
                    );
                    return (
                      <div
                        key={month}
                        className="bg-slate-800/70 border border-slate-700 rounded-xl p-4"
                      >
                        <h4 className="text-indigo-300 font-semibold mb-2">
                          {monthLabel}
                        </h4>
                        <p className="text-indigo-200 text-sm mb-2">
                          Total: R${total.toLocaleString("pt-BR")}
                        </p>
                        <ul className="divide-y divide-slate-700">
                          {mEntries.map((entry, idx) => {
                            const index = entries.findIndex(
                              (e) =>
                                e.account === entry.account &&
                                e.amount === entry.amount &&
                                e.month === entry.month
                            );
                            return (
                              <li
                                key={`${month}-${idx}`}
                                className="flex justify-between text-slate-300 py-1"
                              >
                                <span>{entry.account}</span>
                                <span className="text-indigo-400 font-semibold">
                                  R${entry.amount.toLocaleString("pt-BR")}
                                </span>
                                {onDeleteEntry && (
                                  <button
                                    onClick={() => onDeleteEntry(index)}
                                    className="text-red-400 hover:text-red-600 text-xs"
                                  >
                                    ✕
                                  </button>
                                )}
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* 📊 Per-Account Comparison Chart */}
      <div className="mt-10 bg-slate-800/70 rounded-3xl p-6 border border-slate-700 shadow-sm">
        <h3 className="text-indigo-300 font-bold text-lg mb-4">
          Account Performance Comparison
        </h3>

        {/* Account toggles */}
        <div className="flex flex-wrap gap-3 mb-4">
          {accounts.map((acc) => (
            <label key={acc} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={expandedAccounts.has(acc)}
                onChange={() => toggleAccount(acc)}
                className="accent-indigo-500"
              />
              {acc}
            </label>
          ))}
        </div>

        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={perAccountData}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
            <XAxis dataKey="monthLabel" tick={{ fill: "#CBD5E1", fontSize: 10 }} />
            <YAxis tick={{ fill: "#CBD5E1", fontSize: 10 }} />
            <Tooltip
              contentStyle={{
                background: "#1e293b",
                border: "1px solid #334155",
                borderRadius: "8px",
                color: "white",
                fontSize: "12px",
              }}
            />
            {displayedAccounts.map((acc, i) => (
              <Line
                key={acc}
                type="monotone"
                dataKey={acc}
                stroke={colorPalette[i % colorPalette.length]}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4 }}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
      {/* 💾 DB Export / Import */}
      <div className="mt-10 p-6 bg-slate-800/70 border border-slate-600 rounded-2xl">
        <h3 className="text-indigo-300 font-bold mb-3">Database Management</h3>
        <div className="flex flex-col sm:flex-row gap-4 items-center">
          <button
            onClick={handleExportDatabase}
            className="px-6 py-2 text-white bg-gradient-to-r from-indigo-700 to-blue-700 rounded-lg font-semibold hover:from-indigo-800 hover:to-blue-800"
          >
            💾 Download Database
          </button>
          <label className="flex items-center gap-3 text-sm text-slate-300 cursor-pointer">
            📂 Upload Database
            <input
              type="file"
              accept=".sqlite"
              onChange={handleImportDatabase}
              className="hidden"
            />
          </label>
        </div>
      </div>
    </div>
  );
};

export default NetWorthDisplay;
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
  brlToGbp?: number; // Exchange rate from BRL to GBP
}

const NetWorthDisplay: React.FC<Props> = ({
  entries,
  onDeleteEntry,
  db,
  onDatabaseImport,
  brlToGbp = 0.14,
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

  // 🧮 Previous month total for comparison
  const allMonthsSorted = [...new Set(entries.map((e) => e.month))].sort().reverse();
  const previousMonth = allMonthsSorted[1];
  const previousTotal = previousMonth
    ? entries
        .filter((e) => e.month === previousMonth)
        .reduce((sum, e) => sum + e.amount, 0)
    : null;

  const monthOverMonthDiff = previousTotal !== null ? grandTotal - previousTotal : null;
  const monthOverMonthPct =
    previousTotal !== null && previousTotal !== 0
      ? ((grandTotal - previousTotal) / Math.abs(previousTotal)) * 100
      : null;

  // 🎨 Get unique accounts for color mapping
  const accounts = Array.from(new Set(entries.map((e) => e.account))).sort();
  const colorPalette = [
    "#A78BFA", "#60A5FA", "#34D399", "#FBBF24", 
    "#F87171", "#F472B6", "#FB923C", "#4ADE80",
    "#818CF8", "#2DD4BF", "#FCD34D", "#FDA4AF"
  ];

  // 📊 Real data — totals per month with account breakdown
  const realChartData = [...new Set(entries.map((e) => e.month))]
    .sort()
    .map((month) => {
      const monthData: Record<string, any> = {
        month,
        monthLabel: new Date(month + "-01").toLocaleDateString("default", {
          month: "short",
          year: "2-digit",
        }),
        total: 0,
      };
      
      // Add each account's amount for this month
      accounts.forEach((account) => {
        const amount = entries
          .filter((e) => e.month === month && e.account === account)
          .reduce((sum, e) => sum + e.amount, 0);
        monthData[account] = amount;
        monthData.total += amount;
      });
      
      return monthData;
    });

  // 🔮 Projection — simple average trend extrapolation
  let projectedData: {
    month: string;
    monthLabel: string;
    projectedTotal: number;
  }[] = [];
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
    const SQL = await initSqlJs({ locateFile: (_f) => `/sql-wasm.wasm` });
    const newDb = new SQL.Database(new Uint8Array(buffer));

    if (onDatabaseImport) onDatabaseImport(newDb);
    alert("✅ Database imported successfully!");
  };

  // 🎨 Per-account chart prep
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
          <div className="flex items-center justify-center gap-4">
            <h2 className="text-6xl font-extrabold">
              R${grandTotal.toLocaleString("pt-BR")}
            </h2>
            <div className="text-left">
              <div className="text-2xl font-semibold text-indigo-200">
                £{(grandTotal * brlToGbp).toLocaleString("en-GB", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </div>
              <div className="text-xs text-slate-400">GBP</div>
            </div>
          </div>
          {latestMonthAll && (
            <span className="text-indigo-200 text-sm">
              as of{" "}
              {new Date(latestMonthAll + "-01").toLocaleDateString("default", {
                month: "long",
                year: "numeric",
              })}
            </span>
          )}
          {monthOverMonthDiff !== null && monthOverMonthPct !== null && (
            <div className="mt-3 flex items-center justify-center gap-2 flex-wrap">
              <span
                className={`text-lg font-semibold ${
                  monthOverMonthDiff >= 0 ? "text-green-400" : "text-red-400"
                }`}
              >
                {monthOverMonthDiff >= 0 ? "▲" : "▼"}{" "}
                R${Math.abs(monthOverMonthDiff).toLocaleString("pt-BR")}
              </span>
              <span
                className={`text-sm font-medium ${
                  monthOverMonthDiff >= 0 ? "text-green-300" : "text-red-300"
                }`}
              >
                (£{Math.abs(monthOverMonthDiff * brlToGbp).toLocaleString("en-GB", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })})
              </span>
              <span
                className={`text-sm font-medium ${
                  monthOverMonthDiff >= 0 ? "text-green-300" : "text-red-300"
                }`}
              >
                {monthOverMonthDiff >= 0 ? "+" : ""}
                {monthOverMonthPct.toFixed(2)}%
              </span>
              <span className="text-xs text-slate-400">vs previous month</span>
            </div>
          )}
        </div>
      </div>

      {/* 📈 Net worth bar + projection chart */}
      {combinedData.length > 0 && (
        <div className="bg-slate-800/70 rounded-3xl border border-slate-700 p-6">
          <h3 className="text-indigo-300 font-bold text-lg mb-4">
            Monthly Net Worth Trend
          </h3>
          
          {/* Legend */}
          <div className="flex flex-wrap gap-3 mb-4">
            {accounts.map((account, idx) => {
              // Compare the two most recent months that have data for this account
              const accountMonths = realChartData
                .filter((d) => (d[account] ?? 0) !== 0)
                .slice(-2);
              const prev = accountMonths.length === 2 ? (accountMonths[0][account] as number) : null;
              const curr = accountMonths.length === 2 ? (accountMonths[1][account] as number) : null;
              const trend = prev !== null && curr !== null ? curr - prev : null;

              return (
                <div key={account} className="flex items-center gap-1.5">
                  <div
                    className="w-4 h-4 rounded flex-shrink-0"
                    style={{ backgroundColor: colorPalette[idx % colorPalette.length] }}
                  />
                  <span className="text-sm text-slate-300">{account}</span>
                  {trend !== null && trend !== 0 && (
                    <span
                      className={`text-xs font-bold leading-none ${
                        trend > 0 ? "text-green-400" : "text-red-400"
                      }`}
                      title={`${trend > 0 ? "+" : ""}R$${trend.toLocaleString("pt-BR")}`}
                    >
                      {trend > 0 ? "▲" : "▼"}
                    </span>
                  )}
                </div>
              );
            })}
          </div>

          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={combinedData}>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="rgba(255,255,255,0.1)"
              />
              <XAxis
                dataKey="monthLabel"
                tick={{ fill: "#CBD5E1", fontSize: 10 }}
              />
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

              {/* Stacked bars for each account */}
              {accounts.map((account, idx) => (
                <Bar
                  key={account}
                  dataKey={account}
                  stackId="networth"
                  fill={colorPalette[idx % colorPalette.length]}
                  radius={idx === accounts.length - 1 ? [8, 8, 0, 0] : [0, 0, 0, 0]}
                  label={
                    idx === accounts.length - 1
                      ? (props: any) => {
                          const { x, y, width, index } = props;

                          // Only label REAL bars (skip projected section)
                          if (index >= realChartData.length) return null;
                          if (index === 0) return null; // no previous bar to compare

                          const currentTotal = realChartData[index]?.total;
                          const prevTotal = realChartData[index - 1]?.total;
                          if (prevTotal === 0 || prevTotal === undefined) return null;

                          const pct = ((currentTotal - prevTotal) / Math.abs(prevTotal)) * 100;
                          if (!Number.isFinite(pct)) return null;

                          const sign = pct >= 0 ? "+" : "";
                          const text = `${sign}${pct.toFixed(1)}%`;

                          return (
                            <text
                              x={x + width / 2}
                              y={y - 8}
                              textAnchor="middle"
                              fill={pct >= 0 ? "#34D399" : "#F87171"}
                              fontSize={12}
                              fontWeight={700}
                            >
                              {text}
                            </text>
                          );
                        }
                      : undefined
                  }
                />
              ))}

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
                  className={`ml-3 ${
                    isExpanded ? "rotate-180" : ""
                  } transition-transform`}
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
                            const currencySymbol =
                              entry.originalCurrency === "GBP"
                                ? "£"
                                : entry.originalCurrency === "USD"
                                ? "$"
                                : null;

                            return (
                              <li
                                key={`${month}-${idx}`}
                                className="flex justify-between items-center text-slate-300 py-1 gap-2"
                              >
                                <span>{entry.account}</span>
                                <span className="text-indigo-400 font-semibold text-right">
                                  R${entry.amount.toLocaleString("pt-BR")}
                                  {entry.originalCurrency && entry.originalAmount !== undefined && (
                                    <span className="ml-2 text-xs font-normal text-slate-400 bg-slate-700 rounded px-1.5 py-0.5">
                                      {currencySymbol}
                                      {entry.originalAmount.toLocaleString("en", {
                                        minimumFractionDigits: 2,
                                        maximumFractionDigits: 2,
                                      })}{" "}
                                      {entry.originalCurrency}
                                    </span>
                                  )}
                                </span>
                                {onDeleteEntry && (
                                  <button
                                    onClick={() => onDeleteEntry(index)}
                                    className="text-red-400 hover:text-red-600 text-xs flex-shrink-0"
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
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="rgba(255,255,255,0.1)"
            />
            <XAxis
              dataKey="monthLabel"
              tick={{ fill: "#CBD5E1", fontSize: 10 }}
            />
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
# 🪙 NetWorth Tracker

A simple yet powerful **personal finance tracker** built with React + TypeScript.  
It helps you monitor your **net worth growth over time**, visualize trends, and manage multiple accounts in a clean, interactive dashboard.

---

## 📖 What It Does

- **Record monthly balances** for each of your financial accounts (banks, investments, crypto, etc.)  
- Automatically calculates and displays your **total net worth trend**, including projections for future months.  
- View **yearly summaries** of progress and detailed month-by-month breakdowns.  
- Use the built-in charts to compare **performance across accounts**.  
- Export or import your full local database (`.sqlite` file) for easy backup or data transfer.

All data is stored locally in a lightweight **SQLite database (via sql.js)** — no cloud or server required.

---

## 🚀 Getting Started (Local Installation)

### 1️⃣ Requirements

Make sure you have these installed:

- **Node.js** ≥ 18  
- **npm** or **pnpm**

---

### 2️⃣ Clone the Repository

```bash
git clone https://github.com/jeffcechinel/networth-tracker.git
cd networth-tracker
```

---

### 3️⃣ Install Dependencies

```bash
npm install
```

If you use **pnpm**, you can instead run:

```bash
pnpm install
```

---

### 4️⃣ Run Locally

Start the development server:

```bash
npm run dev
```

Then open the URL displayed in your terminal — usually:

```
http://localhost:5173
```

You’ll see the dashboard running in your browser.  
From here, you can start entering balances, view how your net worth changes each month, and visualize all trends interactively.

---

## 🧮 Tech Stack

- ⚛️ **React 19**
- 🧩 **TypeScript**
- 📊 **Recharts** (charting library for visualizations)
- 🎨 **Tailwind CSS 4**
- ⚡ **Vite (Rolldown)** — fast bundler for development and build
- 🗃 **sql.js** — embedded SQLite database, stored locally in your browser

---

## ⚙️ Features Overview

| Feature | Description |
|----------|-------------|
| 💰 Net Worth Overview | Displays your total net worth for the latest recorded month |
| 📈 Monthly Trend & Projection | Interactive chart showing monthly progression and projections |
| 🗓 Historical Breakdown | Expandable year cards with monthly entries by account |
| 🏦 Account Comparison | Line chart comparing multiple accounts over time |
| 💾 Database Management | Export / import your local SQLite database backups |

---

## 🧠 Why This Is Useful

Tracking your net worth offers a clear overview of your financial health and long-term progress.  
Instead of using spreadsheets, this app provides **insightful visuals and trends** — helping you balance savings, investments, and spending more effectively.

<img width="1092" height="822" alt="image" src="https://github.com/user-attachments/assets/b2c5c34c-05e6-4078-913b-3c4c092a9a6b" />


---

## 💡 Potential Future Enhancements

- Cloud syncing across devices  
- Custom account categories & tags  
- Additional financial analytics (ROI, goals, trend forecasts)  
- CSV export option  
- Enhanced mobile-friendly UI

---

## 🧑‍💻 Contributing

Contributions are welcome! Please open issues or submit pull requests on [GitHub](https://github.com/strognoff/networth-tracker).

To contribute:

```bash
git checkout -b feature/your-feature-name
# make your changes
git commit -m "Add new feature"
git push origin feature/your-feature-name
```

And open a pull request from your branch.

---

## 📄 License

This project is licensed under the **MIT License** — you’re free to use, modify, and share it.

---

**Created with ❤️ by [Jeff Cechinel](https://github.com/strognoff)**  
Helping you **see, understand, and grow your wealth — month by month.**

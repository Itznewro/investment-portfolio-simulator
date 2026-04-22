# 💼 Investment Portfolio Simulator

A full-stack web application that allows users to simulate investment decisions in a safe, risk-free environment. Users can create an account, manage a virtual portfolio, and practice buying and selling assets using simulated market data.

---

## 🚀 Project Overview

The Investment Portfolio Simulator is designed to help beginner investors understand how financial markets work without risking real money. It provides a simple and interactive interface to simulate trading, track portfolio performance, and learn from outcomes.

---

## 🧠 Features

### 🔐 Authentication
- User registration (email + password)
- Secure login using JWT
- Password hashing with bcrypt

### 📊 Portfolio Simulation
- Virtual balance system
- Buy and sell assets
- Track portfolio value

### 📈 Dashboard (Coming Soon)
- Portfolio value visualization
- Asset allocation overview
- Transaction history

### ⚙️ Backend
- REST API built with Node.js and Express
- PostgreSQL database (via Supabase)
- Secure user authentication

---

## 🛠️ Tech Stack

### Frontend
- React (Vite)
- CSS (Custom styling)

### Backend
- Node.js
- Express.js
- PostgreSQL (Supabase)

### Tools
- Git & GitHub
- VS Code

---

## 📁 Project Structure
investment-portfolio-simulator/
│
├── frontend/     # React frontend
├── backend/      # Express backend API
├── README.md

---

## 🔧 Setup Instructions

### 1. Clone the repository
git clone https://github.com/Itznewro/investment-portfolio-simulator.git
---

### 2. Setup Frontend
cd frontend
npm install
npm run dev
---

### 3. Setup Backend
cd backend
npm install
npm run dev
---

### 4. Environment Variables

Create a `.env` file in backend:
DATABASE_URL=your_database_connection_string
JWT_SECRET=your_secret_key
PORT=5000
---

## 🔐 Authentication Flow

1. User registers an account
2. Password is securely hashed
3. User logs in with email and password
4. JWT token is generated and stored
5. Token is used for protected routes

---

## 💰 Financial Concept

This system simulates real-world investment behavior:
- Users start with virtual money
- Assets can be bought and sold
- Portfolio value changes based on asset prices
- Profit and loss are calculated dynamically

---

## 🔮 Future Improvements

- 📊 Advanced dashboard with charts
- 📉 Stop-loss and trailing stop-loss features
- 🔔 Notifications for price changes
- 🤖 Smart trading suggestions (basic AI)
- 🌐 Live market data integration

---

## 👥 Team

- Mahin Ahmed (k232152)
- Shafin Ahmed (k2)
- Marvel Jaya ()
- Pakrity ()
- Binesh ()

---

## 📚 License

This project is developed for educational purposes as part of a university capstone project.

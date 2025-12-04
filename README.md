# M-Hike Backend API (Node.js + Express + SQLite)

The **M-Hike Backend** is a lightweight, fast, and secure REST API built with **Node.js**, **Express**, and **SQLite**.  
It serves as the backend for the **M-Hike mobile application** (React Native + Expo), providing endpoints for:

- User authentication (JWT)
- Hike management (CRUD)
- Observation uploads with images
- Local SQLite database persistence
- Static file hosting for uploaded images

---

## 🚀 Features

- JWT Authentication (Login / Register)
- CRUD APIs for hikes
- CRUD APIs for observations
- Image upload support (`multer`)
- SQLite database using **better-sqlite3**
- Central error handling
- `.env` configuration support
- RESTful API structure with Express Routers
- CORS enabled for mobile frontend

---

m-hike-backend/
├── config/
│ └── database.js # SQLite initialization
├── controllers/
│ ├── authController.js
│ ├── hikeController.js
│ └── observationController.js
├── data/
│ ├── m_hike.db # SQLite database
├── middleware/
│ ├── auth.js # JWT verify
│ └── upload.js # Multer upload config
├── routes/
│ ├── auth.js
│ ├── hikes.js
│ └── observations.js
├── uploads/ # Uploaded images
├── server.js # Entry point
├── package.json
└── .env

---

# 🛠️ How to Install & Run the Backend API

Follow the steps below to help others run this backend easily.

---

## 1️⃣ Install Required Software

You must have:

- **Node.js (v18 or newer)**
- **npm** (comes with Node)
- (Optional) **Postman** or **Thunder Client** to test API

---

## 2️⃣ Clone the Project

```sh
git clone https://github.com/<your-username>/<your-backend-repository>.git
cd m-hike-backend


Replace <your-username> with your actual GitHub account.

3️⃣ Install Dependencies
npm install

4️⃣ Create a .env File

Inside project root:

PORT=3000
DB_PATH=./data/m_hike.db
JWT_SECRET=your-secret-key
NODE_ENV=development

5️⃣ Run the Server
Start normally:
npm start

Start in development (auto-restart with nodemon):
npm run dev


Server output will look like:

M-Hike API server is running on port 3000
Environment: development
Database: SQLite (./data/m_hike.db)

🔥 API Endpoints
🧪 Health Check
GET /api/health


Returns:

{
  "status": "API is running",
  "timestamp": "2024-01-01T12:00:00.000Z",
  "database": "SQLite"
}

🔐 Authentication
Method	Endpoint	Description
POST	/api/auth/register	Register a new user
POST	/api/auth/login	Login and get JWT
🗺️ Hikes
Method	Endpoint	Description
GET	/api/hikes	Get all hikes
POST	/api/hikes	Create new hike
PUT	/api/hikes/:id	Update hike
DELETE	/api/hikes/:id	Delete hike
📷 Observations
Method	Endpoint	Description
POST	/api/hikes/:hikeId/observations	Add observation with image
GET	/api/hikes/:hikeId/observations	Get observations for hike

File uploads are served from:

/uploads/<filename>

🐞 Common Issues & Fixes
❌ Cannot find .env

Ensure .env exists at root and restart server.

❌ Database not loading

Delete the data/ folder and let the backend recreate the SQLite DB automatically.

❌ File upload errors

Make sure your frontend sends multipart/form-data.

🤝 Contributing

Fork the repo

Create a feature branch

Commit your changes

Open a Pull Request

📄 License

This project is licensed under the MIT License.

```

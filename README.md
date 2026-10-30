# ☁️ CloudNest — Your Personal Cloud Drive

**A secure, full-stack cloud drive to upload, organize, preview, download, and share files with expiring links.**

<p align="center">
  <a href="https://cloudnest-drive-xzn4.vercel.app/"><strong>🌐 Live Demo</strong></a> ·
  <a href="https://github.com/akshithareddy1906/cloudnest-drive"><strong>💻 Source Code</strong></a>
</p>

CloudNest is a full-stack cloud storage application built to make everyday file management simple and secure. Users can organize files into folders, preview supported documents, manage their storage, and share files through controlled public links.

The project focuses on practical full-stack engineering: authenticated APIs, user-specific data access, file upload handling, database relationships, validation, and a responsive user experience.

## ✨ Features

- **Authentication** — Register and log in to access a personal workspace.
- **File management** — Upload, preview, download, rename, and delete files.
- **Folder organization** — Create folders and organize files in nested structures.
- **Secure sharing** — Generate public links with configurable expiration and optional password protection.
- **Share management** — Manage or revoke generated share links.
- **Trash and recovery** — Move deleted items to trash and restore supported items.
- **Storage limit** — Enforce a 100 MB per-user storage limit on the server.
- **Storage overview** — View storage usage from the dashboard.
- **Backend API** — REST endpoints for authentication, files, folders, and sharing.
- **Cloud deployment** — Separate frontend and backend deployments.

## 🛠️ Technology Stack

| Layer | Technologies |
|---|---|
| Frontend | React, Vite, JavaScript, CSS |
| Backend | Node.js, Express.js |
| Database | MongoDB Atlas, Mongoose |
| Authentication | JSON Web Tokens (JWT), bcryptjs |
| File uploads | Multer |
| Security | Helmet, express-rate-limit, server-side validation |
| Testing | Jest, Supertest |
| Frontend hosting | Vercel |
| Backend hosting | Render |

## 🌐 Live Application

**Live demo:** https://cloudnest-drive-sigma.vercel.app/

**Backend health check:** https://cloudnest-api-akshitha.onrender.com/api/health

The backend is hosted on Render's free tier, so the first request after inactivity may take longer while the service starts.

## 🚀 Getting Started

### Prerequisites

Install the following before running the project locally:

- Node.js and npm
- MongoDB Atlas account or a local MongoDB instance
- Git

### 1. Clone the repository

```bash
git clone https://github.com/akshithareddy1906/cloudnest-drive.git
cd cloudnest-drive
```

### 2. Install backend dependencies

```bash
cd server
npm install
```

### 3. Configure environment variables

Create a `.env` file inside the `server` directory using `server/.env.example` as a template.

```env
PORT=5000
CLIENT_URL=http://localhost:5173
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_long_random_secret
```

Replace the MongoDB URI and JWT secret with your own values. Never commit `.env` files or real credentials to GitHub.

### 4. Start the backend

From the `server` directory, run:

```bash
npm start
```

The API should be available at:

`http://localhost:5000`

### 5. Install and configure the frontend

Open a second terminal from the project root:

```bash
cd client
npm install
```

Create `client/.env` with the following variable:

```env
VITE_API_URL=http://localhost:5000/api
```

Vite exposes variables prefixed with `VITE_` to browser code, so this value must not contain secrets.

### 6. Start the frontend

From the `client` directory, run:

```bash
npm run dev
```

Open `http://localhost:5173` in your browser.

### 7. Run automated tests

From the project root:

```bash
npm test
```

The repository includes Jest and Supertest tests for basic API behavior. See `server/tests` for the test files.

## 🗂️ Data Model

CloudNest uses MongoDB collections to represent users, files, folders, and shared links.

### User

Stores account information such as name, email, and a hashed password. Passwords are not stored as plain text.

### File

Stores file metadata, including:

- Original filename and stored filename
- MIME type and file size
- Owner reference
- Parent folder reference
- Deletion status and deletion timestamp

File metadata is associated with an owner so that authenticated operations can enforce user-specific access.

### Folder

Stores the folder name, owner, parent-folder reference, and deletion metadata. Parent references allow folders to be organized hierarchically.

### Share

Represents a controlled public share for a file, including its associated file and owner, expiration information, optional password protection, and share status. Download limits or counters are enforced where implemented by the share workflow.

## 🧠 Main Design Decisions

**1. Separate frontend and backend**

The React application and Express API are deployed independently. This keeps UI development separate from server-side business logic and makes the API easier to test.

**2. Store file metadata separately**

MongoDB stores information needed to organize, identify, and authorize files, while the upload system handles the actual file content.

**3. Enforce access control on the server**

The backend uses authentication and ownership checks for private file operations. Frontend visibility alone is not treated as a security boundary.

**4. Validate uploads server-side**

The server enforces the configured per-user storage limit and validates requests before accepting file uploads.

**5. Use expiring, revocable share links**

Sharing is designed to provide controlled access without exposing a user's entire private workspace.

**6. Keep configuration environment-specific**

API URLs, database credentials, JWT secrets, and deployment settings are configured through environment variables rather than hard-coded secrets.

## 📌 Project Status

### Implemented and tested

- [x] User registration and login
- [x] Authenticated dashboard
- [x] File upload and download
- [x] Supported file preview
- [x] Folder creation and nested-folder workflow
- [x] File renaming
- [x] Public share links
- [x] Password-protected sharing
- [x] Share revocation
- [x] Server-side storage limit
- [x] Frontend and backend cloud deployment

### Further improvements

The following are areas for continued development and should not be considered complete unless verified in the current build:

- Expand automated tests for authentication, ownership isolation, upload limits, and share expiration.
- Verify and strengthen trash retention and recovery behavior.
- Add more comprehensive integration and end-to-end tests.
- Improve observability, error reporting, and production monitoring.
- Introduce cloud object storage for scalable file persistence.
- Add drag-and-drop uploads, search, and more advanced file organization.
- Improve accessibility and optimize large-file handling.

## 🧪 Testing Approach

The project includes automated API tests using Jest and Supertest. Manual testing was also performed for the main user workflows, including registration, file uploads, previews, downloads, folders, and sharing.

Automated test coverage can be expanded to include invalid credentials, unauthorized access, cross-user file access, malformed uploads, storage-limit enforcement, and expired or revoked links.

## 🤖 AI Tools Used

AI tools were used as development assistants to support implementation and problem-solving:

- **ChatGPT** — Helped plan the application structure, reason through API integration, troubleshoot deployment issues, and refine project documentation.
- **Cursor** — Assisted with code navigation, implementation support, and debugging during development.

AI-generated suggestions were reviewed and adapted to the project. Application behavior was verified through local testing, deployment checks, and manual feature testing.

## 🔐 Security Notes

- Never commit `.env` files, database credentials, or JWT secrets.
- Use a unique, strong JWT secret in deployed environments.
- Keep database credentials private and restrict database access appropriately.
- Validate ownership and permissions on the backend for every private resource.
- Use HTTPS for deployed frontend and backend communication.

## 👩‍💻 Author

**Akshitha Reddy**

- GitHub: https://github.com/akshithareddy1906
- Project: [CloudNest](https://github.com/akshithareddy1906/cloudnest-drive)

---

*CloudNest was developed as a full-stack engineering project to demonstrate practical skills in frontend development, backend API design, database modeling, authentication, file management, testing, and cloud deployment.*

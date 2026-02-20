# College Event Management System

This is a comprehensive web-based platform for managing college events. It allows administrators to create and manage events, and students to browse and register for them.

## 🚀 Features
- **Admin Dashboard**: Create, edit, delete events, manage users, and view registration rosters.
- **Student Dashboard**: Browse events, register (with capacity checks), view personal schedule, and update profile.
- **Real-time Updates**: Live participant counts (e.g., 5/50 registered).
- **Automated Management**: Events automatically close when the deadline passes or capacity is reached.
- **Profile Management**: Users can update their profile pictures and passwords.

## 🛠️ Prerequisites
Before running the project, ensure you have the following installed:
1.  **Node.js**: [Download here](https://nodejs.org/) (Version 16+ recommended).
2.  **XAMPP**: [Download here](https://www.apachefriends.org/) (For MySQL Database).
3.  **VS Code**: Ideally used as the code editor.

## 📦 Installation

1.  **Clone/Open the Project**: Open the `College_Event_Management` folder in VS Code.
2.  **Install Dependencies**: Open the VS Code terminal (`Ctrl + ` `) and run:
    ```bash
    npm install
    ```

## 🗄️ Database Setup
1.  Open **XAMPP Control Panel** and start **Apache** and **MySQL**.
2.  Open your browser and go to `http://localhost/phpmyadmin`.
3.  Create a new database named `college_event_mgmt`.
4.  Import the provided SQL file (if available) or create the tables manually as per the schema (users, events, registrations).

## ▶️ How to Run
1.  **Start the Server**:
    In the VS Code terminal, run:
    ```bash
    npm run dev
    ```
    (This uses `nodemon` to automatically restart the server on file changes).
    
    *Alternatively, for a simple start:*
    ```bash
    npm start
    ```

2.  **Access the App**:
    Open your browser and visit:
    ```
    http://localhost:5000/index.html
    ```

## 🔑 Default Credentials
- **Admin**: Create an account via sign-up and manually update the role to 'admin' in the database if needed, or use the registration flow if configured.
- **Student**: Sign up via the registration page.

## 📁 Project Structure
- `backend/`: Backend Node.js/Express code, database migrations, and server configuration.
- `frontend/`: Frontend HTML, CSS, and JavaScript files (inside `frontend/public`).
- `backend/uploads/`: Stores event thumbnails and user profile pictures.

## 📦 Installation

1.  **Clone/Open the Project**: Open the `College_Event_Management` folder in VS Code.
2.  **Install Dependencies**: 
    ```bash
    cd backend
    npm install
    ```

## ▶️ How to Run
You can run the project from the root directory:
1.  **Start the Server**:
    ```bash
    npm run dev
    ```
    (This runs the backend from the root using the `--prefix` flag).

2.  **Access the App**:
    Open your browser and visit:
    ```
    http://localhost:5000/index.html
    ```


CREATE DATABASE IF NOT EXISTS college_event_mgmt;
USE college_event_mgmt;

CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    fullname VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role ENUM('admin', 'student') DEFAULT 'student',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS events (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    event_date DATE NOT NULL,
    event_time TIME NOT NULL,
    location VARCHAR(255) NOT NULL,
    capacity INT NOT NULL,
    image_url VARCHAR(255) DEFAULT 'https://images.unsplash.com/photo-1540575861501-7ad05823c9f5?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80',
    registration_deadline DATE,
    created_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS registrations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    event_id INT NOT NULL,
    registration_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY (user_id, event_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE
);

-- Insert a default admin (password: admin123)
-- bcrypt hash for 'admin123' is $2a$10$vI8qS.u7W036yRk.4.p4beVpE6E9E6E9E6E9E6E9E6E9E6E9
-- But for simplicity in initial setup, I'll use a placeholder or let them register.
-- Better to provide a way to seed or just let them register.
INSERT INTO users (fullname, email, password, role) VALUES 
('Admin User', 'admin@college.edu', '$2a$10$VRr/QKQ.X5EICXkaPbdhC.SyyglCEk9om/I/zfk7ZsoHgE88vNvVu', 'admin');

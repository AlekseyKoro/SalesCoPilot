require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const connectDB = require('./config/db');
const authRoutes = require('./routes/auth');
const callsRoutes = require('./routes/calls');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const fs = require('fs');
const recordingsRoutes = require('./routes/recordings');
const mongoose = require('mongoose');

const app = express();

// Подключение к базе данных
connectDB();

// Базовые middleware
app.use(cors());
app.use(cookieParser());
app.use(express.json());

// Статические файлы должны быть первыми
app.use(express.static(path.join(__dirname, '../client')));
app.use('/js', express.static(path.join(__dirname, '../client/js')));
app.use('/css', express.static(path.join(__dirname, '../client/css')));
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Создаем папку uploads, если её нет
const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

// API маршруты
app.use('/api/auth', authRoutes);
app.use('/api/calls', callsRoutes);
app.use('/api/recordings', recordingsRoutes);

// Middleware для проверки авторизации
const checkAuth = (req, res, next) => {
    // Для публичных маршрутов пропускаем проверку
    if (req.path === '/login' || 
        req.path === '/register' || 
        req.path === '/' ||
        req.path.includes('.')) {
        return next();
    }

    const token = req.cookies?.auth_token || 
                 req.headers.authorization?.split(' ')[1] || 
                 null;
    
    if (!token) {
        return res.redirect('/login');
    }
    
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        next();
    } catch (err) {
        console.error('Ошибка проверки токена:', err);
        res.clearCookie('auth_token');
        return res.redirect('/login');
    }
};

// Маршрут для редиректа после авторизации
app.post('/auth/redirect', (req, res) => {
    const token = req.body.token || req.headers.authorization?.split(' ')[1];
    
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        res.cookie('auth_token', token, { 
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict'
        });
        res.json({ success: true });
    } catch (err) {
        console.error('Ошибка проверки токена:', err);
        res.status(401).json({ success: false });
    }
});

// HTML маршруты
const serveHTML = (filePath) => (req, res) => {
    if (!fs.existsSync(filePath)) {
        return res.status(404).redirect('/login');
    }
    res.sendFile(filePath);
};

app.get('/login', serveHTML(path.join(__dirname, '../client/login.html')));
app.get('/register', serveHTML(path.join(__dirname, '../client/register.html')));
app.get('/', serveHTML(path.join(__dirname, '../client/index.html')));
app.get('/dashboard', checkAuth, serveHTML(path.join(__dirname, '../client/dashboard.html')));

// Обработка 404
app.use((req, res) => {
    res.redirect('/login');
});

// Обработчик ошибок
app.use((err, req, res, next) => {
    console.error('Ошибка сервера:', err);
    res.status(500).send('Внутренняя ошибка сервера');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Сервер запущен на порту ${PORT}`);
});

mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log('Connected to MongoDB'))
    .catch(err => console.error('MongoDB connection error:', err)); 
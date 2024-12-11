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

const app = express();

// Подключение к базе данных
connectDB();

// Middleware
app.use(cors());
app.use(express.json());
app.use(cookieParser());

// API маршруты должны быть первыми
app.use('/api/auth', authRoutes);
app.use('/api/calls', callsRoutes);

// Статические файлы
app.use(express.static(path.join(__dirname, '../client')));
app.use('/images', express.static(path.join(__dirname, '../client/images')));
app.use('/js', express.static(path.join(__dirname, '../client/js')));

// Middleware для проверки авторизации
const checkAuth = (req, res, next) => {
    console.log('checkAuth для пути:', req.path);
    
    // Для API маршрутов и публичных страниц пропускаем проверку
    if (req.path.startsWith('/api/') || 
        req.path === '/login' || 
        req.path === '/register' || 
        req.path === '/' ||
        req.path.includes('.')) {
        console.log('Пропускаем проверку для публичного маршрута');
        return next();
    }

    // Для dashboard и других защищенных маршрутов проверяем авторизацию
    const token = req.cookies.auth_token || req.headers.authorization?.split(' ')[1];
    console.log('Полученные cookies:', req.cookies);
    console.log('Заголовок Authorization:', req.headers.authorization);
    console.log('Извлеченный токен:', token);
    
    if (!token) {
        console.log('Нет токена, редирект на /login');
        return res.redirect('/login');
    }
    
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        console.log('Токен валиден, пользователь:', decoded);
        next();
    } catch (err) {
        console.log('Ошибка проверки токена:', err);
        res.clearCookie('auth_token');
        return res.redirect('/login');
    }
};

// Маршрут для редиректа после авторизации
app.post('/auth/redirect', express.json(), (req, res) => {
    console.log('Получен запрос на /auth/redirect');
    console.log('Тело запроса:', req.body);
    console.log('Заголовки:', req.headers);
    
    const token = req.body.token || req.headers.authorization?.split(' ')[1];
    console.log('Извлеченный токен:', token);
    
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        console.log('Токен валиден, пользователь:', decoded);
        
        res.cookie('auth_token', token, { 
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict'
        });
        console.log('Токен установлен в cookie');
        res.status(200).json({ success: true });
    } catch (err) {
        console.log('Ошибка проверки токена при редиректе:', err);
        res.status(401).json({ success: false });
    }
});

// HTML маршруты
app.get('/dashboard', checkAuth, (req, res) => {
    console.log('Запрос страницы dashboard');
    console.log('Пользователь в запросе:', req.user);
    const filePath = path.resolve(__dirname, '../client/dashboard.html');
    console.log('Путь к файлу dashboard:', filePath);
    
    if (fs.existsSync(filePath)) {
        console.log('Файл dashboard.html найден');
        sendFileWithError(res, filePath, 'Ошибка при загрузке панели управления');
    } else {
        console.error('Файл dashboard.html не найден');
        res.status(404).send('Страница не найдена');
    }
});

app.get('/login', (req, res) => {
    console.log('Запрос страницы входа');
    const filePath = path.resolve(__dirname, '../client/login.html');
    if (fs.existsSync(filePath)) {
        sendFileWithError(res, filePath, 'Ошибка при загрузке страницы входа');
    } else {
        console.error('Файл не найден:', filePath);
        res.status(404).send('Страница не найдена');
    }
});

app.get('/register', (req, res) => {
    console.log('Запрос страницы регистрации');
    const filePath = path.resolve(__dirname, '../client/register.html');
    if (fs.existsSync(filePath)) {
        sendFileWithError(res, filePath, 'Ошибка при загрузке страницы регистрации');
    } else {
        console.error('Файл не найден:', filePath);
        res.status(404).send('Страница не найдена');
    }
});

app.get('/', (req, res) => {
    console.log('Запрос главной страницы');
    const filePath = path.resolve(__dirname, '../client/index.html');
    if (fs.existsSync(filePath)) {
        sendFileWithError(res, filePath, 'Ошибка при загрузке главной страницы');
    } else {
        console.error('Файл не найден:', filePath);
        res.status(404).send('Страница не найдена');
    }
});

// Обработка 404
app.use((req, res) => {
    console.log('404 - Страница не найдена:', req.url);
    res.status(404).redirect('/login');
});

// Функция для отправки файла с обработкой ошибок
const sendFileWithError = (res, filePath, errorMessage) => {
    res.sendFile(filePath, (err) => {
        if (err) {
            console.error(`Ошибка при отправке файла ${filePath}:`, err);
            res.status(err.status || 500).send(errorMessage || 'Ошибка при загрузке страницы');
        }
    });
};

// Обработчик ошибок
app.use((err, req, res, next) => {
    console.error('Ошибка сервера:', err);
    res.status(500).send('Внутренняя ошибка сервера');
});

const PORT = process.env.PORT || 3000;
const server = app.listen(PORT, () => {
    console.log(`Сервер запущен на порту ${server.address().port}`);
    console.log(`Открыть в браузере: http://localhost:${server.address().port}`);
});

// Обработка ошибок процесса
process.on('unhandledRejection', (err) => {
    console.error('Необработанное отклонение Promise:', err);
});

process.on('uncaughtException', (err) => {
    console.error('Необработанное исключение:', err);
    process.exit(1);
}); 
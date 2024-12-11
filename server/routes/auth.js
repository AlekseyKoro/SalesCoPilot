const express = require('express');
const router = express.Router();
const User = require('../models/User');
const jwt = require('jsonwebtoken');

// Регистрация
router.post('/register', async (req, res) => {
    try {
        const { name, identifier, password } = req.body;
        console.log('Получен запрос на регистрацию:', { name, identifier });

        // Определяем тип идентификатора
        const identifierType = identifier.includes('@') ? 'email' : 'phone';
        console.log('Тип идентификатора:', identifierType);
        
        // Проверяем существование пользователя
        const existingUser = await User.findOne({ identifier });
        if (existingUser) {
            console.log('Пользователь уже существует:', identifier);
            return res.status(400).json({ 
                message: 'Пользователь с таким email/телефоном уже существует' 
            });
        }

        // Создаем нового пользователя
        const user = new User({
            name,
            identifier,
            identifierType,
            password
        });

        await user.save();
        console.log('Пользователь успешно создан:', { id: user._id, name, identifier });

        // Создаем JWT токен
        const token = jwt.sign(
            { userId: user._id },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.status(201).json({
            token,
            user: {
                id: user._id,
                name: user.name,
                identifier: user.identifier
            }
        });

    } catch (err) {
        console.error('Ошибка при регистрации:', err);
        res.status(500).json({ message: 'Ошибка сервера при регистрации' });
    }
});

// Вход
router.post('/login', async (req, res) => {
    try {
        const { identifier, password } = req.body;

        // Ищем пользователя
        const user = await User.findOne({ identifier });
        if (!user) {
            return res.status(400).json({ message: 'Неверные учетные данные' });
        }

        // Проверяем пароль
        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            return res.status(400).json({ message: 'Неверные учетные данные' });
        }

        // Создаем JWT токен
        const token = jwt.sign(
            { userId: user._id },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.json({
            token,
            user: {
                id: user._id,
                name: user.name,
                identifier: user.identifier
            }
        });

    } catch (err) {
        res.status(500).json({ message: 'Ошибка сервера' });
    }
});

// Маршрут для проверки авторизации
router.get('/me', async (req, res) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) {
            return res.status(401).json({ message: 'Токен не предоставлен' });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.userId).select('-password');
        
        if (!user) {
            return res.status(404).json({ message: 'Пользователь не найден' });
        }

        res.json(user);
    } catch (err) {
        console.error('Ошибка при проверке авторизации:', err);
        res.status(401).json({ message: 'Недействительный токен' });
    }
});

module.exports = router; 
const jwt = require('jsonwebtoken');
const User = require('../models/User');

module.exports = async (req, res, next) => {
    try {
        // Получаем токен из заголовка
        const token = req.headers.authorization?.split(' ')[1];
        
        if (!token) {
            return res.status(401).json({
                success: false,
                message: 'Токен не предоставлен'
            });
        }

        // Проверяем токен
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // Получаем пользователя
        const user = await User.findById(decoded.userId);
        
        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'Пользователь не найден'
            });
        }

        // Добавляем пользователя в request
        req.user = user;
        next();
    } catch (error) {
        console.error('Auth middleware error:', error);
        res.status(401).json({
            success: false,
            message: 'Ошибка аутентификации'
        });
    }
}; 
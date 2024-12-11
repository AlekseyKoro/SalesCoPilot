const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const Call = require('../models/Call');
const auth = require('../middleware/auth');
const fs = require('fs');
const Recording = require('../models/Recording');

// Настройка multer
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const dir = path.join(__dirname, '../../uploads/');
        // Создаем директорию, если её нет
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        cb(null, dir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({ 
    storage: storage,
    fileFilter: function (req, file, cb) {
        if (!file.mimetype.startsWith('audio/')) {
            return cb(new Error('Только аудио файлы разрешены!'), false);
        }
        cb(null, true);
    },
    limits: {
        fileSize: 10 * 1024 * 1024 // 10 MB
    }
}).single('audio');

// Добавляем маршрут GET для получения списка звонков
router.get('/', auth, async (req, res) => {
    try {
        // Получаем userId из токена
        const userId = req.user._id; // Убедитесь, что middleware auth добавляет user в req

        // Получаем все звонки пользователя
        const calls = await Call.find({ userId })
            .sort({ uploadDate: -1 }); // Сортировка по дате загрузки (новые первые)

        res.json({
            success: true,
            calls: calls
        });
    } catch (error) {
        console.error('Ошибка при получении списка звонков:', error);
        res.status(500).json({
            success: false,
            message: 'Ошибка при получении списка звонков'
        });
    }
});

// Обновляем маршрут POST для сохранения информации о файле в базу данных
router.post('/upload', auth, function(req, res) {
    upload(req, res, async function(err) {
        console.log('Начало обработки загрузки файла');
        
        if (err instanceof multer.MulterError) {
            console.error('Multer error:', err);
            return res.status(400).json({
                success: false,
                message: 'Ошибка при загрузке файла: ' + err.message
            });
        } else if (err) {
            console.error('Upload error:', err);
            return res.status(400).json({
                success: false,
                message: err.message
            });
        }

        if (!req.file) {
            console.error('Файл не получен');
            return res.status(400).json({
                success: false,
                message: 'Файл не был загружен'
            });
        }

        try {
            console.log('Полученный файл:', {
                originalname: req.file.originalname,
                filename: req.file.filename,
                path: req.file.path,
                size: req.file.size
            });
            
            // Создаем новую запись в базе данных
            const call = new Call({
                userId: req.user._id,
                fileName: req.file.originalname,
                filePath: req.file.path,
                fileSize: req.file.size
            });

            // Сохраняем запись
            await call.save();
            console.log('Сохраненный звонок:', call);

            // Отправляем ответ с полной информацией о файле
            const responseData = {
                success: true,
                file: {
                    _id: call._id.toString(),
                    fileName: call.fileName,
                    filePath: call.filePath,
                    fileSize: call.fileSize,
                    uploadDate: call.uploadDate
                }
            };

            console.log('Отправляем ответ:', responseData);
            res.json(responseData);

        } catch (error) {
            console.error('Database error:', error);
            res.status(500).json({
                success: false,
                message: 'Ошибка при сохранении информации о файле'
            });
        }
    });
});

// Удаление звонка
router.delete('/:id', auth, async (req, res) => {
    try {
        const call = await Call.findOne({ 
            _id: req.params.id,
            userId: req.user._id 
        });

        if (!call) {
            return res.status(404).json({
                success: false,
                message: 'Звонок не найден'
            });
        }

        // Удаляем файл с диска
        if (fs.existsSync(call.filePath)) {
            fs.unlinkSync(call.filePath);
        }

        // Удаляем связанные записи ��ранскрибации
        await Recording.deleteMany({ callId: call._id });

        // Удаляем запись из базы данных
        await call.deleteOne();

        res.json({
            success: true,
            message: 'Звонок успешно удален'
        });

    } catch (error) {
        console.error('Delete error:', error);
        res.status(500).json({
            success: false,
            message: 'Ошибка при удалении звонка'
        });
    }
});

module.exports = router; 
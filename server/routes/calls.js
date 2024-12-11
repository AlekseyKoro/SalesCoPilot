const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const Call = require('../models/Call');
const auth = require('../middleware/auth');

// Настройка multer для загрузки файлов
const storage = multer.diskStorage({
    destination: function(req, file, cb) {
        const dir = 'uploads/calls';
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        cb(null, dir);
    },
    filename: function(req, file, cb) {
        cb(null, Date.now() + '-' + file.originalname);
    }
});

const upload = multer({ 
    storage: storage,
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('audio/')) {
            cb(null, true);
        } else {
            cb(new Error('Разрешены только аудиофайлы'));
        }
    },
    limits: {
        fileSize: 50 * 1024 * 1024 // 50 MB
    }
});

// Загрузка аудиофайла
router.post('/upload', auth, upload.single('audio'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'Файл не был загружен' });
        }

        const call = new Call({
            userId: req.user.id,
            fileName: req.file.originalname,
            filePath: req.file.path,
            fileSize: req.file.size
        });

        await call.save();

        res.status(201).json({
            message: 'Файл успешно загружен',
            call: {
                id: call._id,
                fileName: call.fileName,
                uploadDate: call.uploadDate
            }
        });

    } catch (err) {
        console.error('Ошибка при загрузке файла:', err);
        res.status(500).json({ message: 'Ошибка при загрузке файла' });
    }
});

// Получение списка звонков пользователя
router.get('/', auth, async (req, res) => {
    try {
        const calls = await Call.find({ userId: req.user.id })
            .sort({ uploadDate: -1 });

        res.json({ calls });

    } catch (err) {
        console.error('Ошибка при получении списка звонков:', err);
        res.status(500).json({ message: 'Ошибка при получении списка звонков' });
    }
});

// Скачивание звонка
router.get('/download/:id', auth, async (req, res) => {
    try {
        const call = await Call.findOne({ 
            _id: req.params.id,
            userId: req.user.id
        });

        if (!call) {
            return res.status(404).json({ message: 'Звонок не найден' });
        }

        res.download(call.filePath);

    } catch (err) {
        console.error('Ошибка при скачивании файла:', err);
        res.status(500).json({ message: 'Ошибка при скачивании файла' });
    }
});

module.exports = router; 
const express = require('express');
const router = express.Router();
const Recording = require('../models/Recording');
const Call = require('../models/Call');
const auth = require('../middleware/auth');
const transcriptionService = require('../services/transcriptionService');
const fs = require('fs');

// Загрузка аудио для транскрибации
router.post('/upload', auth, async (req, res) => {
    try {
        const { callId } = req.body;
        console.log('Получен callId:', callId);

        // Получаем путь к файлу звонка
        const call = await Call.findById(callId);
        if (!call) {
            throw new Error('Звонок не найден');
        }
        console.log('Найден звонок:', call);

        // Проверяем существование файла
        if (!fs.existsSync(call.filePath)) {
            throw new Error('Файл не найден на диске');
        }

        // Отправляем файл на транскрибацию
        const transcribeResult = await transcriptionService.transcribe(
            call.filePath,
            call.fileName
        );

        if (!transcribeResult.success) {
            throw new Error(`Ошибка отправки на транскрибацию: ${transcribeResult.error}`);
        }
        console.log('Результат транскрибации:', transcribeResult);

        // Создаем запись о транскрибации
        const recording = new Recording({
            userId: req.user._id,
            callId: callId,
            jobId: transcribeResult.orderId,
            status: 'processing'
        });
        await recording.save();
        console.log('Создана запись о транскрибации:', recording);

        res.json({
            success: true,
            recordingId: recording._id
        });

    } catch (error) {
        console.error('Upload error:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// Получение статуса транскрибации
router.get('/:id/status', auth, async (req, res) => {
    try {
        const recording = await Recording.findById(req.params.id);
        
        if (!recording) {
            return res.status(404).json({
                success: false,
                message: 'Запись не н��йдена'
            });
        }

        if (recording.status === 'processing' || recording.status === 'pending') {
            const statusResult = await transcriptionService.checkTranscriptionStatus(recording.jobId);
            
            if (statusResult.status === 'completed') {
                recording.status = 'completed';
                recording.transcription = statusResult.transcription;
                recording.completedAt = new Date();
                await recording.save();
            } else if (statusResult.status === 'error') {
                recording.status = 'error';
                recording.error = statusResult.error;
                await recording.save();
            } else if (statusResult.status === 'processing') {
                recording.progress = statusResult.progress;
                await recording.save();
            }
        }

        res.json({
            success: true,
            status: recording.status,
            transcription: recording.transcription,
            error: recording.error
        });

    } catch (error) {
        console.error('Status check error:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

module.exports = router;
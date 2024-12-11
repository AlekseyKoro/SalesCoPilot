const axios = require('axios');
const fs = require('fs');

class TranscriptionService {
    constructor() {
        this.apiKey = process.env.TRANSCRIPTOR_API_KEY;
        this.baseUrl = 'https://api.tor.app/developer/transcription';
        
        console.log('TranscriptionService initialized with:');
        console.log('API URL:', this.baseUrl);
        console.log('API Key:', this.apiKey ? 'Present' : 'Missing');

        // Настраиваем базовые заголовки
        this.headers = {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.apiKey}`,
            'Accept': 'application/json'
        };
    }

    async transcribe(filePath, fileName) {
        try {
            console.log('Начало транскрибации файла:', fileName);
            
            // Шаг 1: Получаем URL для загрузки
            const uploadUrlResponse = await axios.post(
                `${this.baseUrl}/local_file/get_upload_url`,
                { file_name: fileName },
                { headers: this.headers }
            );
            
            if (!uploadUrlResponse.data.upload_url || !uploadUrlResponse.data.public_url) {
                throw new Error('Не получены URL для загрузки');
            }

            const { upload_url, public_url } = uploadUrlResponse.data;
            console.log('Получены URL:', { upload_url, public_url });

            // Шаг 2: Загружаем файл
            const fileStream = fs.createReadStream(filePath);
            const uploadResponse = await axios.put(upload_url, fileStream, {
                headers: {
                    'Content-Type': 'audio/mpeg'
                }
            });

            if (uploadResponse.status !== 200) {
                throw new Error('Ошибка загрузки файла');
            }
            console.log('Файл успешно загружен');

            // Шаг 3: Запускаем транскрибацию
            const transcriptionConfig = {
                url: public_url,
                language: "ru-RU",
                service: "Standard",
                triggering_word: "говорит" // Для разделения реплик
            };

            const transcriptionResponse = await axios.post(
                `${this.baseUrl}/local_file/initiate_transcription`,
                transcriptionConfig,
                { headers: this.headers }
            );

            if (transcriptionResponse.status !== 202) {
                throw new Error('Ошибка запуска транскрибации');
            }

            console.log('Транскрибация запущена:', transcriptionResponse.data);
            
            return {
                success: true,
                orderId: transcriptionResponse.data.order_id,
                message: transcriptionResponse.data.message
            };
        } catch (error) {
            console.error('Ошибка транскрибации:', {
                status: error.response?.status,
                data: error.response?.data,
                message: error.message
            });
            return {
                success: false,
                error: error.response?.data?.message || error.message
            };
        }
    }

    async checkTranscriptionStatus(orderId) {
        try {
            console.log('Проверка статуса транскрибации:', orderId);
            
            const response = await axios.get(
                `${this.baseUrl}/local_file/get_file_detail`,
                {
                    headers: this.headers,
                    params: { order_id: orderId }
                }
            );

            console.log('Получен статус транскрибации:', response.data);

            if (response.data.status === 'completed') {
                return {
                    status: 'completed',
                    transcription: response.data.transcription,
                    progress: 100
                };
            }

            return {
                status: response.data.status,
                progress: response.data.progress || 0
            };
        } catch (error) {
            console.error('Ошибка проверки статуса:', {
                status: error.response?.status,
                data: error.response?.data,
                message: error.message
            });
            return {
                status: 'error',
                error: error.response?.data?.message || error.message
            };
        }
    }
}

module.exports = new TranscriptionService(); 
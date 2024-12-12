document.addEventListener('DOMContentLoaded', function() {
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = '/login';
        return;
    }

    // Добавляем токен в заголовки для всех запросов
    const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
    };

    // Проверяем валидность токена
    fetch('/api/auth/me', {
        headers: headers
    })
    .then(response => {
        if (!response.ok) {
            throw new Error(response.statusText);
        }
        return response.json();
    })
    .then(userData => {
        // Устанавливаем имя пользователя
        document.getElementById('userName').textContent = userData.name;
        initializeDashboard(userData);
    })
    .catch(err => {
        console.error('Ошибка авторизации:', err);
        localStorage.removeItem('token');
        window.location.href = '/login';
    });

    function initializeDashboard(userData) {
        const dropZone = document.getElementById('dropZone');
        const fileInput = document.getElementById('audioFile');
        const fileInfo = document.getElementById('fileInfo');
        const fileName = document.getElementById('fileName');
        const uploadBtn = document.getElementById('uploadBtn');
        const callsList = document.getElementById('callsList');
        const logoutBtn = document.getElementById('logoutBtn');

        // Загрузка списка звонков
        loadCalls();

        // Обработка drag and drop
        dropZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.stopPropagation();
            dropZone.classList.add('dragover');
        });

        dropZone.addEventListener('dragleave', (e) => {
            e.preventDefault();
            e.stopPropagation();
            dropZone.classList.remove('dragover');
        });

        dropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            e.stopPropagation();
            dropZone.classList.remove('dragover');
            handleFiles(e.dataTransfer.files);
        });

        // Обработка выбора файла через input
        fileInput.addEventListener('change', (e) => {
            handleFiles(e.target.files);
        });

        // Обработка клика на зону загрузки
        dropZone.addEventListener('click', (e) => {
            // Если клик был не по label
            if (!e.target.closest('label')) {
                fileInput.click();
            }
        });

        // Загрузка файла на сервер
        uploadBtn.addEventListener('click', uploadFile);

        // Выход из системы
        logoutBtn.addEventListener('click', logout);

        function handleFiles(files) {
            if (files.length > 0) {
                const file = files[0];
                if (file.type.startsWith('audio/')) {
                    fileName.textContent = file.name;
                    fileInfo.classList.remove('hidden');
                    fileInput.files = files;
                } else {
                    showNotification('Пожалуйста, выберите аудиофайл', 'error');
                }
            }
        }

        async function uploadFile() {
            const file = fileInput.files[0];
            if (!file) {
                console.log('Файл не выбран');
                return;
            }

            try {
                // Создаем FormData и добавляем файл
                const formData = new FormData();
                formData.append('audio', file);
                console.log('Подготовлен файл для загрузки:', file.name);

                // Загружаем файл
                const uploadResponse = await fetch('/api/calls/upload', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`
                    },
                    body: formData
                });

                if (!checkAuthAndRedirect(uploadResponse)) return;

                const uploadData = await uploadResponse.json();
                console.log('Ответ от сервера после загрузки файла:', JSON.stringify(uploadData, null, 2));

                if (!uploadResponse.ok) {
                    throw new Error(uploadData.message || 'Ошибка загрузки файла');
                }

                // Проверяем наличие необходимых данных
                if (!uploadData.file || !uploadData.file._id) {
                    console.error('Некорректный ответ сервера:', uploadData);
                    throw new Error('Некорректный ответ сервера: отсутствует ID файла');
                }

                // Запускаем транскрибацию
                console.log('Запускаем транскрибацию для файла:', uploadData.file._id);
                const transcribeResponse = await fetch('/api/recordings/upload', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({ callId: uploadData.file._id })
                });

                const transcribeData = await transcribeResponse.json();
                console.log('Ответ от сервера после запуска транскрибации:', transcribeData);

                if (transcribeData.success) {
                    updateTranscriptionStatus('processing', 0);
                    pollTranscriptionStatus(transcribeData.recordingId);
                } else {
                    throw new Error(transcribeData.message || 'Ошибка запуска транскрибации');
                }

                showNotification('Файл успешно загружен', 'success');
                fileInfo.classList.add('hidden');
                fileInput.value = '';
                loadCalls();

            } catch (err) {
                showNotification(`Ошибка: ${err.message}`, 'error');
                console.error('Ошибка:', err);
            }
        }

        async function loadCalls() {
            try {
                const response = await fetch('/api/calls', {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });

                if (!checkAuthAndRedirect(response)) return;

                const data = await response.json();

                if (!response.ok) {
                    throw new Error(data.message || 'Ошибка загрузки звонков');
                }

                displayCalls(data.calls);

            } catch (err) {
                showNotification('Ошибка при загрузке списка звонков', 'error');
                console.error('Ошибка загрузки звонков:', err);
            }
        }

        function displayCalls(calls) {
            callsList.innerHTML = calls.length ? '' : '<p>Нет загруженных звонков</p>';
            
            calls.forEach(call => {
                const callElement = document.createElement('div');
                callElement.className = 'call-item';
                callElement.innerHTML = `
                    <div class="call-info">
                        <div class="call-name">${call.fileName}</div>
                        <div class="call-date">${new Date(call.uploadDate).toLocaleString()}</div>
                    </div>
                    <div class="call-controls">
                        <button class="play-btn" data-id="${call._id}">
                            <i class="fas fa-play"></i> Прослушать
                        </button>
                        <button class="download-btn" data-id="${call._id}">
                            <i class="fas fa-download"></i> Скачать
                        </button>
                        <button class="delete-btn" data-id="${call._id}">
                            <i class="fas fa-trash"></i> Удалить
                        </button>
                    </div>
                `;

                // Добавляем обработчики событий для кнопок
                const playBtn = callElement.querySelector('.play-btn');
                const downloadBtn = callElement.querySelector('.download-btn');
                const deleteBtn = callElement.querySelector('.delete-btn');

                playBtn.addEventListener('click', () => playCall(call._id));
                downloadBtn.addEventListener('click', () => downloadCall(call._id));
                deleteBtn.addEventListener('click', () => deleteCall(call._id));

                callsList.appendChild(callElement);
            });
        }

        // Добавим функцию удаления
        async function deleteCall(callId) {
            try {
                const response = await fetch(`/api/calls/${callId}`, {
                    method: 'DELETE',
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });

                if (!response.ok) {
                    throw new Error('Ошибка при удалении файла');
                }

                showNotification('Файл успешно удален', 'success');
                loadCalls(); // Перезагружаем список файлов
            } catch (err) {
                showNotification(`Ошибка при удалении: ${err.message}`, 'error');
                console.error('Ошибка удаления:', err);
            }
        }

        function logout() {
            localStorage.removeItem('token');
            window.location.href = '/login';
        }

        function updateTranscriptionStatus(status, progress = 0) {
            const statusElement = document.querySelector('.status-text');
            const progressBar = document.querySelector('.progress-bar-fill');

            switch (status) {
                case 'pending':
                    statusElement.textContent = 'Ожидание...';
                    progressBar.style.width = '0%';
                    break;
                case 'processing':
                    statusElement.textContent = 'Транскрибация...';
                    progressBar.style.width = `${progress}%`;
                    break;
                case 'completed':
                    statusElement.textContent = 'Транскрибация завершена';
                    progressBar.style.width = '100%';
                    break;
                case 'error':
                    statusElement.textContent = 'Ошибка транскрибации';
                    progressBar.style.width = '0%';
                    break;
            }
        }

        async function pollTranscriptionStatus(recordingId) {
            console.log('Начинаем проверку статуса транскрибации:', recordingId);
            let progress = 0;
            
            const interval = setInterval(async () => {
                try {
                    const response = await fetch(`/api/recordings/${recordingId}/status`, {
                        headers: {
                            'Authorization': `Bearer ${token}`
                        }
                    });
                    const data = await response.json();
                    console.log('Статус транскрибации:', data);
                    
                    if (data.status === 'processing') {
                        progress = Math.min(progress + 10, 90); // Имитация прогресса
                        updateTranscriptionStatus('processing', progress);
                    } else if (data.status === 'completed') {
                        clearInterval(interval);
                        updateTranscriptionStatus('completed');
                        displayTranscription(data.transcription);
                        showNotification('Транскрибация завершена', 'success');
                    } else if (data.status === 'error') {
                        clearInterval(interval);
                        updateTranscriptionStatus('error');
                        showNotification('Ошибка транскрибации', 'error');
                    }
                } catch (error) {
                    clearInterval(interval);
                    updateTranscriptionStatus('error');
                    console.error('Ошибка проверки статуса:', error);
                    showNotification('Ошибка проверки статуса транскрибации', 'error');
                }
            }, 5000);
        }

        function displayTranscription(text) {
            const transcriptionElement = document.getElementById('transcriptionText');
            transcriptionElement.textContent = text || 'Транскрипция недоступна';
        }

        function checkAuthAndRedirect(response) {
            if (response.status === 401) {
                localStorage.removeItem('token');
                window.location.href = '/login';
                return false;
            }
            return true;
        }
    }
}); 
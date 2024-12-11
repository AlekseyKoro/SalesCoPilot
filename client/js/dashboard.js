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
            if (!file) return;

            const formData = new FormData();
            formData.append('audio', file);

            try {
                const response = await fetch('/api/calls/upload', {
                    method: 'POST',
                    headers: headers,
                    body: formData
                });

                const data = await response.json();

                if (!response.ok) {
                    throw new Error(data.message || 'Ошибка загрузки файла');
                }

                showNotification('Файл успешно загружен', 'success');
                fileInfo.classList.add('hidden');
                fileInput.value = '';
                loadCalls(); // Обновляем список звонков

            } catch (err) {
                showNotification(err.message, 'error');
                console.error('Ошибка загрузки:', err);
            }
        }

        async function loadCalls() {
            try {
                const response = await fetch('/api/calls', {
                    headers: headers
                });

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
                    </div>
                `;
                callsList.appendChild(callElement);
            });
        }

        function logout() {
            localStorage.removeItem('token');
            window.location.href = '/login';
        }
    }
}); 
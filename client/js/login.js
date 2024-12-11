document.addEventListener('DOMContentLoaded', function() {
    const identifierInput = document.getElementById('loginIdentifier');
    const form = document.getElementById('loginForm');
    
    identifierInput.addEventListener('input', function(e) {
        const value = e.target.value;
        if (/^[\d\s()+\-]+$/.test(value)) {
            formatPhoneNumber(e.target);
        }
    });

    function formatPhoneNumber(input) {
        let value = input.value.replace(/\D/g, '');
        if (value.length > 0) {
            if (value.length <= 11) {
                value = value.match(/(\d{0,1})(\d{0,3})(\d{0,3})(\d{0,2})(\d{0,2})/);
                value = (!value[2] ? value[1] : value[1] + ' (' + value[2] + ') ' + 
                    (value[3] ? value[3] : '') +
                    (value[4] ? '-' + value[4] : '') +
                    (value[5] ? '-' + value[5] : ''));
            }
        }
        input.value = value;
    }

    form.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        try {
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    identifier: identifierInput.value,
                    password: document.getElementById('loginPassword').value
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Ошибка входа');
            }

            // Сохраняем токен
            localStorage.setItem('token', data.token);

            // Устанавливаем токен в cookie через отдельный запрос
            const redirectResponse = await fetch('/auth/redirect', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ token: data.token })
            });

            if (!redirectResponse.ok) {
                throw new Error('Ошибка установки cookie');
            }

            showNotification('Вход выполнен успешно!', 'success');
            window.location.href = '/dashboard';

        } catch (err) {
            showNotification(err.message, 'error');
            console.error('Ошибка входа:', err);
        }
    });
}); 
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
        
        const identifier = identifierInput.value;
        const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(identifier);
        const isPhone = /^[\d\s()+\-]{11,}$/.test(identifier.replace(/\D/g, ''));
        
        if (!isEmail && !isPhone) {
            showNotification('Пожалуйста, введите корректный email или номер телефона', 'error');
            return;
        }

        try {
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    identifier: identifier,
                    password: document.getElementById('loginPassword').value
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Ошибка входа');
            }

            console.log('Успешный вход, сохраняем токен');
            localStorage.setItem('token', data.token);
            showNotification('Вход выполнен успешно!', 'success');

            console.log('Начинаем редирект через 1 секунду');
            setTimeout(() => {
                redirectToDashboard();
            }, 1000);

        } catch (err) {
            showNotification(err.message, 'error');
            console.error('Ошибка входа:', err);
        }
    });
}); 
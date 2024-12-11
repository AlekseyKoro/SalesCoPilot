document.addEventListener('DOMContentLoaded', function() {
    const identifierInput = document.getElementById('registerIdentifier');
    const form = document.getElementById('registerForm');
    
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

        const password = document.getElementById('registerPassword').value;
        const passwordConfirm = document.getElementById('registerPasswordConfirm').value;
        
        if (password !== passwordConfirm) {
            showNotification('Пароли не совпадают', 'error');
            return;
        }

        try {
            const response = await fetch('/api/auth/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    name: document.getElementById('registerName').value,
                    identifier: identifier,
                    password: password
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Ошибка регистрации');
            }

            // Сохраняем токен
            localStorage.setItem('token', data.token);
            showNotification('Регистрация успешна!', 'success');
            
            // Перенаправляем через промежуточный редирект
            setTimeout(() => {
                redirectToDashboard();
            }, 1000);

        } catch (err) {
            showNotification(err.message, 'error');
            console.error('Ошибка регистрации:', err);
        }
    });
}); 
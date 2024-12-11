// Функция для перенаправления на dashboard с токеном
async function redirectToDashboard() {
    const token = localStorage.getItem('token');
    if (!token) {
        console.log('Нет токена для редиректа');
        window.location.href = '/login';
        return;
    }

    try {
        const response = await fetch('/auth/redirect', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ token })
        });

        if (response.ok) {
            window.location.href = '/dashboard';
        } else {
            throw new Error('Ошибка авторизации');
        }
    } catch (err) {
        console.error('Ошибка при редиректе:', err);
        localStorage.removeItem('token');
        window.location.href = '/login';
    }
} 
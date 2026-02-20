document.getElementById('login-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;

    try {
        const data = await apiFetch('/api/auth/login', {
            method: 'POST',
            body: JSON.stringify({ email, password })
        });

        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));

        showToast('Login successful! Redirecting...');
        setTimeout(() => {
            window.location.href = 'dashboard.html';
        }, 1500);
    } catch (err) {
        showToast(err.message, 'error');
    }
});

document.getElementById('register-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fullname = document.getElementById('reg-name').value;
    const email = document.getElementById('reg-email').value;
    const password = document.getElementById('reg-password').value;

    const faculty = document.getElementById('reg-faculty').value;

    try {
        await apiFetch('/api/auth/register', {
            method: 'POST',
            body: JSON.stringify({ fullname, email, password, faculty })
        });

        showToast('Registration successful! Please login.');
        setTimeout(() => {
            switchTab('login');
        }, 1500);
    } catch (err) {
        showToast(err.message, 'error');
    }
});

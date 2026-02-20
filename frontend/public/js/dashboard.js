let currentUser = null;
let allEvents = [];

document.addEventListener('DOMContentLoaded', async () => {
    currentUser = checkAuth();
    if (!currentUser) return;

    // Initial user sync
    syncUserUI();

    // Fetch fresh user data (includes profile pic)
    try {
        const freshUser = await apiFetch('/api/auth/me');
        currentUser = { ...currentUser, ...freshUser };
        syncUserUI();
    } catch (err) {
        console.error('Failed to fetch user data', err);
    }

    // Role-based visibility
    if (currentUser.role === 'admin') {
        document.getElementById('admin-mgmt-btn').style.display = 'block';
        document.getElementById('admin-regs-btn').style.display = 'block';
        document.getElementById('admin-users-btn').style.display = 'block';
        document.getElementById('admin-actions').style.display = 'block';
    } else {
        document.getElementById('student-regs-btn').style.display = 'block';
    }

    showSection('home');
    loadEvents();

    // Scroll Top Button Logic
    window.addEventListener('scroll', () => {
        const scrollBtn = document.getElementById('scroll-top');
        if (window.scrollY > 300) {
            scrollBtn.classList.add('visible');
        } else {
            scrollBtn.classList.remove('visible');
        }
    });
});

async function loadEvents() {
    try {
        allEvents = await apiFetch('/api/events');
        renderEvents();
        if (currentUser.role === 'admin') renderManageTable();
    } catch (err) {
        showToast('Failed to load events', 'error');
    }
}

function renderEvents() {
    const container = document.getElementById('browse-section');
    container.innerHTML = allEvents.map(event => {
        const isEnded = event.status === 'ended' || (event.registration_deadline && new Date(event.registration_deadline) < new Date());

        return `
        <div class="glass animate-fade event-card" onclick="viewEventDetails(${event.id})" style="cursor: pointer; padding: 0; overflow: hidden; display: flex; flex-direction: column; transition: 0.3s; ${isEnded ? 'filter: grayscale(1); opacity: 0.7;' : ''}">
            <div style="height: 160px; overflow: hidden; position: relative;">
                <img src="${event.image_url || 'https://images.unsplash.com/photo-1540575861501-7ad05823c9f5?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80'}" 
                    style="width: 100%; height: 100%; object-fit: cover; transition: 0.5s;">
                <div class="badge" style="position: absolute; top: 1rem; right: 1rem; background: ${isEnded ? '#475569' : 'var(--primary)'}; opacity: 0.9;">
                    ${isEnded ? 'ENDED' : formatDate(event.event_date)}
                </div>
            </div>
            <div style="padding: 1.5rem; flex: 1; display: flex; flex-direction: column;">
                <h3 style="margin-bottom: 0.5rem; font-size: 1.25rem; line-height: 1.4;">${event.title}</h3>
                <p style="color: var(--text-muted); font-size: 0.9rem; margin-bottom: 1rem; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">
                    ${event.description}
                </p>
                <div style="margin-top: auto;">
                    <div style="display: flex; gap: 1rem; font-size: 0.8rem; color: var(--text-muted); margin-bottom: 1rem;">
                        <span>📅 ${formatDate(event.event_date)}</span>
                        <span>👥 ${event.registered_count || 0}/${event.capacity} registered</span>
                    </div>
                ${currentUser.role === 'student' ? `
                    ${isEnded
                    ? `<button disabled class="btn btn-outline" style="width: 100%; padding: 0.5rem; font-size: 0.85rem; opacity: 0.5; cursor: not-allowed; border: 1px solid #475569; color: #94a3b8;">Registration Closed</button>`
                    : `<button onclick="event.stopPropagation(); registerForEvent(${event.id})" class="btn btn-primary" style="width: 100%; padding: 0.5rem; font-size: 0.85rem;">Register Now</button>`
                }
                ` : `
                    <div style="font-size: 0.75rem; color: var(--text-muted);">
                        📍 ${event.location}
                    </div>
                `}
                </div>
            </div>
        </div>
    `}).join('');
}

function renderManageTable() {
    const container = document.getElementById('manage-section');
    container.innerHTML = allEvents.map(event => `
        <div class="event-card animate-fade" onclick="viewEventDetails(${event.id})">
            <div class="image-container">
                <img src="${event.image_url || 'https://images.unsplash.com/photo-1540575861501-7ad05823c9f5?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80'}" style="${event.status === 'ended' ? 'filter: grayscale(1); opacity: 0.7;' : ''}">
                <span class="badge" style="background: ${event.status === 'ended' ? '#475569' : 'var(--success)'};">
                    ${event.status === 'ended' ? 'ENDED' : new Date(event.event_date).toLocaleDateString()}
                </span>
            </div>
            <div class="card-body">
                <h3>${event.title}</h3>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem;">
                    <button class="btn btn-outline" style="font-size: 0.75rem; padding: 0.4rem;" onclick="event.stopPropagation(); editEvent(${event.id})">Edit</button>
                    <button class="btn btn-outline" style="font-size: 0.75rem; padding: 0.4rem;" onclick="event.stopPropagation(); viewAttendees(${event.id})">Roster</button>
                    ${event.status !== 'ended' ? `
                        <button class="btn btn-outline" style="grid-column: span 2; font-size: 0.75rem; padding: 0.4rem; color: #f59e0b; border-color: #f59e0b;" onclick="event.stopPropagation(); endEvent(${event.id})">End Event</button>
                    ` : ''}
                    <button class="btn btn-outline" style="grid-column: span 2; font-size: 0.75rem; padding: 0.4rem; color: var(--danger); border-color: var(--danger);" onclick="event.stopPropagation(); deleteEvent(${event.id})">Delete</button>
                </div>
            </div>
        </div>
    `).join('');
}

function viewEventDetails(id) {
    const event = allEvents.find(e => e.id === id);
    if (!event) return;

    document.getElementById('detail-image').style.backgroundImage = `url('${event.image_url || 'https://images.unsplash.com/photo-1540575861501-7ad05823c9f5?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80'}')`;
    document.getElementById('detail-badge').textContent = new Date(event.event_date).toLocaleDateString();
    document.getElementById('detail-title').textContent = event.title;
    document.getElementById('detail-location').innerHTML = `📍 <b>Location:</b> ${event.location}`;
    document.getElementById('detail-time').innerHTML = `🕒 <b>Time:</b> ${event.event_time}`;
    document.getElementById('detail-capacity').innerHTML = `👥 <b>Participants:</b> ${event.registered_count || 0}/${event.capacity}`;
    document.getElementById('detail-deadline').innerHTML = `⌛ <b>Registration Deadline:</b> ${event.registration_deadline ? new Date(event.registration_deadline).toLocaleDateString() : 'None'}`;
    document.getElementById('detail-desc').textContent = event.description;

    const actionContainer = document.getElementById('detail-actions');
    let actionHTML = '';

    const isEnded = event.status === 'ended' || (event.registration_deadline && new Date(event.registration_deadline) < new Date());

    if (currentUser.role === 'student') {
        if (isEnded) {
            actionHTML = `<button disabled class="btn btn-outline" style="width: 100%; margin-bottom: 1rem; opacity: 0.6; cursor: not-allowed; border-color: #64748b; color: #94a3b8;">Registration Closed</button>`;
        } else {
            actionHTML = `<button onclick="registerForEvent(${event.id})" class="btn btn-primary" style="width: 100%; margin-bottom: 1rem;">Register for this Event</button>`;
        }
    } else {
        actionHTML = `
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1rem;">
                <button onclick="closeDetailsModal(); editEvent(${event.id})" class="btn btn-primary" style="width: 100%;">Edit Event</button>
                <button onclick="closeDetailsModal(); viewAttendees(${event.id})" class="btn btn-outline" style="width: 100%;">View Roster</button>
                <button onclick="closeDetailsModal(); deleteEvent(${event.id})" class="btn btn-outline" style="width: 100%; color: var(--danger); border-color: var(--danger); grid-column: span 2;">Delete Event</button>
            </div>
        `;
    }

    // Always add a prominent bottom close button
    actionHTML += `<button onclick="closeDetailsModal()" class="btn btn-outline" style="width: 100%; margin-top: 1rem; border-color: rgba(255,255,255,0.2);">Close Details</button>`;
    actionContainer.innerHTML = actionHTML;

    document.getElementById('details-modal').style.display = 'flex';
}

function closeDetailsModal() {
    document.getElementById('details-modal').style.display = 'none';
}

async function registerForEvent(eventId) {
    try {
        const response = await apiFetch('/api/registrations', {
            method: 'POST',
            body: JSON.stringify({ event_id: eventId })
        });
        showToast(response.message);
        if (document.getElementById('my-regs-section').style.display !== 'none') {
            loadMyRegistrations();
        }
    } catch (err) {
        showToast(err.message, 'error');
    }
}

async function loadMyRegistrations() {
    try {
        const regs = await apiFetch('/api/registrations/my-registrations');
        const container = document.getElementById('my-regs-section');
        if (regs.length === 0) {
            container.innerHTML = '<p style="grid-column: 1/-1; text-align: center;">You haven\'t registered for any events yet.</p>';
            return;
        }
        container.innerHTML = regs.map(reg => `
            <div class="event-card animate-fade" onclick="viewEventDetails(${reg.id})">
                <div class="image-container">
                    <img src="${reg.image_url || 'https://images.unsplash.com/photo-1540575861501-7ad05823c9f5?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80'}">
                    <span class="badge" style="background: var(--success);">${new Date(reg.event_date).toLocaleDateString()}</span>
                </div>
                <div class="card-body">
                    <h3>${reg.title}</h3>
                    <button onclick="event.stopPropagation(); cancelRegistration(${reg.reg_id})" class="btn btn-outline" style="width: 100%; color: var(--danger); border-color: var(--danger); padding: 0.4rem; font-size: 0.85rem;">Cancel Registration</button>
                </div>
            </div>
        `).join('');
    } catch (err) {
        console.error('Failed to load registrations:', err);
        showToast('Failed to load registrations', 'error');
    }
}

async function cancelRegistration(regId) {
    if (!confirm('Are you sure you want to cancel this registration?')) return;
    try {
        await apiFetch(`/api/registrations/${regId}`, { method: 'DELETE' });
        showToast('Registration cancelled');
        loadMyRegistrations();
    } catch (err) {
        showToast(err.message, 'error');
    }
}

// Section Switching
function showSection(section) {
    const sections = ['home-section', 'browse-section', 'my-regs-section', 'manage-section', 'all-regs-section', 'users-section', 'settings-section'];
    const tabs = document.querySelectorAll('.nav-item');

    sections.forEach(s => {
        const el = document.getElementById(s);
        if (el) el.style.display = 'none';
    });
    tabs.forEach(t => t.classList.remove('active'));

    if (section === 'home') {
        document.getElementById('home-section').style.display = 'block';
        document.getElementById('section-title').textContent = 'Home';
        tabs[0].classList.add('active');
        updateHomeStats();
    } else if (section === 'browse') {
        document.getElementById('browse-section').style.display = 'grid';
        document.getElementById('section-title').textContent = 'Browse Events';
        tabs[1].classList.add('active');
        loadEvents();
    } else if (section === 'my-regs') {
        document.getElementById('my-regs-section').style.display = 'grid';
        document.getElementById('section-title').textContent = 'My Registrations';
        tabs[2].classList.add('active');
        loadMyRegistrations();
    } else if (section === 'manage') {
        document.getElementById('manage-section').style.display = 'grid';
        document.getElementById('section-title').textContent = 'Manage Events';
        tabs[3].classList.add('active');
        loadEvents();
    } else if (section === 'all-regs') {
        document.getElementById('all-regs-section').style.display = 'block';
        document.getElementById('section-title').textContent = 'Student Registrations';
        tabs[4].classList.add('active');
        loadAllRegistrations();
    } else if (section === 'users') {
        document.getElementById('users-section').style.display = 'block';
        document.getElementById('section-title').textContent = 'User Management';
        document.getElementById('admin-users-btn').classList.add('active');
        loadAllUsers();
    } else if (section === 'settings') {
        document.getElementById('settings-section').style.display = 'block';
        document.getElementById('section-title').textContent = 'Account Settings';
        tabs[tabs.length - 1].classList.add('active');

        // Default to profile tab
        switchSettingsTab('profile');

        // Populate settings form
        document.getElementById('settings-fullname').value = currentUser.fullname || currentUser.name;
        document.getElementById('settings-faculty').value = currentUser.faculty || 'BCA';
        document.getElementById('settings-email').value = currentUser.email;
        const profilePreview = document.getElementById('settings-profile-preview');
        const defaultImg = `https://ui-avatars.com/api/?name=${encodeURIComponent(currentUser.fullname || currentUser.name)}&background=6366f1&color=fff`;
        profilePreview.src = currentUser.profile_pic || defaultImg;
    }
}

function switchSettingsTab(tab) {
    const profileBtn = document.getElementById('btn-settings-profile');
    const passwordBtn = document.getElementById('btn-settings-password');
    const profileCard = document.getElementById('settings-profile-card');
    const passwordCard = document.getElementById('settings-password-card');

    if (tab === 'profile') {
        profileBtn.className = 'btn btn-primary';
        passwordBtn.className = 'btn btn-outline';
        profileCard.style.display = 'block';
        passwordCard.style.display = 'none';
    } else {
        profileBtn.className = 'btn btn-outline';
        passwordBtn.className = 'btn btn-primary';
        profileCard.style.display = 'none';
        passwordCard.style.display = 'block';
    }
}

function syncUserUI() {
    if (!currentUser) return;
    const name = currentUser.fullname || currentUser.name;
    const defaultImg = `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=6366f1&color=fff`;
    const pic = currentUser.profile_pic || defaultImg;

    // Header
    document.getElementById('header-user-name').textContent = name;
    document.getElementById('header-user-img').src = pic;

    // Dropdown
    document.getElementById('dropdown-user-name').textContent = name;
    document.getElementById('dropdown-user-role').textContent = currentUser.role;
    document.getElementById('dropdown-user-faculty').textContent = currentUser.faculty || '';
}

async function updateHomeStats() {
    try {
        document.getElementById('welcome-name').textContent = currentUser.name;

        // Active Events Count
        const events = await apiFetch('/api/events');
        const activeEvents = events.filter(e => e.status !== 'ended');
        document.getElementById('stat-events-count').textContent = activeEvents.length;

        // My Registrations Count
        const myRegs = await apiFetch('/api/registrations/my-registrations');
        document.getElementById('stat-my-regs').textContent = myRegs.length;

        // New events this week
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
        const newEvents = events.filter(e => new Date(e.created_at) > oneWeekAgo);
        document.getElementById('stat-new').textContent = newEvents.length;

    } catch (err) {
        console.error('Stats update error:', err);
    }
}

async function loadAllRegistrations() {
    try {
        const regs = await apiFetch('/api/registrations/all');
        const tbody = document.getElementById('all-regs-table-body');
        tbody.innerHTML = regs.map(reg => `
            <tr style="border-bottom: 1px solid var(--glass-border);">
                <td style="padding: 1rem;">${reg.student_name}</td>
                <td style="padding: 1rem;">${reg.faculty || '-'}</td>
                <td style="padding: 1rem;">${reg.email}</td>
                <td style="padding: 1rem;">${reg.event_title}</td>
                <td style="padding: 1rem; font-size: 0.85rem; color: var(--text-muted);">
                    ${new Date(reg.registration_date).toLocaleString()}
                </td>
            </tr>
        `).join('');
    } catch (err) {
        showToast('Failed to load registrations', 'error');
    }
}

async function loadAllUsers() {
    try {
        const users = await apiFetch('/api/auth/students');
        const tbody = document.getElementById('users-table-body');
        tbody.innerHTML = users.map(user => `
            <tr style="border-bottom: 1px solid var(--glass-border);">
                <td style="padding: 1rem;">${user.fullname}</td>
                <td style="padding: 1rem;">${user.faculty || '-'}</td>
                <td style="padding: 1rem;">${user.email}</td>
                <td style="padding: 1rem; color: var(--text-muted); font-size: 0.85rem;">
                    ${new Date(user.created_at).toLocaleDateString()}
                </td>
                <td style="padding: 1rem; text-align: right;">
                    <button class="btn btn-outline" style="font-size: 0.75rem; padding: 0.4rem 1rem;" 
                        onclick="resetUserPassword(${user.id})">Reset Password</button>
                </td>
            </tr>
        `).join('');
    } catch (err) {
        showToast(err.message, 'error');
    }
}

async function resetUserPassword(userId) {
    if (!confirm('Are you sure you want to reset this student\'s password to "password123"?')) return;
    try {
        const response = await apiFetch(`/api/auth/reset-user-password/${userId}`, { method: 'POST' });
        showToast(response.message);
    } catch (err) {
        showToast(err.message, 'error');
    }
}

// Admin Event CRUD
const eventModal = document.getElementById('event-modal');
const eventForm = document.getElementById('event-form');

function openModal(isEdit = false) {
    document.getElementById('modal-title').textContent = isEdit ? 'Edit Event' : 'Create New Event';
    if (!isEdit) {
        eventForm.reset();
        document.getElementById('event-id').value = '';
        document.getElementById('event-thumbnail').value = ''; // Ensure file input is cleared
        document.getElementById('image-preview').style.display = 'none';
    }
    eventModal.style.display = 'flex';
}

function closeModal() {
    eventModal.style.display = 'none';
}

function editEvent(id) {
    const event = allEvents.find(e => e.id === id);
    if (!event) return;

    document.getElementById('event-id').value = event.id;
    document.getElementById('event-title').value = event.title;
    document.getElementById('event-desc').value = event.description;
    document.getElementById('event-date').value = event.event_date.split('T')[0];
    document.getElementById('event-time').value = event.event_time;
    document.getElementById('event-location').value = event.location;
    document.getElementById('event-capacity').value = event.capacity;
    document.getElementById('event-deadline').value = event.registration_deadline ? event.registration_deadline.split('T')[0] : '';

    // Show current image as preview
    if (event.image_url) {
        document.getElementById('image-preview').style.display = 'block';
        document.getElementById('img-preview-src').src = event.image_url;
    } else {
        document.getElementById('image-preview').style.display = 'none';
    }

    openModal(true);
}

// Preview Image when selected
document.getElementById('event-thumbnail')?.addEventListener('change', function (e) {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function (event) {
            document.getElementById('image-preview').style.display = 'block';
            document.getElementById('img-preview-src').src = event.target.result;
        };
        reader.readAsDataURL(file);
    }
});

eventForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('event-id').value;

    const formData = new FormData();
    formData.append('title', document.getElementById('event-title').value);
    formData.append('description', document.getElementById('event-desc').value);
    formData.append('event_date', document.getElementById('event-date').value);
    formData.append('event_time', document.getElementById('event-time').value);
    formData.append('location', document.getElementById('event-location').value);
    formData.append('capacity', document.getElementById('event-capacity').value);
    const deadlineValue = document.getElementById('event-deadline').value;
    formData.append('registration_deadline', deadlineValue || null);

    const imageFile = document.getElementById('event-thumbnail').files[0];
    if (imageFile) {
        formData.append('thumbnail', imageFile);
    }

    try {
        const method = id ? 'PUT' : 'POST';
        const url = id ? `/api/events/${id}` : '/api/events';

        await apiFetch(url, {
            method,
            body: formData // Body is now FormData
        });

        showToast(id ? 'Event updated' : 'Event created');
        closeModal();
        loadEvents();
    } catch (err) {
        showToast(err.message, 'error');
    }
});

async function deleteEvent(id) {
    if (!confirm('Are you sure you want to delete this event?')) return;
    try {
        await apiFetch(`/api/events/${id}`, { method: 'DELETE' });
        showToast('Event deleted');
        loadEvents();
    } catch (err) {
        showToast(err.message, 'error');
    }
}

async function endEvent(id) {
    if (!confirm('Are you sure you want to end this event? This will close registrations.')) return;
    try {
        await apiFetch(`/api/events/${id}/end`, { method: 'PATCH' });
        showToast('Event marked as ended');
        loadEvents();
    } catch (err) {
        showToast(err.message, 'error');
    }
}

async function viewAttendees(eventId) {
    try {
        const attendees = await apiFetch(`/api/registrations/event/${eventId}`);
        const list = document.getElementById('attendee-list');
        if (attendees.length === 0) {
            list.innerHTML = '<p>No students registered yet.</p>';
        } else {
            list.innerHTML = attendees.map(a => `
                <div class="glass" style="padding: 1rem; margin-bottom: 0.5rem; display: flex; justify-content: space-between;">
                    <div>
                        <div style="font-weight: 600;">${a.fullname} <span style="font-size:0.8em; color:var(--primary); margin-left:5px;">${a.faculty || ''}</span></div>
                        <div style="font-size: 0.8rem; color: var(--text-muted);">${a.email}</div>
                    </div>
                    <div style="font-size: 0.8rem; color: var(--text-muted);">
                        ${new Date(a.registration_date).toLocaleDateString()}
                    </div>
                </div>
            `).join('');
        }
        document.getElementById('attendees-modal').style.display = 'flex';
    } catch (err) {
        showToast('Failed to load attendees', 'error');
    }
}

function closeAttendeesModal() {
    document.getElementById('attendees-modal').style.display = 'none';
}

// Profile Update Logic
const updateProfileForm = document.getElementById('update-profile-form');
const profilePicInput = document.getElementById('profile-pic-input');

if (profilePicInput) {
    profilePicInput.addEventListener('change', function (e) {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function (event) {
                document.getElementById('settings-profile-preview').src = event.target.result;
            };
            reader.readAsDataURL(file);
        }
    });
}

if (updateProfileForm) {
    updateProfileForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const fullname = document.getElementById('settings-fullname').value;
        const faculty = document.getElementById('settings-faculty').value;
        const picFile = profilePicInput.files[0];

        const formData = new FormData();
        formData.append('fullname', fullname);
        formData.append('faculty', faculty);
        if (picFile) formData.append('profile_pic', picFile);

        try {
            const response = await apiFetch('/api/auth/update-profile', {
                method: 'POST',
                body: formData
            });

            showToast(response.message);
            // Update local state
            currentUser.fullname = fullname;
            currentUser.faculty = faculty;
            if (response.profile_pic) currentUser.profile_pic = response.profile_pic;

            syncUserUI();
        } catch (err) {
            showToast(err.message, 'error');
        }
    });
}

// Settings / Change Password
const changePasswordForm = document.getElementById('change-password-form');
if (changePasswordForm) {
    changePasswordForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const currentPassword = document.getElementById('current-password').value;
        const newPassword = document.getElementById('new-password').value;
        const confirmPassword = document.getElementById('confirm-password').value;

        if (newPassword !== confirmPassword) {
            return showToast('New passwords do not match', 'error');
        }

        try {
            const response = await apiFetch('/api/auth/change-password', {
                method: 'POST',
                body: JSON.stringify({ currentPassword, newPassword })
            });
            showToast(response.message);
            changePasswordForm.reset();
        } catch (err) {
            showToast(err.message, 'error');
        }
    });
}
// Close modals when clicking outside
window.addEventListener('click', (event) => {
    if (event.target.classList.contains('modal')) {
        event.target.style.display = "none";
    }
});

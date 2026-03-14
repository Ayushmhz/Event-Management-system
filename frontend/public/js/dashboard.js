let currentUser = null;
let allEvents = [];
let currentActiveSection = null;

function syncUserUI() {
    if (!currentUser) return;

    // 1. Robust Role & Name Detection
    const userRole = (currentUser.role || 'student').toLowerCase();
    const isAdmin = userRole === 'admin';
    const fullName = currentUser.fullname || currentUser.name || (currentUser.email ? currentUser.email.split('@')[0] : (isAdmin ? 'Admin' : 'Student'));

    // Debug log for troubleshooting (visible in developer console)
    console.log('Syncing UI for:', { name: fullName, role: userRole, isAdmin });

    // Better Image Path Handling
    let profilePic = currentUser.profile_pic;
    if (!profilePic || profilePic === 'null' || profilePic === 'undefined') {
        profilePic = `https://ui-avatars.com/api/?name=${encodeURIComponent(fullName)}&background=6366f1&color=fff`;
    } else if (typeof profilePic === 'string' && !profilePic.startsWith('http')) {
        if (profilePic.includes('college-events')) {
            // Fix Cloudinary URLs that were saved as just the public ID or relative path
            const cleanPath = profilePic.startsWith('/') ? profilePic.substring(1) : profilePic;
            profilePic = `https://res.cloudinary.com/dr4c4n41l/image/upload/${cleanPath}`;
        } else {
            profilePic = profilePic.startsWith('/') ? profilePic : '/' + profilePic;
        }
    }
    
    // Debug log for profile picture URL
    console.log('Profile picture URL:', profilePic);


    // 2. Navigation & Actions Visibility
    const adminMgmt = document.getElementById('admin-mgmt-btn');
    const adminRegs = document.getElementById('admin-regs-btn');
    const adminUsers = document.getElementById('admin-users-btn');
    const adminActions = document.getElementById('admin-actions');
    const studentRegs = document.getElementById('student-regs-btn');

    if (isAdmin) {
        if (adminMgmt) adminMgmt.style.display = 'block';
        if (adminRegs) adminRegs.style.display = 'block';
        if (adminUsers) adminUsers.style.display = 'block';
        if (adminActions) adminActions.style.display = 'block';
        if (studentRegs) studentRegs.style.display = 'none';

        const dropRole = document.getElementById('dropdown-user-role');
        if (dropRole) dropRole.textContent = 'Administrator';
    } else {
        if (adminMgmt) adminMgmt.style.display = 'none';
        if (adminRegs) adminRegs.style.display = 'none';
        if (adminUsers) adminUsers.style.display = 'none';
        if (adminActions) adminActions.style.display = 'none';
        if (studentRegs) studentRegs.style.display = 'block';

        const dropRole = document.getElementById('dropdown-user-role');
        if (dropRole) dropRole.textContent = 'Student';
    }

    // 3. Header & Welcome Section
    const headerName = document.getElementById('header-user-name');
    if (headerName) headerName.textContent = fullName;
    const headerImg = document.getElementById('header-user-img');
    if (headerImg) headerImg.src = profilePic;

    const dropName = document.getElementById('dropdown-user-name');
    if (dropName) dropName.textContent = fullName;

    const dropFaculty = document.getElementById('dropdown-user-faculty');
    if (dropFaculty) {
        dropFaculty.textContent = currentUser.faculty || '';
        dropFaculty.style.display = 'block';
    }

    const welcome = document.getElementById('welcome-name');
    if (welcome) welcome.textContent = fullName;

    // 4. Settings Form
    const nameInput = document.getElementById('settings-fullname');
    if (nameInput) nameInput.value = fullName;

    const emailInput = document.getElementById('settings-email');
    if (emailInput) {
        emailInput.value = currentUser.email || '';
        emailInput.disabled = true;
    }

    const facultyGroup = document.getElementById('settings-faculty-group');
    if (facultyGroup) facultyGroup.style.display = 'block';

    const facultySelect = document.getElementById('settings-faculty');
    if (facultySelect) facultySelect.value = currentUser.faculty || 'BCA';

    const settingsPreview = document.getElementById('settings-profile-preview');
    if (settingsPreview) {
        settingsPreview.src = profilePic;
        settingsPreview.alt = fullName;
    }
}

document.addEventListener('DOMContentLoaded', async () => {
    currentUser = checkAuth();
    if (!currentUser) return;

    // Phase 1: Immediate UI update using cached localStorage data (fixes flickers)
    syncUserUI();

    // Load initial section and data IMMEDIATELY (don't wait for server)
    showSection('home');
    loadEvents();

    // Phase 2: Background refresh from server (non-blocking for UI)
    try {
        const freshUser = await apiFetch('/api/auth/me');
        if (freshUser) {
            currentUser = freshUser;
            localStorage.setItem('user', JSON.stringify(freshUser));
            syncUserUI(); // Re-sync with fresh server data
        }
    } catch (err) {
        console.error('Failed to refresh user data:', err);
    }

    // Scroll Top Button Logic
    window.addEventListener('scroll', () => {
        const scrollBtn = document.getElementById('scroll-top');
        if (scrollBtn) {
            if (window.scrollY > 300) {
                scrollBtn.classList.add('visible');
            } else {
                scrollBtn.classList.remove('visible');
            }
        }
    });
});

async function loadEvents(force = false) {
    // If we have data, show it immediately
    if (allEvents.length > 0) {
        renderEvents();
        if ((currentUser.role || '').toLowerCase() === 'admin') renderManageTable();
    }

    try {
        const freshEvents = await apiFetch('/api/events');

        // Flicker Prevention: Only re-render if data has actually changed
        if (allEvents.length > 0 && JSON.stringify(freshEvents) === JSON.stringify(allEvents)) {
            return;
        }

        allEvents = freshEvents;
        renderEvents();
        if ((currentUser.role || '').toLowerCase() === 'admin') renderManageTable();
    } catch (err) {
        console.error('Events load error:', err);
    }
}

function renderEvents() {
    const container = document.getElementById('browse-section');
    if (!container) return;

    const newHTML = allEvents.map(event => {
        const isEnded = event.status === 'ended' || (event.registration_deadline && new Date(event.registration_deadline) < new Date());

        return `
        <div class="glass event-card" onclick="viewEventDetails(${event.id})" style="cursor: pointer; padding: 0; overflow: hidden; display: flex; flex-direction: column; transition: 0.3s; ${isEnded ? 'filter: grayscale(1); opacity: 0.7;' : ''}">
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
                ${(currentUser.role || '').toLowerCase() === 'student' ? `
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

    if (container.innerHTML.trim() !== newHTML.trim()) {
        container.innerHTML = newHTML;
    }
}

function renderManageTable() {
    const container = document.getElementById('manage-section');
    if (!container) return;

    const newHTML = allEvents.map(event => `
        <div class="event-card" onclick="viewEventDetails(${event.id})">
            <div class="image-container">
                <img src="${event.image_url || 'https://images.unsplash.com/photo-1540575861501-7ad05823c9f5?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80'}" style="${event.status === 'ended' ? 'filter: grayscale(1); opacity: 0.7;' : ''}">
                <span class="badge" style="background: ${event.status === 'ended' ? '#475569' : 'var(--success)'};">
                    ${event.status === 'ended' ? 'ENDED' : new Date(event.event_date).toLocaleDateString()}
                </span>
            </div>
            <div class="card-body">
                <h3>${event.title}</h3>
                <div style="font-size: 0.8rem; color: var(--text-muted); margin-bottom: 0.5rem; display: flex; align-items: center; gap: 0.4rem;">
                    <span>👥</span> ${event.registered_count || 0}/${event.capacity} registered
                </div>
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

    if (container.innerHTML.trim() !== newHTML.trim()) {
        container.innerHTML = newHTML;
    }
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

    if ((currentUser.role || '').toLowerCase() === 'student') {
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
        const container = document.getElementById('my-regs-section');
        const freshRegs = await apiFetch('/api/registrations/my-registrations');

        if (freshRegs.length === 0) {
            container.innerHTML = '<p style="grid-column: 1/-1; text-align: center;">You haven\'t registered for any events yet.</p>';
            return;
        }

        // Potential re-render check (though regs change less often)
        const currentHTML = container.innerHTML;
        const newHTML = freshRegs.map(reg => `
            <div class="event-card" onclick="viewEventDetails(${reg.event_id})">
                <div class="image-container">
                    <img src="${reg.image_url || 'https://images.unsplash.com/photo-1540575861501-7ad05823c9f5?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80'}">
                    <span class="badge" style="background: var(--success);">${new Date(reg.event_date).toLocaleDateString()}</span>
                </div>
                <div class="card-body">
                    <h3 style="margin-bottom: 0.5rem;">${reg.title}</h3>
                    <div style="font-size: 0.8rem; color: var(--text-muted); margin-bottom: 1rem; display: flex; align-items: center; gap: 0.4rem;">
                        <span>👥</span> ${reg.registered_count || 0}/${reg.capacity} registered
                    </div>
                    <button onclick="event.stopPropagation(); cancelRegistration(${reg.reg_id})" class="btn btn-outline" style="width: 100%; color: var(--danger); border-color: var(--danger); padding: 0.4rem; font-size: 0.85rem;">Cancel Registration</button>
                </div>
            </div>
        `).join('');

        if (currentHTML.trim() !== newHTML.trim() || container.innerHTML.includes('haven\'t registered')) {
            container.innerHTML = newHTML;
        }
    } catch (err) {
        console.error('Failed to load registrations:', err);
        showToast(`Failed to load registrations: ${err.message}`, 'error');
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
    if (section === currentActiveSection && section !== 'settings') return;

    const sections = ['home-section', 'browse-section', 'my-regs-section', 'manage-section', 'all-regs-section', 'users-section', 'settings-section'];
    const tabs = document.querySelectorAll('.nav-item');

    // Fade out current section effectively
    sections.forEach(s => {
        const el = document.getElementById(s);
        if (el) {
            el.style.display = 'none';
            el.classList.remove('animate-fade', 'section-show', 'section-show-grid');
        }
    });
    tabs.forEach(t => t.classList.remove('active'));

    // Toggle Back Button visibility
    const backBtn = document.getElementById('back-to-home');
    if (backBtn) {
        backBtn.style.display = section === 'home' ? 'none' : 'block';
    }

    currentActiveSection = section;
    const targetId = section === 'home' ? 'home-section' :
        section === 'browse' ? 'browse-section' :
            section === 'my-regs' ? 'my-regs-section' :
                section === 'manage' ? 'manage-section' :
                    section === 'all-regs' ? 'all-regs-section' :
                        section === 'users' ? 'users-section' : 'settings-section';

    const targetEl = document.getElementById(targetId);
    if (!targetEl) return;

    // Apply appropriate display class
    const useGrid = ['browse-section', 'my-regs-section', 'manage-section'].includes(targetId);
    targetEl.classList.add(useGrid ? 'section-show-grid' : 'section-show');

    if (section === 'home') {
        document.getElementById('section-title').textContent = 'Home';
        tabs[0].classList.add('active');
        updateHomeStats();
    } else if (section === 'browse') {
        document.getElementById('section-title').textContent = 'Browse Events';
        tabs[1].classList.add('active');
        loadEvents();
    } else if (section === 'my-regs') {
        document.getElementById('section-title').textContent = 'My Registrations';
        tabs[2].classList.add('active');
        loadMyRegistrations();
    } else if (section === 'manage') {
        document.getElementById('section-title').textContent = 'Manage Events';
        tabs[3].classList.add('active');
        loadEvents();
    } else if (section === 'all-regs') {
        document.getElementById('section-title').textContent = 'Student Registrations';
        tabs[4].classList.add('active');
        loadAllRegistrations();
    } else if (section === 'users') {
        document.getElementById('section-title').textContent = 'User Management';
        const userBtn = document.getElementById('admin-users-btn');
        if (userBtn) userBtn.classList.add('active');
        loadAllUsers();
    } else if (section === 'settings') {
        document.getElementById('section-title').textContent = 'Account Settings';
        tabs[tabs.length - 1].classList.add('active');
        switchSettingsTab('profile');
        syncUserUI();
    }

    // Auto-close sidebar on mobile
    const sidebarContent = document.getElementById('sidebar-content');
    if (window.innerWidth <= 992 && sidebarContent && sidebarContent.classList.contains('active')) {
        toggleMobileMenu();
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

async function updateHomeStats() {
    try {
        const fullName = currentUser.fullname || currentUser.name || (currentUser.email ? currentUser.email.split('@')[0] : 'User');
        document.getElementById('welcome-name').textContent = fullName;

        // Active Events Count
        // Use allEvents if already loaded, otherwise fetch
        const events = allEvents.length > 0 ? allEvents : await apiFetch('/api/events');
        const activeEvents = events.filter(e => e.status !== 'ended');
        const statCount = document.getElementById('stat-events-count');
        if (statCount) statCount.textContent = activeEvents.length;

        // My Registrations Count
        const myRegs = await apiFetch('/api/registrations/my-registrations');
        const statRegs = document.getElementById('stat-my-regs');
        if (statRegs) statRegs.textContent = myRegs.length;

        // New events this week
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
        const newEventsList = events.filter(e => new Date(e.created_at) > oneWeekAgo);
        const statNew = document.getElementById('stat-new');
        if (statNew) statNew.textContent = newEventsList.length;

    } catch (err) {
        console.error('Stats update error:', err);
    }
}

// Load student registrations into a single grouped table (Admin only)
async function loadAllRegistrations() {
    try {
        const rows = await apiFetch('/api/registrations/grouped');
        const tbody = document.getElementById('grouped-regs-table-body');

        if (!rows || rows.length === 0) {
            tbody.innerHTML = `<tr><td colspan="4" style="padding: 1.5rem; text-align: center; color: var(--text-muted);">No registrations found.</td></tr>`;
            return;
        }

        // Group rows by user_id so we can calculate rowspan
        const grouped = {};
        const order = []; // preserve student order
        rows.forEach(row => {
            if (!grouped[row.user_id]) {
                grouped[row.user_id] = [];
                order.push(row.user_id);
            }
            grouped[row.user_id].push(row);
        });

        // Build HTML with rowspan for student name & faculty
        let html = '';
        order.forEach((userId, groupIndex) => {
            const studentRows = grouped[userId];
            const count = studentRows.length;

            // Alternate background for visual grouping
            const groupBg = groupIndex % 2 === 0 ? 'rgba(255,255,255,0.02)' : 'rgba(99,102,241,0.04)';

            studentRows.forEach((reg, i) => {
                const isFirst = i === 0;
                const isLast = i === count - 1;
                const topBorder = isFirst ? '2px solid var(--glass-border)' : '1px solid rgba(255,255,255,0.05)';
                const bottomBorder = isLast ? '2px solid var(--glass-border)' : 'none';

                html += `<tr style="background: ${groupBg}; border-top: ${topBorder}; border-bottom: ${bottomBorder};">`;

                // Student name & faculty — only on first row, with rowspan
                if (isFirst) {
                    html += `
                        <td rowspan="${count}" style="padding: 1rem; font-weight: 700; vertical-align: top; border-right: 1px solid rgba(255,255,255,0.07);">
                            ${reg.student_name}
                        </td>
                        <td rowspan="${count}" style="padding: 1rem; vertical-align: top; border-right: 1px solid rgba(255,255,255,0.07);">
                            <span style="background: rgba(99,102,241,0.15); color: var(--primary); padding: 0.2rem 0.7rem; border-radius: 20px; font-size: 0.78rem; font-weight: 600; white-space: nowrap;">
                                ${reg.faculty || '-'}
                            </span>
                        </td>`;
                }

                // Event name & registration time — every row
                html += `
                    <td style="padding: 0.85rem 1rem;">• ${reg.event_name}</td>
                    <td style="padding: 0.85rem 1rem; font-size: 0.83rem; color: var(--text-muted);">
                        ${new Date(reg.registration_date).toLocaleString()}
                    </td>
                    <td style="padding: 0.85rem 1rem; text-align: right;">
                        <button class="btn btn-outline" style="color: #ef4444; border-color: rgba(239, 68, 68, 0.3); font-size: 0.75rem; padding: 0.3rem 0.7rem;" 
                            onclick="deleteRegistrationAdmin(${reg.reg_id})">Delete</button>
                    </td>
                </tr>`;
            });
        });

        if (tbody.innerHTML.trim() !== html.trim()) {
            tbody.innerHTML = html;
        }
    } catch (err) {
        console.error('Registration report load error:', err);
    }
}

async function exportRegistrationsToExcel() {
    try {
        showToast('Preparing your Excel file...');
        const rows = await apiFetch('/api/registrations/grouped');

        if (!rows || rows.length === 0) {
            showToast('No data found to export.', 'error');
            return;
        }

        // Format data for SheetJS - One name per student grouping
        let lastUserId = null;
        const formattedData = rows.map(reg => {
            const isFirstOccurrence = reg.user_id !== lastUserId;
            lastUserId = reg.user_id;

            return {
                'Student Name': isFirstOccurrence ? reg.student_name : '',
                'Faculty': isFirstOccurrence ? (reg.faculty || '-') : '',
                'Event Registered': reg.event_name,
                'Registration Time': new Date(reg.registration_date).toLocaleString()
            };
        });

        // Create workbook and worksheet
        const worksheet = XLSX.utils.json_to_sheet(formattedData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Registrations");

        // Auto-size columns for better visibility
        const wscols = [
            { wch: 25 }, // Name
            { wch: 15 }, // Faculty
            { wch: 35 }, // Event
            { wch: 25 }  // Time
        ];
        worksheet['!cols'] = wscols;

        // Write and download the file
        XLSX.writeFile(workbook, `Student_Registrations_${new Date().toLocaleDateString().replace(/\//g, '-')}.xlsx`);
        showToast('Excel file downloaded successfully!', 'success');

    } catch (err) {
        console.error('Export error:', err);
        showToast('Failed to generate Excel file', 'error');
    }
}


async function loadAllUsers() {
    try {
        const users = await apiFetch('/api/auth/students');
        const tbody = document.getElementById('users-table-body');
        if (!tbody) return;
        const newHTML = users.map(user => `
            <tr style="border-bottom: 1px solid var(--glass-border);">
                <td style="padding: 1rem;">${user.fullname}</td>
                <td style="padding: 1rem;">${user.faculty || '-'}</td>
                <td style="padding: 1rem;">${user.email}</td>
                <td style="padding: 1rem; color: var(--text-muted); font-size: 0.85rem;">
                    ${new Date(user.created_at).toLocaleDateString()}
                </td>
                <td style="padding: 1rem; text-align: right; display: flex; gap: 0.5rem; justify-content: flex-end;">
                    <button class="btn btn-outline" style="font-size: 0.75rem; padding: 0.4rem 0.8rem;" 
                        onclick="resetUserPassword(${user.id})">Reset</button>
                    <button class="btn btn-outline" style="font-size: 0.75rem; padding: 0.4rem 0.8rem; color: #ef4444; border-color: rgba(239, 68, 68, 0.3);" 
                        onclick="deleteUser(${user.id}, '${user.fullname}')">Delete</button>
                </td>
</tr>
        `).join('');

        if (tbody.innerHTML.trim() !== newHTML.trim()) {
            tbody.innerHTML = newHTML;
        }
    } catch (err) {
        console.error('Users load error:', err);
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

async function deleteUser(userId, name) {
    if (!confirm(`CAUTION: Are you sure you want to delete user "${name}"? This will also remove all their event registrations. This action cannot be undone.`)) return;
    try {
        const response = await apiFetch(`/api/auth/${userId}`, { method: 'DELETE' });
        showToast(response.message);
        loadAllUsers(); // Refresh the list
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
    if (eventModal) eventModal.style.display = 'flex';
}

function closeModal() {
    if (eventModal) eventModal.style.display = 'none';
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

    const eventDate = document.getElementById('event-date').value;
    const deadlineValue = document.getElementById('event-deadline').value;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Client-side validation: Past date checks
    if (eventDate && new Date(eventDate) < today) {
        showToast('Event start date cannot be in the past.', 'error');
        return;
    }

    if (deadlineValue && new Date(deadlineValue) < today) {
        showToast('Registration deadline cannot be in the past.', 'error');
        return;
    }

    // Client-side validation: Deadline must be strictly earlier than Event Date
    if (deadlineValue && eventDate) {
        if (new Date(deadlineValue) >= new Date(eventDate)) {
            showToast('Registration deadline must be earlier than the event start date.', 'error');
            return;
        }
    }

    const formData = new FormData();
    formData.append('title', document.getElementById('event-title').value);
    formData.append('description', document.getElementById('event-desc').value);
    formData.append('event_date', eventDate);
    formData.append('event_time', document.getElementById('event-time').value);
    formData.append('location', document.getElementById('event-location').value);
    formData.append('capacity', document.getElementById('event-capacity').value);
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
                <div class="glass" style="padding: 1rem; margin-bottom: 0.5rem; display: flex; justify-content: space-between; align-items: center;">
                    <div>
                        <div style="font-weight: 600;">${a.fullname} <span style="font-size:0.8em; color:var(--primary); margin-left:5px;">${a.faculty || ''}</span></div>
                        <div style="font-size: 0.8rem; color: var(--text-muted);">${a.email}</div>
                    </div>
                    <div style="display: flex; align-items: center; gap: 1rem;">
                        <div style="font-size: 0.8rem; color: var(--text-muted); text-align: right;">
                            <div style="font-size: 0.65rem; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 2px; opacity: 0.6;">Registered</div>
                            ${new Date(a.registration_date).toLocaleDateString()}
                        </div>
                        <button class="btn" style="background: rgba(239, 68, 68, 0.1); color: #ef4444; border: 1px solid rgba(239, 68, 68, 0.2); padding: 4px 8px; font-size: 0.8rem; border-radius: 6px; cursor: pointer; transition: 0.2s;" 
                            onmouseover="this.style.background='rgba(239, 68, 68, 0.2)'" onmouseout="this.style.background='rgba(239, 68, 68, 0.1)'"
                            title="Remove student from event" onclick="removeStudentFromRoster(${eventId}, ${a.user_id}, '${a.fullname}')">❌</button>
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

// ===================== IMAGE CROPPER =====================
let cropImage = new Image();
let cropScale = 1;
let cropOffsetX = 0, cropOffsetY = 0;
let cropDragging = false;
let cropDragStartX = 0, cropDragStartY = 0;
let croppedBlob = null;

const CANVAS_SIZE = 260;

function drawCropCanvas() {
    const canvas = document.getElementById('crop-canvas');
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

    const scaledW = cropImage.width * cropScale;
    const scaledH = cropImage.height * cropScale;
    const x = (CANVAS_SIZE - scaledW) / 2 + cropOffsetX;
    const y = (CANVAS_SIZE - scaledH) / 2 + cropOffsetY;

    ctx.drawImage(cropImage, x, y, scaledW, scaledH);
}

function openCropModal(src) {
    cropImage = new Image();
    cropImage.onload = () => {
        cropScale = 1;
        cropOffsetX = 0;
        cropOffsetY = 0;
        document.getElementById('crop-zoom').value = 1;

        // Auto-fit: scale so image fills the circle (Cover behavior)
        const fitScale = Math.max(CANVAS_SIZE / cropImage.width, CANVAS_SIZE / cropImage.height);
        
        const slider = document.getElementById('crop-zoom');
        if (slider) {
            slider.min = (fitScale * 0.8).toFixed(4); // Allow slightly smaller than cover
            slider.max = (fitScale * 5).toFixed(4);   // Up to 5x cover zoom
            slider.step = "0.001";
            slider.value = fitScale;
        }

        cropScale = fitScale;
        drawCropCanvas();
        document.getElementById('crop-modal').style.display = 'flex';
    };

    cropImage.src = src;
}

function cancelCrop() {
    document.getElementById('crop-modal').style.display = 'none';
    document.getElementById('profile-pic-input').value = '';
    croppedBlob = null;
}

function applyCrop() {
    const canvas = document.getElementById('crop-canvas');
    canvas.toBlob(blob => {
        croppedBlob = blob;
        // Show preview in settings
        const url = URL.createObjectURL(blob);
        document.getElementById('settings-profile-preview').src = url;
        document.getElementById('crop-modal').style.display = 'none';

        // Reset the file input value so picking the same file again triggers 'change'
        const input = document.getElementById('profile-pic-input');
        if (input) input.value = '';

        // Scroll to the form so they see the Save button
        document.getElementById('update-profile-form').scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 'image/jpeg', 0.92);
}

const cropZoomSlider = document.getElementById('crop-zoom');
// Zoom from center
function setZoom(newScale) {
    const oldScale = cropScale;
    const minScale = parseFloat(cropZoomSlider.min) || 0.1;
    const maxScale = parseFloat(cropZoomSlider.max) || 10;
    
    cropScale = Math.max(minScale, Math.min(maxScale, parseFloat(newScale)));

    // Adjust offsets to zoom from center
    if (oldScale > 0) {
        cropOffsetX = (cropOffsetX * cropScale) / oldScale;
        cropOffsetY = (cropOffsetY * cropScale) / oldScale;
    }

    if (cropZoomSlider) cropZoomSlider.value = cropScale;
    drawCropCanvas();
}

if (cropZoomSlider) {
    cropZoomSlider.addEventListener('input', function () {
        setZoom(this.value);
    });
}


// Drag to reposition
const cropCanvas = document.getElementById('crop-canvas');
if (cropCanvas) {
    cropCanvas.addEventListener('mousedown', e => {
        cropDragging = true;
        cropDragStartX = e.clientX - cropOffsetX;
        cropDragStartY = e.clientY - cropOffsetY;
        cropCanvas.style.cursor = 'grabbing';
    });
    window.addEventListener('mousemove', e => {
        if (!cropDragging) return;
        cropOffsetX = e.clientX - cropDragStartX;
        cropOffsetY = e.clientY - cropDragStartY;
        drawCropCanvas();
    });
    window.addEventListener('mouseup', () => {
        cropDragging = false;
        if (cropCanvas) cropCanvas.style.cursor = 'grab';
    });

    // Wheel support for zooming
    cropCanvas.addEventListener('wheel', e => {
        e.preventDefault();
        const delta = e.deltaY > 0 ? 0.9 : 1.1; // Zoom out/in speed
        setZoom(cropScale * delta);
    }, { passive: false });

    // Touch support for mobile
    cropCanvas.addEventListener('touchstart', e => {
        const t = e.touches[0];
        cropDragging = true;
        cropDragStartX = t.clientX - cropOffsetX;
        cropDragStartY = t.clientY - cropOffsetY;
    }, { passive: true });
    window.addEventListener('touchmove', e => {
        if (!cropDragging) return;
        const t = e.touches[0];
        cropOffsetX = t.clientX - cropDragStartX;
        cropOffsetY = t.clientY - cropDragStartY;
        drawCropCanvas();
    }, { passive: true });
    window.addEventListener('touchend', () => { cropDragging = false; });
}


// Profile Update Logic
const updateProfileForm = document.getElementById('update-profile-form');
const profilePicInput = document.getElementById('profile-pic-input');

if (profilePicInput) {
    profilePicInput.addEventListener('change', function (e) {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = function (event) {
            openCropModal(event.target.result);
        };
        reader.readAsDataURL(file);
    });
}


if (updateProfileForm) {
    updateProfileForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const fullname = document.getElementById('settings-fullname').value;
        const faculty = document.getElementById('settings-faculty').value;

        const formData = new FormData();
        formData.append('fullname', fullname);

        // Only append faculty if user is a student
        if (currentUser.role === 'student') {
            const faculty = document.getElementById('settings-faculty').value;
            formData.append('faculty', faculty);
        }

        // Use the cropped blob if available, else fall back to raw file
        if (croppedBlob) {
            formData.append('profile_pic', croppedBlob, 'profile.jpg');
        } else if (profilePicInput.files[0]) {
            formData.append('profile_pic', profilePicInput.files[0]);
        }

        try {
            const response = await apiFetch('/api/auth/update-profile', {
                method: 'POST',
                body: formData
            });

            showToast(response.message);
            // Update local state
            currentUser.fullname = fullname;
            if (currentUser.role === 'student') {
                currentUser.faculty = document.getElementById('settings-faculty').value;
            }
            if (response.profile_pic) currentUser.profile_pic = response.profile_pic;
            
            // Persist the changes to localStorage
            localStorage.setItem('user', JSON.stringify(currentUser));
            
            croppedBlob = null; // Clear the crop state after success

            // Clear the file input as well
            if (profilePicInput) profilePicInput.value = '';

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

        // Frontend validation
        const passwordCheck = validatePassword(newPassword);
        if (!passwordCheck.valid) {
            return showToast(passwordCheck.message, 'error');
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

async function deleteRegistrationAdmin(regId) {
    if (!confirm('Are you sure you want to delete this student registration? This action cannot be undone.')) return;
    try {
        const response = await apiFetch(`/api/registrations/admin/${regId}`, { method: 'DELETE' });
        showToast(response.message);
        loadAllRegistrations();
    } catch (err) {
        showToast(err.message, 'error');
    }
}

async function removeStudentFromRoster(eventId, studentId, studentName) {
    if (!confirm(`Are you sure you want to remove ${studentName} from this event? This will delete their registration record.`)) return;
    try {
        const response = await apiFetch(`/api/registrations/admin/${eventId}/${studentId}`, { method: 'DELETE' });
        showToast(response.message);
        viewAttendees(eventId); // Refresh the roster
        loadEvents(); // Refresh capacity counts in background
    } catch (err) {
        showToast(err.message, 'error');
    }
}

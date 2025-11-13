// Глобальные переменные
let currentUser = null;
let currentObjects = [];
let currentUsers = [];
let editingObjectId = null;

// Инициализация
document.addEventListener('DOMContentLoaded', async () => {
    await loadUser();
    setupEventListeners();
    await loadObjects();
    
    if (currentUser.role === 'admin') {
        await loadUsers();
    } else {
        document.getElementById('usersTab').classList.add('hidden');
    }
});

// Загрузка информации о пользователе
async function loadUser() {
    try {
        const response = await fetch('/api/user');
        currentUser = await response.json();
        document.getElementById('userName').textContent = currentUser.username;
    } catch (err) {
        console.error('Ошибка загрузки пользователя:', err);
        window.location.href = '/';
    }
}

// Настройка обработчиков событий
function setupEventListeners() {
    // Выход
    document.getElementById('logoutBtn').addEventListener('click', async () => {
        await fetch('/api/logout', { method: 'POST' });
        window.location.href = '/';
    });

    // Переключение вкладок
    document.querySelectorAll('.tab-button').forEach(button => {
        button.addEventListener('click', () => {
            const tabName = button.dataset.tab;
            switchTab(tabName);
        });
    });

    // Модальные окна
    setupModal('objectModal', 'addObjectBtn', 'cancelObjectBtn', 'objectForm', handleObjectSubmit);
    setupModal('userModal', 'addUserBtn', 'cancelUserBtn', 'userForm', handleUserSubmit);
}

function setupModal(modalId, openBtnId, closeBtnId, formId, submitHandler) {
    const modal = document.getElementById(modalId);
    const openBtn = document.getElementById(openBtnId);
    const closeBtn = modal.querySelector('.close');
    const cancelBtn = document.getElementById(closeBtnId);
    const form = document.getElementById(formId);

    if (openBtn) {
        openBtn.addEventListener('click', () => {
            if (modalId === 'objectModal') {
                loadClientsForDropdown();
                editingObjectId = null;
                document.getElementById('objectModalTitle').textContent = 'Добавить объект';
                document.getElementById('spentGroup').style.display = 'none';
                form.reset();
            }
            modal.classList.add('active');
        });
    }

    closeBtn.addEventListener('click', () => {
        modal.classList.remove('active');
    });

    cancelBtn.addEventListener('click', () => {
        modal.classList.remove('active');
    });

    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.classList.remove('active');
        }
    });

    form.addEventListener('submit', submitHandler);
}

// Переключение вкладок
function switchTab(tabName) {
    document.querySelectorAll('.tab-button').forEach(btn => {
        btn.classList.remove('active');
    });
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });

    document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
    document.getElementById(`${tabName}-tab`).classList.add('active');
}

// ОБЪЕКТЫ
async function loadObjects() {
    try {
        const response = await fetch('/api/objects');
        currentObjects = await response.json();
        renderObjects();
    } catch (err) {
        console.error('Ошибка загрузки объектов:', err);
    }
}

function renderObjects() {
    const tbody = document.getElementById('objectsTableBody');
    
    if (currentObjects.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="empty-state">Нет объектов</td></tr>';
        return;
    }

    tbody.innerHTML = currentObjects.map(obj => {
        const remaining = (obj.budget || 0) - (obj.spent || 0);
        const isAdmin = currentUser.role === 'admin';
        const photoHtml = obj.photo ? `<img src="${obj.photo}" alt="${obj.name}" style="width: 50px; height: 50px; object-fit: cover; border-radius: 6px; margin-right: 8px; vertical-align: middle;">` : '';
        
        return `
            <tr>
                <td>${photoHtml}<strong>${obj.name}</strong></td>
                <td>${obj.address || '—'}</td>
                <td>${formatMoney(obj.budget)}</td>
                <td>${formatMoney(obj.spent)}</td>
                <td style="color: ${remaining < 0 ? 'var(--danger-color)' : 'var(--success-color)'}">
                    ${formatMoney(remaining)}
                </td>
                <td>${obj.client_name || '—'}</td>
                <td class="actions-col">
                    <div class="table-actions">
                        ${isAdmin ? `
                            <button class="btn btn-secondary btn-small" onclick="editObject(${obj.id})">Изменить</button>
                            <button class="btn btn-danger btn-small" onclick="deleteObject(${obj.id})">Удалить</button>
                        ` : ''}
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

async function loadClientsForDropdown() {
    try {
        const response = await fetch('/api/users');
        const users = await response.json();
        const clientSelect = document.getElementById('objectClient');
        
        clientSelect.innerHTML = '<option value="">Не назначен</option>' +
            users.filter(u => u.role === 'client')
                .map(u => `<option value="${u.id}">${u.username}</option>`)
                .join('');
    } catch (err) {
        console.error('Ошибка загрузки клиентов:', err);
    }
}

function editObject(id) {
    const obj = currentObjects.find(o => o.id === id);
    if (!obj) return;

    editingObjectId = id;
    document.getElementById('objectModalTitle').textContent = 'Редактировать объект';
    document.getElementById('objectName').value = obj.name;
    document.getElementById('objectAddress').value = obj.address || '';
    document.getElementById('objectPhoto').value = obj.photo || '';
    document.getElementById('objectBudget').value = obj.budget || 0;
    document.getElementById('objectSpent').value = obj.spent || 0;
    document.getElementById('objectClient').value = obj.client_id || '';
    document.getElementById('spentGroup').style.display = 'block';
    
    loadClientsForDropdown();
    document.getElementById('objectModal').classList.add('active');
}

async function handleObjectSubmit(e) {
    e.preventDefault();
    
    const data = {
        name: document.getElementById('objectName').value,
        address: document.getElementById('objectAddress').value,
        photo: document.getElementById('objectPhoto').value,
        budget: parseFloat(document.getElementById('objectBudget').value) || 0,
        spent: parseFloat(document.getElementById('objectSpent').value) || 0,
        client_id: document.getElementById('objectClient').value || null
    };

    try {
        const url = editingObjectId ? `/api/objects/${editingObjectId}` : '/api/objects';
        const method = editingObjectId ? 'PUT' : 'POST';
        
        const response = await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });

        if (response.ok) {
            document.getElementById('objectModal').classList.remove('active');
            await loadObjects();
        } else {
            const error = await response.json();
            alert(error.error || 'Ошибка сохранения');
        }
    } catch (err) {
        console.error('Ошибка:', err);
        alert('Ошибка сохранения объекта');
    }
}

async function deleteObject(id) {
    if (!confirm('Вы уверены, что хотите удалить этот объект?')) return;

    try {
        const response = await fetch(`/api/objects/${id}`, { method: 'DELETE' });
        if (response.ok) {
            await loadObjects();
        }
    } catch (err) {
        console.error('Ошибка:', err);
        alert('Ошибка удаления объекта');
    }
}

// ПОЛЬЗОВАТЕЛИ
async function loadUsers() {
    try {
        const response = await fetch('/api/users');
        currentUsers = await response.json();
        renderUsers();
    } catch (err) {
        console.error('Ошибка загрузки пользователей:', err);
    }
}

function renderUsers() {
    const tbody = document.getElementById('usersTableBody');
    
    if (currentUsers.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="empty-state">Нет пользователей</td></tr>';
        return;
    }

    tbody.innerHTML = currentUsers.map(user => {
        const canDelete = user.id !== currentUser.id;
        
        return `
            <tr>
                <td><strong>${user.username}</strong></td>
                <td>
                    <span class="badge badge-${user.role}">
                        ${user.role === 'admin' ? 'Администратор' : 'Клиент'}
                    </span>
                </td>
                <td>${user.phone || '—'}</td>
                <td>${formatDate(user.created_at)}</td>
                <td class="actions-col">
                    <div class="table-actions">
                        ${canDelete ? `
                            <button class="btn btn-danger btn-small" onclick="deleteUser(${user.id})">Удалить</button>
                        ` : ''}
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

async function handleUserSubmit(e) {
    e.preventDefault();
    
    const data = {
        username: document.getElementById('userLogin').value,
        password: document.getElementById('userPassword').value,
        phone: document.getElementById('userPhone').value,
        role: document.getElementById('userRole').value
    };

    try {
        const response = await fetch('/api/users', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });

        if (response.ok) {
            document.getElementById('userModal').classList.remove('active');
            document.getElementById('userForm').reset();
            await loadUsers();
        } else {
            const error = await response.json();
            alert(error.error || 'Ошибка создания пользователя');
        }
    } catch (err) {
        console.error('Ошибка:', err);
        alert('Ошибка создания пользователя');
    }
}

async function deleteUser(id) {
    if (!confirm('Вы уверены, что хотите удалить этого пользователя?')) return;

    try {
        const response = await fetch(`/api/users/${id}`, { method: 'DELETE' });
        if (response.ok) {
            await loadUsers();
        } else {
            const error = await response.json();
            alert(error.error || 'Ошибка удаления');
        }
    } catch (err) {
        console.error('Ошибка:', err);
        alert('Ошибка удаления пользователя');
    }
}

// Вспомогательные функции
function formatMoney(amount) {
    return new Intl.NumberFormat('uz-UZ').format(amount || 0) + ' сум';
}

function formatDate(dateString) {
    return new Date(dateString).toLocaleDateString('ru-RU', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}

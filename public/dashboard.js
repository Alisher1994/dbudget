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
        document.getElementById('addObjectBtn').style.display = 'block';
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
        document.getElementById('accountUserName').textContent = currentUser.username;
    } catch (err) {
        console.error('Ошибка загрузки пользователя:', err);
        window.location.href = '/';
    }
}

// Настройка обработчиков событий
function setupEventListeners() {
    // Выход (десктоп)
    document.getElementById('logoutBtn').addEventListener('click', async () => {
        await fetch('/api/logout', { method: 'POST' });
        window.location.href = '/';
    });

    // Выход (мобильный)
    document.getElementById('logoutBtnMobile').addEventListener('click', async () => {
        await fetch('/api/logout', { method: 'POST' });
        window.location.href = '/';
    });

    // Мобильное меню аккаунта
    document.getElementById('accountMenuBtn').addEventListener('click', () => {
        document.getElementById('accountMenu').classList.add('active');
    });

    document.getElementById('closeAccountMenu').addEventListener('click', () => {
        document.getElementById('accountMenu').classList.remove('active');
    });

    document.getElementById('accountMenu').addEventListener('click', (e) => {
        if (e.target.id === 'accountMenu') {
            document.getElementById('accountMenu').classList.remove('active');
        }
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
    setupModal('editUserModal', null, 'cancelEditUserBtn', 'editUserForm', handleEditUserSubmit);

    // Таблица Приход
    const addIncomeBtn = document.getElementById('addIncomeBtn');
    const incomeTableBody = document.getElementById('incomeTableBody');
    const incomeModal = document.getElementById('incomeModal');
    const closeIncomeModal = document.getElementById('closeIncomeModal');
    const saveIncome = document.getElementById('saveIncome');
    const cancelIncome = document.getElementById('cancelIncome');
    const incomeForm = document.getElementById('incomeForm');
    let editingIncomeIndex = null;

    const readFileAsDataURL = (file) => new Promise((resolve, reject) => {
        if (!file) return resolve('');
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });

    // Dropzone behaviour for income photo in modal
    const incomePhotoInput = document.getElementById('incomePhoto');
    const incomeDropzone = document.getElementById('incomePhotoDropzone');
    const incomePreview = document.querySelector('#incomeModal .photo-preview');

    if (incomeDropzone && incomePhotoInput) {
        // Click to open file selector
        incomeDropzone.addEventListener('click', () => incomePhotoInput.click());

        // When file selected, show preview
        incomePhotoInput.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (!file) return;
            const data = await readFileAsDataURL(file);
            if (incomePreview) {
                incomePreview.src = data;
                incomePreview.style.display = 'inline-block';
            }
        });

        // Drag & drop
        ['dragenter', 'dragover'].forEach(ev => {
            incomeDropzone.addEventListener(ev, (e) => {
                e.preventDefault();
                incomeDropzone.classList.add('dragover');
            });
        });
        ['dragleave', 'drop'].forEach(ev => {
            incomeDropzone.addEventListener(ev, (e) => {
                incomeDropzone.classList.remove('dragover');
            });
        });
        incomeDropzone.addEventListener('drop', async (e) => {
            e.preventDefault();
            const file = e.dataTransfer.files[0];
            if (!file) return;
            incomePhotoInput.files = e.dataTransfer.files;
            const data = await readFileAsDataURL(file);
            if (incomePreview) {
                incomePreview.src = data;
                incomePreview.style.display = 'inline-block';
            }
        });
    }

    addIncomeBtn.addEventListener('click', () => {
        editingIncomeIndex = null;
        incomeForm.reset();
        incomeModal.classList.add('active');
    });

    closeIncomeModal.addEventListener('click', () => {
        incomeModal.classList.remove('active');
    });

    cancelIncome.addEventListener('click', () => {
        incomeModal.classList.remove('active');
    });

    saveIncome.addEventListener('click', async () => {
        const date = document.getElementById('incomeDate').value;
        const photoInput = document.getElementById('incomePhoto');
        const amount = document.getElementById('incomeAmount').value;
        const sender = document.getElementById('incomeSender').value;
        const receiver = document.getElementById('incomeReceiver').value;

        if (!date || !amount || !sender || !receiver) {
            alert('Заполните все обязательные поля!');
            return;
        }

        const photoFile = photoInput.files[0];
        const photo = await readFileAsDataURL(photoFile);

        // Привязываем приход к текущему объекту, если он открыт
        const incomeData = { date, photo, amount, sender, receiver, object_id: currentObjectId || null };

        const savedData = JSON.parse(localStorage.getItem('incomeData')) || [];
        if (editingIncomeIndex === null) {
            savedData.push(incomeData);
        } else {
            // replace existing
            savedData[editingIncomeIndex] = incomeData;
        }

        localStorage.setItem('incomeData', JSON.stringify(savedData));

        alert('Данные сохранены!');
        incomeModal.classList.remove('active');
        if (window.loadIncomeData) window.loadIncomeData();
        if (window.renderAnalysisCharts) window.renderAnalysisCharts(currentUser?.role || 'admin');
    });

    const saveIncomeData = (row) => {
        const date = row.querySelector('.income-date').value;
        const photo = row.querySelector('.income-photo').files[0]?.name || '';
        const amount = row.querySelector('.income-amount').value;
        const sender = row.querySelector('.income-sender').value;
        const receiver = row.querySelector('.income-receiver').value;

        const incomeData = {
            date,
            photo,
            amount,
            sender,
            receiver
        };

        const savedData = JSON.parse(localStorage.getItem('incomeData')) || [];
        savedData.push(incomeData);
        localStorage.setItem('incomeData', JSON.stringify(savedData));

        alert('Данные сохранены!');
        if (window.renderAnalysisCharts) window.renderAnalysisCharts(currentUser?.role || 'admin');
    };

    const deleteIncomeData = (rowIndex) => {
        const savedData = JSON.parse(localStorage.getItem('incomeData')) || [];
        savedData.splice(rowIndex, 1);
        localStorage.setItem('incomeData', JSON.stringify(savedData));
        if (window.loadIncomeData) window.loadIncomeData();
        if (window.renderAnalysisCharts) window.renderAnalysisCharts(currentUser?.role || 'admin');
    };

    incomeTableBody.addEventListener('click', (event) => {
        if (event.target.classList.contains('delete-income')) {
            const rowIndex = event.target.closest('tr').rowIndex - 1; // Учитываем заголовок таблицы
            deleteIncomeData(rowIndex);
            return;
        }

        if (event.target.classList.contains('edit-income')) {
            const rowIndex = event.target.closest('tr').rowIndex - 1;
            const savedData = JSON.parse(localStorage.getItem('incomeData')) || [];
            const data = savedData[rowIndex];
            if (!data) return;

            // Populate modal with existing data
            document.getElementById('incomeDate').value = data.date || '';
            document.getElementById('incomeAmount').value = data.amount || '';
            document.getElementById('incomeSender').value = data.sender || '';
            document.getElementById('incomeReceiver').value = data.receiver || '';
            // Note: file inputs cannot be set programmatically for security reasons.
            // We keep existing photo in preview until user selects a new one.
            const preview = document.querySelector('#incomeModal .photo-preview');
            if (preview) {
                preview.src = data.photo || '';
                preview.style.display = data.photo ? 'inline-block' : 'none';
            }

            editingIncomeIndex = rowIndex;
            incomeModal.classList.add('active');
            return;
        }

        // Клик по миниатюре фото — открыть превью
        if (event.target.tagName === 'IMG' && event.target.classList.contains('income-photo-preview')) {
            const src = event.target.getAttribute('src') || '';
            const tr = event.target.closest('tr');
            const date = tr?.children[1]?.textContent || '';
            const amount = tr?.children[3]?.textContent || '';
            const sender = tr?.children[4]?.textContent || '';

            const photoModal = document.getElementById('photoPreviewModal');
            const photoImg = document.getElementById('photoPreviewImg');
            const photoCaption = document.getElementById('photoPreviewCaption');
            const closeBtn = document.getElementById('closePhotoPreview');

            if (photoImg) photoImg.src = src;
            if (photoCaption) photoCaption.textContent = `${date} • ${sender} • ${amount}`;
            if (photoModal) photoModal.classList.add('active');

            // Close handlers
            if (closeBtn) closeBtn.onclick = () => photoModal.classList.remove('active');
            if (photoModal) photoModal.onclick = (e) => { if (e.target.id === 'photoPreviewModal') photoModal.classList.remove('active'); };
            return;
        }
    });

    // Делаем loadIncomeData доступной глобально
    window.loadIncomeData = () => {
        const incomeTableBody = document.getElementById('incomeTableBody');
        const incomeCardsMobile = document.getElementById('incomeCardsMobile');
        const incomeTableDesktop = document.querySelector('.income-table-desktop');
        
        if (!incomeTableBody || !incomeCardsMobile) {
            console.warn('Элементы для отображения прихода не найдены', { incomeTableBody, incomeCardsMobile });
            return;
        }
        
        incomeTableBody.innerHTML = '';
        let savedData = [];
        try {
            const stored = localStorage.getItem('incomeData');
            savedData = stored ? JSON.parse(stored) : [];
            console.log('Загружено данных прихода из localStorage:', savedData.length, savedData);
        } catch (e) {
            console.error('Ошибка чтения данных прихода:', e);
            savedData = [];
        }
        
        // Для админа показываем все данные, для клиентов фильтруем
        if (currentUser && currentUser.role === 'client') {
            if (currentObjectId) {
                // Если клиент на странице объекта, показываем только данные этого объекта
                const currentObj = currentObjects.find(o => o.id == currentObjectId);
                if (currentObj) {
                    savedData = savedData.filter(i => {
                        // Фильтруем по object_id
                        if ((i.object_id || null) == currentObjectId) return true;
                        // Если объект имеет назначенного клиента, проверяем совпадение по имени
                        if (currentObj.client_name) {
                            const name = (currentObj.client_name || '').toString().toLowerCase();
                            if ((i.sender || '').toString().toLowerCase().includes(name)) return true;
                            if ((i.receiver || '').toString().toLowerCase().includes(name)) return true;
                        }
                        // Проверяем по username клиента
                        if (currentUser.username) {
                            const uname = currentUser.username.toString().toLowerCase();
                            if ((i.sender || '').toString().toLowerCase().includes(uname)) return true;
                            if ((i.receiver || '').toString().toLowerCase().includes(uname)) return true;
                        }
                        return false;
                    });
                }
            } else {
                // Если клиент не на странице объекта, показываем все его данные
                if (currentUser.username) {
                    const uname = currentUser.username.toString().toLowerCase();
                    savedData = savedData.filter(i => {
                        if ((i.sender || '').toString().toLowerCase().includes(uname)) return true;
                        if ((i.receiver || '').toString().toLowerCase().includes(uname)) return true;
                        // Также проверяем по объектам клиента
                        const userObjects = currentObjects.filter(o => o.client_id == currentUser.id);
                        return userObjects.some(obj => {
                            if ((i.object_id || null) == obj.id) return true;
                            if (obj.client_name) {
                                const name = (obj.client_name || '').toString().toLowerCase();
                                if ((i.sender || '').toString().toLowerCase().includes(name)) return true;
                                if ((i.receiver || '').toString().toLowerCase().includes(name)) return true;
                            }
                            return false;
                        });
                    });
                }
            }
        }
        
        // Определяем, показывать ли кнопки редактирования/удаления
        const isClient = currentUser && currentUser.role === 'client';
        const showActions = !isClient;
        
        // Скрываем/показываем кнопку добавления
        const addIncomeBtn = document.getElementById('addIncomeBtn');
        if (addIncomeBtn) {
            addIncomeBtn.style.display = isClient ? 'none' : 'block';
        }
        
        // Определяем, что показывать: таблицу или карточки
        const isMobile = window.innerWidth <= 768;
        const showCards = isClient || isMobile; // Клиент всегда видит карточки, админ на мобилке тоже
        
        console.log('Отображение прихода:', { isMobile, isClient, showCards, savedDataLength: savedData.length });
        
        // Показываем/скрываем таблицу и карточки
        if (incomeTableDesktop) {
            if (showCards || isMobile) {
                incomeTableDesktop.style.display = 'none';
            } else {
                incomeTableDesktop.style.display = 'block';
            }
        }
        if (incomeCardsMobile) {
            if (showCards || isMobile) {
                incomeCardsMobile.classList.add('show');
                incomeCardsMobile.style.display = 'flex';
            } else {
                incomeCardsMobile.classList.remove('show');
                incomeCardsMobile.style.display = 'none';
            }
        }
        
        // Всегда рендерим данные в ОБА контейнера, а показываем нужный через CSS
        if (savedData.length === 0) {
            incomeTableBody.innerHTML = '<tr><td colspan="7" class="empty-state">Нет данных</td></tr>';
            incomeCardsMobile.innerHTML = '<div class="empty-state">Нет данных</div>';
            console.log('Нет данных для отображения');
            return;
        }
        
        console.log('Начинаем рендеринг данных:', savedData.length, 'записей');
        
        // Рендерим таблицу для десктопа (всегда, для всех данных)
        savedData.forEach((data, index) => {
            const newRow = document.createElement('tr');
            newRow.innerHTML = `
                <td>${index + 1}</td>
                <td>${data.date || '—'}</td>
                <td>${data.photo ? `<img src="${data.photo}" alt="Фото" class="income-photo-preview">` : 'Нет фото'}</td>
                <td>${formatMoney(data.amount)}</td>
                <td>${data.sender || '—'}</td>
                <td>${data.receiver || '—'}</td>
                <td>
                    ${showActions ? `
                        <button class="edit-btn edit-income">Изменить</button>
                        <button class="delete-btn delete-income">Удалить</button>
                    ` : '—'}
                </td>
            `;
            incomeTableBody.appendChild(newRow);
        });
        
        console.log('Таблица отрендерена, строк:', incomeTableBody.children.length);
        console.log('Таблица видима?', incomeTableDesktop ? incomeTableDesktop.style.display : 'элемент не найден');
        
        // Рендерим карточки (всегда, для всех данных)
        incomeCardsMobile.innerHTML = savedData.map((data, index) => {
            const photoUrl = data.photo || '';
            return `
                <div class="income-card">
                    ${photoUrl ? `<img src="${photoUrl}" alt="Фото" class="income-card-image" data-photo-src="${photoUrl}" data-photo-date="${data.date}" data-photo-sender="${data.sender}" data-photo-amount="${data.amount}">` : ''}
                    <div class="income-card-content">
                        <div class="income-card-date">${data.date || '—'}</div>
                        <div class="income-card-amount">${formatMoney(data.amount)}</div>
                        <div class="income-card-info">
                            <div class="income-card-info-item">
                                <span class="income-card-info-label">Кем передан:</span>
                                <span>${data.sender || '—'}</span>
                            </div>
                            <div class="income-card-info-item">
                                <span class="income-card-info-label">Кто получил:</span>
                                <span>${data.receiver || '—'}</span>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
        
        console.log('Карточки отрендерены, количество:', incomeCardsMobile.children.length);
        console.log('Карточки видимы?', incomeCardsMobile.style.display, 'класс show:', incomeCardsMobile.classList.contains('show'));
        
        // Добавляем обработчики клика на фото в карточках
        incomeCardsMobile.querySelectorAll('.income-card-image').forEach(img => {
            img.style.cursor = 'pointer';
            img.addEventListener('click', () => {
                const photoModal = document.getElementById('photoPreviewModal');
                const photoImg = document.getElementById('photoPreviewImg');
                const photoCaption = document.getElementById('photoPreviewCaption');
                const closeBtn = document.getElementById('closePhotoPreview');
                
                if (photoImg) photoImg.src = img.dataset.photoSrc || '';
                if (photoCaption) {
                    const date = img.dataset.photoDate || '';
                    const sender = img.dataset.photoSender || '';
                    const amount = img.dataset.photoAmount || '';
                    photoCaption.textContent = `${date} • ${sender} • ${formatMoney(amount)}`;
                }
                if (photoModal) photoModal.classList.add('active');
                
                // Close handlers
                if (closeBtn) closeBtn.onclick = () => photoModal.classList.remove('active');
                if (photoModal) photoModal.onclick = (e) => { 
                    if (e.target.id === 'photoPreviewModal') photoModal.classList.remove('active'); 
                };
            });
        });
    };

    // НЕ вызываем loadIncomeData здесь - она будет вызвана при открытии вкладки прихода
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
    const cardsContainer = document.getElementById('objectsCardsMobile');
    
    if (currentObjects.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="empty-state">Нет объектов</td></tr>';
        cardsContainer.innerHTML = '<div class="empty-state">Нет объектов</div>';
        return;
    }

    // Рендерим таблицу для десктопа
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
                        <button class="btn btn-primary btn-small" onclick="openObjectDetail(${obj.id})">Открыть</button>
                        ${isAdmin ? `
                            <button class="btn btn-secondary btn-small" onclick="editObject(${obj.id})">Изменить</button>
                            <button class="btn btn-danger btn-small" onclick="deleteObject(${obj.id})">Удалить</button>
                        ` : ''}
                    </div>
                </td>
            </tr>
        `;
    }).join('');

    // Рендерим карточки для мобильных
    const savedIncome = JSON.parse(localStorage.getItem('incomeData')) || [];
    cardsContainer.innerHTML = currentObjects.map(obj => {
        const photoUrl = obj.photo || 'https://via.placeholder.com/300x200?text=No+Image';

        // Найдём последние записи прихода, привязанные к объекту.
        // Если записи старые и не имеют object_id, попробуем сопоставить по имени клиента (client_name)
        const incomesForObj = savedIncome.filter(i => {
            if ((i.object_id || null) == obj.id) return true;
            // Если объект имеет назначенного клиента, проверим совпадение по имени
            if (obj.client_name) {
                const name = (obj.client_name || '').toString().toLowerCase();
                if ((i.sender || '').toString().toLowerCase().includes(name)) return true;
                if ((i.receiver || '').toString().toLowerCase().includes(name)) return true;
            }
            // Если текущий пользователь — клиент, сверим по его username
            if (currentUser && currentUser.role === 'client' && currentUser.username) {
                const uname = currentUser.username.toString().toLowerCase();
                if ((i.sender || '').toString().toLowerCase().includes(uname)) return true;
                if ((i.receiver || '').toString().toLowerCase().includes(uname)) return true;
            }
            return false;
        });
        const lastIncome = incomesForObj.length ? incomesForObj[incomesForObj.length - 1] : null;

        // Показать блок передачи только если текущий пользователь — клиент и закреплён за этим объектом
        const showTransfer = currentUser && currentUser.role === 'client' && (obj.client_id == currentUser.id);

        return `
            <div class="object-card" onclick="openObjectDetail(${obj.id})">
                <div class="object-card-image" style="background-image: url('${photoUrl}');"></div>
                <div class="object-card-content">
                    <h3 class="object-card-title">${obj.name}</h3>
                    <div class="object-card-info">
                        ${obj.address ? `<p class="object-card-address">${obj.address}</p>` : ''}
                        ${showTransfer && lastIncome ? `
                            <div class="object-card-transfer">
                                <img src="${lastIncome.photo || ''}" class="income-photo-preview" alt="Фото передачи">
                                <div class="transfer-info">
                                    <div class="transfer-amount">${formatMoney(lastIncome.amount)}</div>
                                    <div class="transfer-meta">${formatDate(lastIncome.date)} • ${lastIncome.receiver || ''}</div>
                                </div>
                            </div>
                        ` : ''}
                    </div>
                </div>
            </div>
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
        tbody.innerHTML = '<tr><td colspan="6" class="empty-state">Нет пользователей</td></tr>';
        return;
    }

    tbody.innerHTML = currentUsers.map(user => {
        const canDelete = user.id !== currentUser.id;
        const statusBadge = user.status === 'active' 
            ? '<span class="badge badge-success">Активный</span>' 
            : '<span class="badge badge-secondary">Неактивный</span>';
        
        return `
            <tr>
                <td><strong>${user.username}</strong></td>
                <td>
                    <span class="badge badge-${user.role}">
                        ${user.role === 'admin' ? 'Администратор' : 'Клиент'}
                    </span>
                </td>
                <td>${user.phone || '—'}</td>
                <td>${statusBadge}</td>
                <td>${formatDate(user.created_at)}</td>
                <td class="actions-col">
                    <div class="table-actions">
                        <button class="btn btn-secondary btn-small" onclick="editUser(${user.id})">Изменить</button>
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
        role: document.getElementById('userRole').value,
        status: document.getElementById('userStatus').value
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

function editUser(id) {
    const user = currentUsers.find(u => u.id === id);
    if (!user) return;

    document.getElementById('editUserId').value = user.id;
    document.getElementById('editUserLogin').value = user.username;
    document.getElementById('editUserPhone').value = user.phone || '';
    document.getElementById('editUserRole').value = user.role;
    document.getElementById('editUserStatus').value = user.status || 'active';
    
    document.getElementById('editUserModal').classList.add('active');
}

async function handleEditUserSubmit(e) {
    e.preventDefault();
    
    const id = document.getElementById('editUserId').value;
    const data = {
        phone: document.getElementById('editUserPhone').value,
        role: document.getElementById('editUserRole').value,
        status: document.getElementById('editUserStatus').value
    };

    try {
        const response = await fetch(`/api/users/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });

        if (response.ok) {
            document.getElementById('editUserModal').classList.remove('active');
            await loadUsers();
        } else {
            const error = await response.json();
            alert(error.error || 'Ошибка обновления пользователя');
        }
    } catch (err) {
        console.error('Ошибка:', err);
        alert('Ошибка обновления пользователя');
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

// ДЕТАЛЬНАЯ СТРАНИЦА ОБЪЕКТА
let currentObjectId = null;

function openObjectDetail(objectId) {
    const obj = currentObjects.find(o => o.id === objectId);
    if (!obj) return;

    currentObjectId = objectId;
    document.getElementById('objects-tab').classList.remove('active');
    document.getElementById('object-detail-tab').classList.add('active');
    document.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
    document.getElementById('objectDetailTitle').textContent = obj.name;
    switchSubTab('analysis');
    // Рендерим графики анализа
    setTimeout(() => {
        if (window.renderAnalysisCharts) {
            window.renderAnalysisCharts(currentUser.role);
        }
        // Обновляем таблицу прихода, если открыта вкладка прихода
        setTimeout(() => {
            if (window.loadIncomeData) window.loadIncomeData();
        }, 100);
    }, 300);
}

// Обработчик кнопки "Назад"
document.addEventListener('DOMContentLoaded', () => {
    const backBtn = document.getElementById('backToObjectsBtn');
    if (backBtn) {
        backBtn.addEventListener('click', () => {
            document.getElementById('object-detail-tab').classList.remove('active');
            document.getElementById('objects-tab').classList.add('active');
            
            // Восстанавливаем активную вкладку
            document.querySelectorAll('.tab-button').forEach(btn => {
                if (btn.dataset.tab === 'objects') {
                    btn.classList.add('active');
                }
            });
            
            currentObjectId = null;
        });
    }
    
    // Обработчики подвкладок
    document.querySelectorAll('.sub-tab-button').forEach(button => {
        button.addEventListener('click', () => {
            const subtabName = button.dataset.subtab;
            switchSubTab(subtabName);
        });
    });
    
    setTimeout(() => {
        if (window.renderAnalysisCharts) {
            window.renderAnalysisCharts(currentUser?.role || 'admin');
        }
    }, 500);
    
    // Обработчик изменения размера окна для переключения между таблицей и карточками
    let resizeTimeout;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(() => {
            if (window.loadIncomeData) {
                window.loadIncomeData();
            }
        }, 250);
    });
});

function switchSubTab(subtabName) {
    // Переключаем активную кнопку
    document.querySelectorAll('.sub-tab-button').forEach(btn => {
        btn.classList.remove('active');
    });
    document.querySelector(`[data-subtab="${subtabName}"]`)?.classList.add('active');
    
    // Переключаем контент
    document.querySelectorAll('.sub-tab-content').forEach(content => {
        content.classList.remove('active');
    });
    document.getElementById(`${subtabName}-subtab`)?.classList.add('active');
    
    // Если переключились на вкладку "Приход", загружаем данные
    if (subtabName === 'income') {
        // Небольшая задержка, чтобы DOM успел обновиться
        setTimeout(() => {
            if (window.loadIncomeData) {
                window.loadIncomeData();
            }
        }, 50);
    }
}

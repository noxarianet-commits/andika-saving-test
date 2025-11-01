// Data structure
const CURRENT_USER_KEY = 'andika_saving_current_user';

// Format currency
function formatCurrency(amount) {
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0
    }).format(amount);
}

// Format date
function formatDate(dateString) {
    const options = { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    };
    return new Date(dateString).toLocaleDateString('id-ID', options);
}

// Show notification
function showNotification(message, type = 'info') {
    // Remove existing notifications
    const existingAlert = document.querySelector('.alert-notification');
    if (existingAlert) {
        existingAlert.remove();
    }
    
    // Create new notification
    const alert = document.createElement('div');
    alert.className = `alert alert-${type} alert-notification position-fixed`;
    alert.style.cssText = 'top: 20px; right: 20px; z-index: 1050; min-width: 300px;';
    alert.textContent = message;
    
    document.body.appendChild(alert);
    
    // Auto remove after 3 seconds
    setTimeout(() => {
        if (alert.parentNode) {
            alert.parentNode.removeChild(alert);
        }
    }, 3000);
}

// ==================== REAL-TIME SYNC SYSTEM ====================

let syncInterval;

function startSync() {
    if (syncInterval) clearInterval(syncInterval);
    
    syncInterval = setInterval(async () => {
        await checkForUpdates();
    }, 2000); // Check every 2 seconds
}

function stopSync() {
    if (syncInterval) {
        clearInterval(syncInterval);
        syncInterval = null;
    }
}

async function checkForUpdates() {
    try {
        const currentUser = getCurrentUser();
        if (!currentUser) return;

        const syncResult = await enhancedAPI.syncData();
        
        if (syncResult.success && syncResult.hasUpdates) {
            // Update last sync timestamp
            localStorage.setItem('andika_last_sync', syncResult.data.lastUpdated.toString());
            
            // Refresh dashboard based on role
            if (currentUser.role === 'admin') {
                if (typeof loadAdminDashboard === 'function') {
                    loadAdminDashboard();
                    showNotification('Data diperbarui', 'info');
                }
            } else if (currentUser.role === 'nasabah') {
                if (typeof loadNasabahDashboard === 'function') {
                    loadNasabahDashboard();
                }
            }
        }
    } catch (error) {
        console.error('Sync error:', error);
    }
}

// ==================== MODIFIED FUNCTIONS ====================

// Register user
async function registerUser(role) {
    const fullName = document.getElementById('fullName').value;
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    
    // Validation
    if (!fullName || !email || !password || !confirmPassword || !role) {
        showNotification('Harap isi semua field yang diperlukan', 'danger');
        return false;
    }
    
    if (password !== confirmPassword) {
        showNotification('Konfirmasi kata sandi tidak cocok', 'danger');
        return false;
    }
    
    if (password.length < 6) {
        showNotification('Kata sandi harus minimal 6 karakter', 'danger');
        return false;
    }
    
    const result = await enhancedAPI.registerUser({
        name: fullName,
        email: email,
        password: password,
        role: role
    });
    
    if (!result.success) {
        showNotification(result.message, 'danger');
        return false;
    }
    
    showNotification(result.message, 'success');
    
    setTimeout(() => {
        window.location.href = 'login.html';
    }, 1500);
    
    return true;
}

// Login user
async function loginUser(role) {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    
    if (!email || !password || !role) {
        showNotification('Harap isi semua field yang diperlukan', 'danger');
        return false;
    }
    
    const result = await enhancedAPI.loginUser(email, password, role);
    
    if (!result.success) {
        showNotification(result.message, 'danger');
        return false;
    }
    
    // Store current user
    localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(result.user));
    showNotification(`Selamat datang, ${result.user.name}!`, 'success');
    
    // Start real-time sync
    startSync();
    
    setTimeout(() => {
        if (result.user.role === 'admin') {
            window.location.href = 'dashboard_admin.html';
        } else {
            window.location.href = 'dashboard_nasabah.html';
        }
    }, 1000);
    
    return true;
}

// Logout
function logout() {
    stopSync();
    localStorage.removeItem(CURRENT_USER_KEY);
    showNotification('Anda telah keluar', 'info');
    
    setTimeout(() => {
        window.location.href = 'index.html';
    }, 1000);
}

// Get current user
function getCurrentUser() {
    const userStr = localStorage.getItem(CURRENT_USER_KEY);
    return userStr ? JSON.parse(userStr) : null;
}

// Auth check
function checkAuth(requiredRole = null) {
    const user = getCurrentUser();
    
    if (!user) {
        window.location.href = 'login.html';
        return false;
    }
    
    if (requiredRole && user.role !== requiredRole) {
        window.location.href = requiredRole === 'admin' ? 'dashboard_admin.html' : 'dashboard_nasabah.html';
        return false;
    }
    
    return user;
}

// Update saldo
async function updateSaldo(amount, type, keterangan = '') {
    const user = getCurrentUser();
    if (!user || user.role !== 'nasabah') return false;
    
    const result = await enhancedAPI.updateSaldo(user.id, amount, type, keterangan);
    
    if (!result.success) {
        showNotification(result.message, 'danger');
        return false;
    }
    
    // Update current user data
    localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(result.user));
    
    showNotification(result.message, 'success');
    return true;
}

// Load nasabah dashboard
async function loadNasabahDashboard() {
    const user = checkAuth('nasabah');
    if (!user) return;
    
    // Get latest user data
    const syncResult = await enhancedAPI.syncData();
    if (syncResult.success) {
        const latestUser = syncResult.data.users.find(u => u.id === user.id);
        if (latestUser) {
            localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(latestUser));
        }
    }
    
    const currentUser = getCurrentUser();
    
    // Update UI
    document.getElementById('userName').textContent = currentUser.name;
    document.getElementById('accountName').textContent = currentUser.name;
    document.getElementById('accountEmail').textContent = currentUser.email;
    document.getElementById('accountSince').textContent = formatDate(currentUser.createdAt);
    document.getElementById('saldoAmount').textContent = formatCurrency(currentUser.saldo || 0);
    document.getElementById('availableBalance').textContent = formatCurrency(currentUser.saldo || 0);
    
    loadTransactions();
}

// Load transactions
function loadTransactions() {
    const user = getCurrentUser();
    if (!user) return;
    
    const transactions = enhancedAPI.getTransactionsForUser(user.id);
    const transactionsTable = document.getElementById('transactionsTable');
    const noTransactions = document.getElementById('noTransactions');
    
    if (transactions.length === 0) {
        transactionsTable.innerHTML = '';
        noTransactions.classList.remove('d-none');
        return;
    }
    
    noTransactions.classList.add('d-none');
    
    let html = '';
    transactions.forEach(transaction => {
        const isMenabung = transaction.type === 'menabung';
        const badgeClass = isMenabung ? 'badge bg-success' : 'badge bg-danger';
        const badgeText = isMenabung ? 'Menabung' : 'Tarik Tunai';
        const amountClass = isMenabung ? 'text-success' : 'text-danger';
        const amountPrefix = isMenabung ? '+' : '-';
        
        html += `
            <tr>
                <td>${formatDate(transaction.createdAt)}</td>
                <td><span class="badge ${badgeClass}">${badgeText}</span></td>
                <td class="${amountClass} fw-bold">${amountPrefix} ${formatCurrency(transaction.amount)}</td>
                <td>${transaction.keterangan}</td>
            </tr>
        `;
    });
    
    transactionsTable.innerHTML = html;
}

// Load admin dashboard
async function loadAdminDashboard() {
    const user = checkAuth('admin');
    if (!user) return;
    
    document.getElementById('adminName').textContent = user.name;
    loadNasabahData();
    loadNotifications();
}

// Load nasabah data for admin
function loadNasabahData() {
    const nasabah = enhancedAPI.getAllNasabah();
    const nasabahTable = document.getElementById('nasabahTable');
    const noNasabah = document.getElementById('noNasabah');
    
    // Update statistics
    document.getElementById('totalNasabah').textContent = nasabah.length;
    
    const totalSaldo = nasabah.reduce((sum, n) => sum + (n.saldo || 0), 0);
    document.getElementById('totalSaldo').textContent = formatCurrency(totalSaldo);
    
    const totalTransactions = nasabah.reduce((sum, n) => {
        const userTransactions = enhancedAPI.getTransactionsForUser(n.id);
        return sum + userTransactions.length;
    }, 0);
    document.getElementById('totalTransaksi').textContent = totalTransactions;
    
    const rataSaldo = nasabah.length > 0 ? totalSaldo / nasabah.length : 0;
    document.getElementById('rataSaldo').textContent = formatCurrency(rataSaldo);
    
    if (nasabah.length === 0) {
        nasabahTable.innerHTML = '';
        noNasabah.classList.remove('d-none');
        return;
    }
    
    noNasabah.classList.add('d-none');
    
    let html = '';
    nasabah.forEach(nasabah => {
        const transactions = enhancedAPI.getTransactionsForUser(nasabah.id);
        
        html += `
            <tr>
                <td>${nasabah.name}</td>
                <td>${nasabah.email}</td>
                <td class="fw-bold">${formatCurrency(nasabah.saldo || 0)}</td>
                <td><span class="badge bg-primary">${transactions.length}</span></td>
                <td>
                    <button class="btn btn-sm btn-outline-primary view-detail" data-userid="${nasabah.id}">
                        Detail
                    </button>
                    <button class="btn btn-sm btn-outline-danger ms-1 delete-nasabah" data-userid="${nasabah.id}">
                        Hapus
                    </button>
                </td>
            </tr>
        `;
    });
    
    nasabahTable.innerHTML = html;
    
    // Add event listeners
    document.querySelectorAll('.view-detail').forEach(button => {
        button.addEventListener('click', function() {
            const userId = this.getAttribute('data-userid');
            showNasabahDetail(userId);
        });
    });
    
    document.querySelectorAll('.delete-nasabah').forEach(button => {
        button.addEventListener('click', function() {
            const userId = this.getAttribute('data-userid');
            deleteNasabah(userId);
        });
    });
}

// Show nasabah detail
function showNasabahDetail(userId) {
    const nasabah = enhancedAPI.getAllNasabah().find(u => u.id === userId);
    
    if (!nasabah) return;
    
    document.getElementById('detailNama').textContent = nasabah.name;
    document.getElementById('detailEmail').textContent = nasabah.email;
    document.getElementById('detailSaldo').textContent = formatCurrency(nasabah.saldo || 0);
    document.getElementById('detailBergabung').textContent = formatDate(nasabah.createdAt);
    
    const transactions = enhancedAPI.getTransactionsForUser(userId);
    const transactionsTable = document.getElementById('detailTransaksiTable');
    const noTransactions = document.getElementById('noDetailTransactions');
    
    if (transactions.length === 0) {
        transactionsTable.innerHTML = '';
        noTransactions.classList.remove('d-none');
    } else {
        noTransactions.classList.add('d-none');
        
        let html = '';
        transactions.forEach(transaction => {
            const isMenabung = transaction.type === 'menabung';
            const badgeClass = isMenabung ? 'badge bg-success' : 'badge bg-danger';
            const badgeText = isMenabung ? 'Menabung' : 'Tarik Tunai';
            const amountClass = isMenabung ? 'text-success' : 'text-danger';
            const amountPrefix = isMenabung ? '+' : '-';
            
            html += `
                <tr>
                    <td>${formatDate(transaction.createdAt)}</td>
                    <td><span class="badge ${badgeClass}">${badgeText}</span></td>
                    <td class="${amountClass}">${amountPrefix} ${formatCurrency(transaction.amount)}</td>
                    <td>${formatCurrency(transaction.saldo_sebelum || 0)}</td>
                    <td>${formatCurrency(transaction.saldo_sesudah || 0)}</td>
                    <td>${transaction.keterangan}</td>
                </tr>
            `;
        });
        
        transactionsTable.innerHTML = html;
    }
    
    const modal = new bootstrap.Modal(document.getElementById('detailNasabahModal'));
    modal.show();
}

// Delete nasabah
async function deleteNasabah(userId) {
    if (!confirm('Apakah Anda yakin ingin menghapus nasabah ini?')) return;
    
    const result = await enhancedAPI.deleteNasabah(userId);
    
    if (!result.success) {
        showNotification(result.message, 'danger');
        return;
    }
    
    showNotification(result.message, 'success');
    loadNasabahData();
}

// Load notifications
function loadNotifications() {
    const emailHistory = JSON.parse(localStorage.getItem('andika_email_history') || '[]');
    const notificationBadge = document.getElementById('notificationBadge');
    const notificationDropdown = document.getElementById('notificationDropdownContent');
    
    if (notificationBadge) {
        const unreadCount = emailHistory.length;
        notificationBadge.textContent = unreadCount;
        notificationBadge.style.display = unreadCount > 0 ? 'inline-block' : 'none';
    }
    
    if (notificationDropdown) {
        let html = '';
        if (emailHistory.length === 0) {
            html = '<div class="dropdown-item text-muted">Tidak ada notifikasi</div>';
        } else {
            emailHistory.slice(0, 5).forEach(email => {
                html += `
                    <div class="dropdown-item">
                        <small class="text-muted">📧 ${formatDate(email.timestamp)}</small><br>
                        <strong>${email.subject}</strong><br>
                        <small>${email.message.substring(0, 50)}...</small>
                    </div>
                    <div class="dropdown-divider"></div>
                `;
            });
        }
        notificationDropdown.innerHTML = html;
    }
}

// Initialize application
document.addEventListener('DOMContentLoaded', function() {
    // Register form
    const registerForm = document.getElementById('registerForm');
    if (registerForm) {
        registerForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const role = document.getElementById('role').value;
            registerUser(role);
        });
    }
    
    // Login form
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const role = document.getElementById('role').value;
            loginUser(role);
        });
    }
    
    // Logout button
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', logout);
    }
    
    // Nasabah dashboard
    if (window.location.pathname.includes('dashboard_nasabah.html')) {
        loadNasabahDashboard();
        startSync();
        
        // Menabung
        const submitMenabung = document.getElementById('submitMenabung');
        if (submitMenabung) {
            submitMenabung.addEventListener('click', function() {
                const amount = parseInt(document.getElementById('jumlahMenabung').value);
                const keterangan = document.getElementById('keteranganMenabung').value;
                
                if (updateSaldo(amount, 'menabung', keterangan)) {
                    const modal = bootstrap.Modal.getInstance(document.getElementById('menabungModal'));
                    modal.hide();
                    document.getElementById('menabungForm').reset();
                    setTimeout(loadNasabahDashboard, 500);
                }
            });
        }
        
        // Tarik tunai
        const submitTarik = document.getElementById('submitTarik');
        if (submitTarik) {
            submitTarik.addEventListener('click', function() {
                const amount = parseInt(document.getElementById('jumlahTarik').value);
                const keterangan = document.getElementById('keteranganTarik').value;
                
                if (updateSaldo(amount, 'tarik', keterangan)) {
                    const modal = bootstrap.Modal.getInstance(document.getElementById('tarikTunaiModal'));
                    modal.hide();
                    document.getElementById('tarikTunaiForm').reset();
                    setTimeout(loadNasabahDashboard, 500);
                }
            });
        }
        
        // Refresh transactions
        const refreshTransactions = document.getElementById('refreshTransactions');
        if (refreshTransactions) {
            refreshTransactions.addEventListener('click', loadTransactions);
        }
    }
    
    // Admin dashboard
    if (window.location.pathname.includes('dashboard_admin.html')) {
        loadAdminDashboard();
        startSync();
        
        // Refresh data
        const refreshData = document.getElementById('refreshData');
        if (refreshData) {
            refreshData.addEventListener('click', loadNasabahData);
        }
    }
    
    // Update available balance
    const tarikTunaiModal = document.getElementById('tarikTunaiModal');
    if (tarikTunaiModal) {
        tarikTunaiModal.addEventListener('show.bs.modal', function() {
            const user = getCurrentUser();
            if (user) {
                document.getElementById('availableBalance').textContent = formatCurrency(user.saldo || 0);
            }
        });
    }
});
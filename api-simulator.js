// Enhanced API Simulator dengan data sharing cross-device
class EnhancedAPISimulator {
    constructor() {
        this.STORAGE_KEY = 'andika_saving_shared_data';
        this.LAST_UPDATE_KEY = 'andika_last_sync';
        this.initializeSharedData();
    }

    initializeSharedData() {
        // Initialize shared data structure
        if (!localStorage.getItem(this.STORAGE_KEY)) {
            const initialData = {
                users: [
                    {
                        id: this.generateId(),
                        name: 'Administrator',
                        email: 'admin@andikasaving.com',
                        password: 'admin123',
                        role: 'admin',
                        createdAt: new Date().toISOString()
                    }
                ],
                transactions: [],
                lastUpdated: Date.now()
            };
            this.saveSharedData(initialData);
        }
    }

    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    getSharedData() {
        const data = localStorage.getItem(this.STORAGE_KEY);
        return data ? JSON.parse(data) : { users: [], transactions: [], lastUpdated: 0 };
    }

    saveSharedData(data) {
        data.lastUpdated = Date.now();
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
        localStorage.setItem(this.LAST_UPDATE_KEY, Date.now().toString());
        
        // Simulate API call delay
        return new Promise(resolve => {
            setTimeout(() => {
                resolve({ 
                    success: true, 
                    message: 'Data berhasil disimpan',
                    timestamp: Date.now() 
                });
            }, 100);
        });
    }

    // Enhanced polling system dengan cross-device sync
    async syncData() {
        try {
            const localData = this.getSharedData();
            const lastSync = localStorage.getItem('andika_last_sync') || 0;
            
            // Simulate network delay
            await new Promise(resolve => setTimeout(resolve, 200));
            
            return {
                success: true,
                data: localData,
                lastUpdated: localData.lastUpdated,
                hasUpdates: localData.lastUpdated > parseInt(lastSync)
            };
        } catch (error) {
            console.error('Sync error:', error);
            return { success: false, error: error.message };
        }
    }

    // User management
    async registerUser(userData) {
        const sharedData = this.getSharedData();
        
        // Check if email exists
        const existingUser = sharedData.users.find(user => user.email === userData.email);
        if (existingUser) {
            return { success: false, message: 'Email sudah terdaftar' };
        }

        // Add new user
        const newUser = {
            ...userData,
            id: this.generateId(),
            saldo: userData.role === 'nasabah' ? 0 : null,
            createdAt: new Date().toISOString()
        };

        sharedData.users.push(newUser);
        const result = await this.saveSharedData(sharedData);

        // Send email notification for new nasabah
        if (userData.role === 'nasabah') {
            await this.sendEmailNotification(
                'Pendaftaran Nasabah Baru - Andika Saving',
                `Nasabah baru telah bergabung:\n\nNama: ${userData.name}\nEmail: ${userData.email}\nTanggal: ${new Date().toLocaleString('id-ID')}`
            );
        }

        return { 
            success: true, 
            message: 'Pendaftaran berhasil',
            user: newUser 
        };
    }

    async loginUser(email, password, role) {
        const sharedData = this.getSharedData();
        const user = sharedData.users.find(u => 
            u.email === email && 
            u.password === password && 
            u.role === role
        );

        if (!user) {
            return { success: false, message: 'Email, kata sandi, atau peran tidak valid' };
        }

        return { 
            success: true, 
            message: 'Login berhasil',
            user: user 
        };
    }

    async updateSaldo(userId, amount, type, keterangan = '') {
        const sharedData = this.getSharedData();
        const userIndex = sharedData.users.findIndex(u => u.id === userId);
        
        if (userIndex === -1) {
            return { success: false, message: 'User tidak ditemukan' };
        }

        const user = sharedData.users[userIndex];
        const oldSaldo = user.saldo || 0;

        // Validate transaction
        if (amount <= 0) {
            return { success: false, message: 'Jumlah harus lebih dari 0' };
        }

        if (type === 'tarik' && oldSaldo < amount) {
            return { success: false, message: 'Saldo tidak mencukupi' };
        }

        // Update saldo
        if (type === 'menabung') {
            user.saldo = oldSaldo + amount;
        } else if (type === 'tarik') {
            user.saldo = oldSaldo - amount;
        }

        // Record transaction
        const newTransaction = {
            id: this.generateId(),
            userId: userId,
            type: type,
            amount: amount,
            saldo_sebelum: oldSaldo,
            saldo_sesudah: user.saldo,
            keterangan: keterangan || (type === 'menabung' ? 'Setoran tabungan' : 'Penarikan tunai'),
            createdAt: new Date().toISOString()
        };

        sharedData.transactions.push(newTransaction);
        const result = await this.saveSharedData(sharedData);

        // Send email notification
        const transactionType = type === 'menabung' ? 'Setoran' : 'Penarikan';
        await this.sendEmailNotification(
            `Transaksi ${transactionType} - Andika Saving`,
            `Nasabah: ${user.name}\nTipe: ${transactionType}\nJumlah: Rp ${amount.toLocaleString('id-ID')}\nSaldo Baru: Rp ${user.saldo.toLocaleString('id-ID')}\nKeterangan: ${keterangan || '-'}`
        );

        return {
            success: true,
            message: `Berhasil ${type === 'menabung' ? 'menabung' : 'menarik tunai'} Rp ${amount.toLocaleString('id-ID')}`,
            transaction: newTransaction,
            user: user
        };
    }

    async sendEmailNotification(subject, message) {
        // Simulate email sending
        console.log('📧 EMAIL TERKIRIM ke andikakhairulanwar10@gmail.com:');
        console.log('Subjek:', subject);
        console.log('Pesan:', message);
        
        // Store in email history
        const emailHistory = JSON.parse(localStorage.getItem('andika_email_history') || '[]');
        emailHistory.unshift({
            id: this.generateId(),
            subject: subject,
            message: message,
            timestamp: new Date().toISOString(),
            to: 'andikakhairulanwar10@gmail.com'
        });
        localStorage.setItem('andika_email_history', JSON.stringify(emailHistory));
        
        return { success: true, message: 'Notifikasi email terkirim' };
    }

    // Admin functions
    getAllNasabah() {
        const sharedData = this.getSharedData();
        return sharedData.users.filter(user => user.role === 'nasabah');
    }

    getTransactionsForUser(userId) {
        const sharedData = this.getSharedData();
        return sharedData.transactions
            .filter(t => t.userId === userId)
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }

    getAllTransactions() {
        const sharedData = this.getSharedData();
        return sharedData.transactions.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }

    async deleteNasabah(userId) {
        const sharedData = this.getSharedData();
        const userIndex = sharedData.users.findIndex(u => u.id === userId);
        
        if (userIndex === -1) {
            return { success: false, message: 'User tidak ditemukan' };
        }

        const deletedUser = sharedData.users[userIndex];
        sharedData.users.splice(userIndex, 1);
        
        // Remove user's transactions
        sharedData.transactions = sharedData.transactions.filter(t => t.userId !== userId);
        
        const result = await this.saveSharedData(sharedData);

        // Send deletion notification
        await this.sendEmailNotification(
            'Penghapusan Nasabah - Andika Saving',
            `Nasabah berikut telah dihapus:\n\nNama: ${deletedUser.name}\nEmail: ${deletedUser.email}\nSaldo Terakhir: Rp ${(deletedUser.saldo || 0).toLocaleString('id-ID')}`
        );

        return { 
            success: true, 
            message: 'Nasabah berhasil dihapus' 
        };
    }
}

// Initialize global API instance
window.enhancedAPI = new EnhancedAPISimulator();
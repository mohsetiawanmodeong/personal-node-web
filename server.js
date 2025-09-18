const express = require('express');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = 3000;

// Enable CORS for all routes
app.use(cors({
    origin: '*', // Allow all origins for development
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
    credentials: true
}));

// Serve static files from current directory
app.use(express.static(__dirname));

// Basic route
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        message: 'PTFI Personal Node Server is running',
        timestamp: new Date().toISOString()
    });
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
    console.log('🚀 PTFI Personal Node Server is running!');
    console.log(`📱 Local: http://localhost:${PORT}`);
    console.log(`🌐 Network: http://172.16.7.131:${PORT}`);
    console.log(`📋 Health Check: http://localhost:${PORT}/health`);
    console.log('');
    console.log('💡 Tips:');
    console.log('   - Buka browser dan akses salah satu URL di atas');
    console.log('   - Pastikan PTFI ID card reader sudah terhubung');
    console.log('   - Scan PTFI ID card untuk test aplikasi');
    console.log('');
    console.log('🛑 Tekan Ctrl+C untuk stop server');
});

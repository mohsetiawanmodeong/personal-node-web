# PTFI Personal Node

Aplikasi web untuk membaca PTFI ID card dan menampilkan data employee dengan UI yang menarik menggunakan warna biru ala PT Freeport.

## Fitur

- ✅ Membaca input PTFI ID card secara real-time
- ✅ Integrasi dengan backend API untuk fetch data employee
- ✅ UI yang modern dan responsif
- ✅ Menampilkan foto, nama, ID, dan informasi lengkap employee
- ✅ Status indicator untuk monitoring proses scan
- ✅ Error handling untuk PTFI ID card yang tidak terdaftar
- ✅ Animasi dan transisi yang smooth

## Cara Penggunaan

### 🚀 **Metode 1: Menggunakan Local Server (Recommended)**

1. **Install Node.js** (jika belum ada): https://nodejs.org/
2. **Jalankan server** dengan salah satu cara:
   - **Windows**: Double-click `start-server.bat`
   - **Linux/Mac**: Jalankan `chmod +x start-server.sh && ./start-server.sh`
   - **Manual**: `npm install && npm start`
3. **Buka browser** dan akses: `http://localhost:3000`
4. **Siapkan PTFI ID card reader** yang sudah terhubung ke komputer
5. **Scan PTFI ID card** dengan mendekatkan card ke reader
6. **Lihat hasil** - data employee akan ditampilkan jika card terdaftar

### 📁 **Metode 2: File Langsung (Bisa Error CORS)**

1. **Buka aplikasi** di browser dengan membuka file `index.html`
2. **Siapkan PTFI ID card reader** yang sudah terhubung ke komputer
3. **Scan PTFI ID card** dengan mendekatkan card ke reader
4. **Lihat hasil** - data employee akan ditampilkan jika card terdaftar

> ⚠️ **Catatan**: Metode 2 mungkin error CORS karena backend hanya mengizinkan `http://ttd-app`. Gunakan Metode 1 untuk hasil terbaik.

## Struktur File

```
├── index.html          # File HTML utama
├── style.css           # Styling CSS
├── script.js           # JavaScript untuk PTFI ID card reading dan API integration
├── server.js           # Local server untuk development
├── package.json        # Node.js dependencies
├── start-server.bat    # Windows server starter
├── start-server.sh     # Linux/Mac server starter
└── README.md           # Dokumentasi
```

## Konfigurasi API

Aplikasi menggunakan API endpoint:
```
http://172.16.175.60:4990/api/getPTFIDetailsEmployee?smartcard_id={SMARTCARD_ID}
```

Untuk mengubah URL API, edit variabel `apiBaseUrl` di file `script.js`:

```javascript
this.apiBaseUrl = 'http://YOUR_API_URL:PORT/api';
```

## Data yang Ditampilkan

Aplikasi menampilkan informasi employee berikut:
- **Foto** - Photo employee dari server
- **Nama** - Nama lengkap employee
- **Employee ID** - ID unik employee
- **Company** - Nama perusahaan
- **Department** - Departemen
- **Job Title** - Posisi/jabatan
- **Email** - Alamat email
- **Site Address** - Alamat lokasi kerja

## Teknologi yang Digunakan

- **HTML5** - Struktur aplikasi
- **CSS3** - Styling dengan gradient dan animasi
- **Vanilla JavaScript** - Logika aplikasi dan API integration
- **Font Awesome** - Icons
- **Fetch API** - HTTP requests ke backend

## Browser Compatibility

Aplikasi kompatibel dengan browser modern yang mendukung:
- ES6+ JavaScript features
- CSS Grid dan Flexbox
- Fetch API
- CSS Animations

## Development Mode

Untuk development, aplikasi menyediakan tombol test yang akan muncul di localhost untuk testing dengan sample data.

## Troubleshooting

### ❌ **CORS Error**
**Problem**: `Access to fetch at 'http://172.16.175.60:4990/api/...' has been blocked by CORS policy`
**Solution**: 
- **PENTING**: Backend CORS di-set ke `http://ttd-app`, jadi pastikan aplikasi berjalan dari domain yang diizinkan
- Jalankan aplikasi dari web server lokal (Live Server, XAMPP, dll)
- Jangan buka file `index.html` langsung (file://)
- Jika masih error, gunakan proxy server atau ubah CORS setting di backend

### ❌ **401 Unauthorized**
**Problem**: `GET http://172.16.175.60:4990/api/... 401 (Unauthorized)`
**Solution**: 
- Aplikasi menggunakan Basic Authentication dengan credentials:
  - **Username**: `fmiacp`
  - **Password**: `track1nd0`
- Pastikan server API sedang berjalan
- Cek koneksi jaringan ke server API
- Cek konfigurasi user di backend `config` file

### ❌ **PTFI ID Card Reader tidak terdeteksi**
**Problem**: Input PTFI ID card tidak terbaca
**Solution**:
- Pastikan PTFI ID card reader terhubung dengan benar
- Cek driver PTFI ID card reader sudah terinstall
- Test dengan aplikasi lain (seperti Notepad) untuk memastikan reader berfungsi

### ❌ **API tidak merespons**
**Problem**: Server tidak merespons request
**Solution**:
- Cek koneksi jaringan ke server API
- Pastikan URL API sudah benar
- Cek apakah server API sedang berjalan
- Coba akses API langsung di browser

### ❌ **Foto tidak muncul**
**Problem**: Foto employee tidak ditampilkan
**Solution**:
- Cek path foto di response API
- Pastikan server foto dapat diakses
- Aplikasi akan menampilkan placeholder jika foto tidak tersedia

### 🔧 **Cara Debug**
1. Buka Developer Tools (F12)
2. Lihat tab Console untuk error messages
3. Lihat tab Network untuk request/response details
4. Cek apakah server API dapat diakses langsung

## Lisensi

Aplikasi ini dibuat untuk keperluan internal perusahaan.

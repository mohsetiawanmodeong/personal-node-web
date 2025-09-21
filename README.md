# PTFI Personal Node - RFID Employee Management System

Aplikasi web untuk manajemen RFID employee dengan sistem Personal Node yang terintegrasi dengan database ULTS (Underground Tracking System). Aplikasi ini memungkinkan auto-assignment employee ke personal node dan tracking real-time status employee.

## 🎯 Fitur Utama

### **📊 Personal Node Management**
- ✅ Real-time monitoring Personal Node status (Total: 10+ nodes)
- ✅ Visual feedback untuk Personal Node selection
- ✅ Live data refresh setiap 5 detik
- ✅ Zone-based filtering (PRODUCTION SIGNIN)

### **🔖 RFID Employee System**
- ✅ RFID card scanning untuk employee identification
- ✅ Auto-detection employee registration status
- ✅ Integrasi dengan database ULTSPerson dan ULTSEntity
- ✅ Employee photo dan detail information display

### **🎯 Three Operating Modes**

#### **Mode 1: Employee Status Check**
- **Cara**: Scan RFID card tanpa select Personal Node
- **Fungsi**: Menampilkan status registrasi dan assignment employee
- **Display**: "ALREADY REGISTERED AND ASSIGNED" atau "NOT REGISTERED"

#### **Mode 2A: Auto-Assignment (Empty Node)**
- **Cara**: Click Personal Node kosong → Scan RFID card
- **Fungsi**: Auto-assign employee ke Personal Node yang dipilih
- **Features**: Auto-registration jika employee belum terdaftar

#### **Mode 2B: Show Assigned Employee (Occupied Node)**
- **Cara**: Click Personal Node yang sudah assigned
- **Fungsi**: Menampilkan detail employee yang sudah assigned
- **Note**: Scan RFID lain akan overwrite assignment (pending backend API)

### **🔧 Technical Features**
- ✅ Dual credential system (PTFI API + ULTS API)
- ✅ Flexible employee ID matching (dengan/tanpa leading zeros)
- ✅ Latest assignment detection via OID sorting
- ✅ Dynamic group/role assignment berdasarkan Personal Node prefix
- ✅ Error handling dan logging yang comprehensive
- ✅ **PLAN B**: Alternative API support (`closest_nodes`) sebagai backup

## 📋 Cara Penggunaan

### 🚀 **Setup & Installation**

1. **Install Node.js** (jika belum ada): https://nodejs.org/
2. **Jalankan server** dengan salah satu cara:
   - **Windows**: Double-click `start-server.bat`
   - **Linux/Mac**: Jalankan `chmod +x start-server.sh && ./start-server.sh`

### 🌐 **Dynamic URL Configuration**

Aplikasi ini secara otomatis mendeteksi environment dan menggunakan URL yang sesuai:

#### **🟢 Development Environment** (Proxy Server)
- **Host**: `localhost`, `127.0.0.1`, `192.168.x.x`, `10.x.x.x`
- **API Mode**: Proxy Server (`http://localhost:3000/api`)
- **Keuntungan**: CORS handling, authentication proxy

#### **🔴 Production Environment** (Direct Backend)
- **Host**: Semua host lain (termasuk `172.16.175.60`)
- **API Mode**: Direct Backend (`http://172.16.175.60:4990/api`)
- **Keuntungan**: Direct connection ke backend server

#### **💡 Tips Deployment**
- **Untuk komputer lain**: Copy folder aplikasi, jalankan server, aplikasi otomatis detect environment
- **Development**: Akses via `http://localhost:3000` atau `http://192.168.x.x:3000`
- **Production**: Akses via `http://172.16.175.60:3000` atau IP server lainnya
- **Manual**: `npm install && npm start`
3. **Buka browser** dan akses: `http://localhost:3000`

### 🔄 **PLAN B: Alternative API Support**

Aplikasi mendukung dua mode untuk menampilkan Personal Node:

#### **🟢 PLAN A: Original API (Default)**
- **API**: `getFLTAutoZoneEntitiesList`
- **Data**: Full entity data dengan operator_name, employee_id, role
- **Authentication**: Required (fmiacp:track1nd0)
- **Features**: Complete assignment tracking

#### **🔵 PLAN B: Closest Nodes API (Backup)**
- **API**: `http://ugm-kiosk-01:3333/closest_nodes`
- **Data**: Real-time closest nodes dengan range, WASP ID, timestamp
- **Authentication**: None required
- **Features**: Live proximity data, range-based coloring

#### **🔄 Switching Between Plans**
```javascript
// Di browser console:
switchPlan(); // Toggle antara PLAN A dan PLAN B
```

#### **📊 PLAN B Data Format**
```json
[
  {
    "avgRangeMetres": 1.47,
    "pdsName": "UGM-03",
    "rangingTimestamp": "1758436462758",
    "waspID": "58931"
  }
]
```

### 🎮 **Operational Guide**

#### **🔍 Mode 1: Employee Status Check**
```
1. Pastikan tidak ada Personal Node yang selected (highlighted)
2. Scan RFID card employee
3. System akan menampilkan:
   ✅ "ALREADY REGISTERED AND ASSIGNED" (jika sudah assigned)
   ⚠️ "REGISTERED BUT NOT ASSIGNED" (jika terdaftar tapi belum assigned)
   ❌ "NOT REGISTERED" (jika belum terdaftar)
```

#### **🎯 Mode 2A: Auto-Assignment ke Personal Node Kosong**
```
1. Click Personal Node yang kosong (operator_name: undefined)
   - Contoh: UGM-37, UGM-23, UGM-49, UGM-48, UGM-47, UGM-46
2. Status berubah ke: "Ready to Scan - Auto Assignment Mode"
3. Scan RFID card employee
4. System akan:
   - Auto-register employee (jika belum terdaftar)
   - Update employee group/role sesuai Personal Node
   - Assign employee ke Personal Node yang dipilih
   - Refresh tampilan untuk show assignment
```

#### **👤 Mode 2B: Tampilkan Employee yang Sudah Assigned**
```
1. Click Personal Node yang sudah assigned
   - Contoh: UGM-06 (Alexander Y), UGM-09, UGM-05, UGM-04, UGM-03
2. System langsung menampilkan detail employee yang assigned
3. Status: "Showing assigned employee: [Name]"
4. Jika scan RFID card lain: akan overwrite assignment (pending backend API)
```

#### **🔄 Reset Mode**
```
- Click tombol "Reset Selection" atau refresh page
- Kembali ke Mode 1 (Employee Status Check)
```

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

## 🔧 Konfigurasi API

### **Backend API Endpoints**
```javascript
// PTFI Employee Data
http://172.16.175.60:4990/api/getPTFIDetailsEmployee?employee_id={EMPLOYEE_ID}

// ULTS Personal Node Data  
http://172.16.175.60:4990/api/getFLTAutoZoneEntitiesList?zone_oid=160&minlastupdate=1800000

// ULTS Person Management
http://172.16.175.60:4990/api/getULTSPerson
http://172.16.175.60:4990/api/updateULTSPerson

// ULTS Entity Management
http://172.16.175.60:4990/api/getULTSEntity
http://172.16.175.60:4990/api/updateULTSEntityAssignment?entity_id={ID}&employee_id={EMPLOYEE_ID}
```

### **Authentication**
```javascript
// PTFI API Credentials
Username: fmiacp
Password: track1nd0

// ULTS API 
No authentication required (internal network)
```

### **Personal Node Group Mapping**
```javascript
const nodeToGroupMapping = {
    'UGM-': 'UG MINE',           // ENTITYGROUPROLE_OID: 46
    'UGT-': 'UG TECHNOLOGY',     // ENTITYGROUPROLE_OID: 42
    'OC1-': 'OFF/ON BOARD CREW 1',
    'SC1-': 'SETUP CREW 1',
    // ... dan seterusnya
};
```

## 📊 Data yang Ditampilkan

### **Employee Information**
- **Photo** - Employee photo dari PTFI server
- **Nama Lengkap** - Full name employee
- **Employee ID** - ID unik dengan/tanpa leading zeros
- **Company** - TRAKINDO UTAMA PT
- **Department** - Departemen employee
- **Job Title** - Posisi/jabatan
- **Email** - Email address
- **Site Address** - Lokasi kerja

### **Registration Status**
- **Registration Status** - Registered/Not Registered
- **Assignment Status** - Assigned Personal Node
- **Entity Group** - UG MINE, UG TECHNOLOGY, dll
- **Role** - WORKER, LEAD, SUPER, dll
- **Latest Assignment** - Personal Node terakhir yang assigned

## 💻 Teknologi yang Digunakan

### **Frontend**
- **HTML5** - Struktur aplikasi dengan semantic elements
- **CSS3** - Modern styling dengan flexbox, grid, dan animations
- **Vanilla JavaScript ES6+** - Async/await, promises, modules
- **Font Awesome** - Icons untuk UI elements
- **XMLHttpRequest/Fetch API** - HTTP requests ke backend APIs

### **Backend Integration**
- **PTFI Employee API** - Employee data retrieval
- **ULTS Database** - Personal Node dan assignment management
- **Basic Authentication** - Security untuk API access
- **Real-time Updates** - 5-second interval data refresh

### **Key JavaScript Features**
- **RFIDReader Class** - Main application controller
- **Event-driven Architecture** - Personal Node click handlers
- **Promise-based API Calls** - Async data operations
- **Dynamic UI Updates** - Real-time status changes
- **Error Handling** - Comprehensive error management
- **Data Parsing** - Employee ID format normalization

## 🌐 Browser Compatibility

Aplikasi kompatibel dengan browser modern yang mendukung:
- **ES6+ JavaScript** - Classes, arrow functions, async/await
- **CSS Grid dan Flexbox** - Modern layout techniques
- **XMLHttpRequest/Fetch API** - AJAX requests
- **CSS Animations dan Transitions** - Smooth UI interactions
- **Event Listeners** - Keyboard dan mouse events

**Tested Browsers:**
- ✅ Chrome 90+
- ✅ Firefox 88+ 
- ✅ Edge 90+
- ✅ Safari 14+

## 🧪 Development & Testing

### **Debug Mode**
```javascript
// Enable console logging
console.log('🔍 Debug mode enabled');

// Test dengan sample data di localhost
// Tombol test otomatis muncul untuk development
```

### **Local Development**
```bash
# Clone repository
git clone [repository-url]

# Install dependencies
npm install

# Start development server
npm start

# Access aplikasi
http://localhost:3000
```

## 🚨 Troubleshooting

### **❌ Employee "NOT REGISTERED" padahal sudah ada**
**Problem**: Employee yang sudah terdaftar di database masih muncul "NOT REGISTERED"
**Root Cause**: Employee ID format mismatch (dengan/tanpa leading zeros)
**Solution**: 
```javascript
// System sudah handle automatic matching:
Database: 80032009 (number)
PTFI API: "0080032009" (string with leading zeros)
✅ Auto-converted untuk matching
```

### **❌ Personal Node Assignment Error**
**Problem**: Assignment tidak masuk ke database atau assign ke node yang salah
**Root Cause**: OID mismatch antara `getFLTAutoZoneEntitiesList` dan `getULTSEntity`
**Solution**:
- System sudah implementasi OID mapping logic
- Menggunakan `MACHINE_NAME` untuk cross-reference
- Priority pada unassigned entities

### **❌ 401 Unauthorized Error**
**Problem**: `GET http://172.16.175.60:4990/api/... 401 (Unauthorized)`
**Solution**: 
```javascript
// Dual credential system sudah diimplementasi:
PTFI API: fmiacp:track1nd0 (Basic Auth)
ULTS API: No authentication (internal network)
```

### **❌ Visual Selection Hilang Setelah Refresh**
**Problem**: Personal Node selection ter-clear setiap 5 detik
**Solution**: 
- System sudah implementasi selection persistence
- Visual feedback restored after auto-refresh
- Gunakan "Reset Selection" untuk manual clear

### **❌ CORS Policy Error**
**Problem**: `Access to fetch has been blocked by CORS policy`
**Solution**:
- Gunakan local server: `npm start` 
- Jangan buka file `index.html` langsung
- Backend sudah configure CORS untuk development

### **🔧 Debug Tools**
```javascript
// Console Debugging
🎯 updateRegistrationStatus called with: {...}
🔍 Employee match found: {...}
📋 Latest assignment (highest OID): {...}
✅ Entity assignment found: {...}

// Network Tab Monitoring
📡 /api/getPTFIDetailsEmployee - Status 200
📡 /api/getULTSPerson - Status 200  
📡 /api/getULTSEntity - Status 200
📡 /api/updateULTSEntityAssignment - Status 200
```

## 🎯 Known Issues & Future Enhancements

### **⏳ Pending Backend API**
- **Overwrite Assignment**: Scan RFID card lain untuk overwrite existing assignment
- **Status**: Waiting for backend engineer API update

### **🚀 Future Features**
- **Bulk Assignment**: Assign multiple employees sekaligus
- **Assignment History**: Track assignment changes over time
- **Role Management**: Dynamic role assignment based on zone
- **Shift Management**: Personal Node assignment per shift

## 📄 Lisensi

Aplikasi ini dibuat untuk keperluan internal **PT Freeport Indonesia** dan **Trakindo Utama**.

---

### 📞 Support & Contact

Untuk technical support atau feature request, silakan hubungi development team.

**Last Updated**: September 2025  
**Version**: 1.0.0  
**Author**: PTFI Development Team

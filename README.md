# PTFI Personal Node - RFID Employee Management System

Aplikasi web untuk manajemen RFID employee dengan sistem Personal Node yang terintegrasi dengan database ULTS (Underground Tracking System).

## 🚀 Quick Start

### Prerequisites
- Node.js (v14 or higher)
- Modern web browser
- Access to PTFI network

### Installation
```bash
# Clone repository
git clone <repository-url>
cd personal-node-web

# Install dependencies
npm install

# Start development server
npm start
```

### Access Application
- **Development**: http://localhost:3000
- **Production**: http://172.16.175.201:3000

## 📚 Documentation

**📁 All detailed documentation is available in the [`docs/`](./docs/) folder:**

- **[📋 Documentation Index](./docs/INDEX.md)** - Complete documentation overview
- **[🚀 Implementation Guide](./docs/PLAN_A_IMPLEMENTATION.md)** - Plan A implementation details
- **[🔧 Feature Documentation](./docs/UNASSIGN_FEATURE.md)** - Feature documentation
- **[🐛 Bug Fixes](./docs/FIX_DOUBLE_EXECUTION.md)** - Bug fixes and optimizations

## 🎯 Key Features

- **📊 Real-time Personal Node Monitoring** - Live status updates every 3 seconds
- **🔖 RFID Employee Scanning** - Auto-detection and registration
- **🎯 Three Operating Modes** - Scan, Assignment, and Unassign modes
- **⚡ Auto-Assignment** - Backend handles auto-registration and assignment
- **🛡️ Protection Mechanisms** - Prevents double execution and duplicate entries
- **⚡ Optimized Performance** - Fast loading with minimal delays

## 🔧 Technical Stack

- **Frontend**: Vanilla JavaScript, HTML5, CSS3
- **Backend**: Node.js with Express
- **Database**: SQL Server with ULTS integration
- **APIs**: PTFI Details API, ULTS Entity API, Auto Zone API
- **Authentication**: Basic Authentication (fmiacp:track1nd0)

## 📁 Project Structure

```
personal-node-web/
├── 📄 README.md                    # This file
├── 📄 index.html                   # Main application page
├── 📄 script.js                    # Main JavaScript application
├── 📄 style.css                    # Application styling
├── 📄 server.js                    # Node.js server
├── 📄 package.json                 # Dependencies
├── 📁 Backend/                     # Backend services
│   ├── 📁 proxy/                   # Proxy server
│   ├── 📁 ptfidetails/            # PTFI details service
│   └── 📁 ults/                   # ULTS service
├── 📁 docs/                       # 📚 Documentation folder
│   ├── 📄 INDEX.md               # Documentation index
│   ├── 📄 README.md              # Detailed project docs
│   ├── 📄 PLAN_A_IMPLEMENTATION.md
│   ├── 📄 PERSONAL_NODE_LOGIC_UPDATE.md
│   ├── 📄 EMPLOYEE_REGISTRATION_LOGIC.md
│   ├── 📄 UNASSIGN_FEATURE.md
│   ├── 📄 BUTTON_TEXT_LOGIC_UPDATE.md
│   ├── 📄 FIX_DOUBLE_EXECUTION.md
│   ├── 📄 REMOVE_DOUBLE_REGISTRATION.md
│   └── 📄 OPTIMIZE_LOADING_TIME.md
└── 📁 node_modules/              # Dependencies
```

## 🚀 Recent Updates

### ✅ Latest Improvements
- **⚡ Optimized Loading Time** - 50-62% faster operations
- **🛡️ Double Execution Protection** - Prevents duplicate database entries
- **🔄 Simplified Registration** - Backend handles auto-registration
- **📱 Better User Experience** - Consistent button behavior

### 🔧 Technical Improvements
- Reduced database wait times (5s → 2s for assignment, 3s → 1.5s for unassign)
- Eliminated unnecessary API calls
- Added protection flags against double execution
- Streamlined assignment flow

## 📞 Support

For technical support or questions:
- Check the **[📚 Documentation](./docs/INDEX.md)** first
- Review **[🐛 Bug Fixes](./docs/FIX_DOUBLE_EXECUTION.md)** for common issues
- Contact the development team

## 📝 License

This project is proprietary software for PTFI (PT Freeport Indonesia).

---

**📚 For complete documentation, visit the [`docs/`](./docs/) folder**

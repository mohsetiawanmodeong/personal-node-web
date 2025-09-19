class RFIDReader {
    constructor() {
        this.apiBaseUrl = 'http://172.16.175.60:4990/api';
        this.autoZoneApiUrl = 'http://172.16.175.60:4990/api/getFLTAutoZoneEntitiesList?zone_oid=112&minlastupdate=1800000'; //GBC Full Area -> 30 Menit
        // this.autoZoneApiUrl = 'http://172.16.175.60:4990/api/getFLTAutoZoneEntitiesList?zone_oid=130&minlastupdate=1800000'; //GBC RTA Office Only -> 30 Menit
        this.currentInput = '';
        this.isScanning = false;
        this.scanTimeout = null;
        this.autoZoneInterval = null;
        this.autoZoneIntervalTime = 5000; // 5 seconds
        
        this.initializeEventListeners();
        this.updateStatus('Ready to Scan', 'ready');
        this.startAutoZoneRealtime();
    }

    initializeEventListeners() {
        // Listen for keyboard input (PTFI ID card reader typically sends input as keyboard events)
        document.addEventListener('keydown', (e) => {
            this.handleRFIDInput(e);
        });

        // Listen for focus events to ensure we can capture input
        window.addEventListener('focus', () => {
            this.updateStatus('Ready to Scan', 'ready');
        });

        // Prevent default behavior for certain keys that might interfere
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && this.isScanning) {
                e.preventDefault();
                this.processRFIDInput();
            }
        });
    }

    handleRFIDInput(event) {
        // PTFI ID card readers typically send input as rapid keystrokes
        // We'll capture all input and look for patterns
        
        if (event.key === 'Enter') {
            // Enter key indicates end of PTFI ID card input
            if (this.currentInput.length > 0) {
                this.processRFIDInput();
            }
            return;
        }

        // Ignore special keys
        if (event.key.length > 1) {
            return;
        }

        // Add character to current input
        this.currentInput += event.key;
        
        // Update status to show scanning
        if (!this.isScanning) {
            this.isScanning = true;
            this.updateStatus('Scanning PTFI ID Card...', 'scanning');
            this.showScanAnimation();
        }

        // Clear any existing timeout
        if (this.scanTimeout) {
            clearTimeout(this.scanTimeout);
        }

        // Set timeout to process input if no more characters come in
        this.scanTimeout = setTimeout(() => {
            if (this.currentInput.length > 0) {
                this.processRFIDInput();
            }
        }, 500); // 500ms delay to allow for complete input
    }

    processRFIDInput() {
        const smartcardId = this.currentInput.trim();
        
        if (smartcardId.length === 0) {
            this.resetScan();
            return;
        }

        console.log('Processing PTFI ID card input:', smartcardId);
        this.fetchEmployeeData(smartcardId);
    }

    async fetchEmployeeData(smartcardId) {
        try {
            this.showLoading();
            this.updateStatus('Loading PTFI employee data...', 'scanning');

            const url = `${this.apiBaseUrl}/getPTFIDetailsEmployee?smartcard_id=${smartcardId}`;
            console.log('Fetching from:', url);

            // Basic Authentication credentials (from proxy.js config)
            const username = 'fmiacp';
            const password = 'track1nd0';
            const credentials = btoa(username + ':' + password);

            // Use jQuery AJAX like consoles.html for consistency
            const response = await this.makeAjaxRequest(url, credentials);
            
            if (response && response.EMPLOYEE_ID) {
                this.displayEmployeeData(response);
                this.updateStatus('Employee found', 'ready');
            } else {
                this.showError('PTFI employee not found in the system');
                this.updateStatus('PTFI ID Card not found', 'error');
            }

        } catch (error) {
            console.error('Error fetching PTFI employee data:', error);
            
            let errorMessage = 'Failed to load PTFI employee data. ';
            
            if (error.message.includes('401 Unauthorized')) {
                errorMessage += 'API requires authentication. Please contact system administrator.';
            } else if (error.message.includes('403 Forbidden')) {
                errorMessage += 'Access denied. Please check permissions.';
            } else if (error.message.includes('404 Not Found')) {
                errorMessage += 'API endpoint not found. Please check API configuration.';
            } else if (error.message.includes('500 Server Error')) {
                errorMessage += 'Server error. Please try again later.';
            } else if (error.message.includes('Network Error')) {
                errorMessage += 'Cannot connect to server. Please check network connection.';
            } else {
                errorMessage += error.message;
            }
            
            this.showError(errorMessage);
            this.updateStatus('Connection error', 'error');
        } finally {
            this.hideLoading();
            this.resetScan();
        }
    }

    // Make AJAX request similar to consoles.html
    makeAjaxRequest(url, credentials) {
        return new Promise((resolve, reject) => {
            // Create XMLHttpRequest for better control
            const xhr = new XMLHttpRequest();
            
            xhr.open('GET', url, true);
            xhr.setRequestHeader('Accept', 'application/json; charset=utf-8; odata=verbose');
            xhr.setRequestHeader('Authorization', 'Basic ' + credentials);
            
            // Add timeout
            xhr.timeout = 10000; // 10 seconds
            
            xhr.onreadystatechange = function() {
                if (xhr.readyState === 4) {
                    if (xhr.status === 200) {
                        try {
                            const data = JSON.parse(xhr.responseText);
                            console.log('✅ AJAX Request Complete:', url);
                            resolve(data);
                        } catch (e) {
                            console.log('❌ AJAX Parse Error:', e);
                            reject(new Error('Invalid JSON response'));
                        }
                    } else if (xhr.status === 0) {
                        console.log('❌ CORS Error - Request blocked by browser');
                        reject(new Error('CORS Error: Request blocked. Please run from local server (http://localhost:3000)'));
                    } else {
                        console.log('❌ AJAX Request Failed:', url, 'Status:', xhr.status);
                        if (xhr.status === 401) {
                            reject(new Error('401 Unauthorized: Invalid credentials'));
                        } else if (xhr.status === 403) {
                            reject(new Error('403 Forbidden: Access denied'));
                        } else if (xhr.status === 404) {
                            reject(new Error('404 Not Found: API endpoint not found'));
                        } else if (xhr.status === 500) {
                            reject(new Error('500 Server Error: Internal server error'));
                        } else {
                            reject(new Error(`HTTP Error ${xhr.status}: ${xhr.statusText}`));
                        }
                    }
                }
            };
            
            xhr.onerror = function() {
                console.log('❌ AJAX Network Error:', url);
                reject(new Error('Network Error: Cannot connect to API server. Check network connection.'));
            };
            
            xhr.ontimeout = function() {
                console.log('❌ AJAX Timeout:', url);
                reject(new Error('Request timeout: Server took too long to respond'));
            };
            
            xhr.send();
        });
    }

    displayEmployeeData(employee) {
        // Hide scan area and error message; show employee card
        const scanArea = document.getElementById('scanArea');
        const errorMessage = document.getElementById('errorMessage');
        const employeeCard = document.getElementById('employeeCard');
        if (scanArea) scanArea.style.display = 'none';
        if (errorMessage) errorMessage.style.display = 'none';
        if (employeeCard) employeeCard.style.display = 'block';
        
        // Show two column layout
        document.getElementById('twoColumnLayout').style.display = 'grid';

        // Update employee information
        document.getElementById('employeeName').textContent = employee.NAME || '-';
        document.getElementById('employeeId').textContent = `ID: ${employee.EMPLOYEE_ID || '-'}`;
        document.getElementById('employeeCompany').textContent = employee.COMPANY || '-';
        document.getElementById('employeeDepartment').textContent = employee.DEPARTMENT || '-';
        document.getElementById('employeeJobTitle').textContent = employee.JOB_TITLE || '-';
        document.getElementById('employeeEmail').textContent = employee.EMAIL || '-';
        document.getElementById('employeeSite').textContent = employee.SITE_ADDRESS || '-';

        // Update employee photo
        const photoElement = document.getElementById('employeePhoto');
        if (employee.PHOTO) {
            // Construct full URL for the photo
            const photoUrl = `http://172.16.175.60:4990/${employee.PHOTO}`;
            photoElement.src = photoUrl;
        } else {
            // Use default placeholder
            photoElement.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgdmlld0JveD0iMCAwIDEwMCAxMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIxMDAiIGhlaWdodD0iMTAwIiBmaWxsPSIjRjNGNEY2Ii8+CjxjaXJjbGUgY3g9IjUwIiBjeT0iMzUiIHI9IjE1IiBmaWxsPSIjOUNBM0FGIi8+CjxwYXRoIGQ9Ik0yMCA4MEMyMCA2NS42NDA2IDMyLjY0MD2IDUzIDQ3IDUzSDYzQzc3LjM1OTQgNTMgOTAgNjUuNjQwNiA5MCA4MFYxMDBIMjBWODBaIiBmaWxsPSIjOUNBM0FGIi8+Cjwvc3ZnPg==';
        }

        // Add success animation
        employeeCard.style.animation = 'slideIn 0.5s ease-out';
    }

    showError(message) {
        // Hide scan area and employee card
        document.getElementById('scanArea').style.display = 'none';
        document.getElementById('employeeCard').style.display = 'none';
        
        // Show error message
        const errorMessage = document.getElementById('errorMessage');
        errorMessage.style.display = 'block';
        document.getElementById('errorText').textContent = message;

        // Add error animation
        errorMessage.style.animation = 'slideIn 0.5s ease-out';
    }

    showLoading() {
        document.getElementById('loadingOverlay').style.display = 'flex';
    }

    hideLoading() {
        document.getElementById('loadingOverlay').style.display = 'none';
    }

    showScanAnimation() {
        document.getElementById('scanAnimation').classList.add('active');
    }

    hideScanAnimation() {
        document.getElementById('scanAnimation').classList.remove('active');
    }

    updateStatus(text, type) {
        const statusText = document.getElementById('statusText');
        const statusDot = document.getElementById('statusDot');
        
        statusText.textContent = text;
        statusDot.className = `status-dot ${type}`;
    }

    resetScan() {
        this.currentInput = '';
        this.isScanning = false;
        this.hideScanAnimation();
        
        if (this.scanTimeout) {
            clearTimeout(this.scanTimeout);
            this.scanTimeout = null;
        }
    }

    scanAgain() {
        // Keep two-column layout visible
        const layout = document.getElementById('twoColumnLayout');
        if (layout) layout.style.display = 'grid';

        // Hide employee card and error
        const employeeCard = document.getElementById('employeeCard');
        const errorMsg = document.getElementById('errorMessage');
        if (employeeCard) employeeCard.style.display = 'none';
        if (errorMsg) errorMsg.style.display = 'none';

        // Show scan panel on right
        const scanArea = document.getElementById('scanArea');
        if (scanArea) scanArea.style.display = 'block';

        // Reset status and scanning state
        this.updateStatus('Ready to Scan', 'ready');
        this.resetScan();
        this.hideScanAnimation();
    }

    // Start Real-time Auto Zone Data
    startAutoZoneRealtime() {
        // Load initial data
        this.loadAutoZoneData();
        
        // Set up interval for real-time updates
        this.autoZoneInterval = setInterval(() => {
            this.loadAutoZoneData();
        }, this.autoZoneIntervalTime);
        
        console.log(`🔄 Auto Zone real-time updates started (every ${this.autoZoneIntervalTime/1000}s)`);
    }

    // Stop Real-time Auto Zone Data
    stopAutoZoneRealtime() {
        if (this.autoZoneInterval) {
            clearInterval(this.autoZoneInterval);
            this.autoZoneInterval = null;
            console.log('⏹️ Auto Zone real-time updates stopped');
        }
    }

    // Load Auto Zone Data
    async loadAutoZoneData() {
        try {
            // Basic Authentication credentials (same as PTFI API)
            const username = 'fmiacp';
            const password = 'track1nd0';
            const credentials = btoa(username + ':' + password);
            
            const data = await this.makeAjaxRequest(this.autoZoneApiUrl, credentials);
            this.displayAutoZoneEntities(data);
            
        } catch (error) {
            console.error('❌ Error loading Auto Zone data:', error);
            this.displayAutoZoneError(error.message);
        }
    }

    // Display Auto Zone Entities
    displayAutoZoneEntities(entities) {
        const entitiesList = document.getElementById('entitiesList');
        
        if (!entities || entities.length === 0) {
            entitiesList.innerHTML = '<div class="entity-item"><p>No entities found in Auto Zone</p></div>';
            return;
        }

        // Filter entities with class_oid starting with 666666
        const filteredEntities = entities.filter(entity => {
            const classOid = entity.properties.class_oid;
            return classOid && classOid.toString().startsWith('666666');
        });

        if (filteredEntities.length === 0) {
            entitiesList.innerHTML = '<div class="entity-item"><p>No personal nodes found (class_oid 666666XXX)</p></div>';
            return;
        }

        entitiesList.innerHTML = '';

        filteredEntities.forEach(entity => {
            const entityItem = document.createElement('div');
            
            // Determine role and color class
            const role = entity.properties.role || 'UNKNOWN';
            const roleClass = this.getRoleClass(role);
            
            entityItem.className = `entity-item ${roleClass}`;
            
            const name = entity.properties.name || 'Unknown';
            const operatorName = entity.properties.operator_name || 'N/A';
            const employeeId = entity.properties.employee_id || 'N/A';
            const coordinates = entity.geometry.coordinates;
            const zone = entity.ZONES && entity.ZONES.length > 0 ? entity.ZONES[0].NAME : 'Unknown Zone';
            
            entityItem.innerHTML = `
                <div class="entity-header">
                    <div class="entity-name">${name}</div>
                    <div class="entity-role ${roleClass}">${role}</div>
                </div>
                <div class="entity-info">
                    <div class="entity-info-item">
                        <span class="label">Operator:</span>
                        <span class="value">${operatorName}</span>
                    </div>
                    <div class="entity-info-item">
                        <span class="label">Employee ID:</span>
                        <span class="value">${employeeId}</span>
                    </div>
                    
                </div>
                <div class="entity-location">
                    <div class="zone">Zone: ${zone}</div>
                    <div class="coordinates">Coordinates: ${coordinates[0]}, ${coordinates[1]}, ${coordinates[2]}</div>
                </div>
            `;
            
            entitiesList.appendChild(entityItem);
        });

        console.log(`✅ Displayed ${filteredEntities.length} personal nodes (filtered from ${entities.length} total entities)`);
    }

    // Get role class for styling
    getRoleClass(role) {
        switch(role.toUpperCase()) {
            case 'SAFETY':
                return 'safety';
            case 'RESCUE':
                return 'rescue';
            case 'SUPER':
                return 'super';
            case 'LEAD':
                return 'lead';
            case 'WORKER':
                return 'worker';
            default:
                return 'worker'; // Default to worker
        }
    }

    // Display Auto Zone Error
    displayAutoZoneError(errorMessage) {
        const entitiesList = document.getElementById('entitiesList');
        entitiesList.innerHTML = `
            <div class="entity-item">
                <div class="entity-header">
                    <div class="entity-name">Error Loading Data</div>
                    <div class="entity-role">ERROR</div>
                </div>
                <div class="entity-info">
                    <div class="entity-info-item">
                        <span class="label">Message:</span>
                        <span class="value">${errorMessage}</span>
                    </div>
                </div>
            </div>
        `;
    }

}

// Global function for scan again button
function scanAgain() {
    if (window.rfidReader) {
        window.rfidReader.scanAgain();
    }
}


// Initialize the RFID reader when the page loads
document.addEventListener('DOMContentLoaded', () => {
    window.rfidReader = new RFIDReader();
    
    // Add some helpful console messages
    console.log('PTFI Personal Node initialized');
    console.log('API Base URL:', window.rfidReader.apiBaseUrl);
    console.log('Auto Zone API URL:', window.rfidReader.autoZoneApiUrl);
    console.log('Ready to scan PTFI ID cards...');
    
    // Optional: Add a test button for development (remove in production)
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        addTestButton();
    }
});

// Cleanup when page unloads
window.addEventListener('beforeunload', () => {
    if (window.rfidReader) {
        window.rfidReader.stopAutoZoneRealtime();
    }
});

// Development helper function (remove in production)
function addTestButton() {
    const testButton = document.createElement('button');
    testButton.textContent = 'Test API';
    testButton.style.cssText = `
        position: fixed;
        top: 10px;
        right: 10px;
        z-index: 1001;
        padding: 10px 15px;
        background: #1e40af;
        color: white;
        border: none;
        border-radius: 5px;
        cursor: pointer;
        font-size: 12px;
    `;
    testButton.onclick = () => {
        window.rfidReader.fetchEmployeeData('0207294330');
    };
    document.body.appendChild(testButton);
}

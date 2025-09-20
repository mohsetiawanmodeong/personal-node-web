class RFIDReader {
    constructor() {
        this.apiBaseUrl = 'http://172.16.175.60:4990/api';
        // this.autoZoneApiUrl = 'http://172.16.175.60:4990/api/getFLTAutoZoneEntitiesList?zone_oid=160&minlastupdate=1800000'; //OB4 2 Flr -> 30 Menit
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
                console.log('📊 Employee data found:', response);
                
                // Check registration status in admin-person
                const employeeIdWithoutZeros = response.EMPLOYEE_ID.replace(/^0+/, ''); // Remove leading zeros
                console.log('🔍 Checking registration for ID:', employeeIdWithoutZeros);
                const registrationData = await this.checkPersonRegistration(employeeIdWithoutZeros, credentials);
                console.log('📊 Registration data result:', registrationData);
                
                this.displayEmployeeData(response, registrationData);
                this.updateStatus('Employee found', 'ready');
                console.log('✅ Employee details loaded successfully');
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

    displayEmployeeData(employee, registrationData = null) {
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

        // Update registration status
        this.updateRegistrationStatus(registrationData);

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

    getGroupFromNode(nodeName) {
        if (!nodeName || nodeName === 'N/A') {
            return 'N/A';
        }
        
        // Mapping NODE prefix to GROUP name based on provided list
        const nodeToGroupMapping = {
            'OC1-': 'OFF/ON BOARD CREW 1',
            'OC2-': 'OFF/ON BOARD CREW 2', 
            'SC1-': 'SETUP CREW 1',
            'SC2-': 'SETUP CREW 2',
            'SC3-': 'SETUP CREW 3',
            'OC3-': 'OFF/ON BOARD CREW 3',
            'DPC-': 'DEPLOYMENT CREW',
            'OSD-': 'OFF/ON SET DAY CREW',
            'INS-': 'INSTRUMENTATION',
            'CS-': 'CENTRAL SERVICES',
            'ERT-': 'EMERGENCY RESPONSE TEAM',
            'OMT-': 'OPERATIONS MAINTENANCE',
            'MIS-': 'MIS',
            'UGT-': 'UG TECHNOLOGY',
            'UGM-': 'UG MINE'
        };
        
        // Find matching prefix
        for (const [prefix, groupName] of Object.entries(nodeToGroupMapping)) {
            if (nodeName.startsWith(prefix)) {
                return groupName;
            }
        }
        
        // If no prefix matches, return N/A
        return 'N/A';
    }

    // Update registration status display
    updateRegistrationStatus(registrationData) {
        // Find or create registration status element
        let statusElement = document.getElementById('registrationStatus');
        if (!statusElement) {
            // Create registration status element above department/job title
            const cardBody = document.querySelector('.card-body');
            statusElement = document.createElement('div');
            statusElement.id = 'registrationStatus';
            statusElement.className = 'registration-status';
            cardBody.insertBefore(statusElement, cardBody.firstChild);
        }

        if (registrationData && registrationData.isRegistered) {
            // Condition 2: Registered in admin-person (may or may not be assigned to admin-entity)
            if (registrationData.entityName && registrationData.entityName !== 'N/A') {
                // Fully registered and assigned to entity
                statusElement.innerHTML = `
                    <div class="status-registered">
                        <div class="status-header">
                            <span class="status-icon">✅</span><span class="status-text">ALREADY REGISTERED AND ASSIGNED</span>
                        </div>
                        <div class="registration-details-grid">
                            <div class="detail-item">
                                <div>
                                    <span class="label">NAME:</span>
                                    <span class="value">${registrationData.displayName}</span>
                                </div>
                            </div>
                            <div class="detail-item">
                                <div>
                                    <span class="label">NODE:</span>
                                    <span class="value">${registrationData.entityName}</span>
                                </div>
                            </div>
                            <div class="detail-item">
                                <div>
                                    <span class="label">GROUP:</span>
                                    <span class="value">${this.getGroupFromNode(registrationData.entityName)}</span>
                                </div>
                            </div>
                            <div class="detail-item">
                                <div>
                                    <span class="label">ROLE:</span>
                                    <span class="value">${registrationData.role}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                `;
                statusElement.className = 'registration-status registered';
            } else {
                // Registered in admin-person but not assigned to admin-entity
                statusElement.innerHTML = `
                    <div class="status-registered-partial">
                        <div class="status-header">
                            <span class="status-icon">⚠️</span><span class="status-text">REGISTERED BUT NOT ASSIGNED</span>
                        </div>
                        <div class="registration-details-grid">
                            <div class="detail-item">
                                <div>
                                    <span class="label">NAME:</span>
                                    <span class="value">${registrationData.displayName}</span>
                                </div>
                            </div>
                            <div class="detail-item">
                                <div>
                                    <span class="label">NODE:</span>
                                    <span class="value">N/A</span>
                                </div>
                            </div>
                            <div class="detail-item">
                                <div>
                                    <span class="label">GROUP:</span>
                                    <span class="value">N/A</span>
                                </div>
                            </div>
                            <div class="detail-item">
                                <div>
                                    <span class="label">ROLE:</span>
                                    <span class="value">${registrationData.role}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                `;
                statusElement.className = 'registration-status registered-partial';
            }
        } else {
            // Condition 1: Not registered in admin-person OR error occurred
            statusElement.innerHTML = `
                <div class="status-not-registered">
                    <div class="status-header">
                        <span class="status-icon">❌</span><span class="status-text">NOT REGISTERED</span>
                    </div>
                </div>
            `;
            statusElement.className = 'registration-status not-registered';
        }
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
            // Update total count
            const totalCountElement = document.getElementById('totalCount');
            if (totalCountElement) {
                totalCountElement.textContent = '(Total: 0)';
            }
            return;
        }

        // Update total count
        const totalCountElement = document.getElementById('totalCount');
        if (totalCountElement) {
            totalCountElement.textContent = `(Total: ${filteredEntities.length})`;
        }

        entitiesList.innerHTML = '';

        // Limit to 6 items for display
        const displayEntities = filteredEntities.slice(0, 6);

        displayEntities.forEach(entity => {
            const entityItem = document.createElement('div');
            
            // Get entity properties first
            const name = entity.properties.name || 'Unknown';
            const operatorName = entity.properties.operator_name || 'N/A';
            const employeeId = entity.properties.employee_id || 'N/A';
            const role = entity.properties.role || 'UNKNOWN';
            
            // Determine role and color class
            const roleClass = this.getRoleClass(role);
            const isUnassigned = (operatorName && name && operatorName.trim() === name.trim());
            
            entityItem.className = `entity-item ${isUnassigned ? 'safety' : roleClass}`;
            const coordinates = entity.geometry.coordinates;
            const zone = entity.ZONES && entity.ZONES.length > 0 ? entity.ZONES[0].NAME : 'Unknown Zone';
            
            entityItem.innerHTML = `
                <div class=\"entity-main-line\">
                    <span class=\"entity-main-name\">${name}</span>
                    <span class=\"entity-main-operator\">${operatorName}</span>
                    <span class=\"entity-main-employee\">${employeeId}</span>
                    <span class=\"entity-role-badge ${roleClass}\">${role}</span>
                </div>
                <div class=\"entity-location compact\">
                    <span class=\"zone\">Zone:${zone}</span>
                    <span class=\"coordinates\"> ${coordinates[0]},${coordinates[1]},${coordinates[2]}</span>
                </div>
            `;
            
            // Clickable: show in employee card (if worker and has identification)
            entityItem.style.cursor = 'pointer';
            entityItem.addEventListener('click', () => {
                console.log('🖱️ Entity clicked:', entity.properties.name);
                // Add visual feedback
                entityItem.style.backgroundColor = '#e0f2fe';
                setTimeout(() => {
                    entityItem.style.backgroundColor = '';
                }, 200);
                
                // Get employee_id and format it with leading zeros
                const employeeId = entity.properties.employee_id;
                if (employeeId) {
                    // Format employee_id with leading zeros (10 digits total)
                    const formattedEmployeeId = employeeId.toString().padStart(10, '0');
                    console.log('🔍 Fetching employee details for ID:', formattedEmployeeId);
                    this.fetchEmployeeDetails(formattedEmployeeId);
                } else {
                    console.error('❌ No employee_id found for entity:', entity.properties.name);
                }
            });

            entitiesList.appendChild(entityItem);
        });

        console.log(`✅ Displayed ${filteredEntities.length} personal nodes (filtered from ${entities.length} total entities)`);
    }

    // Populate employee card from entity data
    populateEmployeeCardFromEntity(entity) {
        console.log('📋 Populating employee card for:', entity.properties.name);
        
        // Hide scan area and error message
        document.getElementById('scanArea').style.display = 'none';
        document.getElementById('errorMessage').style.display = 'none';
        
        // Show two column layout (already visible, but ensure)
        document.getElementById('twoColumnLayout').style.display = 'grid';

        // Show employee card
        const employeeCard = document.getElementById('employeeCard');
        employeeCard.style.display = 'block';
        console.log('👤 Employee card displayed:', employeeCard.style.display);

        // Update employee information
        document.getElementById('employeeName').textContent = entity.properties.name || '-';
        document.getElementById('employeeId').textContent = `ID: ${entity.properties.employee_id || '-'}`;
        document.getElementById('employeeCompany').textContent = entity.properties.role || '-'; // Using role as placeholder for company
        document.getElementById('employeeDepartment').textContent = 'N/A'; // Placeholder
        document.getElementById('employeeJobTitle').textContent = entity.properties.role || 'N/A'; // Placeholder
        document.getElementById('employeeEmail').textContent = 'N/A'; // Placeholder
        document.getElementById('employeeSite').textContent = entity.ZONES && entity.ZONES.length > 0 ? entity.ZONES[0].NAME : 'N/A'; // Using zone as site address

        // Update employee photo (using a generic placeholder for now as API doesn't provide photo URL)
        const photoElement = document.getElementById('employeePhoto');
        photoElement.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgdmlld0JveD0iMCAwIDEwMCAxMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIxMDAiIGhlaWdodD0iMTAwIiBmaWxsPSIjRjNGNEY2Ii8+CjxjaXJjbGUgY3g9IjUwIiBjeT0iMzUiIHI9IjE1IiBmaWxsPSIjOUNBM0FGIi8+CjxwYXRoIGQ9Ik0yMCA4MEMyMCA2NS42NDA2IDMyLjY0MDYgNTMgNDcgNTNINjNDNzcuMzU5NCA1MyA5MCA2NS42NDA2IDkwIDgwVjEwMEgyMFY4MFoiIGZpbGw9IiM5Q0EzQUYiLz4KPC9zdmc+'; // Default placeholder
        
        // Add success animation
        employeeCard.style.animation = 'slideIn 0.5s ease-out';
        console.log('✅ Employee card population completed for:', entity.properties.name);
    }

    // Fetch employee details from API
    async fetchEmployeeDetails(employeeId) {
        try {
            this.showLoading();
            
            const username = 'fmiacp';
            const password = 'track1nd0';
            const credentials = btoa(username + ':' + password);
            
            const apiUrl = `${this.apiBaseUrl}/getPTFIDetailsEmployee?employee_id=${employeeId}`;
            console.log('🌐 Calling API:', apiUrl);
            
            const data = await this.makeAjaxRequest(apiUrl, credentials);
            
            console.log('📊 Raw API response:', data);
            console.log('📊 Data type:', typeof data);
            console.log('📊 Data length:', data ? data.length : 'null/undefined');
            
            if (data && data.EMPLOYEE_ID) {
                console.log('📊 Employee data found:', data);
                
                // Check registration status in admin-person
                const employeeIdWithoutZeros = employeeId.replace(/^0+/, ''); // Remove leading zeros
                console.log('🔍 Checking registration for ID:', employeeIdWithoutZeros);
                const registrationData = await this.checkPersonRegistration(employeeIdWithoutZeros, credentials);
                console.log('📊 Registration data result:', registrationData);
                
                this.displayEmployeeData(data, registrationData);
                console.log('✅ Employee details loaded successfully');
            } else {
                this.showError(`No employee data found for ID: ${employeeId}`);
                console.log('❌ No employee data found - data:', data);
            }
            
        } catch (error) {
            console.error('❌ Error fetching employee details:', error);
            this.showError(`Failed to load employee details: ${error.message}`);
        } finally {
            this.hideLoading();
        }
    }

    // Check person registration in admin-person and admin-entity system
    async checkPersonRegistration(employeeId, credentials) {
        try {
            // First check if person exists in admin-person
            const personApiUrl = `${this.apiBaseUrl}/getULTSPerson`;
            console.log('🔍 Checking person registration:', personApiUrl);
            
            const personData = await this.makeAjaxRequest(personApiUrl, credentials);
            console.log('📋 Person registration data:', personData);
            console.log('📋 Person data type:', typeof personData);
            console.log('📋 Person data length:', personData ? personData.length : 'null/undefined');
            
            // Debug: Check if we got any data at all
            if (!personData) {
                console.log('❌ personData is null/undefined');
                return {
                    isRegistered: false,
                    entityGroup: null,
                    role: null,
                    personName: null,
                    displayName: null,
                    entityName: null
                };
            }
            
            if (!Array.isArray(personData)) {
                console.log('❌ personData is not an array:', personData);
                return {
                    isRegistered: false,
                    entityGroup: null,
                    role: null,
                    personName: null,
                    displayName: null,
                    entityName: null
                };
            }
            
            if (personData && Array.isArray(personData)) {
                // Remove leading zeros from employeeId for comparison
                const cleanEmployeeId = employeeId.replace(/^0+/, '');
                console.log('📋 Searching for employee_id:', employeeId, 'clean:', cleanEmployeeId, 'type:', typeof employeeId);
                console.log('📋 Available employee_ids:', personData.map(p => ({id: p.EMPLOYEE_ID, type: typeof p.EMPLOYEE_ID})));
                
                // Find person by employee_id (try both string and number comparison)
                const person = personData.find(p => 
                    p.EMPLOYEE_ID === employeeId || 
                    p.EMPLOYEE_ID === employeeId.toString() ||
                    p.EMPLOYEE_ID === parseInt(employeeId) ||
                    p.EMPLOYEE_ID.toString() === employeeId.toString() ||
                    // Try with cleaned employee_id (without leading zeros)
                    p.EMPLOYEE_ID === cleanEmployeeId ||
                    p.EMPLOYEE_ID === cleanEmployeeId.toString() ||
                    p.EMPLOYEE_ID === parseInt(cleanEmployeeId) ||
                    p.EMPLOYEE_ID.toString() === cleanEmployeeId.toString()
                );
                
                console.log('📋 Person search result:', person);
                
                if (person) {
                    console.log('✅ Person found in registration:', person);
                    
                    // Now check entity assignment in admin-entity
                    const entityApiUrl = `${this.apiBaseUrl}/getULTSEntity`;
                    console.log('🔍 Checking entity assignment:', entityApiUrl);
                    
                    const entityData = await this.makeAjaxRequest(entityApiUrl, credentials);
                    console.log('📋 Entity assignment data:', entityData);
                    console.log('📋 Entity data type:', typeof entityData);
                    console.log('📋 Entity data length:', entityData ? entityData.length : 'null/undefined');
                    
                    // Find entity assignment for this person
                    let entityAssignment = null;
                    let entityGroup = 'N/A';
                    
                    if (entityData && Array.isArray(entityData)) {
                        console.log('📋 Searching for entity assignment with person OID:', person.OID, 'employee_id:', employeeId);
                        console.log('📋 Available PERSON_OIDs:', entityData.map(e => e.PERSON_OID));
                        console.log('📋 Available OPERATOR_NAMEs:', entityData.map(e => e.OPERATOR_NAME));
                        
                        // Look for entity where PERSON_OID matches the person's OID
                        entityAssignment = entityData.find(e => 
                            e.PERSON_OID && e.PERSON_OID === person.OID
                        );
                        
                        // If not found by PERSON_OID, try OPERATOR_NAME as fallback
                        if (!entityAssignment) {
                            entityAssignment = entityData.find(e => 
                                e.OPERATOR_NAME && (
                                    e.OPERATOR_NAME.includes(person.DISPLAY_NAME) || 
                                    e.OPERATOR_NAME.includes(employeeId) ||
                                    e.OPERATOR_NAME.includes(cleanEmployeeId)
                                )
                            );
                        }
                        
                        console.log('📋 Entity assignment search result:', entityAssignment);
                        
                        if (entityAssignment) {
                            console.log('✅ Entity assignment found:', entityAssignment);
                            
                            // Get entity group name directly from getULTSEntityGroup
                            const entityGroupApiUrl = `${this.apiBaseUrl}/getULTSEntityGroup`;
                            const entityGroupData = await this.makeAjaxRequest(entityGroupApiUrl, credentials);
                            
                            if (entityGroupData && Array.isArray(entityGroupData)) {
                                // Based on database structure from admin-entity.html:
                                // ENTITYGROUPROLE_OID in ULTSEntity maps to OID in ULTSEntityGroupRole
                                // ULTSEntityGroupRole has ENTITYGROUP_OID that maps to ULTSEntityGroup
                                
                                // From the database structure you provided:
                                // ENTITYGROUPROLE_OID 2 = WORKER with ENTITYGROUP_OID 1 = OFF/ON BOARD CREW 1
                                // ENTITYGROUPROLE_OID 46 = WORKER with ENTITYGROUP_OID 16 = UG MINE
                                // etc.
                                
                                // Try to find entity group by ENTITYGROUPROLE_OID
                                // Based on admin-entity.html logic, we need to map ENTITYGROUPROLE_OID to ENTITYGROUP_OID
                                const entityGroupRoleOid = entityAssignment.ENTITYGROUPROLE_OID;
                                console.log('📋 Entity assignment ENTITYGROUPROLE_OID:', entityGroupRoleOid);
                                console.log('📋 Available entity groups:', entityGroupData.map(g => ({oid: g.OID, name: g.NAME})));
                                
                                // Map ENTITYGROUPROLE_OID to ENTITYGROUP_OID based on provided ULTSEntityGroupRole database
                                const entityGroupRoleMapping = {
                                    1: 8,   // DEFAULT -> Group OID 8
                                    2: 1,   // WORKER -> Group OID 1 (OFF/ON BOARD CREW 1)
                                    3: 1,   // LEAD -> Group OID 1 (OFF/ON BOARD CREW 1)
                                    4: 1,   // SUPER -> Group OID 1 (OFF/ON BOARD CREW 1)
                                    5: 2,   // WORKER -> Group OID 2 (OFF/ON BOARD CREW 2)
                                    6: 2,   // LEAD -> Group OID 2 (OFF/ON BOARD CREW 2)
                                    7: 2,   // SUPER -> Group OID 2 (OFF/ON BOARD CREW 2)
                                    8: 3,   // WORKER -> Group OID 3 (SETUP CREW 1)
                                    9: 3,   // LEAD -> Group OID 3 (SETUP CREW 1)
                                    10: 3,  // SUPER -> Group OID 3 (SETUP CREW 1)
                                    11: 4,  // WORKER -> Group OID 4 (SETUP CREW 2)
                                    12: 4,  // LEAD -> Group OID 4 (SETUP CREW 2)
                                    13: 4,  // SUPER -> Group OID 4 (SETUP CREW 2)
                                    14: 5,  // WORKER -> Group OID 5 (SETUP CREW 3)
                                    15: 5,  // LEAD -> Group OID 5 (SETUP CREW 3)
                                    16: 5,  // SUPER -> Group OID 5 (SETUP CREW 3)
                                    17: 6,  // WORKER -> Group OID 6 (OFF/ON BOARD CREW 3)
                                    18: 6,  // LEAD -> Group OID 6 (OFF/ON BOARD CREW 3)
                                    19: 6,  // SUPER -> Group OID 6 (OFF/ON BOARD CREW 3)
                                    20: 7,  // WORKER -> Group OID 7 (DEPLOYMENT CREW)
                                    21: 7,  // LEAD -> Group OID 7 (DEPLOYMENT CREW)
                                    22: 7,  // SUPER -> Group OID 7 (DEPLOYMENT CREW)
                                    23: 7,  // RESCUE -> Group OID 7 (DEPLOYMENT CREW)
                                    24: 7,  // SAFETY -> Group OID 7 (DEPLOYMENT CREW)
                                    26: 9,  // WORKER -> Group OID 9 (OFF/ON SET DAY CREW)
                                    27: 9,  // LEAD -> Group OID 9 (OFF/ON SET DAY CREW)
                                    28: 9,  // SUPER -> Group OID 9 (OFF/ON SET DAY CREW)
                                    29: 10, // WORKER -> Group OID 10 (INSTRUMENTATION)
                                    30: 10, // LEAD -> Group OID 10 (INSTRUMENTATION)
                                    31: 10, // SUPER -> Group OID 10 (INSTRUMENTATION)
                                    32: 11, // WORKER -> Group OID 11 (CENTRAL SERVICES)
                                    33: 11, // LEAD -> Group OID 11 (CENTRAL SERVICES)
                                    34: 11, // SUPER -> Group OID 11 (CENTRAL SERVICES)
                                    35: 12, // RESCUE -> Group OID 12 (EMERGENCY RESPONSE TEAM)
                                    36: 13, // WORKER -> Group OID 13 (OPERATIONS MAINTENANCE)
                                    37: 13, // LEAD -> Group OID 13 (OPERATIONS MAINTENANCE)
                                    38: 13, // SUPER -> Group OID 13 (OPERATIONS MAINTENANCE)
                                    39: 14, // WORKER -> Group OID 14 (MIS)
                                    40: 14, // LEAD -> Group OID 14 (MIS)
                                    41: 14, // SUPER -> Group OID 14 (MIS)
                                    42: 15, // WORKER -> Group OID 15 (UG TECHNOLOGY)
                                    43: 15, // LEAD -> Group OID 15 (UG TECHNOLOGY)
                                    45: 15, // SUPER -> Group OID 15 (UG TECHNOLOGY)
                                    46: 16, // WORKER -> Group OID 16 (UG MINE)
                                    47: 16, // LEAD -> Group OID 16 (UG MINE)
                                    48: 16  // SUPER -> Group OID 16 (UG MINE)
                                };
                                
                                const mappedEntityGroupOid = entityGroupRoleMapping[entityGroupRoleOid];
                                if (!mappedEntityGroupOid) {
                                    console.log('⚠️ Unknown ENTITYGROUPROLE_OID:', entityGroupRoleOid);
                                }
                                
                                if (mappedEntityGroupOid) {
                                    const group = entityGroupData.find(g => g.OID === mappedEntityGroupOid);
                                    if (group) {
                                        entityGroup = group.NAME || 'N/A';
                                        console.log('✅ Entity group found by mapping:', entityGroup);
                                    } else {
                                        entityGroup = person.ENTITY_GROUP || 'N/A';
                                        console.log('⚠️ Entity group not found, using person data:', entityGroup);
                                    }
                                } else {
                                    entityGroup = person.ENTITY_GROUP || 'N/A';
                                    console.log('⚠️ No mapping found, using person data:', entityGroup);
                                }
                            }
                        }
                    }
                    
                    const result = {
                        isRegistered: true,
                        entityGroup: entityGroup !== 'N/A' ? entityGroup : (person.ENTITY_GROUP || 'N/A'), // Use entity assignment group if found, otherwise person group
                        role: person.ROLE || 'N/A',
                        personName: person.PERSON_NAME || 'N/A',
                        displayName: person.DISPLAY_NAME || 'N/A',
                        entityName: entityAssignment ? entityAssignment.MACHINE_NAME : 'N/A' // Use MACHINE_NAME as entity name
                    };
                    
                    console.log('📊 Final registration result:', result);
                    return result;
                } else {
                    console.log('❌ Person not found in registration');
                    return {
                        isRegistered: false,
                        entityGroup: null,
                        role: null,
                        personName: null,
                        displayName: null,
                        entityName: null
                    };
                }
            } else {
                console.log('❌ Invalid person registration data format');
                return {
                    isRegistered: false,
                    entityGroup: null,
                    role: null,
                    personName: null,
                    displayName: null,
                    entityName: null
                };
            }
        } catch (error) {
            console.error('❌ Error checking person registration:', error);
            console.log('📊 Returning error state - isRegistered: false');
            return {
                isRegistered: false,
                entityGroup: null,
                role: null,
                personName: null,
                displayName: null,
                entityName: null
            };
        }
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
                    <div class="entity-role error">ERROR</div>
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

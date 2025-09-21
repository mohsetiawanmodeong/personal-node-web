class RFIDReader {
    constructor() {
        // Dynamic URL detection - automatically adapts to current host
        this.apiBaseUrl = this.detectApiBaseUrl();
        
        // ===== PLAN A: Original API =====
        this.autoZoneApiUrl = `${this.apiBaseUrl}/getFLTAutoZoneEntitiesList?zone_oid=160&minlastupdate=30000`; //OB4 2 Flr -> 30 Menit
        // this.autoZoneApiUrl = `${this.apiBaseUrl}/getFLTAutoZoneEntitiesList?zone_oid=112&minlastupdate=1800000`; //GBC Full Area -> 30 Menit
        // this.autoZoneApiUrl = `${this.apiBaseUrl}/getFLTAutoZoneEntitiesList?zone_oid=130&minlastupdate=1800000`; //GBC RTA Office Only -> 30 Menit
        
        // ===== PLAN B: Alternative API =====
        this.closestNodesApiUrl = 'http://172.16.175.201:3333/closest_nodes'; // Alternative API for personal nodes
        this.currentInput = '';
        this.isScanning = false;
        this.scanTimeout = null;
        this.autoZoneInterval = null;
        this.autoZoneIntervalTime = 3000; //3 seconds
        this.selectedEntity = null; // Store clicked entity for auto-assignment
        
        // Protection against double execution
        this.isProcessing = false;
        this.isAssigning = false;
        // ===== PLAN SWITCHER =====
        // Change this variable to switch between plans:
        // true = PLAN B (closest_nodes API)
        // false = PLAN A (original autoZone API)
        this.usePlanB = false; //change to false to use PLAN A and true to use PLAN B
        // =========================
        
        this.initializeEventListeners();
        this.updateStatus('Ready to Scan', 'ready');
        this.startAutoZoneRealtime();
    }

    // Dynamic URL detection - automatically adapts to current host
    detectApiBaseUrl() {
        const currentHost = window.location.hostname;
        const currentPort = window.location.port;
        const currentProtocol = window.location.protocol;
        
        console.log('🔍 Detecting API Base URL...');
        console.log('📊 Current hostname:', currentHost);
        console.log('📊 Current port:', currentPort);
        console.log('📊 Current protocol:', currentProtocol);
        
        // Check if running on localhost/development
        if (currentHost === 'localhost' || 
            currentHost === '127.0.0.1' || 
            currentHost.startsWith('192.168.') || 
            currentHost.startsWith('10.') ||
            currentHost.includes('local') ||
            currentHost.includes('dev')) {
            
            // Development environment - use local proxy server
            const apiUrl = `${currentProtocol}//${currentHost}${currentPort ? ':' + currentPort : ''}/api`;
            console.log('🟢 Development environment detected - using proxy:', apiUrl);
            return apiUrl;
        } else {
            // Production environment - use direct backend server
            const apiUrl = 'http://172.16.175.60:4990/api';
            console.log('🔴 Production environment detected - using direct backend:', apiUrl);
            console.log('💡 To use proxy server, run on localhost or 192.168.x.x');
            return apiUrl;
        }
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
        // Protection against double execution
        if (this.isProcessing) {
            console.log('⚠️ Already processing, ignoring duplicate request');
            return;
        }
        
        this.isProcessing = true;
        
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
                const employeeIdOriginal = response.EMPLOYEE_ID; // Keep original with leading zeros
                console.log('🔍 Checking registration for ID:', employeeIdWithoutZeros, 'Original:', employeeIdOriginal);
                
                // getULTSPerson API doesn't require credentials (same as admin-person.html)
                console.log('🔍 Checking person registration without credentials...');
                let registrationData = await this.checkPersonRegistration(employeeIdWithoutZeros, null);
                
                console.log('📊 Registration data result:', registrationData);
                
                // Handle assignment flow based on personal node selection
                console.log('🔗 Processing employee data...');
                
                if (this.selectedEntity && this.selectedEntity.properties) {
                    // Assignment Mode: Personal node is selected
                    const entityProps = this.selectedEntity.properties;
                    const hasOperatorName = entityProps.operator_name && entityProps.operator_name !== 'undefined';
                    const hasEmployeeId = entityProps.employee_id && entityProps.employee_id !== 'undefined';
                    
                    console.log('📱 Personal node selected:', entityProps.name);
                    console.log('📱 Has operator_name:', hasOperatorName, '(', entityProps.operator_name, ')');
                    console.log('📱 Has employee_id:', hasEmployeeId, '(', entityProps.employee_id, ')');
                    
                    if (!hasOperatorName || !hasEmployeeId) {
                        // Case A: Empty personal node - auto-assign
                        console.log('🔗 Personal node is empty - proceeding with auto-assignment');
                        await this.handleAutoAssignment(response, employeeIdWithoutZeros, credentials);
                    } else {
                        // Case B: Personal node has assignment - scanned employee will overwrite the assignment
                        console.log('📋 Personal node already assigned, but scanned employee will overwrite assignment');
                        console.log('📋 Current assignment:', entityProps.operator_name, entityProps.employee_id);
                        console.log('📋 New employee to assign:', response.NAME, response.EMPLOYEE_ID);
                        
                        // Proceed with assignment (this will overwrite the existing assignment)
                        await this.handleAutoAssignment(response, employeeIdWithoutZeros, credentials);
                    }
                } else {
                    // Scan Mode: No personal node selected - just show employee details
                    console.log('📋 No personal node selected - showing employee details only');
                    console.log('🎯 About to call displayEmployeeData with:', response, registrationData);
                    this.displayEmployeeData(response, registrationData);
                    this.updateStatus('Employee found', 'ready');
                    console.log('✅ Employee details loaded successfully');
                }
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
            this.isProcessing = false; // Reset processing flag
        }
    }

    // Make AJAX request similar to consoles.html
    makeAjaxRequest(url, credentials) {
        return new Promise((resolve, reject) => {
            // Create XMLHttpRequest for better control
            const xhr = new XMLHttpRequest();
            
            xhr.open('GET', url, true);
            xhr.setRequestHeader('Accept', 'application/json; charset=utf-8; odata=verbose');
            
            // Only add Authorization header if credentials are provided
            if (credentials) {
            xhr.setRequestHeader('Authorization', 'Basic ' + credentials);
            }
            
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

        // Add unassign button if personal node is selected and assigned
        this.addUnassignButton();

        // Update employee photo
        const photoElement = document.getElementById('employeePhoto');
        if (employee.PHOTO) {
            // Construct full URL for the photo
            const photoUrl = `http://172.16.175.60:4990/${employee.PHOTO}`;
            photoElement.src = photoUrl;
        } else {
            // Use default placeholder
            photoElement.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgdmlld0JveD0iMCAwIDEwMCAxMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIxMDAiIGhlaWdodD0iMTAwIiBmaWxsPSIjRjNGNEY2Ii8+CjxjaXJjbGUgY3g9IjUwIiBjeT0iMzUiIHI9IjE1IiBmaWxsPSIjOUNBM0FGIi8+CjxwYXRoIGQ9Ik0yMCA4MEMyMCA2NS42NDA2IDMyLjY0MDYgNTMgNDcgNTNINjNDNzcuMzU5NCA1MyA5MCA2NS42NDA2IDkwIDgwVjEwMEgyMFY4MFoiIGZpbGw9IiM5Q0EzQUYiLz4KPC9zdmc+';
        }

        // Add success animation
        employeeCard.style.animation = 'slideIn 0.5s ease-out';
    }

    // Add unassign button for assigned personal nodes
    addUnassignButton() {
        // Only show unassign button if personal node is selected and assigned
        if (!this.selectedEntity || !this.selectedEntity.properties) {
            return;
        }

        const isEmpty = this.isPersonalNodeEmpty(
            this.selectedEntity.properties.operator_name,
            this.selectedEntity.properties.employee_id,
            this.selectedEntity.properties.name
        );

        if (isEmpty) {
            // Remove any existing unassign button
            this.removeUnassignButton();
            return;
        }

        // Check if unassign button already exists
        let unassignButton = document.getElementById('unassignButton');
        if (unassignButton) {
            return; // Button already exists
        }

        // Create unassign button
        unassignButton = document.createElement('button');
        unassignButton.id = 'unassignButton';
        unassignButton.className = 'btn btn-danger unassign-btn';
        unassignButton.innerHTML = `
            <div class="icon-user-minus"></div>
            Unassign from ${this.selectedEntity.properties.name}
        `;
        unassignButton.onclick = () => this.handleUnassign();

        // Add button to employee card
        const employeeCard = document.getElementById('employeeCard');
        const cardBody = employeeCard.querySelector('.card-body');
        
        // Insert button after registration status
        const registrationStatus = document.getElementById('registrationStatus');
        if (registrationStatus) {
            registrationStatus.insertAdjacentElement('afterend', unassignButton);
        } else {
            cardBody.appendChild(unassignButton);
        }
    }

    // Remove unassign button
    removeUnassignButton() {
        const unassignButton = document.getElementById('unassignButton');
        if (unassignButton) {
            unassignButton.remove();
        }
    }

    // Handle unassign action
    async handleUnassign() {
        // Protection against double execution
        if (this.isAssigning) {
            console.log('⚠️ Already processing assignment/unassignment, ignoring duplicate request');
            return;
        }
        
        if (!this.selectedEntity || !this.selectedEntity.properties) {
            alert('No personal node selected for unassignment');
            return;
        }

        const entityName = this.selectedEntity.properties.name;
        const employeeName = this.selectedEntity.properties.operator_name;
        
        // Confirm unassignment
        const confirmed = confirm(`Are you sure you want to unassign "${employeeName}" from personal node "${entityName}"?`);
        if (!confirmed) {
            return;
        }

        this.isAssigning = true;
        
        try {
            this.showLoading();
            this.updateStatus('Unassigning employee...', 'scanning');

            // Call unassign API (set employee_id to 0)
            const credentials = btoa('fmiacp:track1nd0');
            const unassignResult = await this.updateEntityAssignmentByMachineName(entityName, 0, credentials);

            if (unassignResult) {
                alert(`Employee "${employeeName}" has been unassigned from personal node "${entityName}" successfully!`);
                
                // Clear selected entity
                this.selectedEntity = null;
                
                // Wait for database update
                console.log('⏳ Waiting for database update...');
                await new Promise(resolve => setTimeout(resolve, 3000)); // Wait 3 seconds for DB update
                
                // Refresh entities list
                console.log('🔄 Refreshing personal nodes list...');
                await this.loadAutoZoneData();
                
                // Hide employee card and show scan area
                const scanArea = document.getElementById('scanArea');
                const employeeCard = document.getElementById('employeeCard');
                const errorMsg = document.getElementById('errorMessage');
                
                if (employeeCard) employeeCard.style.display = 'none';
                if (errorMsg) errorMsg.style.display = 'none';
                if (scanArea) scanArea.style.display = 'block';
                
                // Reset status
                this.updateStatus('Employee unassigned - Ready to Scan', 'ready');
                
                // Clear all selections
                this.clearAllSelections();
                
                console.log('✅ Unassignment completed successfully');
            } else {
                throw new Error('Failed to unassign employee from personal node');
            }
            
        } catch (error) {
            console.error('❌ Error unassigning employee:', error);
            alert('Error unassigning employee: ' + error.message);
            this.updateStatus('Unassignment failed', 'error');
        } finally {
            this.hideLoading();
            this.isAssigning = false; // Reset assigning flag
        }
    }

    // Check if personal node is empty/unassigned
    isPersonalNodeEmpty(operatorName, employeeId, nodeName) {
        // Case 1: operator_name is undefined/null
        if (!operatorName || operatorName === 'undefined' || operatorName === 'null') {
            return true;
        }
        
        // Case 2: employee_id is undefined/null/0
        if (!employeeId || employeeId === 'undefined' || employeeId === 'null' || employeeId === '0') {
            return true;
        }
        
        // Case 3: operator_name equals node_name (unassigned state)
        if (operatorName && nodeName && operatorName.trim() === nodeName.trim()) {
            return true;
        }
        
        // Case 4: operator_name is empty string
        if (operatorName === '') {
            return true;
        }
        
        // If none of the above, it's assigned
        return false;
    }

    getGroupFromNode(nodeName) {
        if (!nodeName || nodeName === 'N/A') {
            return 'N/A';
        }
        
        // Mapping NODE prefix to GROUP name based on actual database data
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
            'UGM-': 'UG MINE'  // UGM- maps to UG MINE (based on actual database screenshot showing UGM-43 has ENTITYGROUPROLE_OID: 46)
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

    // Get ENTITYGROUPROLE_OID based on personal node prefix and role
    getEntityGroupRoleOid(nodeName, role = 'WORKER') {
        if (!nodeName || nodeName === 'N/A') {
            return 1; // Default
        }
        
        // Mapping based on actual database data from screenshots
        // ENTITYGROUPROLE_OID mapping for WORKER role
        const nodeToEntityGroupRoleMapping = {
            'OC1-': 2,   // OFF/ON BOARD CREW 1 + WORKER
            'OC2-': 5,   // OFF/ON BOARD CREW 2 + WORKER
            'SC1-': 8,   // SETUP CREW 1 + WORKER
            'SC2-': 11,  // SETUP CREW 2 + WORKER
            'SC3-': 14,  // SETUP CREW 3 + WORKER
            'OC3-': 17,  // OFF/ON BOARD CREW 3 + WORKER
            'DPC-': 20,  // DEPLOYMENT CREW + WORKER
            'OSD-': 26,  // OFF/ON SET DAY CREW + WORKER
            'INS-': 29,  // INSTRUMENTATION + WORKER
            'CS-': 32,   // CENTRAL SERVICES + WORKER
            'ERT-': 35,  // EMERGENCY RESPONSE TEAM + RESCUE
            'OMT-': 36,  // OPERATIONS MAINTENANCE + WORKER
            'MIS-': 39,  // MIS + WORKER
            'UGT-': 42,  // UG TECHNOLOGY + WORKER
            'UGM-': 46   // UG MINE + WORKER (based on actual database screenshot showing UGM-43 has ENTITYGROUPROLE_OID: 46)
        };
        
        // Find matching prefix
        for (const [prefix, entityGroupRoleOid] of Object.entries(nodeToEntityGroupRoleMapping)) {
            if (nodeName.startsWith(prefix)) {
                console.log(`📱 Node ${nodeName} -> ENTITYGROUPROLE_OID: ${entityGroupRoleOid} (${this.getGroupFromNode(nodeName)} + ${role})`);
                return entityGroupRoleOid;
            }
        }
        
        // Default fallback
        console.log(`📱 Node ${nodeName} -> Using default ENTITYGROUPROLE_OID: 1`);
        return 1;
    }

    // Update registration status display
    updateRegistrationStatus(registrationData) {
                console.log('🎯 updateRegistrationStatus called with:', JSON.stringify(registrationData, null, 2));
        console.log('🎯 registrationData.isRegistered:', registrationData?.isRegistered);
        console.log('🎯 registrationData.entityName:', registrationData?.entityName);
        console.log('🎯 typeof registrationData:', typeof registrationData);
        console.log('🎯 Object.keys(registrationData):', Object.keys(registrationData || {}));
        
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
            // Only show NOT REGISTERED status - no form, auto assignment will handle registration
            statusElement.innerHTML = `
                <div class="status-not-registered">
                    <div class="status-header">
                        <span class="status-icon">❌</span><span class="status-text">NOT REGISTERED</span>
                    </div>
                    <div class="registration-info">
                        <p>Employee is not registered in the system.</p>
                        <p><strong>To register:</strong> Select a personal node and scan the ID card again for auto-assignment.</p>
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

    // Start Real-time Auto Zone Data
    startAutoZoneRealtime() {
        // Load initial data based on current plan
        this.loadCurrentPlanData();
        
        // Set up interval for real-time updates
        this.autoZoneInterval = setInterval(() => {
            this.loadCurrentPlanData();
        }, this.autoZoneIntervalTime);
        
        const planName = this.usePlanB ? 'Closest Nodes (PLAN B)' : 'Auto Zone (PLAN A)';
        console.log(`🔄 ${planName} real-time updates started (every ${this.autoZoneIntervalTime/1000}s)`);
    }

    // Load data based on current plan
    loadCurrentPlanData() {
        if (this.usePlanB) {
            this.loadClosestNodesData();
        } else {
            this.loadAutoZoneData();
        }
    }


    // Stop Real-time Auto Zone Data
    stopAutoZoneRealtime() {
        if (this.autoZoneInterval) {
            clearInterval(this.autoZoneInterval);
            this.autoZoneInterval = null;
            console.log('⏹️ Auto Zone real-time updates stopped');
        }
    }

    // Load Auto Zone Data (PLAN A - Original API)
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

    // Load Closest Nodes Data (PLAN B - Alternative API)
    async loadClosestNodesData() {
        try {
            console.log('🔄 Loading closest nodes data from:', this.closestNodesApiUrl);
            
            // No authentication needed for closest_nodes API
            const data = await this.makeAjaxRequest(this.closestNodesApiUrl, null);
            this.displayClosestNodesEntities(data);
            
        } catch (error) {
            console.error('❌ Error loading Closest Nodes data:', error);
            this.displayAutoZoneError(error.message);
        }
    }

    // Display Auto Zone Entities
    displayAutoZoneEntities(entities) {
        const entitiesList = document.getElementById('entitiesList');
        
        console.log('📊 Raw entities data from API:', JSON.stringify(entities, null, 2));
        
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

        filteredEntities.forEach(entity => {
            const entityItem = document.createElement('div');
            
            // Get entity properties first
            const name = entity.properties.name || 'Unknown';
            const operatorName = entity.properties.operator_name || 'N/A';
            const employeeId = entity.properties.employee_id || 'N/A';
            const role = entity.properties.role || 'UNKNOWN';
            
            // Log each entity for debugging
            console.log(`📱 Entity: ${name}, Operator: ${operatorName}, Employee: ${employeeId}, Role: ${role}`);
            console.log(entity.properties.name);
            
            // Determine if personal node is empty/unassigned or assigned
            const isUnassigned = this.isPersonalNodeEmpty(operatorName, employeeId, name);
            const roleClass = isUnassigned ? 'safety' : this.getRoleClass(role);
            
            entityItem.className = `entity-item ${roleClass}`;
            const coordinates = entity.geometry.coordinates;
            const zone = entity.ZONES && entity.ZONES.length > 0 ? entity.ZONES[0].NAME : 'Unknown Zone';
            
            // Display different content based on assignment status
            if (isUnassigned) {
                entityItem.innerHTML = `
                    <div class="entity-main-line">
                        <span class="entity-main-name">${name}</span>
                        <span class="entity-main-operator">Available</span>
                        <span class="entity-main-employee">-</span>
                        <span class="entity-role-badge ${roleClass}">READY</span>
                    </div>
                    <div class="entity-location compact">
                        <span class="zone">Zone:${zone}</span>
                        <span class="coordinates"> ${coordinates[0]},${coordinates[1]},${coordinates[2]}</span>
                    </div>
                `;
            } else {
                entityItem.innerHTML = `
                    <div class="entity-main-line">
                        <span class="entity-main-name">${name}</span>
                        <span class="entity-main-operator">${operatorName}</span>
                        <span class="entity-main-employee">${employeeId}</span>
                        <span class="entity-role-badge ${roleClass}">${role}</span>
                    </div>
                    <div class="entity-location compact">
                        <span class="zone">Zone:${zone}</span>
                        <span class="coordinates"> ${coordinates[0]},${coordinates[1]},${coordinates[2]}</span>
                    </div>
                `;
            }
            
            // Check if this entity is currently selected
            if (this.selectedEntity && this.selectedEntity.properties && 
                this.selectedEntity.properties.name === entity.properties.name) {
                // Restore visual feedback for previously selected node
                entityItem.classList.add('selected-node');
                entityItem.style.backgroundColor = '#e0f2fe';
                entityItem.style.boxShadow = '0 0 10px rgba(0, 123, 255, 0.5)';
                entityItem.style.border = '2px solid #007bff';
            }
            
            // Clickable: select personal node for assignment
            entityItem.style.cursor = 'pointer';
            entityItem.addEventListener('click', async () => {
                console.log('🖱️ Personal node clicked:', entity.properties.name);
                console.log('📋 Full entity data:', JSON.stringify(entity, null, 2));
                
                // Clear previous selection visual feedback
                this.clearAllSelections();
                
                // Store the clicked entity for auto-assignment
                this.selectedEntity = entity;
                
                // Add visual feedback for selected node
                entityItem.classList.add('selected-node');
                entityItem.style.backgroundColor = '#e0f2fe';
                entityItem.style.boxShadow = '0 0 10px rgba(0, 123, 255, 0.5)';
                entityItem.style.border = '2px solid #007bff';
                
                // Check if this personal node is empty or assigned
                const isEmpty = this.isPersonalNodeEmpty(entity.properties.operator_name, entity.properties.employee_id, entity.properties.name);
                
                if (!isEmpty) {
                    // Personal node has assignment - show assigned employee details immediately
                    console.log('📋 Personal node has assignment:', entity.properties.operator_name, entity.properties.employee_id);
                    
                    try {
                        console.log('🔍 Fetching assigned employee details for ID:', entity.properties.employee_id);
                        const assignedEmployeeUrl = `${this.apiBaseUrl}/getPTFIDetailsEmployee?employee_id=${entity.properties.employee_id}`;
                        const assignedEmployeeCredentials = btoa('fmiacp:track1nd0');
                        const assignedEmployeeData = await this.makeAjaxRequest(assignedEmployeeUrl, assignedEmployeeCredentials);
                        
                        if (assignedEmployeeData && assignedEmployeeData.EMPLOYEE_ID) {
                            console.log('✅ Assigned employee data found:', assignedEmployeeData);
                            
                            // Check registration status for the assigned employee
                            const assignedEmployeeIdClean = assignedEmployeeData.EMPLOYEE_ID.replace(/^0+/, '');
                            const assignedRegistrationData = await this.checkPersonRegistration(assignedEmployeeIdClean, null);
                            
                            // Display the assigned employee's details
                            this.displayEmployeeData(assignedEmployeeData, assignedRegistrationData);
                            
                            // Update status to show this is the assigned employee
                            this.updateStatus(`Showing assigned employee: ${assignedEmployeeData.NAME}`, 'ready');
                            
                            // Update button text to "Reset Selection"
                            this.updateScanButtonText('Reset Selection');
                } else {
                            console.log('❌ Could not fetch assigned employee details');
                            this.showError('Could not load assigned employee details');
                        }
                    } catch (error) {
                        console.error('❌ Error fetching assigned employee:', error);
                        this.showError('Error loading assigned employee: ' + error.message);
                    }
                } else {
                    // Personal node is empty - show ready for assignment message
                    console.log('📋 Personal node is empty - ready for assignment:', entity.properties.name);
                    this.showReadyForAssignment(entity.properties.name);
                }
            });

            entitiesList.appendChild(entityItem);
        });

        console.log(`✅ Displayed ${filteredEntities.length} personal nodes (filtered from ${entities.length} total entities)`);
    }

    // Display Closest Nodes Entities (PLAN B - Alternative API)
    displayClosestNodesEntities(closestNodes) {
        const entitiesList = document.getElementById('entitiesList');
        
        console.log('📊 Raw closest nodes data from API:', JSON.stringify(closestNodes, null, 2));
        
        if (!closestNodes || closestNodes.length === 0) {
            entitiesList.innerHTML = '<div class="entity-item"><p>No closest nodes found</p></div>';
            return;
        }

        // Update total count
        const totalCountElement = document.getElementById('totalCount');
        if (totalCountElement) {
            totalCountElement.textContent = `(Total: ${closestNodes.length})`;
        }

        entitiesList.innerHTML = '';

        closestNodes.forEach(node => {
            const entityItem = document.createElement('div');
            
            // Extract data from closest_nodes API format
            const nodeName = node.pdsName || 'Unknown';
            const avgRange = node.avgRangeMetres || 0;
            const waspId = node.waspID || 'N/A';
            const timestamp = node.rangingTimestamp || 'N/A';
            
            // Log each node for debugging
            console.log(`📱 Closest Node: ${nodeName}, Range: ${avgRange}m, WASP: ${waspId}`);
            console.log(`📅 Raw Timestamp: ${timestamp}`);
            
            // Determine role and color class based on range
            const roleClass = this.getRoleClassFromRange(avgRange);
            
            entityItem.className = `entity-item ${roleClass}`;
            
            // Format timestamp for better readability
            const formattedTimestamp = this.formatTimestamp(timestamp);
            console.log(`📅 Formatted Timestamp: ${formattedTimestamp}`);
            
            entityItem.innerHTML = `
                <div class="entity-main-line">
                    <span class="entity-main-name">${nodeName}</span>
                    <span class="entity-main-operator">Range: ${avgRange}m</span>
                    <span class="entity-main-employee">WASP: ${waspId}</span>
                    <span class="entity-role-badge ${roleClass}">CLOSEST</span>
                </div>
                <div class="entity-location compact">
                    <span class="zone">Time: ${formattedTimestamp}</span>
                    <span class="coordinates"> Range: ${avgRange} metres</span>
                </div>
            `;
            
            // Check if this node is currently selected
            if (this.selectedEntity && this.selectedEntity.pdsName === node.pdsName) {
                // Restore visual feedback for previously selected node
                entityItem.classList.add('selected-node');
                entityItem.style.backgroundColor = '#e0f2fe';
                entityItem.style.boxShadow = '0 0 10px rgba(0, 123, 255, 0.5)';
                entityItem.style.border = '2px solid #007bff';
            }
            
            // Clickable: select personal node for assignment
            entityItem.style.cursor = 'pointer';
            entityItem.addEventListener('click', async () => {
                console.log('🖱️ Closest node clicked:', node.pdsName);
                console.log('📋 Full node data:', JSON.stringify(node, null, 2));
                
                // Clear previous selection visual feedback
                this.clearAllSelections();
                
                // Store the clicked node for auto-assignment
                this.selectedEntity = node;
                
                // Add visual feedback for selected node
                entityItem.classList.add('selected-node');
                entityItem.style.backgroundColor = '#e0f2fe';
                entityItem.style.boxShadow = '0 0 10px rgba(0, 123, 255, 0.5)';
                entityItem.style.border = '2px solid #007bff';
                
                // Show ready for assignment message
                this.showReadyForAssignment(node.pdsName);
            });

            entitiesList.appendChild(entityItem);
        });

        console.log(`✅ Displayed ${closestNodes.length} closest nodes from alternative API`);
    }

    // Clear all visual selections from personal nodes
    clearAllSelections() {
        console.log('🔄 clearAllSelections() called');
        const allNodes = document.querySelectorAll('.entity-item');
        console.log('🔍 Found entity items:', allNodes.length);
        
        allNodes.forEach((node, index) => {
            console.log(`🔍 Clearing node ${index}:`, node);
            node.classList.remove('selected-node');
            node.style.backgroundColor = '';
            node.style.boxShadow = '';
            node.style.border = '';
            node.style.borderLeft = '';
        });
        
        // Clear selected entity and reset button to green
        this.selectedEntity = null;
        this.updateScanButtonText('Scan Again');
        
        // Remove unassign button
        this.removeUnassignButton();
        
        console.log('✅ All visual selections cleared and button reset to green');
    }

    // Update scan button text to "Reset Selection" and change functionality
    updateScanButtonText(text) {
        console.log(`🔄 updateScanButtonText() called with text: "${text}"`);
        const headerText = document.getElementById('scanAgainText');
        const headerButton = document.getElementById('scanAgainBtn');
        console.log('🔍 Looking for scanAgainText element:', headerText);
        console.log('🔍 Looking for scanAgainBtn element:', headerButton);
        
        if (headerText) {
            headerText.textContent = text;
            console.log(`✅ Button text updated to: ${text}`);
        } else {
            console.log('❌ scanAgainText element not found!');
        }
        
        // Apply red styling when in "Reset Selection" mode
        if (headerButton) {
            if (text === 'Reset Selection') {
                headerButton.classList.add('reset-mode');
                console.log('🔴 Applied red styling for Reset Selection mode');
            } else {
                headerButton.classList.remove('reset-mode');
                console.log('🟢 Applied green styling for Scan Again mode');
            }
        } else {
            console.log('❌ scanAgainBtn element not found!');
        }
    }

    // Show ready for assignment message
    showReadyForAssignment(entityName) {
        // Keep scan area visible - don't change layout
        document.getElementById('scanArea').style.display = 'block';
        document.getElementById('employeeCard').style.display = 'none';
        
        // Change button text to "Reset Selection"
        this.updateScanButtonText('Reset Selection');
        
        // Get group name and ENTITYGROUPROLE_OID for this node
        const groupName = this.getGroupFromNode(entityName);
        const entityGroupRoleOid = this.getEntityGroupRoleOid(entityName, 'WORKER');
        
        // Update scan area message to show assignment mode
        const scanArea = document.getElementById('scanArea');
        if (scanArea) {
            const h2Elements = scanArea.querySelectorAll('h2');
            
            if (h2Elements.length >= 1) {
                h2Elements[0].textContent = 'Ready to Scan - Auto Assignment Mode';
            }
            
            if (h2Elements.length >= 2) {
                h2Elements[1].textContent = 'Scan PTFI ID Card';
            }
        }
        
        const scanSubtitle = document.querySelector('#scanArea p');
        if (scanSubtitle) {
            scanSubtitle.innerHTML = `
                <strong>Personal Node Selected:</strong> ${entityName}<br>
                <strong>Auto Settings:</strong> Role: WORKER, Group: ${groupName}<br>
                Scan an employee ID card to automatically register and assign.
            `;
        }
        
        // Update status
        this.updateStatus('Ready to Scan - Auto Assignment Mode', 'ready');
        
        console.log(`🎯 Personal node ${entityName} selected for auto-assignment`);
        console.log(`📋 Auto settings: Role=WORKER, Group=${groupName}, ENTITYGROUPROLE_OID=${entityGroupRoleOid}`);
    }

    // Handle complete auto-assignment flow
    async handleAutoAssignment(employeeData, employeeId, credentials) {
        // Protection against double assignment
        if (this.isAssigning) {
            console.log('⚠️ Already assigning, ignoring duplicate assignment request');
            return;
        }
        
        this.isAssigning = true;
        
        try {
            console.log('🔄 Starting auto-assignment flow for employee:', employeeData.NAME);
            
            if (!this.selectedEntity || !this.selectedEntity.properties) {
                // No personal node selected - just show employee details
                console.log('📋 No personal node selected - showing employee details only');
                this.displayEmployeeData(employeeData, null);
                return;
            }
            
            const entityName = this.selectedEntity.properties.name;
            const entityOid = this.selectedEntity.properties.oid;
            
            console.log('📱 Selected personal node:', entityName, 'OID:', entityOid);
            console.log('🔍 Selected entity properties:', JSON.stringify(this.selectedEntity.properties, null, 2));
            
            // Check if employee is registered and update group if needed
            const registrationData = await this.checkPersonRegistration(employeeId, credentials);
            console.log('📊 Current registration status:', registrationData);
            
            if (registrationData.isRegistered) {
                // Employee exists - update group based on personal node name
                console.log('🔄 Employee already registered, updating group...');
                await this.updatePersonGroupByEmployeeId(employeeId, entityName, credentials);
            } else {
                // Employee not registered - backend will handle auto-registration during assignment
                console.log('📝 Employee not registered - backend will auto-register during assignment');
            }
            
            // Perform assignment using MACHINE_NAME
            console.log('🔗 Assigning employee to personal node:', entityName);
            const assignmentResult = await this.updateEntityAssignmentByMachineName(entityName, employeeId, credentials);
            
                if (assignmentResult) {
                    alert(`Employee "${employeeData.NAME}" assigned to personal node "${entityName}" successfully!`);
                    
                    // Clear selected entity
                    this.selectedEntity = null;
                    
                    // Wait a moment for database to update, then refresh entities list
                    console.log('⏳ Waiting for database update...');
                    await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds for DB update
                    
                    // Force refresh entities list to show updated operator_name
                    console.log('🔄 Force refreshing personal nodes list...');
                    await this.loadAutoZoneData();
                    
                    // Also refresh employee data to show latest assignment
                    console.log('🔄 Refreshing employee data to show latest assignment...');
                    const updatedRegistrationData = await this.checkPersonRegistration(employeeId, credentials);
                    console.log('📊 Updated registration data:', updatedRegistrationData);
                    
                    // Update the display with latest assignment
                    this.displayEmployeeData(employeeData, updatedRegistrationData);
                    
                    // Show success message and auto-reset countdown
                    this.updateStatus('✅ Assignment Successful! Returning to scan mode in 2 seconds...', 'ready');
                    
                    // Auto-reset to scan mode after successful assignment
                    console.log('🔄 Auto-assignment completed - resetting to scan mode to prevent double assignment');
                    
                    // Visual countdown for user feedback
                    let countdown = 2;
                    const countdownInterval = setInterval(() => {
                        countdown--;
                        if (countdown > 0) {
                            this.updateStatus(`✅ Assignment Successful! Returning to scan mode in ${countdown} seconds...`, 'ready');
                        } else {
                            clearInterval(countdownInterval);
                        }
                    }, 1000);
                    
                    // Clear selection and reset button to prevent accidental double assignment
                    setTimeout(() => {
                        this.clearAllSelections();
                        
                        // Hide employee details and show scan area
                        const scanArea = document.getElementById('scanArea');
                        const employeeCard = document.getElementById('employeeCard');
                        const errorMsg = document.getElementById('errorMessage');
                        
                        if (employeeCard) employeeCard.style.display = 'none';
                        if (errorMsg) errorMsg.style.display = 'none';
                        if (scanArea) scanArea.style.display = 'block';
                        
                        // Reset status to ready
                        this.updateStatus('Assignment completed - Ready to Scan', 'ready');
                        
                        // Force refresh personal nodes to show updated assignment
                        this.loadAutoZoneData();
                        
                        console.log('✅ Auto-assignment completed successfully - back to scan mode');
                    }, 2000); // Give user 2 seconds to see the assignment result
            } else {
                    throw new Error('Failed to assign employee to personal node');
            }
            
        } catch (error) {
            console.error('❌ Error in auto-assignment flow:', error);
            alert('Error in auto-assignment: ' + error.message);
        } finally {
            this.isAssigning = false; // Reset assigning flag
        }
    }


    // Get entity by MACHINE_NAME to avoid duplicate OID issues
    async getEntityByMachineName(machineName, credentials) {
        return new Promise((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            
            // Store apiBaseUrl in local variable to avoid context issues
            const apiBaseUrl = this.apiBaseUrl;
            console.log('🔍 API Base URL:', apiBaseUrl);
            
            // Get data from getULTSEntity to find entity by MACHINE_NAME
            const entityUrl = `${apiBaseUrl}/getULTSEntity`;
            console.log('🔍 Getting entity by MACHINE_NAME:', entityUrl);
            
            xhr.open('GET', entityUrl, true);
            xhr.setRequestHeader('Authorization', 'Basic ' + credentials);
            
            xhr.onreadystatechange = function() {
                if (xhr.readyState === 4) {
                    if (xhr.status === 200) {
                        try {
                            const entityData = JSON.parse(xhr.responseText);
                            console.log('📊 ULTSENTITY data:', entityData);
                            
                            // Find ALL entities with matching MACHINE_NAME (there might be duplicates)
                            const matchingEntities = entityData.filter(e => e.MACHINE_NAME === machineName);
                            console.log('🔍 Found entities with MACHINE_NAME:', machineName, ':', matchingEntities);
                            
                            if (matchingEntities.length > 0) {
                                // If multiple entities with same MACHINE_NAME, choose the one that's available for assignment
                                // Priority: 1) Unassigned (OPERATOR_NAME === MACHINE_NAME), 2) Lowest OID (first created)
                                const availableEntity = matchingEntities.find(e => 
                                    e.OPERATOR_NAME === machineName || 
                                    e.OPERATOR_NAME === 'undefined' || 
                                    e.PERSON_OID === 0
                                ) || matchingEntities[0]; // Fallback to first one
                                
                                console.log('✅ Selected entity for assignment:', availableEntity);
                                console.log('🔍 Using ULTSENTITY OID:', availableEntity.OID, 'for MACHINE_NAME:', machineName);
                                
                                resolve({
                                    ultsEntityOid: availableEntity.OID,
                                    entity: availableEntity,
                                    allMatches: matchingEntities
                                });
                            } else {
                                console.log('❌ No entity found in ULTSENTITY with MACHINE_NAME:', machineName);
                                reject(new Error('No entity found in ULTSENTITY with MACHINE_NAME: ' + machineName));
                            }
                        } catch (e) {
                            console.log('❌ ULTSENTITY response parse error:', e);
                            reject(new Error('Invalid JSON response from ULTSENTITY'));
                        }
                    } else {
                        console.log('❌ ULTSENTITY request failed:', xhr.status, xhr.statusText);
                        reject(new Error(`HTTP Error ${xhr.status}: ${xhr.statusText}`));
                    }
                }
            };
            
            xhr.onerror = function() {
                console.log('❌ ULTSENTITY network error');
                reject(new Error('Network Error: Cannot connect to ULTSENTITY API server'));
            };
            
            xhr.send();
        });
    }

    // Update entity assignment via API using MACHINE_NAME to avoid duplicate OID issues
    async updateEntityAssignmentByMachineName(machineName, employeeId, credentials) {
        try {
            // Get correct OID by matching MACHINE_NAME (not OID) to avoid duplicates
            console.log('🔍 Getting correct entity OID by matching MACHINE_NAME...');
            const entityMatch = await this.getEntityByMachineName(machineName, credentials);
            
            console.log('✅ Entity Match result:', entityMatch);
            console.log('🔍 Using ULTSENTITY OID:', entityMatch.ultsEntityOid, 'for MACHINE_NAME:', machineName);
            
            // Perform assignment using correct entity_id from ULTSENTITY
            return new Promise((resolve, reject) => {
                const xhr = new XMLHttpRequest();
                const apiBaseUrl = this.apiBaseUrl;
                const assignUrl = `${apiBaseUrl}/updateULTSEntityAssignment?entity_id=${entityMatch.ultsEntityOid}&employee_id=${employeeId}`;
                
                console.log('🔗 Calling assignment API with correct ULTSENTITY OID:', assignUrl);
                console.log('🔍 Assignment - entity_id:', entityMatch.ultsEntityOid, 'employee_id:', employeeId, 'MACHINE_NAME:', machineName);
                
                xhr.open('GET', assignUrl, true);
                xhr.setRequestHeader('Authorization', 'Basic ' + credentials);
                
                xhr.onreadystatechange = function() {
                    if (xhr.readyState === 4) {
                        console.log('📡 Assignment API response status:', xhr.status);
                        console.log('📡 Assignment API response text:', xhr.responseText);
                        
                        if (xhr.status === 200) {
                            try {
                                const assignResult = JSON.parse(xhr.responseText);
                                console.log('✅ Assignment successful with correct OID:', assignResult);
                                console.log('📊 Assignment result details:', JSON.stringify(assignResult, null, 2));
                                resolve(assignResult);
                            } catch (e) {
                                console.log('❌ Assignment response parse error:', e);
                                console.log('📡 Raw response:', xhr.responseText);
                                reject(new Error('Invalid JSON response from assignment'));
                            }
                        } else {
                            console.log('❌ Assignment failed:', xhr.status, xhr.statusText);
                            console.log('📡 Error response:', xhr.responseText);
                            reject(new Error(`HTTP Error ${xhr.status}: ${xhr.statusText}`));
                        }
                    }
                };
                
                xhr.onerror = function() {
                    console.log('❌ Assignment network error');
                    reject(new Error('Network Error: Cannot connect to API server'));
                };
                
                xhr.send();
            });
            
        } catch (error) {
            console.log('❌ Error getting correct entity by MACHINE_NAME:', error);
            throw error;
        }
    }

    // Update person group using existing updateULTSPerson API (PUT method)
    async updatePersonGroupByEmployeeId(employeeId, personalNodeName, credentials) {
        return new Promise((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            
            // Store apiBaseUrl in local variable to avoid context issues
            const apiBaseUrl = this.apiBaseUrl;
            console.log('🔍 API Base URL:', apiBaseUrl);
            
            // Get group and role based on personal node name
            const groupName = this.getGroupFromNode(personalNodeName);
            const entityGroupRoleOid = this.getEntityGroupRoleOid(personalNodeName, 'WORKER');
            
            // First, get current person data
            const getUrl = `${apiBaseUrl}/getULTSPerson`;
            console.log('🔍 Getting current person data:', getUrl);
            
            xhr.open('GET', getUrl, true);
            xhr.setRequestHeader('Authorization', 'Basic ' + credentials);
            
            xhr.onreadystatechange = function() {
                if (xhr.readyState === 4) {
                    if (xhr.status === 200) {
                        try {
                            const personData = JSON.parse(xhr.responseText);
                            console.log('📊 Current person data:', personData);
                            
                            // Find the person with matching employee_id
                            const person = personData.find(p => p.EMPLOYEE_ID == employeeId);
                            if (person) {
                                console.log('✅ Found person to update:', person);
                                
                                // Update person data with new group
                                const updatedPersonData = {
                                    ...person,
                                    ENTITYGROUPROLE_OID: entityGroupRoleOid,
                                    ROLE: 'WORKER'
                                };
                                
                                console.log('🔄 Updated person data:', updatedPersonData);
                                
                                // Now update the person using PUT method
                                const xhr2 = new XMLHttpRequest();
                                const updateUrl = `${apiBaseUrl}/updateULTSPerson`;
                                
                                console.log('🔗 Updating person with URL:', updateUrl);
                                console.log('📊 Person data to update:', JSON.stringify(updatedPersonData, null, 2));
                                
                                xhr2.open('PUT', updateUrl, true);
                                xhr2.setRequestHeader('Authorization', 'Basic ' + credentials);
                                xhr2.setRequestHeader('Content-Type', 'application/json');
                                
                                xhr2.onreadystatechange = function() {
                                    if (xhr2.readyState === 4) {
                                        if (xhr2.status === 200) {
                                            try {
                                                const updateResult = JSON.parse(xhr2.responseText);
                                                console.log('✅ Person group update successful:', updateResult);
                                                resolve(updateResult);
                                            } catch (e) {
                                                console.log('❌ Person update response parse error:', e);
                                                reject(new Error('Invalid JSON response from person update'));
                                            }
            } else {
                                            console.log('❌ Person update failed:', xhr2.status, xhr2.statusText);
                                            reject(new Error(`HTTP Error ${xhr2.status}: ${xhr2.statusText}`));
                                        }
                                    }
                                };
                                
                                xhr2.onerror = function() {
                                    console.log('❌ Person update network error');
                                    reject(new Error('Network Error: Cannot connect to API server'));
                                };
                                
                                xhr2.send(JSON.stringify(updatedPersonData));
                            } else {
                                console.log('❌ No person found with employee_id:', employeeId);
                                reject(new Error('No person found with employee_id: ' + employeeId));
                            }
                        } catch (e) {
                            console.log('❌ Person data response parse error:', e);
                            reject(new Error('Invalid JSON response from person data'));
                        }
                    } else {
                        console.log('❌ Person data request failed:', xhr.status, xhr.statusText);
                        reject(new Error(`HTTP Error ${xhr.status}: ${xhr.statusText}`));
                    }
                }
            };
            
            xhr.onerror = function() {
                console.log('❌ Person data network error');
                reject(new Error('Network Error: Cannot connect to API server'));
            };
            
            xhr.send();
        });
    }

    // Check person registration in admin-person and admin-entity system
    async checkPersonRegistration(employeeId, inputCredentials) {
        try {
            // First check if person exists in admin-person
            const personApiUrl = `${this.apiBaseUrl}/getULTSPerson`;
            console.log('🔍 Checking person registration:', personApiUrl);
        console.log('🔍 Using credentials for admin API:', inputCredentials ? 'credentials provided' : 'no credentials');
            
        // ULTS backend requires authentication, using fmiacp credentials
        const credentials = btoa('fmiacp:track1nd0');
            const personData = await this.makeAjaxRequest(personApiUrl, credentials);
        
            console.log('📋 Person registration data:', personData);
            console.log('📋 Person data type:', typeof personData);
            console.log('📋 Person data length:', personData ? personData.length : 'null/undefined');
        
        if (personData && Array.isArray(personData) && personData.length > 0) {
            console.log('📋 Sample person record:', personData[0]);
            console.log('📋 All person names:', personData.map(p => p.PERSON_NAME));
        }
            
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
                // Clean both employeeId and database values for comparison
                const cleanEmployeeId = employeeId.replace(/^0+/, '');
                console.log('📋 Searching for employee_id:', employeeId, 'clean:', cleanEmployeeId, 'type:', typeof employeeId);
                console.log('📋 Available employee_ids:', personData.map(p => ({id: p.EMPLOYEE_ID, type: typeof p.EMPLOYEE_ID, clean: String(p.EMPLOYEE_ID).replace(/^0+/, '')})));
                
                        // Enhanced search with more flexible matching
                        // Database stores EMPLOYEE_ID as number (e.g., 80032009)
                        // Input comes as string with leading zeros (e.g., "0080032009")
                        const person = personData.find(p => {
                            const dbEmployeeId = p.EMPLOYEE_ID; // This is a number like 80032009
                            const inputEmployeeId = employeeId; // This is string like "80032009" (already cleaned)
                            
                            console.log('🔍 Comparing:', {
                                database_id: dbEmployeeId,
                                database_type: typeof dbEmployeeId,
                                input_id: inputEmployeeId,
                                input_type: typeof inputEmployeeId
                            });
                            
                            // Convert database number to string and compare with cleaned input
                            const dbIdAsString = String(dbEmployeeId);
                            const inputIdCleaned = String(inputEmployeeId).replace(/^0+/, '');
                            
                            const match = (
                                // Direct numeric comparison
                                dbEmployeeId === parseInt(inputEmployeeId, 10) ||
                                // String comparison after cleaning
                                dbIdAsString === inputIdCleaned ||
                                // Fallback comparisons
                                dbIdAsString === inputEmployeeId ||
                                String(dbEmployeeId) === String(inputEmployeeId)
                            );
                            
                            if (match) {
                                console.log('✅ Employee match found:', {
                                    database: dbEmployeeId,
                                    input: inputEmployeeId,
                                    dbAsString: dbIdAsString,
                                    inputCleaned: inputIdCleaned
                                });
                            }
                            
                            return match;
                        });
                
                console.log('📋 Person search result:', person);
                
                if (person) {
                    console.log('✅ Person found in registration:', person);
                    
                    // Now check entity assignment in admin-entity
                    const entityApiUrl = `${this.apiBaseUrl}/getULTSEntity`;
                    console.log('🔍 Checking entity assignment:', entityApiUrl);
                    
                            // ULTS backend requires authentication, using fmiacp credentials
                            const entityCredentials = btoa('fmiacp:track1nd0');
                            const entityData = await this.makeAjaxRequest(entityApiUrl, entityCredentials);
                    console.log('📋 Entity assignment data:', entityData);
                    console.log('📋 Entity data type:', typeof entityData);
                    console.log('📋 Entity data length:', entityData ? entityData.length : 'null/undefined');
                    
                    // Find entity assignment for this person
                    let entityAssignment = null;
                    let entityGroup = 'N/A';
                    
                    if (entityData && Array.isArray(entityData)) {
                        console.log('📋 Searching for entity assignment with person OID:', person.OID, 'employee_id:', employeeId);
                            console.log('📋 Person DISPLAY_NAME:', person.DISPLAY_NAME);
                            console.log('📋 Available PERSON_OIDs sample:', entityData.slice(0,5).map(e => e.PERSON_OID));
                            console.log('📋 Available OPERATOR_NAMEs sample:', entityData.slice(0,5).map(e => e.OPERATOR_NAME));
                            console.log('📋 Total entity data count:', entityData.length);
                        
                            // Look for ALL entities where PERSON_OID matches the person's OID
                            const allAssignments = entityData.filter(e => 
                            e.PERSON_OID && e.PERSON_OID === person.OID
                        );
                        
                            console.log('📋 All assignments found by PERSON_OID:', allAssignments);
                            
                            // Also look for entities where OPERATOR_NAME matches person's DISPLAY_NAME
                            const operatorAssignments = entityData.filter(e => 
                                e.OPERATOR_NAME && (
                                    e.OPERATOR_NAME === person.DISPLAY_NAME ||
                                    e.OPERATOR_NAME.includes(person.DISPLAY_NAME) || 
                                    e.OPERATOR_NAME.includes(employeeId) ||
                                    e.OPERATOR_NAME.includes(cleanEmployeeId)
                                )
                            );
                            
                            console.log('📋 All assignments found by OPERATOR_NAME:', operatorAssignments);
                            
                            // Combine both results and remove duplicates
                            const combinedAssignments = [...allAssignments];
                            operatorAssignments.forEach(opAssign => {
                                if (!combinedAssignments.find(assign => assign.OID === opAssign.OID)) {
                                    combinedAssignments.push(opAssign);
                                }
                            });
                            
                            console.log('📋 Combined assignments:', combinedAssignments);
                            
                            // If found assignments, get the latest one (highest OID)
                            if (combinedAssignments.length > 0) {
                                // Sort by OID descending to get the latest assignment
                                combinedAssignments.sort((a, b) => b.OID - a.OID);
                                entityAssignment = combinedAssignments[0];
                                console.log('✅ Latest assignment (highest OID):', entityAssignment);
                                console.log('📊 Latest assignment details - MACHINE_NAME:', entityAssignment.MACHINE_NAME, 'OID:', entityAssignment.OID, 'OPERATOR_NAME:', entityAssignment.OPERATOR_NAME);
                            }
                        
                        console.log('📋 Entity assignment search result:', entityAssignment);
                        
                        if (entityAssignment) {
                            console.log('✅ Entity assignment found:', entityAssignment);
                            entityGroup = this.getGroupFromNode(entityAssignment.MACHINE_NAME);
                        }
                    }
                    
                    console.log('🎯 Before creating result - entityAssignment:', entityAssignment);
                    console.log('🎯 Before creating result - entityGroup:', entityGroup);
                    
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

    // Get role class based on range for closest nodes (PLAN B)
    getRoleClassFromRange(range) {
        if (range <= 1.5) {
            return 'safety'; // Very close - green
        } else if (range <= 2.0) {
            return 'rescue'; // Close - blue
        } else if (range <= 3.0) {
            return 'super'; // Medium - yellow
        } else {
            return 'worker'; // Far - default
        }
    }

    // Format timestamp for better readability
    formatTimestamp(timestamp) {
        if (!timestamp || timestamp === 'N/A') {
            return 'N/A';
        }
        
        try {
            // Convert timestamp to Date object
            const date = new Date(parseInt(timestamp));
            
            // Check if date is valid
            if (isNaN(date.getTime())) {
                return 'Invalid Time';
            }
            
            // Format date and time
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            const hours = String(date.getHours()).padStart(2, '0');
            const minutes = String(date.getMinutes()).padStart(2, '0');
            const seconds = String(date.getSeconds()).padStart(2, '0');
            
            // Return formatted timestamp
            return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
            
        } catch (error) {
            console.error('Error formatting timestamp:', error);
            return 'Format Error';
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

// Global function for insert employee button (default version)
function insertEmployeeDefault() {
    if (window.rfidReader) {
        window.rfidReader.insertEmployeeDefault();
    }
}


// Global function to handle scan again or reset selection (refresh page)
function scanAgain() {
    console.log('🖱️ scanAgain() function called');
    const headerText = document.getElementById('scanAgainText');
    
    if (headerText && headerText.textContent === 'Reset Selection') {
        // If in assignment mode, refresh the page to reset everything
        console.log('🔄 Reset Selection - refreshing page...');
        window.location.reload();
    } else {
        // Normal scan mode - just clear any existing employee data
    if (window.rfidReader) {
            console.log('🔄 Normal scan mode - clearing employee data...');
            const scanArea = document.getElementById('scanArea');
            const employeeCard = document.getElementById('employeeCard');
            const errorMsg = document.getElementById('errorMessage');
            
            if (employeeCard) employeeCard.style.display = 'none';
            if (errorMsg) errorMsg.style.display = 'none';
            if (scanArea) scanArea.style.display = 'block';
            
            window.rfidReader.updateStatus('Ready to Scan', 'ready');
            window.rfidReader.resetScan();
            window.rfidReader.hideScanAnimation();
            
            console.log('🔄 Scan Again - cleared employee data');
        }
    }
}

// Initialize the RFID reader when the page loads
document.addEventListener('DOMContentLoaded', () => {
    window.rfidReader = new RFIDReader();
    
    // Add some helpful console messages
    console.log('🚀 PTFI Personal Node initialized');
    console.log('🔗 API Base URL:', window.rfidReader.apiBaseUrl);
    console.log('📡 Auto Zone API URL (PLAN A):', window.rfidReader.autoZoneApiUrl);
    console.log('📡 Closest Nodes API URL (PLAN B):', window.rfidReader.closestNodesApiUrl);
    console.log('✅ Ready to scan PTFI ID cards...');
    
    // Show current plan
    const currentPlan = window.rfidReader.usePlanB ? 'PLAN B (closest_nodes)' : 'PLAN A (autoZone)';
    console.log('🎯 Current Plan:', currentPlan);
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

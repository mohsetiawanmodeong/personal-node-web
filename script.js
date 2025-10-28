class RFIDReader {
    constructor() {
        // Dynamic URL detection - automatically adapts to current host
		const myURL = new URL(window.location.toLocaleString());
		let params = new URLSearchParams(myURL.search);
		if ( params.has("wasp_id") ){
			this.srcWASPID = params.get("wasp_id");
		}else{
			this.srcWASPID = 19971;
		}
		console.log("Getting Data from Bridge with WASP ID["+this.srcWASPID+"].");
        this.apiBaseUrl = this.detectApiBaseUrl();
        
        // ===== PLAN A: Original API =====
        this.autoZoneApiUrl = `${this.apiBaseUrl}api/getFLTAutoZoneEntitiesList?zone_oid=160&minlastupdate=30000`; //OB4 2 Flr -> 30 detik
        // this.autoZoneApiUrl = `${this.apiBaseUrl}/getFLTAutoZoneEntitiesList?zone_oid=112&minlastupdate=1800000`; //GBC Full Area -> 30 Menit
        // this.autoZoneApiUrl = `${this.apiBaseUrl}/getFLTAutoZoneEntitiesList?zone_oid=130&minlastupdate=1800000`; //GBC RTA Office Only -> 30 Menit
        
        // ===== PLAN B: Alternative API =====
        this.closestNodesApiUrl = `${this.apiBaseUrl}api/getMONBridgeRangeCurrent?minlastupdate=8000&src_wasp_id=${this.srcWASPID}`; // Alternative API for personal nodes
        this.healthNodesApiUrl = `${this.apiBaseUrl}api/getMONBridgeHealthLKSCurrent?minlastupdate=8000&src_wasp_id=${this.srcWASPID}`; // Alternative API for personal nodes
        this.currentInput = '';
        this.isScanning = false;
        this.scanTimeout = null;
        this.autoZoneInterval = null;
        this.autoZoneIntervalTime = 1500; //1.5 seconds
        this.selectedEntity = null; // Store clicked entity for auto-assignment
        
        // Protection against double execution
        this.isProcessing = false;
        this.isAssigning = false;
        // ===== PLAN SWITCHER =====
        // Load saved plan preference or default to closest-nodes
        this.currentPlan = this.loadSavedPlanPreference();
        // =========================
        
        this.initializeEventListeners();
        this.initializePlanSelector();
        this.updateStatus('Ready to Scan', 'ready');
        
        // Show which API is being used on startup
        const apiName = this.currentPlan === 'closest-nodes' ? 'Closest Nodes' : 'Auto Zone';
        
        // Update UI to show current plan
        this.updatePlanSelectorDisplay();
        
        this.startAutoZoneRealtime();

		this.vEntityWASPIDToNameMap = new Map();
    }

    // Dynamic URL detection - automatically adapts to current host
    detectApiBaseUrl() {
        const currentHost = window.location.hostname;
        const currentPort = window.location.port;
        const currentProtocol = window.location.protocol;
        
        
        // Check if running on localhost/development
        /*if (currentHost === 'localhost' || 
            currentHost === '127.0.0.1' || 
            currentHost.startsWith('192.168.') || 
            currentHost.startsWith('10.') ||
            currentHost.includes('local') ||
            currentHost.includes('dev')) {
            
            // Development environment - use local proxy server
            const apiUrl = `${currentProtocol}//${currentHost}${currentPort ? ':' + currentPort : ''}/api`;
            return apiUrl;
        } else {*/
            // Production environment - use direct backend server
            const apiUrl = 'http://172.16.175.60:4990/';
            return apiUrl;
        //}
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

    // Initialize Plan Selector Dropdown
    initializePlanSelector() {
        const planTrigger = document.getElementById('planSelectorTrigger');
        const dropdownMenu = document.getElementById('planDropdownMenu');
        const planSelector = document.querySelector('.hidden-plan-selector');
        
        if (!planTrigger || !dropdownMenu || !planSelector) {
            console.warn('Plan selector elements not found');
            return;
        }

        // Toggle dropdown on button click
        planTrigger.addEventListener('click', (e) => {
            e.stopPropagation();
            planSelector.classList.toggle('active');
        });

        // Handle plan selection
        dropdownMenu.addEventListener('click', (e) => {
            const dropdownItem = e.target.closest('.plan-dropdown-item');
            if (!dropdownItem) return;

            const plan = dropdownItem.dataset.plan;
            this.switchPlan(plan);
            
            // Close dropdown
            planSelector.classList.remove('active');
        });

        // Close dropdown when clicking outside
        document.addEventListener('click', (e) => {
            if (!planTrigger.contains(e.target) && !dropdownMenu.contains(e.target)) {
                planSelector.classList.remove('active');
            }
        });

        // Set initial active state
        this.updatePlanSelectorDisplay();
    }

    // Load saved plan preference from localStorage
    loadSavedPlanPreference() {
        try {
            const savedPlan = localStorage.getItem('ptfi-personal-node-api-preference');
            if (savedPlan && (savedPlan === 'auto-zone' || savedPlan === 'closest-nodes')) {
                return savedPlan;
            } else {
                return 'closest-nodes'; // Default to closest-nodes instead of auto-zone
            }
        } catch (error) {
            console.error('❌ Error loading saved plan preference:', error);
            return 'closest-nodes'; // Default to closest-nodes instead of auto-zone
        }
    }

    // Save plan preference to localStorage
    savePlanPreference(plan) {
        try {
            localStorage.setItem('ptfi-personal-node-api-preference', plan);
        } catch (error) {
            console.error('❌ Error saving plan preference:', error);
        }
    }

    // Clear saved plan preference (reset to default)
    clearPlanPreference() {
        try {
            localStorage.removeItem('ptfi-personal-node-api-preference');
        } catch (error) {
            console.error('❌ Error clearing plan preference:', error);
        }
    }

    // Switch between Plan A and Plan B
    switchPlan(plan) {
        
        // Stop current auto-refresh
        this.stopAutoZoneRealtime();
        
        // Clear current selections
        this.clearAllSelections();
        
        // Update plan settings
        this.currentPlan = plan;
        
        // Save preference to localStorage
        this.savePlanPreference(plan);
        
        // Update UI
        this.updatePlanSelectorDisplay();
        
        // Refresh web to return to initial scan mode with new plan
        // Clear browser cache to ensure fresh data
        if ('caches' in window) {
            caches.keys().then(names => {
                names.forEach(name => {
                    caches.delete(name);
                });
            });
        }
        
        // Force refresh with cache bypass
        window.location.reload(true);
        
    }

    // Update plan selector display
    updatePlanSelectorDisplay() {
        const dropdownItems = document.querySelectorAll('.plan-dropdown-item');
        
        // Update active state in dropdown items
        dropdownItems.forEach(item => {
            item.classList.remove('active');
            if (item.dataset.plan === this.currentPlan) {
                item.classList.add('active');
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

    // Generate ID variants to try different formats (with/without leading zeros)
    generateIdVariants(id) {
        const variants = [];
        const cleanId = id.trim();
        
        // Skip if empty
        if (!cleanId) return [];
        
        // 1. Original input as-is
        variants.push(cleanId);
        
        // 2. Get number without leading zeros
        const withoutZeros = cleanId.replace(/^0+/, '');
        
        // 3. If different from original, add without zeros variant
        if (withoutZeros !== cleanId && withoutZeros.length > 0) {
            variants.push(withoutZeros);
        }
        
        // 4. For IDs shorter than 10 digits, try padding to 10 digits
        // This covers cases like "3336" -> "0000003336" or "80032009" -> "0080032009"
        if (withoutZeros.length > 0 && withoutZeros.length < 10) {
            const padded10 = withoutZeros.padStart(10, '0');
            if (!variants.includes(padded10)) {
                variants.push(padded10);
            }
        }
        
        // 5. For IDs shorter than 10, also try adding specific leading zeros
        if (withoutZeros.length >= 4 && withoutZeros.length < 10) {
            // For 4-9 digit IDs, also try with specific leading zeros
            const neededZeros = 10 - withoutZeros.length;
            if (neededZeros > 0 && neededZeros <= 6) {
                const paddedWithSpecific = '0'.repeat(neededZeros) + withoutZeros;
                if (!variants.includes(paddedWithSpecific)) {
                    variants.push(paddedWithSpecific);
                }
            }
        }
        
        // Remove duplicates while maintaining order
        return [...new Set(variants)];
    }

    processRFIDInput() {
        const smartcardId = this.currentInput.trim();
        
        if (smartcardId.length === 0) {
            this.resetScan();
            return;
        }

        // Check if confirmation modal is open
        const confirmationModal = document.getElementById('confirmationModal');
        if (confirmationModal && confirmationModal.style.display === 'flex') {
            
            // Find and click the confirm button
            const confirmBtn = document.getElementById('confirmBtn');
            if (confirmBtn) {
                confirmBtn.click();
            } else {
            }
            
            // Reset scan input
            this.resetScan();
            return;
        }

        this.fetchEmployeeData(smartcardId);
    }

    async fetchEmployeeData(smartcardId) {
        // Protection against double execution
        if (this.isProcessing) {
            return;
        }
        
        this.isProcessing = true;
        
        try {
            this.showLoading();
            this.updateStatus('Loading PTFI employee data...', 'scanning');

            // Basic Authentication credentials (from proxy.js config)
            const username = 'fmiacp';
            const password = 'track1nd0';
            const credentials = btoa(username + ':' + password);

            // Try to fetch employee data with different ID formats
            // 1. Original input (user input as-is: e.g., "80032009")
            // 2. With leading zeros to 10 digits (e.g., "0080032009")
            // 3. With leading zeros to 10 digits starting with "00" (e.g., "000080032009")
            
            let response = null;
            const idVariants = this.generateIdVariants(smartcardId);
            
            console.log(`🔍 Generated ID variants:`, idVariants);
            console.log(`🔍 API Base URL:`, this.apiBaseUrl);
            
            for (const idVariant of idVariants) {
                try {
                    // Try both smartcard_id (for RFID scan) and employee_id (for manual input)
                    const urls = [
                        `${this.apiBaseUrl}api/getPTFIDetailsEmployee?smartcard_id=${idVariant}`,
                        `${this.apiBaseUrl}api/getPTFIDetailsEmployee?employee_id=${idVariant}`
                    ];
                    
                    for (const url of urls) {
                        console.log(`🔍 Trying ID variant: ${idVariant}`);
                        console.log(`🔗 Full URL: ${url}`);
                        
                        response = await this.makeAjaxRequest(url, credentials);
                    
                        console.log(`📋 Raw Response:`, JSON.stringify(response));
                        console.log(`📋 Response Type:`, typeof response);
                        console.log(`📋 Response Keys:`, response ? Object.keys(response) : 'null');
                        
                        // Check if response is valid and has data
                        if (response && typeof response === 'object' && !response.error) {
                            console.log(`📋 Response received:`, response);
                            
                            // Handle array response (if API returns array with employee)
                            if (Array.isArray(response) && response.length > 0) {
                                const firstEmployee = response[0];
                                if (firstEmployee.EMPLOYEE_ID) {
                                    console.log(`✅ Employee found with URL: ${url}`);
                                    response = firstEmployee;
                                    break; // Break from URL loop
                                }
                            }
                            // Handle object response
                            else if (response.EMPLOYEE_ID) {
                                console.log(`✅ Employee found with URL: ${url}`);
                                console.log(`✅ Employee Details:`, response);
                                break; // Break from URL loop
                            } else {
                                console.log(`⚠️ No EMPLOYEE_ID in response, trying next URL...`);
                            }
                        } else {
                            console.log(`⚠️ Invalid response, trying next URL...`);
                        }
                    }
                    
                    // If we got valid response, break from variant loop
                    if (response && response.EMPLOYEE_ID) {
                        break;
                    }
                } catch (error) {
                    // Continue to next variant
                    console.log(`⚠️ ID variant ${idVariant} failed:`, error.message);
                    response = null;
                }
            }
            
            if (response && response.EMPLOYEE_ID) {
                
                // Check registration status in admin-person
                const employeeIdWithoutZeros = response.EMPLOYEE_ID.replace(/^0+/, ''); // Remove leading zeros
            const employeeIdOriginal = response.EMPLOYEE_ID; // Keep original with leading zeros
            
                // Optimize: Start registration check immediately (parallel processing)
            let registrationData = await this.checkPersonRegistration(employeeIdWithoutZeros, null);
            
                
            // Handle assignment flow based on personal node selection
            
            if (this.selectedEntity && this.selectedEntity.properties) {
                // Assignment Mode: Personal node is selected
                const entityProps = this.selectedEntity.properties;
                const hasOperatorName = entityProps.operator_name && entityProps.operator_name !== 'undefined';
                const hasEmployeeId = entityProps.employee_id && entityProps.employee_id !== 'undefined';
                
                
                // SIMPLE LOGIC: Check if same employee is scanning again
                
                // Check if this personal node is already assigned to the same employee
                const currentEmployeeId = entityProps.employee_id;
                const currentOperatorName = entityProps.operator_name;
                
                // Simple check: if node has assignment and employee_id matches
                if (currentEmployeeId && 
                    currentEmployeeId !== 'undefined' && 
                    currentEmployeeId !== '0' && 
                    currentEmployeeId !== 0 &&
                    currentOperatorName && 
                    currentOperatorName !== 'undefined' &&
                    currentOperatorName !== entityProps.name) {
                    
                    // Normalize both IDs for comparison
                    const normalizedCurrentId = currentEmployeeId.toString().replace(/^0+/, '');
                    const normalizedScannedId = employeeIdWithoutZeros.toString().replace(/^0+/, '');
                    
                    
                    if (normalizedCurrentId === normalizedScannedId) {
                        // SAME EMPLOYEE - Show unassign confirmation
                        const credentials = btoa('fmiacp:track1nd0');
                        await this.handleRescanUnassign(response, employeeIdWithoutZeros, entityProps.name, credentials);
                        return;
                    } else {
                        // DIFFERENT EMPLOYEE - Show reassign confirmation
                        const credentials = btoa('fmiacp:track1nd0');
                        await this.handleRescanReassign(response, employeeIdWithoutZeros, entityProps.name, credentials);
                        return;
                    }
                } else {
                    // NODE IS AVAILABLE - Proceed with normal assignment
                    await this.handleAutoAssignment(response, employeeIdWithoutZeros, credentials);
                    return;
                }
            } else {
                // Scan Mode: No personal node selected - show employee details and unassign option if assigned
                
                // Check if this is a rescan of the same employee (simple logic)
                if (this.scannedEmployeeData && 
                    this.scannedEmployeeData.employeeId === employeeIdWithoutZeros &&
                    registrationData.isRegistered && 
                    registrationData.isAssigned &&
                    registrationData.entityName !== 'N/A') {
                    
                    // Same employee rescan - show unassign confirmation
                    const credentials = btoa('fmiacp:track1nd0');
                    await this.handleScanModeRescanUnassign(response, employeeIdWithoutZeros, registrationData.entityName, credentials);
                    return;
                }
                
                // Store scanned employee data for potential unassign
                this.scannedEmployeeData = {
                    employeeData: response,
                    employeeId: employeeIdWithoutZeros,
                    registrationData: registrationData
                };
                
                this.displayEmployeeData(response, registrationData);
                
                // Add unassign button if employee is registered and assigned
                this.addUnassignButtonForScanMode(registrationData);
                
                this.updateStatus('Employee found', 'ready');
            }
            } else {
                // None of the ID variants worked
                const idVariantsStr = idVariants.join(', ');
                console.log(`❌ All ID variants failed. Tried: ${idVariantsStr}`);
                
                // Show error message
                const errorMessage = document.getElementById('errorText');
                if (errorMessage) {
                    errorMessage.textContent = `Employee ID not found in the system.\nTried variants: ${idVariantsStr}`;
                }
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
            xhr.timeout = 5000; // Reduced from 10 to 5 seconds
            
            xhr.onreadystatechange = function() {
                if (xhr.readyState === 4) {
                    if (xhr.status === 200) {
                        try {
                            const data = JSON.parse(xhr.responseText);
                            resolve(data);
                        } catch (e) {
                            reject(new Error('Invalid JSON response'));
                        }
                    } else if (xhr.status === 0) {
                        reject(new Error('CORS Error: Request blocked. Please run from local server (http://localhost:3000)'));
                    } else {
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
                reject(new Error('Network Error: Cannot connect to API server. Check network connection.'));
            };
            
            xhr.ontimeout = function() {
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
            const photoUrl = `${this.apiBaseUrl}${employee.PHOTO}`;
            
            // Try to load photo with credentials
            this.loadEmployeePhoto(photoUrl, photoElement);
            
        } else {
            // Use default placeholder
            photoElement.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgdmlld0JveD0iMCAwIDEwMCAxMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIxMDAiIGhlaWdodD0iMTAwIiBmaWxsPSIjRjNGNEY2Ii8+CjxjaXJjbGUgY3g9IjUwIiBjeT0iMzUiIHI9IjE1IiBmaWxsPSIjOUNBM0FGIi8+CjxwYXRoIGQ9Ik0yMCA4MEMyMCA2NS42NDA2IDMyLjY0MDYgNTMgNDcgNTNINjNDNzcuMzU5NCA1MyA5MCA2NS42NDA2IDkwIDgwVjEwMEgyMFY4MFoiIGZpbGw9IiM5Q0EzQUYiLz4KPC9zdmc+';
        }

        // Add success animation
        employeeCard.style.animation = 'slideIn 0.5s ease-out';
    }

    // Load employee photo with credentials
    async loadEmployeePhoto(photoUrl, photoElement) {
        try {
            
            // Get credentials
            const username = 'fmiacp';
            const password = 'track1nd0';
            const credentials = btoa(username + ':' + password);
            
            // Fetch photo with credentials
            const response = await fetch(photoUrl, {
                method: 'GET',
                headers: {
                    'Authorization': `Basic ${credentials}`,
                    'Content-Type': 'image/jpeg'
                }
            });
            
            if (response.ok) {
                // Convert response to blob URL
                const blob = await response.blob();
                const blobUrl = URL.createObjectURL(blob);
                photoElement.src = blobUrl;
            } else {
                throw new Error(`Photo load failed: ${response.status}`);
            }
            
        } catch (error) {
            // Use default placeholder if photo fails to load
            photoElement.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgdmlld0JveD0iMCAwIDEwMCAxMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIxMDAiIGhlaWdodD0iMTAwIiBmaWxsPSIjRjNGNEY2Ii8+CjxjaXJjbGUgY3g9IjUwIiBjeT0iMzUiIHI9IjE1IiBmaWxsPSIjOUNBM0FGIi8+CjxwYXRoIGQ9Ik0yMCA4MEMyMCA2NS42NDA2IDMyLjY0MDYgNTMgNDcgNTNINjNDNzcuMzU5NCA1MyA5MCA2NS42NDA2IDkwIDgwVjEwMEgyMFY4MFoiIGZpbGw9IiM5Q0EzQUYiLz4KPC9zdmc+';
        }
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
            <span class="button-text">Unassign from ${this.selectedEntity.properties.name}</span>
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

    // Add unassign button for scan mode (when employee is registered and assigned)
    addUnassignButtonForScanMode(registrationData) {
        
        // Only show unassign button if employee is registered and assigned
        if (!registrationData || !registrationData.isRegistered || !registrationData.isAssigned) {
            return;
        }
        

        // Check if unassign button already exists
        let unassignButton = document.getElementById('unassignButton');
        if (unassignButton) {
            return; // Button already exists
        }

        // Get assigned entity name
        const assignedEntityName = registrationData.entityName || 'Personal Node';
        
        // Create unassign button
        unassignButton = document.createElement('button');
        unassignButton.id = 'unassignButton';
        unassignButton.className = 'btn btn-danger unassign-btn';
        unassignButton.innerHTML = `
            <div class="icon-user-minus"></div>
            <span class="button-text">Unassign from ${assignedEntityName}</span>
        `;

        // Add click event for scan mode unassign
        unassignButton.onclick = () => this.handleScanModeUnassignClick();

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
            return;
        }
        
        if (!this.selectedEntity || !this.selectedEntity.properties) {
            alert('No personal node selected for unassignment');
            return;
        }

        const entityName = this.selectedEntity.properties.name;
        const employeeName = this.selectedEntity.properties.operator_name;
        
        // Show confirmation modal
        showCustomConfirmationModal(
            `Are you sure you want to unassign "${employeeName}" from personal node "${entityName}"?`,
            'Confirm Unassignment',
            'Yes, Unassign',
            'Cancel',
            async () => {
                // User confirmed - proceed with unassignment
                this.isAssigning = true;
                
                try {
                    this.showLoading();
                    this.updateStatus('Unassigning employee...', 'scanning');

                    // Call unassign API (set employee_id to 0)
                    const credentials = btoa('fmiacp:track1nd0');
                    const unassignResult = await this.updateEntityAssignmentByMachineName(entityName, 0, credentials);

                    if (unassignResult) {
                        // Show unassign success modal
                        showUnassignSuccessModal(`Employee "${employeeName}" has been unassigned from personal node "${entityName}" successfully!`);
                        
                        // Wait for database update
                        await new Promise(resolve => setTimeout(resolve, 1500)); // Reduced from 3 to 1.5 seconds
                        
                        // Refresh entities list
                        await this.loadCurrentPlanData();
                        
                        // Stay in personal node mode - don't clear selection
                        this.updateStatus('Ready to Scan - Auto Assignment Mode', 'ready');
                        
                        // Update button text to show we're still in assignment mode
                        this.updateScanButtonText('Scan Again');
                        
                        // Remove unassign button (since node is now available)
                        this.removeUnassignButton();
                        
                        
                    } else {
                        throw new Error('Failed to unassign employee from personal node');
                    }
                    
                } catch (error) {
                    console.error('❌ Error unassigning:', error);
                    alert('Error unassigning employee: ' + error.message);
                } finally {
                    this.isAssigning = false;
                    this.hideLoading();
                }
            },
            () => {
                // User cancelled - do nothing
            },
            'warning' // Red color for unassign
        );
        
        return; // Exit early since confirmation is handled in modal

    }

    // Handle unassign action for scan mode
    async handleScanModeUnassignClick() {
        // Protection against double execution
        if (this.isAssigning) {
            return;
        }
        
        if (!this.scannedEmployeeData) {
            alert('No scanned employee data available for unassignment');
            return;
        }
        
        const employeeData = this.scannedEmployeeData.employeeData;
        const employeeId = this.scannedEmployeeData.employeeId;
        const registrationData = this.scannedEmployeeData.registrationData;
        
        const entityName = registrationData.entityName || 'Personal Node';
        const employeeName = employeeData.NAME;
        
        
        // Show confirmation modal
        showCustomConfirmationModal(
            `Are you sure you want to unassign "${employeeName}" from personal node "${entityName}"?`,
            'Confirm Unassignment',
            'Yes, Unassign',
            'Cancel',
            async () => {
                // User confirmed - proceed with unassignment
                this.isAssigning = true;
                
                try {
                    this.showLoading();
                    this.updateStatus('Unassigning employee...', 'scanning');

                    // Call unassign API (set employee_id to 0)
                    const credentials = btoa('fmiacp:track1nd0');
                    const unassignResult = await this.updateEntityAssignmentByMachineName(entityName, 0, credentials);

                    if (unassignResult) {
                        // Show unassign success modal
                        showUnassignSuccessModal(`Employee "${employeeName}" has been unassigned from personal node "${entityName}" successfully!`);
                        
                        // Wait for database update
                        await new Promise(resolve => setTimeout(resolve, 1500));
                        
                        // Refresh entities list
                        await this.loadCurrentPlanData();
                        
                        // Update employee data to show unassigned status
                        const updatedRegistrationData = await this.checkPersonRegistration(employeeId, null);
                        this.displayEmployeeData(employeeData, updatedRegistrationData);
                        
                        // Remove unassign button (since employee is now unassigned)
                        this.removeUnassignButton();
                        
                        this.updateStatus('Employee unassigned successfully', 'ready');
                        
                        
                    } else {
                        throw new Error('Failed to unassign employee from personal node');
                    }
                    
                } catch (error) {
                    console.error('❌ Error unassigning:', error);
                    alert('Error unassigning employee: ' + error.message);
                } finally {
                    this.isAssigning = false;
                    this.hideLoading();
                }
            },
            () => {
                // User cancelled - do nothing
            },
            'warning' // Red color for unassign
        );
        
        return; // Exit early since confirmation is handled in modal
    }

    // Handle rescan unassign for scan mode (when same employee scans again)
    async handleScanModeRescanUnassign(employeeData, employeeId, entityName, credentials) {
        try {
            
            // Show confirmation modal for unassign
            const confirmMessage = `Are you sure you want to unassign "${employeeData.NAME}" from personal node "${entityName}"?`;
            
            showCustomConfirmationModal(
                confirmMessage,
                'Confirm Unassignment',
                'Yes, Unassign',
                'Cancel',
                async () => {
                    // User confirmed unassign
                    
                    // Perform unassign
                    const unassignResult = await this.updateEntityAssignmentByMachineName(entityName, 0, credentials);
                    
                    if (unassignResult) {
                        // Show success modal
                        showUnassignSuccessModal(`Employee "${employeeData.NAME}" unassigned from personal node "${entityName}" successfully!`);
                        
                        // Wait for modal auto-close (1.5 seconds)
                        await new Promise(resolve => setTimeout(resolve, 1500));
                        
                        // Wait for database update (additional delay)
                        await new Promise(resolve => setTimeout(resolve, 1500));
                        
                        // Refresh entities list
                        await this.loadCurrentPlanData();
                        
                        // Update employee data to show unassigned status
                        const updatedRegistrationData = await this.checkPersonRegistration(employeeId, null);
                        this.displayEmployeeData(employeeData, updatedRegistrationData);
                        
                        // Remove unassign button (since employee is now unassigned)
                        this.removeUnassignButton();
                        
                        // Update scanned employee data
                        this.scannedEmployeeData = {
                            employeeData: employeeData,
                            employeeId: employeeId,
                            registrationData: updatedRegistrationData
                        };
                        
                        this.updateStatus('Employee unassigned successfully', 'ready');
                        
                        
                    } else {
                        throw new Error('Failed to unassign employee from personal node');
                    }
                },
                () => {
                    // User cancelled - do nothing
                },
                'warning' // Red color for unassign
            );
            
        } catch (error) {
            console.error('❌ Error in scan mode rescan unassign:', error);
            alert('Error in rescan unassign: ' + error.message);
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

    // Check if employee is already assigned to any personal node
    async checkEmployeeAssignment(employeeId) {
        try {
            
            // Get current personal nodes data
            const username = 'fmiacp';
            const password = 'track1nd0';
            const credentials = btoa(username + ':' + password);
            
            const response = await this.makeAjaxRequest(this.autoZoneApiUrl, credentials);
            
            if (response && response.features) {
                
                // Look for any personal node that has this employee assigned
                const assignedNode = response.features.find(feature => {
                    const properties = feature.properties;
                    
                    // Normalize employee IDs by removing leading zeros for comparison
                    const normalizedScannedId = employeeId.toString().replace(/^0+/, '');
                    const normalizedNodeId = properties?.employee_id?.toString().replace(/^0+/, '');
                    
                    const isMatch = properties && 
                           properties.employee_id && 
                           normalizedNodeId === normalizedScannedId &&
                           !this.isPersonalNodeEmpty(properties.operator_name, properties.employee_id, properties.name);
                    
                    
                    return isMatch;
                });
                
                if (assignedNode) {
                    return {
                        isAssigned: true,
                        nodeName: assignedNode.properties.name,
                        nodeData: assignedNode
                    };
                } else {
                    return {
                        isAssigned: false,
                        nodeName: null,
                        nodeData: null
                    };
                }
            }
            
            return {
                isAssigned: false,
                nodeName: null,
                nodeData: null
            };
            
        } catch (error) {
            console.error('❌ Error checking employee assignment:', error);
            return {
                isAssigned: false,
                nodeName: null,
                nodeData: null
            };
        }
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
                return entityGroupRoleOid;
            }
        }
        
        // Default fallback
        return 1;
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
        
        const planName = this.currentPlan === 'closest-nodes' ? 'Closest Nodes' : 'Auto Zone';
    }

    // Load data based on current plan
    loadCurrentPlanData() {
        
        if (this.currentPlan === 'closest-nodes') {
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
            
            // Fetch employee data to get correct roles
            const entitiesWithEmployeeData = await this.fetchEmployeeDataForAutoZone(data, credentials);
            
            this.displayAutoZoneEntities(entitiesWithEmployeeData);
            
        } catch (error) {
            console.error('âŒ Error loading Auto Zone data:', error);
            this.displayAutoZoneError(error.message);
        }
    }

    // Load Closest Nodes Data (PLAN B - Alternative API)
    async loadClosestNodesData() {
        try {
            
            // No authentication needed for closest_nodes API
			const credentials = btoa('fmiacp:track1nd0');
            const data = await this.makeAjaxRequest(this.closestNodesApiUrl, credentials);
            //Now lets get the battery level.
            const healthData = await this.makeAjaxRequest(this.healthNodesApiUrl, credentials);
			data.forEach((node) => {
				node.BATLVL = 'N/A';
				healthData.forEach((health) => {
					if ( health.DST_WASP_ID === node.DST_WASP_ID ){
						node.BATLVL = (health.BATLVL/4)*100;
					}
				});
			});
            this.displayClosestNodesEntities(data);
            
        } catch (error) {
            console.error('❌ Error loading Closest Nodes data:', error);
            this.displayAutoZoneError(error.message);
        }
    }

    // Fetch employee data for Auto Zone entities to get correct roles
    async fetchEmployeeDataForAutoZone(entities, credentials) {
        try {
            // Filter assigned entities
            const assignedEntities = entities.filter(entity => {
                const operatorName = entity.properties.operator_name;
                const employeeId = entity.properties.employee_id;
                const name = entity.properties.name;
                
                return operatorName && operatorName !== 'undefined' && operatorName !== name &&
                       employeeId && employeeId !== 'undefined';
            });
            
            // Fetch registration data for each assigned employee
            for (const entity of assignedEntities) {
                try {
                    const employeeIdClean = entity.properties.employee_id.toString().replace(/^0+/, '');
                    const registrationData = await this.checkPersonRegistration(employeeIdClean, credentials);
                    entity.properties.registrationData = registrationData;
                    console.log('🔍 Fetched registrationData for auto zone entity:', entity.properties.name, ':', registrationData);
                } catch (error) {
                    console.error('Error fetching registration data for entity:', entity.properties.name, error);
                    entity.properties.registrationData = null;
                }
            }
            
            return entities;
            
        } catch (error) {
            console.error('Error fetching employee data for auto zone:', error);
            return entities; // Return original data if fetch fails
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
            // Update total count only if no node is selected
            const totalCountElement = document.getElementById('totalCount');
            if (totalCountElement && !this.selectedEntity) {
                totalCountElement.textContent = '(Total: 0)';
            }
            return;
        }

        // Update total count only if no node is selected
        const totalCountElement = document.getElementById('totalCount');
        if (totalCountElement && !this.selectedEntity) {
            totalCountElement.textContent = `(Total: ${filteredEntities.length})`;
        }

        entitiesList.innerHTML = '';

        filteredEntities.forEach(entity => {
            const entityItem = document.createElement('div');
            
            // Get entity properties first
            const name = entity.properties.name || 'Unknown';
            const operatorName = entity.properties.operator_name || 'N/A';
            const employeeId = entity.properties.employee_id || 'N/A';
            
            // Log each entity for debugging
            
            // Use employee data from registration (like closest nodes mode)
            let employeeName = 'Available';
            let employeeIdDisplay = '';
            let roleBadge = 'ASSIGNABLE';
            let roleClass = 'safety'; // Default for unassigned
            
            if (operatorName && operatorName !== 'undefined' && operatorName !== name) {
                employeeName = operatorName;
                employeeIdDisplay = employeeId || '-';
                
                // Get role from registration data (like closest nodes mode)
                if (entity.properties.registrationData && entity.properties.registrationData.role) {
                    roleBadge = entity.properties.registrationData.role;
                    roleClass = this.getRoleClass(entity.properties.registrationData.role);
                    console.log('✅ Using registrationData role for auto zone entity:', name, ':', entity.properties.registrationData.role);
                } else {
                    // Fallback to WORKER if no role data
                    roleBadge = 'WORKER';
                    roleClass = 'worker';
                    console.log('⚠️ No registrationData role for auto zone entity:', name, ', using WORKER fallback');
                }
            } else {
                // Unassigned - use ASSIGNABLE
                roleBadge = 'ASSIGNABLE';
                roleClass = 'safety';
            }
            
            entityItem.className = `entity-item ${roleClass}`;
            const coordinates = entity.geometry.coordinates;
            const zone = entity.ZONES && entity.ZONES.length > 0 ? entity.ZONES[0].NAME : 'Unknown Zone';
            
            // Determine if personal node is empty/unassigned or assigned
            const isUnassigned = this.isPersonalNodeEmpty(operatorName, employeeId, name);
            
            // Display different content based on assignment status
            if (isUnassigned) {
            entityItem.innerHTML = `
                    <div class="entity-main-line">
                        <span class="entity-main-name">${name}</span>
                        <span class="entity-main-operator">${employeeName}</span>
                        <span class="entity-main-employee">${employeeIdDisplay}</span>
                        <span class="entity-role-badge ${roleClass}">${roleBadge}</span>
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
                    <span class="entity-main-operator">${employeeName}</span>
                    <span class="entity-main-employee">${employeeIdDisplay}</span>
                    <span class="entity-role-badge ${roleClass}">${roleBadge}</span>
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
                entityItem.style.backgroundColor = '#ffd700';
                entityItem.style.boxShadow = '0 0 15px rgba(255, 215, 0, 0.8)';
                entityItem.style.border = '3px solid #ff8c00';
            }
            
            // Clickable: select personal node for assignment
            entityItem.style.cursor = 'pointer';
            entityItem.addEventListener('click', async () => {
                
                // Check if this is the same node that's already selected (toggle off)
                if (this.selectedEntity && 
                    this.selectedEntity.properties && 
                    this.selectedEntity.properties.name === entity.properties.name) {
                    
                    // Same node clicked - simple toggle off
                    this.simpleToggleOff();
                    return;
                }
                
                // Clear previous selection visual feedback (gentle)
                this.clearSelectionVisuals();
                
                // Store the clicked entity for auto-assignment
                this.selectedEntity = entity;
                
                // Update header to show selected node
                this.updateHeaderForSelectedNode(entity.properties.name);
                
                // Add visual feedback for selected node
                entityItem.classList.add('selected-node');
                entityItem.style.backgroundColor = '#ffd700';
                entityItem.style.boxShadow = '0 0 15px rgba(255, 215, 0, 0.8)';
                entityItem.style.border = '3px solid #ff8c00';
                
                // Check if this personal node is empty or assigned
                const isEmpty = this.isPersonalNodeEmpty(entity.properties.operator_name, entity.properties.employee_id, entity.properties.name);
                
                if (!isEmpty) {
                    // Personal node has assignment - show assigned employee details immediately
                    
                    // Update button text to "Reset Selection" immediately (before API call)
                    this.updateScanButtonText('Reset Selection');
                    
                    try {
                        const assignedEmployeeUrl = `${this.apiBaseUrl}api/getPTFIDetailsEmployee?employee_id=${entity.properties.employee_id}`;
                        const assignedEmployeeCredentials = btoa('fmiacp:track1nd0');
                        const assignedEmployeeData = await this.makeAjaxRequest(assignedEmployeeUrl, assignedEmployeeCredentials);
                        
                        if (assignedEmployeeData && assignedEmployeeData.EMPLOYEE_ID) {
                            
                            // Check registration status for the assigned employee
                            const assignedEmployeeIdClean = assignedEmployeeData.EMPLOYEE_ID.replace(/^0+/, '');
                            const assignedRegistrationData = await this.checkPersonRegistration(assignedEmployeeIdClean, null);
                            
                            // Display the assigned employee's details
                            this.displayEmployeeData(assignedEmployeeData, assignedRegistrationData);
                            
                            // Update status to show this is the assigned employee
                            this.updateStatus(`Showing assigned employee: ${assignedEmployeeData.NAME}`, 'ready');
                } else {
                            this.showError('Could not load assigned employee details');
                        }
                    } catch (error) {
                        console.error('❌ Error fetching assigned employee:', error);
                        this.showError('Error loading assigned employee: ' + error.message);
                    }
                } else {
                    // Personal node is empty - show ready for assignment message
                    this.showReadyForAssignment(entity.properties.name);
                }
            });

            entitiesList.appendChild(entityItem);
        });

    }
	
    // Fetch employee data for closest nodes using OID
    async fetchEmployeeDataForClosestNodes(closestNodes) {
        try {
            
            // Get all WASPIDs from closest nodes
            const waspids = closestNodes.filter(node => node.DST_WASP_ID).map(node => node.DST_WASP_ID);
            
            if (waspids.length === 0) {
                return closestNodes;
            }

			var names=[];
			for ( let node of closestNodes){
				if ( this.vEntityWASPIDToNameMap.has(node.DST_WASP_ID)){
					names.push(this.vEntityWASPIDToNameMap.get(node.DST_WASP_ID));
					node.MACHINE_NAME = this.vEntityWASPIDToNameMap.get(node.DST_WASP_ID);
				}else{
					var credentials = btoa('fmiacp:track1nd0');
            		var entityUrl = `${this.apiBaseUrl}api/getMONBridgeMO?type=PersonalNode&wasp_id=${node.DST_WASP_ID}`;
            		var personalData = await this.makeAjaxRequest(entityUrl, credentials);
					console.log("Downloaded Personal data["+JSON.stringify(personalData)+"].");
					if ( personalData.length > 0 ){
						var vNAME = ""+personalData[0].NAME;
						names.push(vNAME);
						this.vEntityWASPIDToNameMap.set(node.DST_WASP_ID,vNAME);
						node.MACHINE_NAME = vNAME;
					}
				}
			};

			//console.log("Data before Sort["+JSON.stringify(closestNodes)+"].");
			closestNodes.sort((a,b)=> a.DISTANCE_SMOOTH - b.DISTANCE_SMOOTH);
			closestNodes = closestNodes.filter( a => a.DISTANCE_SMOOTH < 2);
			//console.log("Data after Sort["+JSON.stringify(closestNodes)+"].");
            // Get all OIDs from closest nodes
            //const oids = closestNodes.filter(node => node.OID).map(node => node.OID);
            
            if (names.length === 0) {
                return closestNodes;
            }
            
            
            // Fetch employee data from ULTS API
            var credentials = btoa('fmiacp:track1nd0');
            var entityUrl = `${this.apiBaseUrl}api/getULTSEntity`;
            var entityData = await this.makeAjaxRequest(entityUrl, credentials);
           	//console.log("Downloaded entity data["+JSON.stringify(entityData)+"]."); 
            if (entityData && entityData.length > 0) {
                
				//console.log("Getting matching Entities...");
                // Map employee data to closest nodes
                closestNodes.forEach(node => {
                    if (node.MACHINE_NAME) {
                        const entityMatch = entityData.find(entity => entity.MACHINE_NAME === node.MACHINE_NAME);
           				console.log("Checking Match  ["+node.OID+"]["+JSON.stringify(entityMatch)+"]..."); 
                        if (entityMatch) {
                            node.employee_id = entityMatch.EMPLOYEE_ID;
                            node.operator_name = entityMatch.OPERATOR_NAME;
							//node.MACHINE_NAME = entityMatch.MACHINE_NAME;
							console.log("Found a matching entity ["+JSON.stringify(node)+"].");
                        }
                    }
                });
                
                // Fetch registration data for assigned employees to get their roles
                const assignedNodes = closestNodes.filter(node => 
                    node.employee_id && 
                    node.employee_id !== 'undefined' && 
                    node.operator_name && 
                    node.operator_name !== 'undefined' &&
                    node.operator_name !== node.MACHINE_NAME
                );
                
                // Fetch registration data for each assigned employee
                for (const node of assignedNodes) {
                    try {
                        const employeeIdClean = node.employee_id.toString().replace(/^0+/, '');
                        const registrationData = await this.checkPersonRegistration(employeeIdClean, credentials);
                        node.registrationData = registrationData;
                        console.log('🔍 Fetched registrationData for', node.MACHINE_NAME, ':', registrationData);
                    } catch (error) {
                        console.error('Error fetching registration data for node:', node.MACHINE_NAME, error);
                        node.registrationData = null;
                    }
                }
            }
            
            return closestNodes;
            
        } catch (error) {
            console.error('❌ Error fetching employee data for closest nodes:', error);
            return closestNodes; // Return original data if fetch fails
        }
    }

    // Display Closest Nodes Entities (PLAN B - Alternative API)
    async displayClosestNodesEntities(closestNodes) {
        const entitiesList = document.getElementById('entitiesList');
        
        
        if (!closestNodes || closestNodes.length === 0) {
            entitiesList.innerHTML = '<div class="entity-item"><p>No closest nodes found</p></div>';
            return;
        }

        // Fetch employee data for closest nodes
        const nodesWithEmployeeData = await this.fetchEmployeeDataForClosestNodes(closestNodes);

        // Update total count only if no node is selected
        const totalCountElement = document.getElementById('totalCount');
        if (totalCountElement && !this.selectedEntity) {
            totalCountElement.textContent = `(Total: ${nodesWithEmployeeData.length})`;
        }

        entitiesList.innerHTML = '';

        nodesWithEmployeeData.forEach(node => {
            const entityItem = document.createElement('div');
            
            // Extract data from closest_nodes API format
            const nodeName = node.MACHINE_NAME || 'Unknown';
            const avgRange = node.DISTANCE_SMOOTH || 0;
            const waspId = node.DST_WASP_ID || 'N/A';
            const timestamp = node.LAST_UPDATE || 'N/A';
            const battery = node.BATLVL || 'N/A';
            const oid = node.OID || null;
            
            // Use employee data from ULTS API (already fetched)
            let employeeName = 'Available';
            let employeeId = '';
            let roleBadge = 'ASSIGNABLE';
            let roleClass = 'safety'; // Default for unassigned
            
            if (node.operator_name && node.operator_name !== 'undefined' && node.operator_name !== nodeName) {
                employeeName = node.operator_name;
                employeeId = node.employee_id || '-';
                
                console.log('🔍 Processing assigned node:', nodeName, 'employeeId:', employeeId, 'registrationData:', node.registrationData);
                console.log('🔍 registrationData.role:', node.registrationData ? node.registrationData.role : 'null');
                
                // Get role from employee data (like auto zone mode)
                if (node.registrationData && node.registrationData.role) {
                    roleBadge = node.registrationData.role;
                    roleClass = this.getRoleClass(node.registrationData.role);
                    console.log('✅ Using registrationData role for', nodeName, ':', node.registrationData.role, '-> class:', roleClass);
                } else {
                    // Fallback to WORKER if no role data (not DEFAULT)
                    roleBadge = 'WORKER';
                    roleClass = 'worker';
                    console.log('⚠️ No registrationData role for', nodeName, ', using WORKER fallback');
                }
            } else {
                // Unassigned - use ASSIGNABLE
                roleBadge = 'ASSIGNABLE';
                roleClass = 'safety';
            }
            
            // Log each node for debugging
            
            // Determine role and color class based on assignment status
            const isAssigned = employeeName !== 'Available';
            
            entityItem.className = `entity-item ${roleClass}`;
            
            // Format timestamp for better readability
            const formattedTimestamp = this.formatTimestamp(timestamp);
            
            // Determine battery styling and display based on percentage
            let batteryClass = '';
            let batteryDisplay = '';
            
            if (battery !== 'N/A' && battery !== null && battery !== undefined && battery !== '') {
                if (battery >= 75) {
                    batteryClass = 'battery-high';
                } else if (battery >= 50) {
                    batteryClass = 'battery-medium';
                } else if (battery >= 25) {
                    batteryClass = 'battery-low';
                } else {
                    batteryClass = 'battery-critical';
                }
                batteryDisplay = `<span class="battery ${batteryClass}"> Battery: ${battery}%</span>`;
            } else {
                // Don't display battery if N/A, null, or undefined
                batteryDisplay = '';
            }

            entityItem.innerHTML = `
                <div class="entity-main-line">
                    <span class="entity-main-name">${nodeName}</span>
                    <span class="entity-main-operator">${employeeName}</span>
                    <span class="entity-main-employee">${employeeId}</span>
                    <span class="entity-role-badge ${roleClass}">${roleBadge}</span>
                </div>
                <div class="entity-location compact">
                    <span class="time">Time: ${formattedTimestamp}</span>
                    <span class="range"> Range: ${avgRange}m, WASP ID: ${waspId}</span>
                    ${batteryDisplay}
                </div>
            `;
            
            // Check if this node is currently selected
            if (this.selectedEntity && this.selectedEntity.properties && 
                this.selectedEntity.properties.name === node.MACHINE_NAME) {
                // Restore visual feedback for previously selected node
                entityItem.classList.add('selected-node');
                entityItem.style.backgroundColor = '#ffd700';
                entityItem.style.boxShadow = '0 0 15px rgba(255, 215, 0, 0.8)';
                entityItem.style.border = '3px solid #ff8c00';
            }
            
            // Clickable: select personal node for assignment
            entityItem.style.cursor = 'pointer';
            entityItem.addEventListener('click', async () => {
                
                // Check if this is the same node that's already selected (toggle off)
                if (this.selectedEntity && 
                    this.selectedEntity.properties && 
                    this.selectedEntity.properties.name === node.MACHINE_NAME) {
                    
                    // Same node clicked - simple toggle off
                    this.simpleToggleOff();
                    return;
                }
                
                // Clear previous selection visual feedback (gentle)
                this.clearSelectionVisuals();
                
                // Store the clicked node for auto-assignment
                // Convert closest nodes format to compatible format
                this.selectedEntity = {
                    properties: {
                        name: node.MACHINE_NAME,
                        oid: node.OID || null, // Use OID from closest_nodes API
                        employee_id: node.employee_id || null,
                        operator_name: node.operator_name || null,
                        battery: node.BATLVL || 'N/A',
                        waspId: node.WASP_ID || 'N/A',
                        avgRange: node.DISTANCE_SMOOTH || 0
                    },
                    closestNodeData: node // Keep original data for reference
                };
                
                // Update header to show selected node
                this.updateHeaderForSelectedNode(node.MACHINE_NAME);
                
                // Add visual feedback for selected node
                entityItem.classList.add('selected-node');
                entityItem.style.backgroundColor = '#ffd700';
                entityItem.style.boxShadow = '0 0 15px rgba(255, 215, 0, 0.8)';
                entityItem.style.border = '3px solid #ff8c00';
                
                // Check if this personal node is empty or assigned
                const isEmpty = this.isPersonalNodeEmpty(node.operator_name, node.employee_id, node.MACHINE_NAME);
                
                if (!isEmpty) {
                    // Personal node has assignment - show assigned employee details immediately
                    
                    // Update button text to "Reset Selection" immediately (before API call)
                    this.updateScanButtonText('Reset Selection');
                    
                    try {
                        const assignedEmployeeUrl = `${this.apiBaseUrl}api/getPTFIDetailsEmployee?employee_id=${node.employee_id}`;
                        const assignedEmployeeCredentials = btoa('fmiacp:track1nd0');
                        const assignedEmployeeData = await this.makeAjaxRequest(assignedEmployeeUrl, assignedEmployeeCredentials);
                        
                        if (assignedEmployeeData && assignedEmployeeData.EMPLOYEE_ID) {
                            
                            // Check registration status for the assigned employee
                            const assignedEmployeeIdClean = assignedEmployeeData.EMPLOYEE_ID.replace(/^0+/, '');
                            const assignedRegistrationData = await this.checkPersonRegistration(assignedEmployeeIdClean, null);
                            
                            // Display the assigned employee's details
                            this.displayEmployeeData(assignedEmployeeData, assignedRegistrationData);
                            
                            // Update button text to "Reset Selection" for assigned node
                            this.updateScanButtonText('Reset Selection');
                            
                            // Update status to show this is the assigned employee
                            this.updateStatus(`Showing assigned employee: ${assignedEmployeeData.NAME}`, 'ready');
                        } else {
                            this.showError('Could not load assigned employee details');
                        }
                    } catch (error) {
                        console.error('❌ Error fetching assigned employee:', error);
                        this.showError('Error loading assigned employee: ' + error.message);
                    }
                } else {
                    // Personal node is empty - show ready for assignment message
                    this.showReadyForAssignment(node.MACHINE_NAME);
                    
                    // Update button text to "Reset Selection" for empty node (consistent with auto zone)
                    this.updateScanButtonText('Reset Selection');
                }
            });

            entitiesList.appendChild(entityItem);
        });

    }

    // Update header when personal node is selected
    updateHeaderForSelectedNode(nodeName) {
        const headerElement = document.querySelector('.column-header h3');
        const totalCountElement = document.getElementById('totalCount');
        
        if (headerElement && totalCountElement) {
            // Update header text with badge styling
            headerElement.innerHTML = `Personal Node Selected <span id="totalCount" class="entity-name-badge-small">${nodeName}</span>`;
            
            // Apply styling to header
            headerElement.classList.add('selected-node');
        } else {
        }
    }

    // Reset header to default state
    resetHeaderToDefault() {
        const headerElement = document.querySelector('.column-header h3');
        const totalCountElement = document.getElementById('totalCount');
        
        if (headerElement && totalCountElement) {
            // Reset header text (keep the structure)
            headerElement.innerHTML = 'Personal Node Detected <span id="totalCount">(Total: 0)</span>';
            
            // Remove styling
            headerElement.classList.remove('selected-node');
            totalCountElement.classList.remove('selected-node');
        } else {
        }
    }

    // Clear all visual selections from personal nodes
    clearAllSelections() {
        const allNodes = document.querySelectorAll('.entity-item');
        
        allNodes.forEach((node, index) => {
            node.classList.remove('selected-node');
            node.style.backgroundColor = '';
            node.style.boxShadow = '';
            node.style.border = '';
            node.style.borderLeft = '';
        });
        
        // Clear selected entity and reset button to green
        this.selectedEntity = null;
        this.updateScanButtonText('Scan Again');
        
        // Remove unassign button if it exists
        this.removeUnassignButton();
        
        // Reset header to default
        this.resetHeaderToDefault();
        
        // Don't call returnToScanMode here to avoid layout issues
        
    }

    // Update scan button text to "Reset Selection" and change functionality
    updateScanButtonText(text) {
        const headerText = document.getElementById('scanAgainText');
        const headerButton = document.getElementById('scanAgainBtn');
        
        if (headerText) {
            headerText.textContent = text;
        } else {
        }
        
        // Apply red styling when in "Reset Selection" mode
        if (headerButton) {
            if (text === 'Reset Selection') {
                headerButton.classList.add('reset-mode');
            } else {
                headerButton.classList.remove('reset-mode');
            }
        } else {
        }
    }

    // Display employee data for assignment mode (no layout changes)
    displayEmployeeDataForAssignment(employee, registrationData = null) {
        // Don't change layout - keep scan area visible
        const scanArea = document.getElementById('scanArea');
        if (scanArea) scanArea.style.display = 'block';
        
        // Update scan area message to show assigned employee info
        if (scanArea) {
            const h2Elements = scanArea.querySelectorAll('h2');
            
            if (h2Elements.length >= 1) {
                h2Elements[0].textContent = `Assigned Employee: ${employee.NAME || '-'}`;
            }
            
            if (h2Elements.length >= 2) {
                h2Elements[1].textContent = `ID: ${employee.EMPLOYEE_ID || '-'}`;
            }
        }
        
        const scanSubtitle = document.querySelector('#scanArea p');
        if (scanSubtitle) {
            scanSubtitle.innerHTML = `
                <strong>Current Assignment:</strong><br>
                <span class="entity-name-badge">${this.selectedEntity.properties.name}</span>
                <br><br>
                <strong>Employee Details:</strong><br>
                Name: ${employee.NAME || '-'}<br>
                ID: ${employee.EMPLOYEE_ID || '-'}<br>
                Company: ${employee.COMPANY || '-'}<br>
                Department: ${employee.DEPARTMENT || '-'}<br>
                Job Title: ${employee.JOB_TITLE || '-'}<br>
                ${registrationData ? `Role: ${registrationData.role || 'WORKER'}<br>` : ''}
                <br>
                <span>Scan a different ID card to reassign this personal node.</span>
            `;
        }
    }

    // Reset right panel to initial scan mode
    resetRightPanelToScanMode() {
        const scanArea = document.getElementById('scanArea');
        const employeeCard = document.getElementById('employeeCard');
        const errorMessage = document.getElementById('errorMessage');
        
        // Show scan area, hide others
        if (scanArea) scanArea.style.display = 'block';
        if (employeeCard) employeeCard.style.display = 'none';
        if (errorMessage) errorMessage.style.display = 'none';
        
        // Reset scan area content to initial state
        if (scanArea) {
            const h2Elements = scanArea.querySelectorAll('h2');
            
            if (h2Elements.length >= 1) {
                h2Elements[0].textContent = 'Ready to Scan';
            }
            
            if (h2Elements.length >= 2) {
                h2Elements[1].textContent = 'Scan PTFI ID Card';
            }
            
            const scanSubtitle = scanArea.querySelector('p');
            if (scanSubtitle) {
                scanSubtitle.innerHTML = `
                    <strong>Instructions:</strong><br>
                    <span>Scan an employee ID card to view details and manage assignments.</span>
                `;
            }
        }
    }

    // Simple toggle off (minimal changes)
    simpleToggleOff() {
        // Remove visual feedback from all nodes
        const allNodes = document.querySelectorAll('.entity-item');
        allNodes.forEach((node) => {
            node.classList.remove('selected-node');
            node.style.backgroundColor = '';
            node.style.boxShadow = '';
            node.style.border = '';
            node.style.borderLeft = '';
        });
        
        // Clear selected entity
        this.selectedEntity = null;
        
        // Reset button text
        this.updateScanButtonText('Scan Again');
        
        // Remove unassign button if it exists
        this.removeUnassignButton();
        
        // Reset header to default
        this.resetHeaderToDefault();
        
        // Reset right panel to scan mode
        this.resetRightPanelToScanMode();
        
        // Update status only
        this.updateStatus('Ready to Scan', 'ready');
    }

    // Clear selection visuals only (gentle)
    clearSelectionVisuals() {
        // Remove visual feedback from all nodes
        const allNodes = document.querySelectorAll('.entity-item');
        allNodes.forEach((node) => {
            node.classList.remove('selected-node');
            node.style.backgroundColor = '';
            node.style.boxShadow = '';
            node.style.border = '';
            node.style.borderLeft = '';
        });
        
        // Remove unassign button if it exists
        this.removeUnassignButton();
    }

    // Toggle off selection (gentle unselect)
    toggleOffSelection() {
        // Remove visual feedback from selected node only
        const allNodes = document.querySelectorAll('.entity-item');
        allNodes.forEach((node) => {
            node.classList.remove('selected-node');
            node.style.backgroundColor = '';
            node.style.boxShadow = '';
            node.style.border = '';
            node.style.borderLeft = '';
        });
        
        // Clear selected entity
        this.selectedEntity = null;
        
        // Reset button text
        this.updateScanButtonText('Scan Again');
        
        // Remove unassign button if it exists
        this.removeUnassignButton();
        
        // Reset header to default
        this.resetHeaderToDefault();
        
        // Return to scan mode layout
        this.returnToScanMode();
        
        // Update status
        this.updateStatus('Ready to Scan', 'ready');
    }

    // Return to scan mode layout
    returnToScanMode() {
        // Hide employee card and show scan area
        const scanArea = document.getElementById('scanArea');
        const employeeCard = document.getElementById('employeeCard');
        const errorMessage = document.getElementById('errorMessage');
        
        if (scanArea) scanArea.style.display = 'block';
        if (employeeCard) employeeCard.style.display = 'none';
        if (errorMessage) errorMessage.style.display = 'none';
        
        // Hide two column layout
        const twoColumnLayout = document.getElementById('twoColumnLayout');
        if (twoColumnLayout) twoColumnLayout.style.display = 'none';
        
        // Reset scan area content to default
        if (scanArea) {
            const h2Elements = scanArea.querySelectorAll('h2');
            
            if (h2Elements.length >= 1) {
                h2Elements[0].textContent = 'Ready to Scan';
            }
            
            if (h2Elements.length >= 2) {
                h2Elements[1].textContent = 'Scan PTFI ID Card';
            }
            
            // Reset scan subtitle
            const scanSubtitle = scanArea.querySelector('p');
            if (scanSubtitle) {
                scanSubtitle.innerHTML = `
                    <strong>Instructions:</strong><br>
                    <span>Scan an employee ID card to view details and manage assignments.</span>
                `;
            }
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
                <strong>Personal Node Selected:</strong><br>
                <span class="entity-name-badge">${entityName}</span>
                <br>
                <strong>Auto Settings:</strong> Role: WORKER, Group: ${groupName}<br>
                <span>Scan an employee ID card to automatically register and assign.</span>
            `;
        }
        
        // Update status
        this.updateStatus('Ready to Scan - Auto Assignment Mode', 'ready');
        
    }


    // Check personal node assignment status and determine action
    async checkNodeAssignmentStatus(entityName, employeeId, credentials) {
        try {
            
            // Use same assignment checking logic for both PLAN A and PLAN B
            // Both plans now use ULTSENTITY-based assignment checking for consistency
            
            // Get current personal nodes data to check assignment
            const response = await this.makeAjaxRequest(this.autoZoneApiUrl, credentials);
            
            if (response && response.features) {
                
                // Find the specific entity
                const entity = response.features.find(feature => 
                    feature.properties.name === entityName
                );
                
                if (entity) {
                    const assignedEmployeeId = entity.properties.employee_id;
                    const operatorName = entity.properties.operator_name;
                    
                    
                    
                    // Check if node is empty/available
                    
                    const isEmpty = this.isPersonalNodeEmpty(operatorName, assignedEmployeeId, entityName);
                    
                    if (isEmpty) {
                        return { status: 'available', action: 'assign' };
                    }
                    
                    // Normalize employee IDs by removing leading zeros for comparison
                    const normalizedAssignedId = assignedEmployeeId ? assignedEmployeeId.toString().replace(/^0+/, '') : '';
                    const normalizedScannedId = employeeId ? employeeId.toString().replace(/^0+/, '') : '';
                    
                    
                    // Check if node is assigned to the same employee by normalized employee_id
                    
                    if (normalizedAssignedId && normalizedScannedId && normalizedAssignedId === normalizedScannedId) {
                        return { status: 'same_employee', action: 'unassign' };
                    }
                    
                    // Additional check: also compare with original formats (in case normalization didn't work)
                    
                    if (assignedEmployeeId && employeeId && assignedEmployeeId.toString() === employeeId.toString()) {
                        return { status: 'same_employee', action: 'unassign' };
                    }
                    
                    // If node has assignment but different employee, should reassign
                    
                    if (assignedEmployeeId && assignedEmployeeId !== 0 && assignedEmployeeId !== '0') {
                        return { status: 'different_employee', action: 'reassign' };
                    }
                    
                    // Default to assign if unclear
                    return { status: 'available', action: 'assign' };
                    
                } else {
                    return { status: 'available', action: 'assign' };
                }
            } else {
                return { status: 'available', action: 'assign' };
            }
            
        } catch (error) {
            console.error('❌ Error checking node assignment status:', error);
            return { status: 'available', action: 'assign' }; // Default to assign on error
        }
    }

    // Show battery low warning modal
    showBatteryLowWarning(nodeName, batteryLevel, onContinue, onCancel) {
        const confirmMessage = `Personal node "${nodeName}" has low battery (${batteryLevel}%).\n\nIt is not recommended to assign to this personal node due to low battery.\n\nDo you want to continue anyway?`;
        
        showCustomConfirmationModal(
            confirmMessage,
            'Battery Low Warning',
            'Continue Anyway',
            'Cancel',
            onContinue,
            onCancel,
            'caution' // Yellow color for battery warning
        );
    }

    // Check battery level and show warning if needed
    checkBatteryAndWarn(nodeName, batteryLevel, onContinue, onCancel) {
        // Check if battery is 50% or below and battery data is available
        if (batteryLevel !== 'N/A' && batteryLevel !== null && batteryLevel !== undefined && batteryLevel !== '' && batteryLevel <= 50) {
            this.showBatteryLowWarning(nodeName, batteryLevel, onContinue, onCancel);
        } else {
            // Battery is OK or data not available, proceed directly
            onContinue();
        }
    }

    // Get current assigned employee info for better context in reassign modal
    async getCurrentAssignedEmployee(entityName, credentials) {
        try {
            console.log('🔍 Getting current assigned employee for:', entityName);
            
            // Use ULTS Entity API to get more complete data
            const entityUrl = `${this.apiBaseUrl}api/getULTSEntity`;
            const entityData = await this.makeAjaxRequest(entityUrl, credentials);
            
            console.log('📊 ULTS Entity Data:', entityData);
            
            if (entityData && Array.isArray(entityData)) {
                // Find entity by MACHINE_NAME
                const entity = entityData.find(e => e.MACHINE_NAME === entityName);
                
                console.log('🎯 Found entity:', entity);
                
                if (entity) {
                    const assignedEmployeeId = entity.EMPLOYEE_ID;
                    const operatorName = entity.OPERATOR_NAME;
                    
                    console.log('📋 Entity details:', {
                        machineName: entity.MACHINE_NAME,
                        employeeId: assignedEmployeeId,
                        operatorName: operatorName,
                        isEmpty: this.isPersonalNodeEmpty(operatorName, assignedEmployeeId, entityName)
                    });
                    
                    // More robust check: if we have employee_id and operator_name, consider it assigned
                    if (assignedEmployeeId && assignedEmployeeId !== '0' && assignedEmployeeId !== 0 && 
                        operatorName && operatorName !== 'undefined' && operatorName !== entityName) {
                        
                        console.log('✅ Node appears to be assigned, fetching employee details...');
                        
                        // Try to get employee details from PTFI API
                        try {
                            const employeeIdClean = assignedEmployeeId.toString().replace(/^0+/, '');
                            const employeeUrl = `${this.apiBaseUrl}api/getPTFIDetailsEmployee?employee_id=${employeeIdClean}`;
                            const employeeData = await this.makeAjaxRequest(employeeUrl, credentials);
                            
                            console.log('👤 Employee data from PTFI API:', employeeData);
                            
                            if (employeeData && employeeData.NAME) {
                                console.log('✅ Returning employee name:', employeeData.NAME);
                                return { name: employeeData.NAME, id: assignedEmployeeId };
                            }
                        } catch (error) {
                            console.error('❌ Error fetching assigned employee details:', error);
                        }
                        
                        // Fallback to operator name from ULTS
                        console.log('✅ Returning operator name as fallback:', operatorName);
                        return { name: operatorName, id: assignedEmployeeId };
                    }
                    
                    console.log('❌ Node does not appear to be assigned');
                } else {
                    console.log('❌ Entity not found in ULTS data');
                }
            } else {
                console.log('❌ ULTS Entity data is invalid or empty');
            }
            
            // If ULTS API fails, try auto zone API as fallback
            console.log('🔄 Trying fallback with auto zone API...');
            try {
                const response = await this.makeAjaxRequest(this.autoZoneApiUrl, credentials);
                
                console.log('📊 Auto Zone Data:', response);
                
                if (response && response.features) {
                    const entity = response.features.find(feature => 
                        feature.properties.name === entityName
                    );
                    
                    console.log('🎯 Found entity in auto zone:', entity);
                    
                    if (entity) {
                        const assignedEmployeeId = entity.properties.employee_id;
                        const operatorName = entity.properties.operator_name;
                        
                        console.log('📋 Auto zone entity details:', {
                            name: entity.properties.name,
                            employeeId: assignedEmployeeId,
                            operatorName: operatorName,
                            isEmpty: this.isPersonalNodeEmpty(operatorName, assignedEmployeeId, entityName)
                        });
                        
                        // More robust check for auto zone data
                        if (assignedEmployeeId && assignedEmployeeId !== '0' && assignedEmployeeId !== 0 && 
                            operatorName && operatorName !== 'undefined' && operatorName !== entityName) {
                            
                            console.log('✅ Auto zone: Node appears to be assigned, fetching employee details...');
                            
                            // Try to get employee details
                            try {
                                const employeeIdClean = assignedEmployeeId.toString().replace(/^0+/, '');
                                const employeeUrl = `${this.apiBaseUrl}api/getPTFIDetailsEmployee?employee_id=${employeeIdClean}`;
                                const employeeData = await this.makeAjaxRequest(employeeUrl, credentials);
                                
                                console.log('👤 Auto zone employee data:', employeeData);
                                
                                if (employeeData && employeeData.NAME) {
                                    console.log('✅ Auto zone: Returning employee name:', employeeData.NAME);
                                    return { name: employeeData.NAME, id: assignedEmployeeId };
                                }
                            } catch (error) {
                                console.error('❌ Error fetching assigned employee details from fallback:', error);
                            }
                            
                            // Fallback to operator name
                            console.log('✅ Auto zone: Returning operator name as fallback:', operatorName);
                            return { name: operatorName, id: assignedEmployeeId };
                        } else {
                            console.log('❌ Auto zone: Node does not appear to be assigned');
                        }
                    } else {
                        console.log('❌ Auto zone: Entity not found');
                    }
                } else {
                    console.log('❌ Auto zone: No features found');
                }
            } catch (fallbackError) {
                console.error('❌ Fallback API also failed:', fallbackError);
            }
            
            console.log('❌ All methods failed, returning Unknown Employee');
            return { name: 'Unknown Employee', id: 'N/A' };
            
        } catch (error) {
            console.error('❌ Error getting current assigned employee:', error);
            return { name: 'Unknown Employee', id: 'N/A' };
        }
    }

    // Handle rescan reassign (when different employee scans on already assigned node)
    async handleRescanReassign(employeeData, employeeId, entityName, credentials) {
        try {
            
            // Get current assigned employee info for better context
            const currentAssignedEmployee = await this.getCurrentAssignedEmployee(entityName, credentials);
            
            // Get battery level from selected entity
            let batteryLevel = 'N/A';
            if (this.selectedEntity && this.selectedEntity.properties) {
                batteryLevel = this.selectedEntity.properties.battery || 'N/A';
            }
            
            // Check battery level before showing reassign confirmation
            this.checkBatteryAndWarn(
                entityName, 
                batteryLevel,
                async () => {
                    // Battery is OK or user chose to continue - show reassign confirmation
                    const confirmMessage = `Personal node "${entityName}" is already assigned to "${currentAssignedEmployee.name}".\n\nDo you want to reassign it to "${employeeData.NAME}"?\n\nThis will override the current assignment.`;
                    
                    showCustomConfirmationModal(
                        confirmMessage,
                        'Confirm Reassignment',
                        'Yes, Reassign',
                        'Cancel',
                        async () => {
                            // User confirmed reassign/override
                            
                            // Proceed with reassignment flow (this will overwrite the existing assignment)
                            await this.proceedWithAssignment(employeeData, employeeId, entityName, credentials, true);
                        },
                        () => {
                            // User cancelled reassign/override
                            
                            // Stay in personal node mode - don't clear selection
                            this.updateStatus('Ready to Scan - Auto Assignment Mode', 'ready');
                            this.updateScanButtonText('Reset Selection');
                        },
                        'caution' // Yellow color for reassign
                    );
                },
                () => {
                    // User cancelled due to battery warning
                    
                    // Stay in personal node mode - don't clear selection
                    this.updateStatus('Ready to Scan - Auto Assignment Mode', 'ready');
                    this.updateScanButtonText('Reset Selection');
                }
            );
            
        } catch (error) {
            console.error('❌ Error in rescan reassign flow:', error);
            alert('Error in rescan reassign: ' + error.message);
        }
    }

    // Handle normal assignment (when personal node is empty)
    async handleNormalAssignment(employeeData, employeeId, entityName, credentials) {
        try {
            
            // Get battery level from selected entity
            let batteryLevel = 'N/A';
            if (this.selectedEntity && this.selectedEntity.properties) {
                batteryLevel = this.selectedEntity.properties.battery || 'N/A';
            }
            
            // Check battery level before showing assignment confirmation
            this.checkBatteryAndWarn(
                entityName, 
                batteryLevel,
                async () => {
                    // Battery is OK or user chose to continue - show assignment confirmation
                    const confirmMessage = `Personal node "${entityName}" is available.\n\nDo you want to assign "${employeeData.NAME}" to this personal node?`;
                    
                    showCustomConfirmationModal(
                        confirmMessage,
                        'Confirm Assignment',
                        'Yes, Assign',
                        'Cancel',
                        async () => {
                            // User confirmed assignment
                            
                            // Proceed with normal assignment flow
                            await this.proceedWithAssignment(employeeData, employeeId, entityName, credentials);
                        },
                        () => {
                            // User cancelled assignment
                            
                            // Stay in personal node mode - don't clear selection
                            this.updateStatus('Ready to Scan - Auto Assignment Mode', 'ready');
                            this.updateScanButtonText('Reset Selection');
                        },
                        'info' // Blue color for assignment
                    );
                },
                () => {
                    // User cancelled due to battery warning
                    
                    // Stay in personal node mode - don't clear selection
                    this.updateStatus('Ready to Scan - Auto Assignment Mode', 'ready');
                    this.updateScanButtonText('Reset Selection');
                }
            );
            
        } catch (error) {
            console.error('❌ Error in normal assignment flow:', error);
            alert('Error in normal assignment: ' + error.message);
        }
    }

    // Proceed with assignment (extracted from handleAutoAssignment for reuse)
    async proceedWithAssignment(employeeData, employeeId, entityName, credentials, isReassignment = false) {
        try {
            
            // Check if employee is registered and update group if needed
            const registrationData = await this.checkPersonRegistration(employeeId, credentials);
            
            if (registrationData.isRegistered) {
                // Employee exists - update group based on personal node name
                await this.updatePersonGroupByEmployeeId(employeeId, entityName, credentials);
            } else {
                // Employee not registered - backend will handle auto-registration during assignment
            }
            
            // Perform assignment using MACHINE_NAME
            
            // Use same assignment logic for both PLAN A and PLAN B
            // Both plans now use machine name-based assignment for consistency
            const assignmentResult = await this.updateEntityAssignmentByMachineName(entityName, employeeId, credentials);
            
            if (assignmentResult) {
                // Show appropriate success modal based on whether it's reassignment or new assignment
                if (isReassignment) {
                    showReassignSuccessModal(`Employee "${employeeData.NAME}" reassigned to personal node "${entityName}" successfully!`);
                } else {
                    showSuccessModal(`Employee "${employeeData.NAME}" assigned to personal node "${entityName}" successfully!`);
                }
                
                // Wait for database to update (2 seconds) + modal auto-close (3 seconds) = 5 seconds total
                await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds total
                
                // Refresh page after modal closes to ensure clean state
                
                // Clear browser cache to ensure fresh data
                if ('caches' in window) {
                    caches.keys().then(names => {
                        names.forEach(name => {
                            caches.delete(name);
                        });
                    });
                }
                
                // Force refresh with cache bypass
                window.location.reload(true);
            } else {
                throw new Error('Failed to assign employee to personal node');
            }
            
        } catch (error) {
            console.error('❌ Error in proceed with assignment:', error);
            alert('Error in assignment: ' + error.message);
        }
    }

    // Handle rescan unassign (when same employee scans again on already assigned node)
    async handleRescanUnassign(employeeData, employeeId, entityName, credentials) {
        try {
            
            // Show confirmation modal for unassign
            const confirmMessage = `Are you sure you want to unassign "${employeeData.NAME}" from personal node "${entityName}"?`;
            
            showCustomConfirmationModal(
                confirmMessage,
                'Confirm Unassignment',
                'Yes, Unassign',
                'Cancel',
                async () => {
                    // User confirmed unassign
                    
                    // Perform unassign
                    const unassignResult = await this.updateEntityAssignmentByMachineName(entityName, 0, credentials);
                    
                    if (unassignResult) {
                        // Show success modal
                        showUnassignSuccessModal(`Employee "${employeeData.NAME}" unassigned from personal node "${entityName}" successfully!`);
                        
                        // Wait for modal auto-close (1.5 seconds)
                        await new Promise(resolve => setTimeout(resolve, 1500));
                        
                        // Wait for database update (additional delay)
                        await new Promise(resolve => setTimeout(resolve, 1500));
                        
                        // Refresh data to show updated status
                        await this.loadCurrentPlanData();
                        
                        // Stay in personal node mode - don't clear selection
                        this.updateStatus('Ready to Scan - Auto Assignment Mode', 'ready');
                        
                        // Update button text to show we're still in assignment mode
                        this.updateScanButtonText('Scan Again');
                    } else {
                        throw new Error('Failed to unassign employee from personal node');
                    }
                },
                () => {
                    // User cancelled unassign
                    
                    // Stay in personal node mode - don't clear selection
                    this.updateStatus('Ready to Scan - Auto Assignment Mode', 'ready');
                    this.updateScanButtonText('Reset Selection');
                },
                'warning' // Red color for unassign
            );
            
        } catch (error) {
            console.error('❌ Error in rescan unassign flow:', error);
            alert('Error in rescan unassign: ' + error.message);
        }
    }

    // Handle complete auto-assignment flow
    async handleAutoAssignment(employeeData, employeeId, credentials) {
        // Protection against double assignment
        if (this.isAssigning) {
                return;
            }
            
        this.isAssigning = true;
        
        try {
            
            if (!this.selectedEntity || !this.selectedEntity.properties) {
                // No personal node selected - just show employee details
                this.displayEmployeeData(employeeData, null);
                return;
            }
            
            const entityName = this.selectedEntity.properties.name;
            const entityOid = this.selectedEntity.properties.oid;
            
            
            // Check if employee is registered and update group if needed
                const registrationData = await this.checkPersonRegistration(employeeId, credentials);
            
            // Check node assignment status and determine action
            const assignmentStatus = await this.checkNodeAssignmentStatus(entityName, employeeId, credentials);
            
            if (assignmentStatus.action === 'unassign') {
                // Same employee scanning again on already assigned node - show unassign confirmation
                await this.handleRescanUnassign(employeeData, employeeId, entityName, credentials);
                return;
            } else if (assignmentStatus.action === 'reassign') {
                // Different employee scanning on already assigned node - show reassign confirmation
                await this.handleRescanReassign(employeeData, employeeId, entityName, credentials);
                return;
            } else {
                // Node is available - show assign confirmation
                await this.handleNormalAssignment(employeeData, employeeId, entityName, credentials);
                return;
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
            
            // Get data from getULTSEntity to find entity by MACHINE_NAME
            const entityUrl = `${apiBaseUrl}api/getULTSEntity`;
            
            xhr.open('GET', entityUrl, true);
            xhr.setRequestHeader('Authorization', 'Basic ' + credentials);
            
            xhr.onreadystatechange = function() {
                if (xhr.readyState === 4) {
                    if (xhr.status === 200) {
                        try {
                            const entityData = JSON.parse(xhr.responseText);
                            
                            // Find ALL entities with matching MACHINE_NAME (there might be duplicates)
                            const matchingEntities = entityData.filter(e => e.MACHINE_NAME === machineName);
                            
                            if (matchingEntities.length > 0) {
                                // If multiple entities with same MACHINE_NAME, choose the one that's available for assignment
                                // Priority: 1) Unassigned (OPERATOR_NAME === MACHINE_NAME), 2) Lowest OID (first created)
                                const availableEntity = matchingEntities.find(e => 
                                    e.OPERATOR_NAME === machineName || 
                                    e.OPERATOR_NAME === 'undefined' || 
                                    e.PERSON_OID === 0
                                ) || matchingEntities[0]; // Fallback to first one
                                
                                
                                resolve({
                                    ultsEntityOid: availableEntity.OID,
                                    entity: availableEntity,
                                    allMatches: matchingEntities
                                });
                            } else {
                                reject(new Error('No entity found in ULTSENTITY with MACHINE_NAME: ' + machineName));
                            }
                        } catch (e) {
                            reject(new Error('Invalid JSON response from ULTSENTITY'));
                        }
                    } else {
                        reject(new Error(`HTTP Error ${xhr.status}: ${xhr.statusText}`));
                    }
                }
            };
            
            xhr.onerror = function() {
                reject(new Error('Network Error: Cannot connect to ULTSENTITY API server'));
            };
            
            xhr.send();
        });
    }


    // Update entity assignment via API using MACHINE_NAME to avoid duplicate OID issues
    async updateEntityAssignmentByMachineName(machineName, employeeId, credentials) {
        try {
            // Get correct OID by matching MACHINE_NAME (not OID) to avoid duplicates
            const entityMatch = await this.getEntityByMachineName(machineName, credentials);
            
            
            // Perform assignment using correct entity_id from ULTSENTITY
            return new Promise((resolve, reject) => {
                const xhr = new XMLHttpRequest();
                const apiBaseUrl = this.apiBaseUrl;
                const assignUrl = `${apiBaseUrl}api/updateULTSEntityAssignment?entity_id=${entityMatch.ultsEntityOid}&employee_id=${employeeId}`;
                
                
                xhr.open('GET', assignUrl, true);
                xhr.setRequestHeader('Authorization', 'Basic ' + credentials);
                
                xhr.onreadystatechange = function() {
                    if (xhr.readyState === 4) {
                        
                        if (xhr.status === 200) {
                            try {
                                const assignResult = JSON.parse(xhr.responseText);
                                resolve(assignResult);
                        } catch (e) {
                                reject(new Error('Invalid JSON response from assignment'));
                        }
                    } else {
                        reject(new Error(`HTTP Error ${xhr.status}: ${xhr.statusText}`));
                    }
                }
            };
            
            xhr.onerror = function() {
                reject(new Error('Network Error: Cannot connect to API server'));
            };
            
            xhr.send();
        });
            
        } catch (error) {
            throw error;
        }
    }

    // Update person group using existing updateULTSPerson API (PUT method)
    async updatePersonGroupByEmployeeId(employeeId, personalNodeName, credentials) {
        return new Promise((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            
            // Store apiBaseUrl in local variable to avoid context issues
            const apiBaseUrl = this.apiBaseUrl;
            
            // Get group and role based on personal node name
            const groupName = this.getGroupFromNode(personalNodeName);
            const entityGroupRoleOid = this.getEntityGroupRoleOid(personalNodeName, 'WORKER');
            
            // First, get current person data
            const getUrl = `${apiBaseUrl}api/getULTSPerson`;
            
            xhr.open('GET', getUrl, true);
            xhr.setRequestHeader('Authorization', 'Basic ' + credentials);
            
            xhr.onreadystatechange = function() {
                if (xhr.readyState === 4) {
                    if (xhr.status === 200) {
                        try {
                            const personData = JSON.parse(xhr.responseText);
                            
                            // Find the person with matching employee_id
                            const person = personData.find(p => p.EMPLOYEE_ID == employeeId);
                            if (person) {
                                
                                // Update person data with new group
                                const updatedPersonData = {
                                    ...person,
                                    ENTITYGROUPROLE_OID: entityGroupRoleOid,
                                    ROLE: 'WORKER'
                                };
                                
                                
                                // Now update the person using PUT method
                                const xhr2 = new XMLHttpRequest();
                                const updateUrl = `${apiBaseUrl}api/updateULTSPerson`;
                                
                                
                                xhr2.open('PUT', updateUrl, true);
                                xhr2.setRequestHeader('Authorization', 'Basic ' + credentials);
                                xhr2.setRequestHeader('Content-Type', 'application/json');
                                
                                xhr2.onreadystatechange = function() {
                                    if (xhr2.readyState === 4) {
                                        if (xhr2.status === 200) {
                                            try {
                                                const updateResult = JSON.parse(xhr2.responseText);
                                                resolve(updateResult);
                                            } catch (e) {
                                                reject(new Error('Invalid JSON response from person update'));
                                            }
            } else {
                                            reject(new Error(`HTTP Error ${xhr2.status}: ${xhr2.statusText}`));
                                        }
                                    }
                                };
                                
                                xhr2.onerror = function() {
                                    reject(new Error('Network Error: Cannot connect to API server'));
                                };
                                
                                xhr2.send(JSON.stringify(updatedPersonData));
                            } else {
                                reject(new Error('No person found with employee_id: ' + employeeId));
                            }
                        } catch (e) {
                            reject(new Error('Invalid JSON response from person data'));
                        }
                    } else {
                        reject(new Error(`HTTP Error ${xhr.status}: ${xhr.statusText}`));
                    }
                }
            };
            
            xhr.onerror = function() {
                reject(new Error('Network Error: Cannot connect to API server'));
            };
            
            xhr.send();
        });
    }

    // Check person registration in admin-person and admin-entity system
    async checkPersonRegistration(employeeId, inputCredentials) {
        try {
            // First check if person exists in admin-person
            const personApiUrl = `${this.apiBaseUrl}api/getULTSPerson`;
            
        // ULTS backend requires authentication, using fmiacp credentials
        const credentials = btoa('fmiacp:track1nd0');
            const personData = await this.makeAjaxRequest(personApiUrl, credentials);
        
            
            // Debug: Check if we got any data at all
            if (!personData) {
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
                
                        // Enhanced search with more flexible matching
                        // Database stores EMPLOYEE_ID as number (e.g., 80032009)
                        // Input comes as string with leading zeros (e.g., "0080032009")
                        const person = personData.find(p => {
                            const dbEmployeeId = p.EMPLOYEE_ID; // This is a number like 80032009
                            const inputEmployeeId = employeeId; // This is string like "80032009" (already cleaned)
                            
                            
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
                            }
                            
                            return match;
                        });
                
                
                if (person) {
                    
                    // Now check entity assignment in admin-entity
                    const entityApiUrl = `${this.apiBaseUrl}api/getULTSEntity`;
                    
                            // ULTS backend requires authentication, using fmiacp credentials
                            const entityCredentials = btoa('fmiacp:track1nd0');
                            const entityData = await this.makeAjaxRequest(entityApiUrl, entityCredentials);
                    
                    // Find entity assignment for this person
                    let entityAssignment = null;
                    let entityGroup = 'N/A';
                    
                    if (entityData && Array.isArray(entityData)) {
                        
                            // Look for ALL entities where PERSON_OID matches the person's OID
                            const allAssignments = entityData.filter(e => 
                            e.PERSON_OID && e.PERSON_OID === person.OID
                        );
                        
                            
                            // Also look for entities where OPERATOR_NAME matches person's DISPLAY_NAME
                            const operatorAssignments = entityData.filter(e => 
                                e.OPERATOR_NAME && (
                                    e.OPERATOR_NAME === person.DISPLAY_NAME ||
                                    e.OPERATOR_NAME.includes(person.DISPLAY_NAME) || 
                                    e.OPERATOR_NAME.includes(employeeId) ||
                                    e.OPERATOR_NAME.includes(cleanEmployeeId)
                                )
                            );
                            
                            
                            // Combine both results and remove duplicates
                            const combinedAssignments = [...allAssignments];
                            operatorAssignments.forEach(opAssign => {
                                if (!combinedAssignments.find(assign => assign.OID === opAssign.OID)) {
                                    combinedAssignments.push(opAssign);
                                }
                            });
                            
                            
                            // If found assignments, get the latest one (highest OID)
                            if (combinedAssignments.length > 0) {
                                // Sort by OID descending to get the latest assignment
                                combinedAssignments.sort((a, b) => b.OID - a.OID);
                                entityAssignment = combinedAssignments[0];
                            }
                        
                        
                        if (entityAssignment) {
                            entityGroup = this.getGroupFromNode(entityAssignment.MACHINE_NAME);
                        }
                    }
                    
                    
                    // Additional validation: entityAssignment should have valid MACHINE_NAME and operator
                    const isValidAssignment = entityAssignment && 
                                            entityAssignment.MACHINE_NAME && 
                                            entityAssignment.MACHINE_NAME !== 'N/A' &&
                                            entityAssignment.MACHINE_NAME !== person.DISPLAY_NAME &&
                                            entityAssignment.OPERATOR_NAME &&
                                            entityAssignment.OPERATOR_NAME !== entityAssignment.MACHINE_NAME &&
                                            entityAssignment.PERSON_OID &&
                                            entityAssignment.PERSON_OID !== 0;
                    
                    const result = {
                        isRegistered: true,
                        isAssigned: isValidAssignment ? true : false, // More strict validation
                        entityGroup: (isValidAssignment && entityGroup !== 'N/A') ? entityGroup : (person.ENTITY_GROUP || 'N/A'),
                        role: (person.ROLE && person.ROLE !== 'DEFAULT') ? person.ROLE : 'WORKER',
                        personName: person.PERSON_NAME || 'N/A',
                        displayName: person.DISPLAY_NAME || 'N/A',
                        entityName: isValidAssignment ? entityAssignment.MACHINE_NAME : 'N/A'
                    };
                    
                    return result;
                } else {
                    return {
                        isRegistered: false,
                        isAssigned: false,
                        entityGroup: null,
                        role: null,
                        personName: null,
                        displayName: null,
                        entityName: null
                    };
                }
            } else {
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
            case 'DEFAULT':
                return 'default';
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

    // Get role badge based on range for closest nodes (PLAN B)
    getRoleBadgeFromRange(range) {
        if (range <= 1.5) {
            return 'SAFETY'; // Very close - green
        } else if (range <= 2.0) {
            return 'RESCUE'; // Close - blue
        } else if (range <= 3.0) {
            return 'SUPER'; // Medium - yellow
        } else {
            return 'WORKER'; // Far - default
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


// Global function to show success modal with auto-close
function showSuccessModal(message) {
    const modal = document.getElementById('successModal');
    const messageElement = document.getElementById('successMessage');
    const countdownElement = document.getElementById('countdownTimer');
    
    if (messageElement) {
        messageElement.textContent = message;
    }
    
    if (modal) {
        modal.style.display = 'flex';
        
        // Auto-close modal after 3 seconds with countdown
        let countdown = 3;
        if (countdownElement) {
            countdownElement.textContent = countdown;
        }
        
        const countdownInterval = setInterval(() => {
            countdown -= 0.5;
            if (countdownElement) {
                countdownElement.textContent = Math.ceil(countdown);
            }
            
            if (countdown <= 0) {
                clearInterval(countdownInterval);
                closeSuccessModal();
            }
        }, 500);
    }
}

// Global function to close success modal
function closeSuccessModal() {
    const modal = document.getElementById('successModal');
    
    if (modal) {
        modal.style.display = 'none';
    }
}

// Show confirmation modal with custom title, button text, and color theme
function showCustomConfirmationModal(message, title, confirmText, cancelText, onConfirm, onCancel, colorTheme = 'warning') {
    const modal = document.getElementById('confirmationModal');
    const messageElement = document.getElementById('confirmationMessage');
    const confirmBtn = document.getElementById('confirmBtn');
    const cancelBtn = document.getElementById('cancelBtn');
    const titleElement = modal.querySelector('h2');
    const iconElement = modal.querySelector('.modal-icon');
    const iconInnerElement = modal.querySelector('.modal-icon div');
    
    if (modal && messageElement && confirmBtn && cancelBtn && titleElement && iconElement) {
        // Update title
        titleElement.textContent = title;
        
        // Update message
        messageElement.textContent = message;
        
        // Update button texts
        confirmBtn.textContent = confirmText;
        cancelBtn.textContent = cancelText;
        
        // Update icon and color theme
        iconElement.className = `modal-icon ${colorTheme}`;
        
        // Update icon content based on theme
        if (iconInnerElement) {
            iconInnerElement.className = `icon-${colorTheme}`;
        }
        
        // Update confirm button color theme
        confirmBtn.className = `btn btn-confirm ${colorTheme}`;
        
        modal.style.display = 'flex';
        
        // Remove existing event listeners
        const newConfirmBtn = confirmBtn.cloneNode(true);
        const newCancelBtn = cancelBtn.cloneNode(true);
        confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);
        cancelBtn.parentNode.replaceChild(newCancelBtn, cancelBtn);
        
        // Auto-cancel timer (5 seconds)
        let countdown = 5;
        let timerInterval;
        
        // Update button text with countdown
        const updateButtonText = () => {
            newCancelBtn.textContent = `${cancelText} (${countdown})`;
        };
        
        // Start countdown
        updateButtonText();
        timerInterval = setInterval(() => {
            countdown--;
            updateButtonText();
            
            if (countdown <= 0) {
                clearInterval(timerInterval);
                modal.style.display = 'none';
                if (onCancel) onCancel();
            }
        }, 1000);
        
        // Add new event listeners
        newConfirmBtn.addEventListener('click', () => {
            clearInterval(timerInterval);
            modal.style.display = 'none';
            if (onConfirm) onConfirm();
        });
        
        newCancelBtn.addEventListener('click', () => {
            clearInterval(timerInterval);
            modal.style.display = 'none';
            if (onCancel) onCancel();
        });
    }
}

// Show confirmation modal with auto-cancel timer
function showConfirmationModal(message, onConfirm, onCancel) {
    const modal = document.getElementById('confirmationModal');
    const messageElement = document.getElementById('confirmationMessage');
    const confirmBtn = document.getElementById('confirmBtn');
    const cancelBtn = document.getElementById('cancelBtn');
    
    if (modal && messageElement && confirmBtn && cancelBtn) {
        messageElement.textContent = message;
        modal.style.display = 'flex';
        
        // Remove existing event listeners
        const newConfirmBtn = confirmBtn.cloneNode(true);
        const newCancelBtn = cancelBtn.cloneNode(true);
        confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);
        cancelBtn.parentNode.replaceChild(newCancelBtn, cancelBtn);
        
        // Auto-cancel timer (5 seconds)
        let countdown = 5;
        let timerInterval;
        
        // Update button text with countdown
        const updateButtonText = () => {
            newCancelBtn.textContent = `Cancel (${countdown})`;
        };
        
        // Start countdown
        updateButtonText();
        timerInterval = setInterval(() => {
            countdown--;
            updateButtonText();
            
            if (countdown <= 0) {
                clearInterval(timerInterval);
                modal.style.display = 'none';
                if (onCancel) onCancel();
            }
        }, 1000);
        
        // Add new event listeners
        newConfirmBtn.addEventListener('click', () => {
            clearInterval(timerInterval);
            modal.style.display = 'none';
            if (onConfirm) onConfirm();
        });
        
        newCancelBtn.addEventListener('click', () => {
            clearInterval(timerInterval);
            modal.style.display = 'none';
            if (onCancel) onCancel();
        });
    }
}

// Show unassign success modal
function showUnassignSuccessModal(message) {
    const modal = document.getElementById('unassignSuccessModal');
    const messageElement = document.getElementById('unassignSuccessMessage');
    const countdownElement = document.getElementById('unassignCountdownTimer');
    
    if (modal && messageElement && countdownElement) {
        messageElement.textContent = message;
        modal.style.display = 'flex';
        
        // Start countdown
        let countdown = 1.5;
        countdownElement.textContent = Math.ceil(countdown);
        
        const countdownInterval = setInterval(() => {
            countdown -= 0.5;
            countdownElement.textContent = Math.ceil(countdown);
            
            if (countdown <= 0) {
                clearInterval(countdownInterval);
                modal.style.display = 'none';
                
                // Refresh page after modal closes
                setTimeout(() => {
                    
                    // Clear browser cache
                    if ('caches' in window) {
                        caches.keys().then(names => {
                            names.forEach(name => {
                                caches.delete(name);
                            });
                        });
                    }
                    
                    window.location.reload(true);
                }, 500);
            }
        }, 500);
    }
}

// Close unassign success modal
function closeUnassignSuccessModal() {
    const modal = document.getElementById('unassignSuccessModal');
    if (modal) {
        modal.style.display = 'none';
    }
}

// Show reassignment success modal
function showReassignSuccessModal(message) {
    const modal = document.getElementById('reassignSuccessModal');
    const messageElement = document.getElementById('reassignSuccessMessage');
    const countdownElement = document.getElementById('reassignCountdownTimer');
    
    if (modal && messageElement && countdownElement) {
        messageElement.textContent = message;
        modal.style.display = 'flex';
        
        // Start countdown
        let countdown = 3;
        countdownElement.textContent = Math.ceil(countdown);
        
        const countdownInterval = setInterval(() => {
            countdown -= 0.5;
            countdownElement.textContent = Math.ceil(countdown);
            
            if (countdown <= 0) {
                clearInterval(countdownInterval);
                modal.style.display = 'none';
                
                // Refresh page after modal closes
                setTimeout(() => {
                    
                    // Clear browser cache
                    if ('caches' in window) {
                        caches.keys().then(names => {
                            names.forEach(name => {
                                caches.delete(name);
                            });
                        });
                    }
                    
                    window.location.reload(true);
                }, 500);
            }
        }, 500);
    }
}

// Close reassignment success modal
function closeReassignSuccessModal() {
    const modal = document.getElementById('reassignSuccessModal');
    if (modal) {
        modal.style.display = 'none';
    }
}

// Manual Input Functions
function showManualInput() {
    const modal = document.getElementById('manualInputModal');
    const inputField = document.getElementById('manualInputField');
    
    if (modal && inputField) {
        // Clear input field
        inputField.value = '';
        modal.style.display = 'flex';
        
        // Focus on input field
        setTimeout(() => {
            inputField.focus();
        }, 100);
    }
}

function closeManualInput() {
    const modal = document.getElementById('manualInputModal');
    if (modal) {
        modal.style.display = 'none';
        // Refresh page when close button is pressed
        window.location.reload();
    }
}

function addDigit(digit) {
    const inputField = document.getElementById('manualInputField');
    if (inputField) {
        // Limit to 10 digits (typical ID card length)
        if (inputField.value.length < 10) {
            inputField.value += digit;
        }
    }
}

function deleteDigit() {
    const inputField = document.getElementById('manualInputField');
    if (inputField) {
        inputField.value = inputField.value.slice(0, -1);
    }
}

function submitManualInput() {
    const inputField = document.getElementById('manualInputField');
    if (inputField && window.rfidReader) {
        const manualInput = inputField.value.trim();
        
        if (manualInput.length === 0) {
            alert('Please enter an ID card number');
            return;
        }
        
        if (manualInput.length < 4) {
            alert('ID card number must be at least 4 digits');
            return;
        }
        
        if (manualInput.length > 10) {
            alert('ID card number cannot exceed 10 digits');
            return;
        }
        
        // Close modal first (without refreshing)
        const modal = document.getElementById('manualInputModal');
        if (modal) {
            modal.style.display = 'none';
        }
        
        // Process the manual input as if it was scanned
        window.rfidReader.currentInput = manualInput;
        window.rfidReader.processRFIDInput();
    }
}

// Add keyboard support for manual input
document.addEventListener('keydown', (e) => {
    const manualModal = document.getElementById('manualInputModal');
    if (manualModal && manualModal.style.display === 'flex') {
        // Handle keyboard input when manual modal is open
        if (e.key >= '0' && e.key <= '9') {
            e.preventDefault();
            addDigit(e.key);
        } else if (e.key === 'Backspace') {
            e.preventDefault();
            deleteDigit();
        } else if (e.key === 'Enter') {
            e.preventDefault();
            submitManualInput();
        } else if (e.key === 'Escape') {
            e.preventDefault();
            closeManualInput();
        }
    }
});

// Global function to handle scan again or reset selection (refresh page)
function scanAgain() {
    const headerText = document.getElementById('scanAgainText');
    
    // Always refresh page for both "Reset Selection" and "Scan Again" modes
    // This ensures clean state for both auto zone and closest nodes modes
    
    // Clear browser cache to ensure fresh data
    if ('caches' in window) {
        caches.keys().then(names => {
            names.forEach(name => {
                caches.delete(name);
            });
        });
    }
    
    // Force refresh with cache bypass
    window.location.reload(true);
}

// Initialize the RFID reader when the page loads
document.addEventListener('DOMContentLoaded', () => {
    window.rfidReader = new RFIDReader();
    
    // Add some helpful console messages
    console.log('✅ Ready to scan PTFI ID cards...');
    
    // Show current plan
    const currentPlan = window.rfidReader.currentPlan === 'closest-nodes' ? 'PLAN B (closest_nodes)' : 'PLAN A (autoZone)';
    console.log('🎯 Current Plan:', currentPlan);
    
    // Initialize Help Button functionality
    initializeHelpButton();
});

// Initialize Help Button Dropdown and Video Modal
function initializeHelpButton() {
    const helpTrigger = document.getElementById('helpTrigger');
    const helpDropdownMenu = document.getElementById('helpDropdownMenu');
    const helpSelector = document.querySelector('.help-selector');
    
    if (!helpTrigger || !helpDropdownMenu || !helpSelector) {
        console.warn('Help elements not found');
        return;
    }

    console.log('Initializing Help Button...');

    // Toggle dropdown on button click
    helpTrigger.addEventListener('click', (e) => {
        e.stopPropagation();
        helpSelector.classList.toggle('active');
        console.log('Help button clicked, dropdown active:', helpSelector.classList.contains('active'));
    });

    // Handle dropdown item clicks (parent items with submenu)
    const dropdownItems = document.querySelectorAll('.help-dropdown-item');
    dropdownItems.forEach(item => {
        item.classList.add('has-submenu'); // Mark as having submenu
        
        item.addEventListener('click', (e) => {
            e.stopPropagation();
            
            // Toggle active class to show/hide submenu
            const wasActive = item.classList.contains('active');
            const isActive = item.classList.toggle('active');
            
            console.log(`Dropdown item clicked: ${item.dataset.help}, Active: ${isActive}`);
            
            // Close other items if clicked
            dropdownItems.forEach(otherItem => {
                if (otherItem !== item && otherItem.classList.contains('active')) {
                    otherItem.classList.remove('active');
                }
            });
        });
    });

    // Handle video language selection (submenu items)
    const submenuItems = document.querySelectorAll('.help-submenu-item');
    submenuItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.stopPropagation();
            
            const lang = item.dataset.lang;
            const type = item.dataset.type;
            
            // Map type and lang to video URL
            const videoUrls = {
                'assignment': {
                    'english': 'videos/ASSIGNMENT PN ENGLISH.mp4',
                    'bahasa': 'videos/ASSIGNMENT PN BAHASA.mp4'
                },
                'reassignment': {
                    'english': 'videos/RE-ASSIGNMENT ENGLISH.mp4',
                    'bahasa': 'videos/RE-ASSIGNMENT PN BAHASA.mp4'
                },
                'unassignment': {
                    'english': 'videos/UNASSIGNMENT PN ENGLISH.mp4',
                    'bahasa': 'videos/UNASSIGNMENT PN BAHASA.mp4'
                }
            };
            
            const videoUrl = videoUrls[type][lang];
            
            // Open video modal
            openVideoModal(type, lang, videoUrl);
            
            // Close all dropdowns
            dropdownItems.forEach(dropdownItem => {
                dropdownItem.classList.remove('active');
            });
            helpSelector.classList.remove('active');
        });
    });

    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
        if (!helpTrigger.contains(e.target) && 
            !helpDropdownMenu.contains(e.target) && 
            !e.target.closest('.help-submenu')) {
            helpSelector.classList.remove('active');
            dropdownItems.forEach(item => {
                item.classList.remove('active');
            });
        }
    });
}

// Open Video Modal
function openVideoModal(type, lang, videoUrl) {
    const modal = document.getElementById('videoModal');
    const video = document.getElementById('helpVideo');
    const title = document.getElementById('videoModalTitle');
    
    if (!modal || !video || !title) {
        console.error('Video modal elements not found');
        return;
    }
    
    // Set title based on type and lang
    const titles = {
        'assignment': {
            'english': 'How to Assignment',
            'bahasa': 'Cara Assignment'
        },
        'reassignment': {
            'english': 'How to Reassignment',
            'bahasa': 'Cara Reassignment'
        },
        'unassignment': {
            'english': 'How to Unassignment',
            'bahasa': 'Cara Unassignment'
        }
    };
    
    title.textContent = titles[type][lang] || 'Video Tutorial';
    
    // Set video source (empty for now, user will fill path later)
    if (videoUrl) {
        video.src = videoUrl;
    } else {
        video.src = ''; // Empty, user will add path later
    }
    
    // Show modal
    modal.style.display = 'flex';
}

// Close Video Modal
function closeVideoModal() {
    const modal = document.getElementById('videoModal');
    const video = document.getElementById('helpVideo');
    
    if (modal) {
        modal.style.display = 'none';
        
        // Pause and reset video
        if (video) {
            video.pause();
            video.currentTime = 0;
        }
    }
}

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

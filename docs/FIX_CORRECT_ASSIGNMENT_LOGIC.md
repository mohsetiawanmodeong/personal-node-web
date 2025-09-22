# Fix Correct Assignment Logic

## Problem Identified

The user reported that the rescan unassign functionality was still not working correctly. The correct logic should be:

1. **Personal node available** → Assign
2. **Personal node sudah ada person (beda person)** → Reassign 
3. **Personal node sudah ada person (sama person)** → Unassign

## Issue Analysis

The previous implementation was not properly detecting the different scenarios and handling them accordingly. The system needed to:

1. **Detect node status**: Available, assigned to same person, or assigned to different person
2. **Show appropriate confirmation**: Different modals for unassign vs reassign
3. **Handle each case properly**: Different flows for each scenario

## Solution Implemented

### 1. Comprehensive Assignment Status Detection

**Problem**: Single detection method was not sufficient for all scenarios.

**Solution**: Created `checkNodeAssignmentStatus()` method that returns both status and action.

```javascript
// Check personal node assignment status and determine action
async checkNodeAssignmentStatus(entityName, employeeId, credentials) {
    try {
        console.log('🔍 Checking node assignment status:', entityName, employeeId);
        
        // Get current personal nodes data to check assignment
        const response = await this.makeAjaxRequest(this.autoZoneApiUrl, credentials);
        
        if (response && response.features) {
            const entity = response.features.find(feature => 
                feature.properties.name === entityName
            );
            
            if (entity) {
                const assignedEmployeeId = entity.properties.employee_id;
                const operatorName = entity.properties.operator_name;
                const personOid = entity.properties.person_oid;
                
                // Check if node is empty/available
                const isEmpty = this.isPersonalNodeEmpty(operatorName, assignedEmployeeId, entityName);
                if (isEmpty) {
                    console.log('📋 Node is empty/available - should assign');
                    return { status: 'available', action: 'assign' };
                }
                
                // Check if node is assigned to the same employee by employee_id
                if (assignedEmployeeId && assignedEmployeeId.toString() === employeeId.toString()) {
                    console.log('✅ Node is assigned to the same employee (by employee_id) - should unassign');
                    return { status: 'same_employee', action: 'unassign' };
                }
                
                // Check if node is assigned by person_oid (alternative method)
                if (personOid && personOid !== 0 && personOid !== '0') {
                    const isSameEmployeeByPersonOid = await this.checkPersonOidMatchesEmployee(personOid, employeeId, credentials);
                    if (isSameEmployeeByPersonOid) {
                        console.log('✅ Node is assigned to the same employee (by person_oid) - should unassign');
                        return { status: 'same_employee', action: 'unassign' };
                    } else {
                        console.log('📋 Node is assigned to different employee (by person_oid) - should reassign');
                        return { status: 'different_employee', action: 'reassign' };
                    }
                }
                
                // Default to reassign if status unclear
                console.log('📋 Node has assignment but status unclear - defaulting to reassign');
                return { status: 'different_employee', action: 'reassign' };
            }
        }
        
        return { status: 'available', action: 'assign' };
        
    } catch (error) {
        console.error('❌ Error checking node assignment status:', error);
        return { status: 'available', action: 'assign' }; // Default to assign on error
    }
}
```

### 2. Reassign Confirmation Handler

**Problem**: No handler for reassign scenario.

**Solution**: Added `handleRescanReassign()` method with appropriate confirmation modal.

```javascript
// Handle rescan reassign (when different employee scans on already assigned node)
async handleRescanReassign(employeeData, employeeId, entityName, credentials) {
    try {
        console.log('🔄 Handling rescan reassign for:', employeeData.NAME, 'on', entityName);
        
        // Show confirmation modal for reassign
        const confirmMessage = `Personal node "${entityName}" is already assigned to another employee.\n\nDo you want to reassign it to "${employeeData.NAME}"?`;
        
        showConfirmationModal(
            confirmMessage,
            async () => {
                // User confirmed reassign
                console.log('✅ User confirmed reassign via rescan');
                
                // Proceed with normal assignment flow (this will overwrite the existing assignment)
                await this.proceedWithAssignment(employeeData, employeeId, entityName, credentials);
            },
            () => {
                // User cancelled reassign
                console.log('❌ User cancelled reassign via rescan');
                
                // Just clear selections and return to scan mode
                this.clearAllSelections();
                this.updateStatus('Ready to Scan', 'ready');
            }
        );
        
    } catch (error) {
        console.error('❌ Error in rescan reassign flow:', error);
        alert('Error in rescan reassign: ' + error.message);
    }
}
```

### 3. Extracted Assignment Logic

**Problem**: Assignment logic was duplicated across different handlers.

**Solution**: Created `proceedWithAssignment()` method for reusable assignment logic.

```javascript
// Proceed with assignment (extracted from handleAutoAssignment for reuse)
async proceedWithAssignment(employeeData, employeeId, entityName, credentials) {
    try {
        console.log('🔄 Proceeding with assignment for:', employeeData.NAME, 'on', entityName);
        
        // Check if employee is registered and update group if needed
        const registrationData = await this.checkPersonRegistration(employeeId, credentials);
        
        if (registrationData.isRegistered) {
            await this.updatePersonGroupByEmployeeId(employeeId, entityName, credentials);
        } else {
            console.log('📝 Employee not registered - backend will auto-register during assignment');
        }
        
        // Perform assignment using MACHINE_NAME
        const assignmentResult = await this.updateEntityAssignmentByMachineName(entityName, employeeId, credentials);
        
        if (assignmentResult) {
            // Show success modal with auto-close (1.5 seconds)
            showSuccessModal(`Employee "${employeeData.NAME}" assigned to personal node "${entityName}" successfully!`);
            
            // Wait for database to update (2 seconds) + modal auto-close (1.5 seconds) = 3.5 seconds total
            await new Promise(resolve => setTimeout(resolve, 3500));
            
            // Refresh page after modal closes to ensure clean state
            if ('caches' in window) {
                caches.keys().then(names => {
                    names.forEach(name => {
                        caches.delete(name);
                    });
                });
            }
            
            window.location.reload(true);
        } else {
            throw new Error('Failed to assign employee to personal node');
        }
        
    } catch (error) {
        console.error('❌ Error in proceed with assignment:', error);
        alert('Error in assignment: ' + error.message);
    }
}
```

### 4. Updated Main Assignment Flow

**Problem**: Main assignment flow didn't handle different scenarios properly.

**Solution**: Updated `handleAutoAssignment()` to use the new detection and handling logic.

```javascript
// Check node assignment status and determine action
const assignmentStatus = await this.checkNodeAssignmentStatus(entityName, employeeId, credentials);
console.log('🔍 Node assignment status:', assignmentStatus);

if (assignmentStatus.action === 'unassign') {
    // Same employee scanning again on already assigned node - show unassign confirmation
    console.log('🔄 Same employee scanning again - showing unassign confirmation');
    await this.handleRescanUnassign(employeeData, employeeId, entityName, credentials);
    return;
} else if (assignmentStatus.action === 'reassign') {
    // Different employee scanning on already assigned node - show reassign confirmation
    console.log('🔄 Different employee scanning - showing reassign confirmation');
    await this.handleRescanReassign(employeeData, employeeId, entityName, credentials);
    return;
} else {
    // Node is available - proceed with normal assignment
    console.log('🔄 Node is available - proceeding with normal assignment');
    await this.proceedWithAssignment(employeeData, employeeId, entityName, credentials);
    return;
}
```

## Key Features

### 1. Three-Tier Detection Logic
- **Available**: Node is empty/unassigned → Assign
- **Same Employee**: Node assigned to same person → Unassign
- **Different Employee**: Node assigned to different person → Reassign

### 2. Appropriate Confirmation Modals
- **Unassign Modal**: "Employee X is already assigned to personal node Y. Do you want to unassign them?"
- **Reassign Modal**: "Personal node Y is already assigned to another employee. Do you want to reassign it to X?"

### 3. Consistent Assignment Flow
- **Extracted Logic**: `proceedWithAssignment()` handles all assignment scenarios
- **Reusable**: Same logic for normal assignment and reassignment
- **Error Handling**: Consistent error handling across all scenarios

### 4. Comprehensive Logging
- **Status Detection**: Log each detection step
- **Action Determination**: Log the determined action
- **Flow Tracking**: Log which handler is being called
- **Benefit**: Easy debugging and troubleshooting

## Expected Behavior

### Scenario 1: Available Node (Assign)
1. **Click Available Node**: User clicks on available UGM-42
2. **Scan Card**: User scans any employee card
3. **Detection**: System detects node is available
4. **Action**: Proceeds with normal assignment
5. **Result**: Employee assigned to UGM-42

### Scenario 2: Same Employee (Unassign)
1. **Click Assigned Node**: User clicks on UGM-41 assigned to John Doe
2. **Scan Same Card**: User scans John Doe's card again
3. **Detection**: System detects same employee
4. **Confirmation**: Shows unassign confirmation modal
5. **Result**: If confirmed, John Doe unassigned from UGM-41

### Scenario 3: Different Employee (Reassign)
1. **Click Assigned Node**: User clicks on UGM-41 assigned to John Doe
2. **Scan Different Card**: User scans Jane Smith's card
3. **Detection**: System detects different employee
4. **Confirmation**: Shows reassign confirmation modal
5. **Result**: If confirmed, Jane Smith assigned to UGM-41 (replacing John Doe)

## Testing Scenarios

### Test 1: Available Node Assignment
1. **Click Available Node**: Click on available UGM-42
2. **Scan Card**: Scan any employee card
3. **Verify Detection**: Console shows "Node is empty/available - should assign"
4. **Verify Action**: Console shows "Node is available - proceeding with normal assignment"
5. **Verify Success**: Employee assigned successfully

### Test 2: Same Employee Unassign
1. **Assign Employee**: Assign John Doe to UGM-41
2. **Click Assigned Node**: Click on UGM-41
3. **Scan Same Card**: Scan John Doe's card again
4. **Verify Detection**: Console shows "Node is assigned to the same employee - should unassign"
5. **Verify Confirmation**: Unassign confirmation modal appears
6. **Confirm Unassign**: Click "Yes, Unassign"
7. **Verify Success**: UGM-41 becomes available

### Test 3: Different Employee Reassign
1. **Assign Employee**: Assign John Doe to UGM-41
2. **Click Assigned Node**: Click on UGM-41
3. **Scan Different Card**: Scan Jane Smith's card
4. **Verify Detection**: Console shows "Node is assigned to different employee - should reassign"
5. **Verify Confirmation**: Reassign confirmation modal appears
6. **Confirm Reassign**: Click "Yes, Reassign"
7. **Verify Success**: Jane Smith assigned to UGM-41

## Files Modified
- `script.js` - Implemented correct assignment logic with three-tier detection
- `docs/FIX_CORRECT_ASSIGNMENT_LOGIC.md` - This documentation

## Expected Results

- **Available Node**: Correctly detects and proceeds with assignment
- **Same Employee**: Correctly detects and shows unassign confirmation
- **Different Employee**: Correctly detects and shows reassign confirmation
- **Appropriate Modals**: Different confirmation messages for different scenarios
- **Consistent Flow**: Same assignment logic for all scenarios
- **Better UX**: Clear confirmation messages for each action

The assignment logic should now work correctly for all three scenarios: assign, unassign, and reassign, with appropriate confirmation modals for each case.

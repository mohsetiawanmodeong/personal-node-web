# Employee Registration Logic - PTFI Personal Node

## 🎯 Overview

Sistem telah diperbaiki untuk menangani employee yang belum terdaftar di database admin-person.html dengan dua mode yang berbeda:

1. **Mode Assign**: Otomatis terinput ke database
2. **Mode Scan**: Muncul insert form seperti yang sudah ada

## 🔧 Implementation Logic

### **Mode Assignment (Personal Node Selected)**

```javascript
if (this.selectedEntity && this.selectedEntity.properties) {
    // Assignment Mode: Personal node is selected
    await this.handleAutoAssignment(response, employeeIdWithoutZeros, credentials);
}
```

**Flow:**
1. Check registration status via `checkPersonRegistration()`
2. If `registrationData.isRegistered = false`:
   - Call `autoRegisterEmployee()` untuk auto-register
   - Generate display name: First initial + 6 chars from last name
   - Set role: WORKER (default)
   - Set group: Based on personal node prefix (UGM- → UG MINE, MIS- → MIS, etc.)
   - Set ENTITYGROUPROLE_OID: Based on node prefix + role
3. Perform assignment via `updateEntityAssignmentByMachineName()`

### **Mode Scan (No Personal Node Selected)**

```javascript
else {
    // Scan Mode: No personal node selected - just show employee details
    this.displayEmployeeData(response, registrationData);
}
```

**Flow:**
1. Check registration status via `checkPersonRegistration()`
2. Display employee card dengan registration status
3. If `registrationData.isRegistered = false`:
   - Show "NOT REGISTERED" status
   - Display insert form dengan default values
   - User dapat manually insert employee

## 📊 Registration Status Display

### **Mode Assign - Auto Registration**
```
✅ Employee "John Doe" assigned to personal node "UGM-09" successfully!
```

### **Mode Scan - Manual Registration**
```
❌ NOT REGISTERED
┌─────────────────────────────────────┐
│ Register Employee                   │
│ Person Name: John Doe               │
│ Display Name: J Doe                 │
│ Employee ID: 80032009               │
│ Entity Group: UG MINE               │
│ Role: WORKER                        │
│ [Insert Employee]                   │
└─────────────────────────────────────┘
```

## 🔄 Auto-Registration Process

### **Data Generated Automatically**
```javascript
const personData = {
    ACTIVE: true,
    PERSON_NAME: employeeData.NAME,           // From PTFI API
    DISPLAY_NAME: displayName,                // Generated: "J Doe"
    EMPLOYEE_ID: employeeId,                  // Cleaned ID
    ENTITYGROUPROLE_OID: entityGroupRoleOid,  // Based on node prefix
    ROLE: 'WORKER'                           // Default role
};
```

### **Display Name Generation**
```javascript
// Example: "John Doe" → "J Doe"
const nameParts = employeeData.NAME.split(' ');
const firstName = nameParts[0];
const lastName = nameParts[nameParts.length - 1];
const displayName = firstName.charAt(0) + ' ' + lastName.substring(0, 6);
```

### **Group Assignment Based on Node Prefix**
```javascript
const nodeToGroupMapping = {
    'UGM-': 'UG MINE',           // ENTITYGROUPROLE_OID: 46
    'MIS-': 'MIS',               // ENTITYGROUPROLE_OID: 39
    'UGT-': 'UG TECHNOLOGY',      // ENTITYGROUPROLE_OID: 42
    'OC1-': 'OFF/ON BOARD CREW 1', // ENTITYGROUPROLE_OID: 2
    // ... dan seterusnya
};
```

## 🎮 User Experience Flow

### **Scenario 1: Mode Assign (New Employee)**
```
1. User clicks empty personal node (UGM-09)
2. Status: "Ready to Scan - Auto Assignment Mode"
3. User scans RFID card (new employee)
4. System checks registration status
5. Employee not found → Auto-register with default values
6. Assign employee to UGM-09
7. Success: "Employee 'John Doe' assigned to personal node 'UGM-09' successfully!"
8. UGM-09 now shows "John Doe" as operator
```

### **Scenario 2: Mode Scan (New Employee)**
```
1. User scans RFID card (no personal node selected)
2. System checks registration status
3. Employee not found → Show "NOT REGISTERED"
4. Display insert form with pre-filled data
5. User clicks "Insert Employee" button
6. Employee registered with default values
7. Show updated registration status
```

### **Scenario 3: Mode Assign (Existing Employee)**
```
1. User clicks empty personal node (UGM-09)
2. User scans RFID card (existing employee)
3. System checks registration status
4. Employee found → Update group based on node
5. Assign employee to UGM-09
6. Success message
```

## ✅ Benefits

1. **Seamless Assignment**: New employees automatically registered during assignment
2. **Manual Control**: Users can manually register employees in scan mode
3. **Consistent Data**: Same default values for both modes
4. **Smart Grouping**: Automatic group assignment based on personal node
5. **User Choice**: Assignment mode = auto, Scan mode = manual

## 🔧 Technical Details

### **API Calls**
- **Registration Check**: `getULTSPerson` (no auth required)
- **Auto Registration**: `updateULTSPerson` (PUT method, requires auth)
- **Assignment**: `updateULTSEntityAssignment` (GET method, requires auth)

### **Credentials**
- **PTFI API**: `fmiacp:track1nd0`
- **ULTS API**: `fmiacp:track1nd0`

### **Error Handling**
- Comprehensive error management for both modes
- User-friendly error messages
- Fallback to manual registration if auto-registration fails

---

**Last Updated**: January 2025  
**Version**: 1.3.0  
**Status**: ✅ Implemented and Ready

# PlanA Implementation - PTFI Personal Node Assignment System

## 🎯 Overview

Sistem PTFI Personal Node sudah diimplementasikan dengan **PlanA** yang menggunakan API assignment yang sudah ada dari backend engineer. Sistem ini memungkinkan auto-assignment employee ke personal node melalui RFID scanning.

## 🔧 API Assignment Implementation

### **Backend API Endpoint**
```
GET /api/updateULTSEntityAssignment?entity_id={ENTITY_ID}&employee_id={EMPLOYEE_ID}
```

**Contoh:**
```
GET /api/updateULTSEntityAssignment?entity_id=6327&employee_id=80032009
```

### **Parameter Sources**
- **entity_id**: Diambil dari personal node yang diklik (dari `getULTSEntity` API)
- **employee_id**: Diambil dari RFID scan (dari `getPTFIDetailsEmployee` API)

## 🚀 How It Works

### **1. Personal Node Selection**
```javascript
// User clicks on personal node
entityItem.addEventListener('click', async () => {
    // Store selected entity for assignment
    this.selectedEntity = entity;
    
    // Show ready for assignment mode
    this.showReadyForAssignment(entity.properties.name);
});
```

### **2. RFID Scan Processing**
```javascript
// RFID card scanned
async fetchEmployeeData(smartcardId) {
    // Get employee data from PTFI API
    const employeeData = await this.makeAjaxRequest(ptfiUrl, credentials);
    
    // Check if personal node is selected
    if (this.selectedEntity && this.selectedEntity.properties) {
        // Auto-assignment mode
        await this.handleAutoAssignment(employeeData, employeeId, credentials);
    } else {
        // Status check mode only
        this.displayEmployeeData(employeeData, registrationData);
    }
}
```

### **3. Auto-Assignment Flow**
```javascript
async handleAutoAssignment(employeeData, employeeId, credentials) {
    // 1. Check/register employee in ULTS system
    if (registrationData.isRegistered) {
        await this.updatePersonGroupByEmployeeId(employeeId, entityName, credentials);
    } else {
        await this.autoRegisterEmployee(employeeData, employeeId, credentials);
    }
    
    // 2. Perform assignment using MACHINE_NAME
    const assignmentResult = await this.updateEntityAssignmentByMachineName(entityName, employeeId, credentials);
    
    // 3. Show success and refresh data
    if (assignmentResult) {
        alert(`Employee "${employeeData.NAME}" assigned to personal node "${entityName}" successfully!`);
        await this.loadAutoZoneData(); // Refresh personal nodes
    }
}
```

### **4. Entity ID Resolution**
```javascript
async getEntityByMachineName(machineName, credentials) {
    // Get all entities from ULTSENTITY
    const entityData = await this.makeAjaxRequest(entityUrl, credentials);
    
    // Find matching entity by MACHINE_NAME
    const matchingEntities = entityData.filter(e => e.MACHINE_NAME === machineName);
    
    // Select available entity (unassigned preferred)
    const availableEntity = matchingEntities.find(e => 
        e.OPERATOR_NAME === machineName || 
        e.OPERATOR_NAME === 'undefined' || 
        e.PERSON_OID === 0
    ) || matchingEntities[0];
    
    return {
        ultsEntityOid: availableEntity.OID,
        entity: availableEntity
    };
}
```

### **5. API Assignment Call**
```javascript
async updateEntityAssignmentByMachineName(machineName, employeeId, credentials) {
    // Get correct entity OID
    const entityMatch = await this.getEntityByMachineName(machineName, credentials);
    
    // Call assignment API
    const assignUrl = `${this.apiBaseUrl}/updateULTSEntityAssignment?entity_id=${entityMatch.ultsEntityOid}&employee_id=${employeeId}`;
    
    const response = await this.makeAjaxRequest(assignUrl, credentials);
    return response;
}
```

## 🔐 Authentication

### **Credentials Used**
```javascript
// PTFI API & ULTS API
const credentials = btoa('fmiacp:track1nd0');
```

### **API Endpoints**
- **PTFI Employee Data**: `getPTFIDetailsEmployee` (requires auth)
- **ULTS Entity Data**: `getULTSEntity` (requires auth)
- **ULTS Person Data**: `getULTSPerson` (requires auth)
- **Assignment API**: `updateULTSEntityAssignment` (requires auth)

## 📊 Data Flow

### **1. Personal Node Data**
```javascript
// From getFLTAutoZoneEntitiesList
{
    "properties": {
        "name": "UGM-37",
        "operator_name": "undefined",
        "employee_id": "undefined",
        "role": "UNKNOWN"
    },
    "geometry": {
        "coordinates": [x, y, z]
    }
}
```

### **2. Employee Data**
```javascript
// From getPTFIDetailsEmployee
{
    "NAME": "John Doe",
    "EMPLOYEE_ID": "80032009",
    "COMPANY": "TRAKINDO UTAMA PT",
    "DEPARTMENT": "Mining Operations",
    "JOB_TITLE": "Mining Engineer",
    "EMAIL": "john.doe@trakindo.com",
    "SITE_ADDRESS": "Grasberg Mine"
}
```

### **3. Assignment Result**
```javascript
// From updateULTSEntityAssignment
{
    "result": "Updating Entity[{\"OID\":6327,\"MACHINE_NAME\":\"UGM-37\",\"OPERATOR_NAME\":\"J Doe\",\"PERSON_OID\":12345}]"
}
```

## 🎮 User Experience

### **Mode 1: Employee Status Check**
1. Scan RFID card tanpa select personal node
2. System menampilkan status registrasi employee
3. Shows: "ALREADY REGISTERED AND ASSIGNED" atau "NOT REGISTERED"

### **Mode 2: Auto-Assignment**
1. Click personal node kosong
2. Status berubah ke: "Ready to Scan - Auto Assignment Mode"
3. Scan RFID card employee
4. System auto-assigns employee ke personal node
5. Shows success message dan refresh data

### **Mode 3: Show Assigned Employee**
1. Click personal node yang sudah assigned
2. System langsung menampilkan detail employee yang assigned
3. Status: "Showing assigned employee: [Name]"

## 🔧 Configuration

### **Plan Selection**
```javascript
// In script.js constructor
this.usePlanB = false; // false = PLAN A (autoZone API), true = PLAN B (closest_nodes API)
```

### **API URLs**
```javascript
// PLAN A (Default)
this.autoZoneApiUrl = `${this.apiBaseUrl}/getFLTAutoZoneEntitiesList?zone_oid=160&minlastupdate=30000`;

// PLAN B (Alternative)
this.closestNodesApiUrl = 'http://172.16.175.201:3333/closest_nodes';
```

## ✅ Implementation Status

- ✅ **PlanA Configuration**: `usePlanB = false`
- ✅ **API Assignment**: `updateULTSEntityAssignment` endpoint
- ✅ **Entity ID Extraction**: From personal node click
- ✅ **Employee ID Extraction**: From RFID scan
- ✅ **Error Handling**: Comprehensive error management
- ✅ **Auto-Registration**: Employee auto-registration if not exists
- ✅ **Group Assignment**: Dynamic group/role assignment based on node prefix
- ✅ **Real-time Updates**: 5-second interval data refresh
- ✅ **Visual Feedback**: Selection highlighting and status updates

## 🚨 Error Handling

### **Assignment Errors**
```javascript
try {
    const assignmentResult = await this.updateEntityAssignmentByMachineName(entityName, employeeId, credentials);
    if (assignmentResult) {
        // Success
    } else {
        throw new Error('Failed to assign employee to personal node');
    }
} catch (error) {
    console.error('❌ Error in auto-assignment flow:', error);
    alert('Error in auto-assignment: ' + error.message);
}
```

### **Common Error Scenarios**
- **401 Unauthorized**: Invalid credentials
- **404 Not Found**: Entity or employee not found
- **500 Server Error**: Backend server error
- **Network Error**: Connection issues

## 📝 Notes

1. **Entity ID Resolution**: System uses `MACHINE_NAME` to find correct `OID` from `getULTSEntity` to avoid duplicate issues
2. **Employee ID Format**: System handles both formats (with/without leading zeros)
3. **Auto-Registration**: If employee not registered, system auto-registers with default values (UG MINE, WORKER)
4. **Group Mapping**: Personal node prefix determines employee group (UGM- → UG MINE, UGT- → UG TECHNOLOGY, etc.)
5. **Real-time Updates**: Personal nodes list refreshes every 5 seconds to show latest assignments

---

**Last Updated**: January 2025  
**Version**: 1.0.0  
**Status**: ✅ Fully Implemented and Ready for Production

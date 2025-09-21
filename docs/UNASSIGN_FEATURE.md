# Unassign Feature - PTFI Personal Node

## 🎯 Overview

Telah ditambahkan fitur **Unassign** untuk personal node yang sudah terassign. Fitur ini memungkinkan user untuk menghapus assignment employee dari personal node dengan mudah.

## 🔧 Implementation

### **Unassign Button**
- **Location**: Muncul di employee card setelah registration status
- **Visibility**: Hanya muncul untuk personal node yang sudah terassign
- **Style**: Red button dengan icon user-minus
- **Text**: "Unassign from [NODE_NAME]"

### **Unassign Process**
```javascript
async handleUnassign() {
    // 1. Confirm unassignment
    const confirmed = confirm(`Are you sure you want to unassign "${employeeName}" from personal node "${entityName}"?`);
    
    // 2. Call API dengan employee_id = 0
    const unassignResult = await this.updateEntityAssignmentByMachineName(entityName, 0, credentials);
    
    // 3. Refresh UI dan database
    await this.loadAutoZoneData();
    
    // 4. Return to scan mode
    this.clearAllSelections();
}
```

## 🎮 User Experience

### **Scenario: Unassign Employee**
```
1. User clicks assigned personal node (e.g., UGM-09 with Wawan M)
2. Employee card appears with unassign button
3. User clicks "Unassign from UGM-09" button
4. Confirmation dialog appears
5. User confirms unassignment
6. System calls API dengan employee_id = 0
7. Success message: "Employee 'Wawan M' has been unassigned from personal node 'UGM-09' successfully!"
8. Personal node list refreshes
9. UGM-09 now shows "Available" status
10. System returns to scan mode
```

### **Visual Flow**
```
Before Unassign:
┌─────────────────────────────────────┐
│ UGM-09    Wawan M    80032009 WORKER│
└─────────────────────────────────────┘

After Unassign:
┌─────────────────────────────────────┐
│ UGM-09    Available    -    READY  │
└─────────────────────────────────────┘
```

## 🔧 Technical Details

### **API Call**
```
GET /api/updateULTSEntityAssignment?entity_id={ENTITY_ID}&employee_id=0
```

**Example:**
```
GET /api/updateULTSEntityAssignment?entity_id=6329&employee_id=0
```

### **Button Logic**
```javascript
addUnassignButton() {
    // Only show for assigned personal nodes
    if (!this.selectedEntity || isEmpty) {
        return;
    }
    
    // Create red unassign button
    unassignButton.className = 'btn btn-danger unassign-btn';
    unassignButton.innerHTML = `
        <div class="icon-user-minus"></div>
        Unassign from ${this.selectedEntity.properties.name}
    `;
}
```

### **UI Updates**
- **Button Removal**: Automatically removed when personal node is cleared
- **Status Update**: "Unassigning employee..." → "Employee unassigned - Ready to Scan"
- **Layout Reset**: Returns to scan mode after unassignment
- **Data Refresh**: Personal nodes list refreshes to show updated status

## 🎨 Styling

### **Unassign Button CSS**
```css
.unassign-btn {
    background: #dc2626;        /* Red background */
    color: white;
    border-radius: 8px;
    box-shadow: 0 2px 4px rgba(220, 38, 38, 0.2);
    transition: all 0.2s;
}

.unassign-btn:hover {
    background: #b91c1c;        /* Darker red on hover */
    transform: translateY(-1px);
}
```

### **Icon**
- **Icon**: `icon-user-minus` (user with minus sign)
- **SVG**: User circle with horizontal line
- **Color**: Inherits from button text color

## ✅ Features

1. **Smart Visibility**: Button hanya muncul untuk assigned personal nodes
2. **Confirmation Dialog**: Prevents accidental unassignment
3. **Real-time Updates**: Database dan UI update immediately
4. **Error Handling**: Comprehensive error management
5. **Visual Feedback**: Loading states dan success messages
6. **Auto-cleanup**: Button dihapus otomatis setelah unassignment

## 🔄 Integration

### **With Existing Features**
- **Assignment Flow**: Unassign button muncul setelah assignment
- **Empty Node Logic**: Unassigned nodes kembali ke "Available" status
- **Real-time Updates**: 3-second refresh interval (sesuai user setting)
- **Selection Management**: Auto-clear selection setelah unassignment

### **API Compatibility**
- **Same Endpoint**: Menggunakan `updateULTSEntityAssignment` yang sama
- **Parameter Change**: `employee_id` diubah dari actual ID ke `0`
- **Authentication**: Menggunakan credentials yang sama (`fmiacp:track1nd0`)

## 🎯 Use Cases

1. **Employee Transfer**: Unassign employee dari node lama sebelum assign ke node baru
2. **Shift Change**: Clear assignment di akhir shift
3. **Error Correction**: Fix assignment yang salah
4. **Maintenance**: Temporary unassignment untuk maintenance

## 📊 Database Impact

### **Before Unassign**
```sql
UPDATE ULTSENTITY 
SET OPERATOR_NAME = 'Wawan M', PERSON_OID = 286
WHERE MACHINE_NAME = 'UGM-09'
```

### **After Unassign**
```sql
UPDATE ULTSENTITY 
SET OPERATOR_NAME = 'UGM-09', PERSON_OID = 0
WHERE MACHINE_NAME = 'UGM-09'
```

---

**Last Updated**: January 2025  
**Version**: 1.2.0  
**Status**: ✅ Implemented and Ready

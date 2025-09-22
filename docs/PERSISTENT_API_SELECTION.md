# Persistent API Selection

## Problem Identified

The user requested that when switching between APIs (Auto Zone and Closest Nodes), the web application should remember the selected API even after page refresh. This creates the effect of having two separate applications that maintain their own state.

## User Requirements

1. **Persistent Selection**: When user switches to Closest Nodes API, it should stay in Closest Nodes mode even after refresh
2. **Persistent Selection**: When user switches to Auto Zone API, it should stay in Auto Zone mode even after refresh
3. **Two Separate Applications**: Each API mode should feel like a completely separate application
4. **Default Behavior**: If no preference is saved, default to Auto Zone API

## Solution Implemented

### 1. localStorage Integration

**Problem**: API selection was not persistent across page refreshes.

**Solution**: Implemented localStorage to save and load API preferences.

```javascript
// Load saved plan preference from localStorage
loadSavedPlanPreference() {
    try {
        const savedPlan = localStorage.getItem('ptfi-personal-node-api-preference');
        if (savedPlan && (savedPlan === 'auto-zone' || savedPlan === 'closest-nodes')) {
            console.log(`📱 Found saved API preference: ${savedPlan}`);
            return savedPlan;
        } else {
            console.log('📱 No valid saved preference found, using default: auto-zone');
            return 'auto-zone';
        }
    } catch (error) {
        console.error('❌ Error loading saved plan preference:', error);
        return 'auto-zone';
    }
}

// Save plan preference to localStorage
savePlanPreference(plan) {
    try {
        localStorage.setItem('ptfi-personal-node-api-preference', plan);
        console.log(`💾 Saved API preference: ${plan}`);
    } catch (error) {
        console.error('❌ Error saving plan preference:', error);
    }
}
```

### 2. Constructor Integration

**Problem**: Application always started with default API regardless of saved preference.

**Solution**: Modified constructor to load saved preference on startup.

```javascript
constructor() {
    // ... other initialization code ...
    
    // ===== PLAN SWITCHER =====
    // Load saved plan preference or default to auto-zone
    this.currentPlan = this.loadSavedPlanPreference();
    console.log(`🎯 Loaded saved plan preference: ${this.currentPlan}`);
    // =========================
    
    this.initializeEventListeners();
    this.initializePlanSelector();
    this.updateStatus('Ready to Scan', 'ready');
    
    // Show which API is being used on startup
    const apiName = this.currentPlan === 'closest-nodes' ? 'Closest Nodes' : 'Auto Zone';
    console.log(`🚀 Starting application with ${apiName} API`);
    
    // Update UI to show current plan
    this.updatePlanSelectorDisplay();
    
    this.startAutoZoneRealtime();
}
```

### 3. Switch Plan Enhancement

**Problem**: Switching plans didn't save the preference for future sessions.

**Solution**: Enhanced `switchPlan()` method to save preference immediately.

```javascript
// Switch between Plan A and Plan B
switchPlan(plan) {
    console.log(`🔄 Switching to ${plan}`);
    
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
    
    // Start new auto-refresh with selected plan
    this.startAutoZoneRealtime();
    
    console.log(`✅ Switched to ${this.currentPlan === 'closest-nodes' ? 'Closest Nodes' : 'Auto Zone'}`);
}
```

### 4. Clear Preference Method

**Problem**: No way to reset to default API.

**Solution**: Added method to clear saved preference.

```javascript
// Clear saved plan preference (reset to default)
clearPlanPreference() {
    try {
        localStorage.removeItem('ptfi-personal-node-api-preference');
        console.log('🗑️ Cleared saved API preference, will use default: auto-zone');
    } catch (error) {
        console.error('❌ Error clearing plan preference:', error);
    }
}
```

## Key Features

### 1. Automatic Preference Loading
- **On Startup**: Application automatically loads saved API preference
- **Fallback**: If no valid preference found, defaults to Auto Zone
- **Error Handling**: Graceful fallback if localStorage is unavailable

### 2. Immediate Preference Saving
- **On Switch**: Preference is saved immediately when user switches APIs
- **Persistent**: Preference survives page refreshes, browser restarts, etc.
- **Validation**: Only valid API values ('auto-zone' or 'closest-nodes') are saved

### 3. UI State Synchronization
- **Dropdown State**: Dropdown shows correct active API on startup
- **Visual Feedback**: User can see which API is currently active
- **Consistent Behavior**: UI always reflects the actual API being used

### 4. Comprehensive Logging
- **Startup Logging**: Shows which API preference was loaded
- **Switch Logging**: Shows when API is switched and saved
- **Error Logging**: Logs any issues with localStorage operations

## User Experience

### First Time User
1. **Opens Application**: Defaults to Auto Zone API
2. **Sees Dropdown**: Can switch to Closest Nodes API
3. **Switches API**: Application immediately uses Closest Nodes
4. **Refreshes Page**: Application remembers Closest Nodes API
5. **Result**: Feels like using Closest Nodes application

### Returning User
1. **Opens Application**: Automatically loads last used API
2. **Sees Correct Data**: Personal nodes from correct API
3. **Sees Correct UI**: Dropdown shows active API
4. **Can Switch**: Can change API if needed
5. **Result**: Seamless experience with preferred API

### API-Specific Behavior

#### Auto Zone Application
- **Data Source**: `getFLTAutoZoneEntitiesList`
- **Features**: Full assignment, unassign, real-time updates
- **Persistent**: Remembers Auto Zone preference across sessions
- **Default**: Used when no preference is saved

#### Closest Nodes Application
- **Data Source**: `getClosestNodes`
- **Features**: Top 3 closest nodes, real-time updates
- **Persistent**: Remembers Closest Nodes preference across sessions
- **Limitation**: Assignment not yet supported

## Technical Implementation

### localStorage Key
- **Key**: `ptfi-personal-node-api-preference`
- **Values**: `'auto-zone'` or `'closest-nodes'`
- **Scope**: Per-browser, per-domain

### Error Handling
- **localStorage Unavailable**: Falls back to default API
- **Invalid Values**: Falls back to default API
- **Corrupted Data**: Falls back to default API

### Performance
- **Minimal Overhead**: Only reads localStorage once on startup
- **No Impact**: localStorage operations don't affect API performance
- **Fast Switching**: Immediate API switching with instant preference saving

## Testing Scenarios

### Scenario 1: First Time User
1. **Open Application**: Should default to Auto Zone
2. **Check Console**: Should show "Loaded saved plan preference: auto-zone"
3. **Check Data**: Should load Auto Zone personal nodes
4. **Check UI**: Dropdown should show Auto Zone as active

### Scenario 2: Switch to Closest Nodes
1. **Click Dropdown**: Open plan selector
2. **Select Closest Nodes**: Click Closest Nodes option
3. **Check Console**: Should show "Switched to Closest Nodes"
4. **Check Data**: Should load Closest Nodes data
5. **Check UI**: Dropdown should show Closest Nodes as active

### Scenario 3: Refresh After Switch
1. **Refresh Page**: Reload the application
2. **Check Console**: Should show "Loaded saved plan preference: closest-nodes"
3. **Check Data**: Should load Closest Nodes data (not Auto Zone)
4. **Check UI**: Dropdown should show Closest Nodes as active
5. **Result**: Application remembers Closest Nodes preference

### Scenario 4: Switch Back to Auto Zone
1. **Click Dropdown**: Open plan selector
2. **Select Auto Zone**: Click Auto Zone option
3. **Check Console**: Should show "Switched to Auto Zone"
4. **Check Data**: Should load Auto Zone data
5. **Refresh Page**: Reload the application
6. **Check Data**: Should load Auto Zone data (not Closest Nodes)
7. **Result**: Application remembers Auto Zone preference

## Files Modified
- `script.js` - Added persistent API selection functionality
- `docs/PERSISTENT_API_SELECTION.md` - This documentation

## Expected Results

- **Persistent Selection**: API choice survives page refreshes
- **Two Applications**: Each API mode feels like separate application
- **Seamless Experience**: Users don't need to re-select API after refresh
- **Default Behavior**: New users get Auto Zone by default
- **Error Resilience**: Graceful fallback if localStorage fails
- **Clear Feedback**: Console logs show which API is being used

The application now behaves like two separate applications that remember their user's preference, providing a seamless experience regardless of page refreshes or browser restarts.

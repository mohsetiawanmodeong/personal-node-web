# Plan Selector Dropdown Implementation

## Overview

Added a dropdown selector in the top-left header to allow users to switch between Plan A (Auto Zone API) and Plan B (Closest Nodes API) for personal node detection.

## Features Implemented

### 1. HTML Structure
- **Location**: Top-left header, between logo and status indicator
- **Components**: Dropdown button with icon, text, and arrow
- **Menu Items**: Two options with icons, names, and API descriptions

### 2. CSS Styling
- **Design**: Modern dropdown with glassmorphism effect
- **Animation**: Smooth transitions for open/close and hover effects
- **Responsive**: Adapts to different screen sizes
- **Visual Hierarchy**: Clear distinction between active and inactive states

### 3. JavaScript Functionality
- **Plan Switching**: Seamless switching between Plan A and Plan B
- **State Management**: Tracks current plan and updates UI accordingly
- **Auto-refresh**: Automatically restarts data loading with selected plan
- **Event Handling**: Click, outside-click, and keyboard interactions

## Implementation Details

### HTML Structure
```html
<div class="plan-selector">
    <div class="dropdown">
        <button class="dropdown-toggle" id="planSelectorBtn">
            <span class="dropdown-icon">⚙️</span>
            <span class="dropdown-text" id="planSelectorText">Plan A - Auto Zone</span>
            <span class="dropdown-arrow">▼</span>
        </button>
        <div class="dropdown-menu" id="planDropdownMenu">
            <div class="dropdown-item" data-plan="auto-zone">
                <span class="plan-icon">🏢</span>
                <span class="plan-name">Plan A - Auto Zone</span>
                <span class="plan-desc">getFLTAutoZoneEntitiesList</span>
            </div>
            <div class="dropdown-item" data-plan="closest-nodes">
                <span class="plan-icon">📍</span>
                <span class="plan-name">Plan B - Closest Nodes</span>
                <span class="plan-desc">getClosestNodes</span>
            </div>
        </div>
    </div>
</div>
```

### CSS Styling
```css
.plan-selector {
    display: flex;
    align-items: center;
}

.dropdown {
    position: relative;
    display: inline-block;
}

.dropdown-toggle {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 16px;
    background: rgba(30, 64, 175, 0.1);
    border: 2px solid rgba(30, 64, 175, 0.2);
    border-radius: 25px;
    color: #333;
    font-size: 0.9rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.3s ease;
    min-width: 200px;
}

.dropdown-menu {
    position: absolute;
    top: 100%;
    left: 0;
    right: 0;
    background: white;
    border: 2px solid rgba(30, 64, 175, 0.2);
    border-radius: 15px;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15);
    z-index: 1000;
    opacity: 0;
    visibility: hidden;
    transform: translateY(-10px);
    transition: all 0.3s ease;
    margin-top: 5px;
    overflow: hidden;
}

.dropdown.active .dropdown-menu {
    opacity: 1;
    visibility: visible;
    transform: translateY(0);
}
```

### JavaScript Methods

#### 1. initializePlanSelector()
- Sets up event listeners for dropdown interactions
- Handles click events for toggle and selection
- Manages outside-click to close dropdown

#### 2. switchPlan(plan)
- Switches between 'auto-zone' and 'closest-nodes' plans
- Stops current auto-refresh
- Clears current selections
- Updates plan settings
- Restarts auto-refresh with new plan

#### 3. updatePlanSelectorDisplay()
- Updates dropdown button text
- Sets active state for dropdown items
- Reflects current plan in UI

## Plan A vs Plan B

### Plan A - Auto Zone (Default)
- **API**: `getFLTAutoZoneEntitiesList`
- **URL**: Dynamic based on current host
- **Authentication**: Required (Basic Auth)
- **Data**: Personal nodes from specific zone
- **Icon**: 🏢 (Building)

### Plan B - Closest Nodes
- **API**: `getClosestNodes`
- **URL**: `http://172.16.175.201:3333/closest_nodes`
- **Authentication**: Not required
- **Data**: Closest personal nodes
- **Icon**: 📍 (Location)

## User Experience

### Visual Design
- **Consistent**: Matches overall application design
- **Intuitive**: Clear icons and descriptions
- **Responsive**: Works on all screen sizes
- **Accessible**: Proper contrast and focus states

### Interaction Flow
1. **Click Dropdown**: Opens menu with plan options
2. **Select Plan**: Click on desired plan option
3. **Auto-switch**: System automatically switches to selected plan
4. **Visual Feedback**: UI updates to show current plan
5. **Data Refresh**: New data loads automatically

### State Management
- **Current Plan**: Tracked in `this.currentPlan`
- **Plan Flag**: `this.usePlanB` determines API selection
- **UI Sync**: Dropdown always reflects current plan
- **Persistence**: Plan selection maintained during session

## Technical Benefits

### 1. Seamless Switching
- **No Page Reload**: Instant plan switching
- **State Preservation**: Maintains current selections
- **Auto-refresh**: Automatically starts new data loading

### 2. Clean Architecture
- **Separation of Concerns**: UI logic separate from data logic
- **Reusable**: Easy to add more plans in future
- **Maintainable**: Clear method structure

### 3. User-Friendly
- **Visual Clarity**: Clear distinction between plans
- **Easy Access**: Prominent placement in header
- **Intuitive**: Familiar dropdown interaction pattern

## Files Modified
- `index.html` - Added dropdown HTML structure
- `style.css` - Added dropdown styling
- `script.js` - Added plan switching logic
- `docs/PLAN_SELECTOR_DROPDOWN.md` - This documentation

## Testing Steps

### Basic Functionality
1. **Load Page**: Verify dropdown appears in header
2. **Click Dropdown**: Verify menu opens with both options
3. **Select Plan A**: Verify switches to Auto Zone
4. **Select Plan B**: Verify switches to Closest Nodes
5. **Check Data**: Verify different data loads for each plan

### Visual Testing
1. **Hover Effects**: Verify hover states work
2. **Active States**: Verify active plan is highlighted
3. **Animations**: Verify smooth transitions
4. **Responsive**: Test on different screen sizes

### Integration Testing
1. **Data Loading**: Verify correct API is called
2. **Auto-refresh**: Verify interval restarts with new plan
3. **State Management**: Verify plan selection persists
4. **Error Handling**: Test with invalid API responses

## Expected Results

- **Dropdown Button**: Appears in top-left header with current plan
- **Menu Options**: Two clear options with icons and descriptions
- **Plan Switching**: Instant switching between Plan A and Plan B
- **Data Loading**: Correct API called based on selected plan
- **UI Updates**: Dropdown reflects current plan selection
- **Auto-refresh**: Data refreshes automatically with selected plan

The dropdown should provide a seamless way to switch between Plan A (Auto Zone) and Plan B (Closest Nodes) with clear visual feedback and automatic data loading.

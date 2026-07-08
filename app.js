// ========================================
// STATE MANAGEMENT
// ========================================
let armies = [];
let units = [];
let rules = {};
let forceList = []; // Array of { unitId, quantity }
let selectedArmyId = null;
let listTitle = ''; // Army list title

// ========================================
// DOM ELEMENTS
// ========================================
const armySelect = document.getElementById('armySelect');
const unitsList = document.getElementById('unitsList');
const forceListDiv = document.getElementById('forceList');
const emptyState = document.getElementById('emptyState');
const totalPointsEl = document.getElementById('totalPoints');
const totalBPEl = document.getElementById('totalBP');
const clearBtn = document.getElementById('clearBtn');
const printBtn = document.getElementById('printBtn');
const listTitleInput = document.getElementById('listTitle');

// ========================================
// INITIALIZATION
// ========================================
async function init() {
    try {
        // Load data from JSON files
        armies = await fetch('data/armies.json').then(r => r.json());
        units = await fetch('data/units.json').then(r => r.json());
        rules = await fetch('data/rules.json').then(r => r.json());

        // Load force list from localStorage
        loadFromLocalStorage();

        // Populate army select
        populateArmySelect();

        // Setup event listeners
        setupEventListeners();

        // Initial render
        renderForceList();
    } catch (error) {
        console.error('Failed to initialize:', error);
        alert('Error loading data files. Check console for details.');
    }
}

// ========================================
// DATA LOADING
// ========================================
function loadFromLocalStorage() {
    const saved = localStorage.getItem('forceList');
    if (saved) {
        forceList = JSON.parse(saved);
    }
    const savedTitle = localStorage.getItem('listTitle');
    if (savedTitle) {
        listTitle = savedTitle;
        listTitleInput.value = listTitle;
    }
}

function saveToLocalStorage() {
    localStorage.setItem('forceList', JSON.stringify(forceList));
    localStorage.setItem('listTitle', listTitle);
}

// ========================================
// POPULATION FUNCTIONS
// ========================================
function populateArmySelect() {
    armies.forEach(army => {
        const option = document.createElement('option');
        option.value = army.id;
        option.textContent = army.name;
        armySelect.appendChild(option);
    });
}

function populateUnitsList(armyId) {
    unitsList.innerHTML = '';
    selectedArmyId = armyId;

    if (!armyId) {
        return;
    }

    const armyUnits = units.filter(u => u.army === armyId);

    if (armyUnits.length === 0) {
        unitsList.innerHTML = '<p style="color: #999; padding: 10px;">No units available</p>';
        return;
    }

    armyUnits.forEach(unit => {
        const div = document.createElement('div');
        div.className = 'unit-item';
        div.innerHTML = `
            <div class="unit-name">${unit.name}</div>
            <div class="unit-meta">
                <span>${unit.type}</span>
                <div class="unit-cost">
                    <span>${unit.points}pts</span>
                    <span>${unit.bp} BP</span>
                </div>
            </div>
        `;
        div.addEventListener('click', () => addUnitToForce(unit.id));
        unitsList.appendChild(div);
    });
}

// ========================================
// FORCE LIST MANAGEMENT
// ========================================
function addUnitToForce(unitId) {
    const existing = forceList.find(item => item.unitId === unitId);
    if (existing) {
        existing.quantity += 1;
    } else {
        forceList.push({ unitId, quantity: 1 });
    }
    saveToLocalStorage();
    renderForceList();
}

function removeUnitFromForce(unitId) {
    forceList = forceList.filter(item => item.unitId !== unitId);
    saveToLocalStorage();
    renderForceList();
}

function updateUnitQuantity(unitId, quantity) {
    quantity = parseInt(quantity, 10);
    if (isNaN(quantity) || quantity < 0) return;

    if (quantity === 0) {
        removeUnitFromForce(unitId);
    } else {
        const item = forceList.find(f => f.unitId === unitId);
        if (item) {
            item.quantity = quantity;
            saveToLocalStorage();
            renderForceList();
        }
    }
}

function clearForce() {
    if (confirm('Clear all units from your force list? This cannot be undone.')) {
        forceList = [];
        saveToLocalStorage();
        renderForceList();
    }
}

// ========================================
// RENDERING
// ========================================
function renderForceList() {
    if (forceList.length === 0) {
        forceListDiv.innerHTML = '';
        emptyState.style.display = 'block';
        totalPointsEl.textContent = '0';
        totalBPEl.textContent = '0';
        return;
    }

    emptyState.style.display = 'none';

    let totalPoints = 0;
    let totalBP = 0;
    let html = '<table class="force-table"><thead><tr>';
    html += '<th>Type</th>';
    html += '<th>Name</th>';
    html += '<th>Arm F</th>';
    html += '<th>Arm S</th>';
    html += '<th>Wpn</th>';
    html += '<th>Hit</th>';
    html += '<th>Mor</th>';
    html += '<th>ATGM</th>';
    html += '<th>Notes</th>';
    html += '<th style="text-align: center;">Qty</th>';
    html += '<th style="text-align: right;">Pts</th>';
    html += '<th style="text-align: right;">BP</th>';
    html += '<th></th>';
    html += '</tr></thead><tbody>';

    forceList.forEach(item => {
        const unit = units.find(u => u.id === item.unitId);
        if (!unit) return;

        const unitTotal = unit.points * item.quantity;
        const bpTotal = unit.bp * item.quantity;
        totalPoints += unitTotal;
        totalBP += bpTotal;

        // Main row
        html += `<tr>
            <td>${unit.type}</td>
            <td><strong>${unit.name}</strong></td>
            <td style="text-align: center;">${unit.armourFront}</td>
            <td style="text-align: center;">${unit.armourSide}</td>
            <td style="text-align: center;">${unit.weapon}</td>
            <td style="text-align: center;">${unit.toHit}</td>
            <td style="text-align: center;">${unit.morale}</td>
            <td style="text-align: center;">${formatAtgm(unit.atgmToHit, unit.atgmWeapon)}</td>
            <td style="font-size: 12px;">${unit.notes}</td>
            <td style="text-align: center;">
                <div class="unit-quantity">
                    <button class="btn qty-btn" onclick="updateUnitQuantity('${unit.id}', ${item.quantity - 1})">−</button>
                    <input type="number" class="qty-input" value="${item.quantity}" 
                           onchange="updateUnitQuantity('${unit.id}', this.value)" min="0">
                    <button class="btn qty-btn" onclick="updateUnitQuantity('${unit.id}', ${item.quantity + 1})">+</button>
                </div>
            </td>
            <td class="unit-points">${unitTotal}</td>
            <td class="unit-points">${bpTotal.toFixed(1)}</td>
            <td style="text-align: center;">
                <button class="btn btn-small btn-danger" onclick="removeUnitFromForce('${unit.id}')">Remove</button>
            </td>
        </tr>`;
    });

    html += '</tbody></table>';

    forceListDiv.innerHTML = html;
    totalPointsEl.textContent = totalPoints;
    totalBPEl.textContent = totalBP.toFixed(1);
}

function formatAtgm(toHit, weapon) {
    if (!toHit && !weapon) return '—';
    return `${toHit} ${weapon}`.trim();
}

// ========================================
// EVENT LISTENERS
// ========================================
function setupEventListeners() {
    armySelect.addEventListener('change', (e) => {
        populateUnitsList(e.target.value);
    });

    clearBtn.addEventListener('click', clearForce);

    printBtn.addEventListener('click', handlePrint);

    listTitleInput.addEventListener('change', (e) => {
        listTitle = e.target.value.trim();
        saveToLocalStorage();
    });
}

// ========================================
// PRINT FUNCTIONALITY
// ========================================
function handlePrint() {
    if (forceList.length === 0) {
        alert('Add units to your force list before printing.');
        return;
    }

    // Get selected army name (try selectedArmyId first, then detect from first unit in force)
    let selectedArmy = armies.find(a => a.id === selectedArmyId);
    
    // If selectedArmyId not set, try to detect from first unit in force list
    if (!selectedArmy && forceList.length > 0) {
        const firstUnit = units.find(u => u.id === forceList[0].unitId);
        if (firstUnit) {
            selectedArmy = armies.find(a => a.id === firstUnit.army);
        }
    }

    const armyName = selectedArmy ? selectedArmy.name : 'Army List';

    // Set print title
    const printTitleEl = document.getElementById('printTitle');
    if (listTitle) {
        printTitleEl.textContent = listTitle;
    } else {
        printTitleEl.textContent = 'Army List';
    }

    // Calculate totals
    let totalPoints = 0;
    let totalBP = 0;
    forceList.forEach(item => {
        const unit = units.find(u => u.id === item.unitId);
        if (unit) {
            totalPoints += unit.points * item.quantity;
            totalBP += unit.bp * item.quantity;
        }
    });

    // Populate print template
    const armySubtitle = selectedArmy ? `${selectedArmy.name} - ${selectedArmy.faction}` : 'Army List';
    document.getElementById('printArmy').textContent = armySubtitle;
    document.getElementById('printTotalPoints').textContent = totalPoints;
    document.getElementById('printTotalBP').textContent = totalBP.toFixed(1);

    // Generate print content
    let printContent = '<table class="force-table"><thead><tr>';
    printContent += '<th>Type</th>';
    printContent += '<th>Name</th>';
    printContent += '<th>Arm F</th>';
    printContent += '<th>Arm S</th>';
    printContent += '<th>Wpn</th>';
    printContent += '<th>Hit</th>';
    printContent += '<th>Mor</th>';
    printContent += '<th>ATGM</th>';
    printContent += '<th>Notes</th>';
    printContent += '<th style="text-align: center;">Qty</th>';
    printContent += '<th style="text-align: right;">Pts</th>';
    printContent += '<th style="text-align: right;">BP</th>';
    printContent += '</tr></thead><tbody>';

    forceList.forEach(item => {
        const unit = units.find(u => u.id === item.unitId);
        if (!unit) return;

        const unitTotal = unit.points * item.quantity;
        const bpTotal = unit.bp * item.quantity;

        printContent += `<tr>
            <td>${unit.type}</td>
            <td><strong>${unit.name}</strong></td>
            <td style="text-align: center;">${unit.armourFront}</td>
            <td style="text-align: center;">${unit.armourSide}</td>
            <td style="text-align: center;">${unit.weapon}</td>
            <td style="text-align: center;">${unit.toHit}</td>
            <td style="text-align: center;">${unit.morale}</td>
            <td style="text-align: center;">${formatAtgm(unit.atgmToHit, unit.atgmWeapon)}</td>
            <td style="font-size: 12px;">${unit.notes}</td>
            <td style="text-align: center;">${item.quantity}</td>
            <td style="text-align: right;">${unitTotal}</td>
            <td style="text-align: right;">${bpTotal.toFixed(1)}</td>
        </tr>`;
    });

    printContent += '</tbody></table>';
    
    // Add applicable rules section
    const applicableRules = new Set();
    let hasHeatOrSpecialArmour = false;
    let hasAtgm = false;
    
    forceList.forEach(item => {
        const unit = units.find(u => u.id === item.unitId);
        if (unit) {
            // Extract rules from notes
            if (unit.notes) {
                unit.notes.split(',').map(s => s.trim()).forEach(rule => {
                    if (rule) applicableRules.add(rule);
                });
            }
            
            // Check for HEAT rounds (h in weapon or ATGM) or Special Armour (s in armour)
            const hasH = (unit.weapon && unit.weapon.toLowerCase().includes('h')) ||
                         (unit.atgmWeapon && unit.atgmWeapon.toLowerCase().includes('h'));
            const hasS = (unit.armourFront && unit.armourFront.toLowerCase().includes('s')) ||
                         (unit.armourSide && unit.armourSide.toLowerCase().includes('s'));
            
            if (hasH || hasS) {
                hasHeatOrSpecialArmour = true;
            }
            
            // Check for ATGM values
            if (unit.atgmToHit || unit.atgmWeapon) {
                hasAtgm = true;
            }
        }
    });
    
    // Add HEAT Rounds and Special Armour rule if applicable
    if (hasHeatOrSpecialArmour) {
        applicableRules.add('HEAT Rounds and Special Armour');
    }
    
    // Add ATGM rule if applicable
    if (hasAtgm) {
        applicableRules.add('ATGM');
    }
    
    if (applicableRules.size > 0) {
        printContent += '<div style="margin-top: 30px; page-break-inside: avoid;"><h3 style="margin: 0 0 15px 0; font-size: 16px; border-bottom: 1px solid #000; padding-bottom: 8px;">Applicable Special Rules</h3>';
        printContent += '<div style="font-size: 12px; border-top: 1px solid #ddd;">';
        const rulesSorted = Array.from(applicableRules).sort();
        rulesSorted.forEach((ruleName) => {
            const ruleDesc = (rules[ruleName] || ruleName).replace(/\\n/g, '\n');
            printContent += `<div style="display: grid; grid-template-columns: 140px 1fr; gap: 18px; border-bottom: 1px solid #ddd; padding: 10px 8px; break-inside: avoid; page-break-inside: avoid;">
                <div style="font-weight: 600;">${ruleName}</div>
                <div style="white-space: pre-wrap; word-break: break-word;">${ruleDesc}</div>
            </div>`;
        });
        printContent += '</div></div>';
    }
    
    document.getElementById('printContent').innerHTML = printContent;

    // Small delay to ensure DOM is rendered before printing
    setTimeout(() => {
        window.print();
    }, 100);
}

// ========================================
// START APP
// ========================================
document.addEventListener('DOMContentLoaded', init);

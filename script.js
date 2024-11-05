// Constants
const CONSTANTS = {
  MAX_TAX_ROWS: 25,
  DEBOUNCE_DELAY: 300,
  MIN_TAX_ROWS: 1,
  COPY_SUCCESS_DURATION: 1000
};

// State management
const state = {
  taxRowCount: 1,
  calculations: {
    baseFareDiff: 0,
    taxBreakdown: {},
    overallTaxDiff: 0,
    totalFareDiff: 0,
    penalties: {
      airlinePenalty: 0,
      serviceFee: 0
    }
  }
};

// Utility functions
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => {
      func(...args);
    }, wait);
  };
}

function formatCurrency(value) {
  const numValue = parseFloat(value) || 0;
  return numValue.toFixed(2);
}

function safeCalculation(calculation) {
  try {
    return calculation();
  } catch (error) {
    console.error('Calculation error:', error);
    return 0;
  }
}

// Copy functionality
function createTooltip(message) {
  const tooltip = document.createElement('div');
  tooltip.className = 'copy-tooltip';
  tooltip.textContent = message;
  document.body.appendChild(tooltip);
  return tooltip;
}

function positionTooltip(tooltip, targetElement) {
  const rect = targetElement.getBoundingClientRect();
  tooltip.style.top = `${rect.top - tooltip.offsetHeight - 8}px`;
  tooltip.style.left = `${rect.left + (rect.width - tooltip.offsetWidth) / 2}px`;
}

function showTooltip(message, targetElement, duration = 2000) {
  const tooltip = createTooltip(message);
  positionTooltip(tooltip, targetElement);

  setTimeout(() => {
    tooltip.style.opacity = '0';
    setTimeout(() => tooltip.remove(), 50);
  }, duration);
}

function generateSummaryText() {
  const flexibilityValue = document.getElementById("flexibilitySelect").value;
  const { airlinePenalty, serviceFee } = state.calculations.penalties;

  let summaryText = "Ticket Change Summary\n";
  summaryText += "=======================\n";

  // Base fare section
  summaryText += `Base Fare Difference: ${document.getElementById("totalBaseFare").innerText}`;

  // Penalties section if applicable
  if (flexibilityValue === "No") {
    summaryText += `\nAirline Penalty: ${formatCurrency(airlinePenalty)}\n`;
    summaryText += `Service Fee: ${formatCurrency(serviceFee)}`;
  }

  // Tax breakdown section
  summaryText += `\nOverall Tax Difference: ${document.getElementById("taxDifference").innerText}\n`;
  summaryText += "=======================\n";
  summaryText += `Total Fare Difference: ${document.getElementById("totalFareDiff").innerText}\n`;
  summaryText += "***Tax Breakdown****\n";
  Object.entries(state.calculations.taxBreakdown).forEach(([taxType, difference]) => {
    summaryText += `${taxType}: ${formatCurrency(difference)}\n`;
  });
  return summaryText;
}

async function handleCopy() {
  const copyButton = document.getElementById('copyButton');
  const flexibilityValue = document.getElementById("flexibilitySelect").value;
  const airlinePenalty = document.getElementById("airlinePenalty").value;
  const serviceFee = document.getElementById("serviceFee").value;

  // Check if flexibility is No and if inputs are empty
  if (flexibilityValue === "No" && (!airlinePenalty || !serviceFee)) {
    copyButton.classList.add('error');
    showTooltip('Please fill in Airline Penalty and Service Fee', copyButton);
    setTimeout(() => {
      copyButton.classList.remove('error');
    }, CONSTANTS.COPY_SUCCESS_DURATION);
    return; // Exit the function if inputs are invalid
  }

  const summaryText = generateSummaryText();

  try {
    await navigator.clipboard.writeText(summaryText);
    copyButton.classList.add('success');
    showTooltip('Copied!', copyButton);

    setTimeout(() => {
      copyButton.classList.remove('success');
    }, CONSTANTS.COPY_SUCCESS_DURATION);
  } catch (err) {
    copyButton.classList.add('error');
    showTooltip('Failed to copy', copyButton);

    setTimeout(() => {
      copyButton.classList.remove('error');
    }, CONSTANTS.COPY_SUCCESS_DURATION);
  }
}

// DOM Utility functions
function createTaxBreakdownItem(taxType, difference) {
  const taxItem = document.createElement('div');
  taxItem.className = 'tax-item';
  taxItem.innerHTML = `
    <span class="tax-type-label">${taxType || 'Unknown'} Tax:</span>
    <span class="tax-amount currency">${formatCurrency(difference)}</span>
  `;
  return taxItem;
}

function updateTaxBreakdownDisplay() {
  const taxList = document.querySelector('.tax-list');
  taxList.innerHTML = '';

  Object.entries(state.calculations.taxBreakdown)
    .filter(([_, value]) => value !== 0)
    .sort((a, b) => b[1] - a[1])
    .forEach(([taxType, difference]) => {
      taxList.appendChild(createTaxBreakdownItem(taxType, difference));
    });

  if (taxList.children.length === 0) {
    taxList.innerHTML = '<div class="tax-item empty">No tax differences calculated</div>';
  }
}

// Calculation functions
function calculateBaseFareDifference() {
  return safeCalculation(() => {
    const baseOldFare = parseFloat(document.getElementById("baseOldFare").value) || 0;
    const baseNewFare = parseFloat(document.getElementById("baseNewFare").value) || 0;

    let baseFareDiff = baseNewFare - baseOldFare;

    if (document.getElementById("flexibilitySelect").value === "No") {
      const airlinePenalty = parseFloat(document.getElementById("airlinePenalty").value) || 0;
      const serviceFee = parseFloat(document.getElementById("serviceFee").value) || 0;

      state.calculations.penalties = {
        airlinePenalty,
        serviceFee
      };

      baseFareDiff += airlinePenalty + serviceFee;
    }

    state.calculations.baseFareDiff = baseFareDiff;
    document.getElementById("totalBaseFare").innerText = formatCurrency(baseFareDiff);

    return baseFareDiff;
  });
}

function calculateTaxDifferences() {
  state.calculations.taxBreakdown = {};
  let totalTaxDiff = 0;

  for (let i = 1; i <= state.taxRowCount; i++) {
    const row = document.getElementById(`taxRow${i}`);
    if (!row) continue;

    const taxType = document.getElementById(`taxType${i}`).value.toUpperCase();
    const oldFare = parseFloat(document.getElementById(`oldFare${i}`).value) || 0;
    const newFare = parseFloat(document.getElementById(`newFare${i}`).value) || 0;
    const difference = newFare - oldFare;

    if (taxType && difference !== 0) {
      state.calculations.taxBreakdown[taxType] = difference;
      if (difference > 0) {
        totalTaxDiff += difference;
      }
    }

    document.getElementById(`taxDiff${i}`).innerText = formatCurrency(difference);
  }

  state.calculations.overallTaxDiff = totalTaxDiff;
  document.getElementById("taxDifference").innerText = formatCurrency(totalTaxDiff);

  updateTaxBreakdownDisplay();

  return totalTaxDiff;
}

function calculateTotalFareDifference() {
  const baseOldFare = parseFloat(document.getElementById("baseOldFare").value) || 0;
  const baseNewFare = parseFloat(document.getElementById("baseNewFare").value) || 0;

  // Calculate the base fare difference
  const baseFareDiff = baseNewFare - baseOldFare;
  state.calculations.baseFareDiff = baseFareDiff;
  document.getElementById("totalBaseFare").innerText = formatCurrency(baseFareDiff);

  // Calculate the tax differences
  const totalTaxDifference = calculateTaxDifferences();

  // Calculate the total fare difference
  let totalFareDiff;
  if (baseFareDiff < 0) {
    // If the base fare difference is negative, only calculate the penalties and tax differences
    const { airlinePenalty, serviceFee } = state.calculations.penalties;
    totalFareDiff = Math.max(airlinePenalty + serviceFee + totalTaxDifference, 0);
  } else {
    // Otherwise, calculate the total fare difference including the base fare difference
    totalFareDiff = Math.max(baseFareDiff + totalTaxDifference, 0);
  }

  state.calculations.totalFareDiff = totalFareDiff;
  document.getElementById("totalFareDiff").innerText = formatCurrency(totalFareDiff);

  // Update the Airline Penalty and Service Fee summary
  updatePenaltySummary();
}

function updatePenaltySummary() {
  const flexibilityValue = document.getElementById("flexibilitySelect").value;
  const airlinePenalty = parseFloat(document.getElementById("airlinePenalty").value) || 0;
  const serviceFee = parseFloat(document.getElementById("serviceFee").value) || 0;

  state.calculations.penalties = {
    airlinePenalty,
    serviceFee
  };

  if (flexibilityValue === "No") {
    document.getElementById("Penaltysummary").style.display = "flex";
    document.getElementById("airlinePenaltySummary").innerText = formatCurrency(airlinePenalty);
    document.getElementById("Servicefeesummary").style.display = "flex";
    document.getElementById("serviceFeesSummary").innerText = formatCurrency(serviceFee);
  } else {
    document.getElementById("Penaltysummary").style.display = "none";
    document.getElementById("Servicefeesummary").style.display = "none";
  }
}

function addTaxRow() {
  if (state.taxRowCount < CONSTANTS.MAX_TAX_ROWS) {
    state.taxRowCount++;
    const newRow = document.createElement("tr");
    newRow.id = `taxRow${state.taxRowCount}`;
    newRow.innerHTML = `
      <td><input type="text" id="taxType${state.taxRowCount}" maxlength="2" class="tax-type"></td>
      <td><input type="number" id="oldFare${state.taxRowCount}" placeholder="0.00" min="0" step="0.01"></td>
      <td><input type="number" id="newFare${state.taxRowCount}" placeholder="0.00" min="0" step="0.01"></td>
      <td id="taxDiff${state.taxRowCount}" class="currency">0.00</td>
      <td><button class="remove-tax-button" onclick="removeTaxRow(${state.taxRowCount})">Remove</button></td>
    `;
    document.getElementById("taxTableBody").appendChild(newRow);
    bindTaxRowEvents(newRow);

    document.getElementById("maxTaxAlert").style.display =
      state.taxRowCount >= CONSTANTS.MAX_TAX_ROWS ? "block" : "none";
  }
}

function removeTaxRow(rowNumber) {
  if (state.taxRowCount <= CONSTANTS.MIN_TAX_ROWS) return;

  const row = document.getElementById(`taxRow${rowNumber}`);
  if (row) {
    row.remove();
    state.taxRowCount--;
    document.getElementById("maxTaxAlert").style.display = "none";
    calculateTotalFareDifference();
  }
}

function bindTaxRowEvents(row) {
  const inputs = row.querySelectorAll('input');
  inputs.forEach(input => {
    input.addEventListener('input', debounce(calculateTotalFareDifference, CONSTANTS.DEBOUNCE_DELAY));
  });
}

function handleFlexibilityChange() {
  const flexibilitySelect = document.getElementById("flexibilitySelect").value;
  const airlinePenaltyRow = document.getElementById("airlinePenaltyRow");
  const serviceFeeRow = document.getElementById("serviceFeeRow");

  // Determine display and requirement based on flexibility value
  const display = flexibilitySelect === "No" ? "block" : "none";
  airlinePenaltyRow.style.display = display;
  serviceFeeRow.style.display = display;

  // Clear previous error states
  document.getElementById("airlinePenalty").setCustomValidity('');
  document.getElementById("serviceFee").setCustomValidity('');

  // Check for required fields when flexibility is "No"
  if (flexibilitySelect === "No") {
    const airlinePenalty = document.getElementById("airlinePenalty").value.trim();
    const serviceFee = document.getElementById("serviceFee").value.trim();

    if (!airlinePenalty) {
      document.getElementById("airlinePenalty").setCustomValidity('Airline penalty is required.');
      showTooltip('Airline penalty is required.', document.getElementById("airlinePenalty"));
    }

    if (!serviceFee) {
      document.getElementById("serviceFee").setCustomValidity('Service fee is required.');
      showTooltip('Service fee is required.', document.getElementById("serviceFee"));
    }
  }

  // Trigger recalculation of total fare difference
  calculateTotalFareDifference();
}

function clearFields() {
  document.getElementById("baseOldFare").value = "";
  document.getElementById("baseNewFare").value = "";
  document.getElementById("airlinePenalty").value = "";
  document.getElementById("serviceFee").value = "";

  document.getElementById("flexibilitySelect").value = "Yes";
  handleFlexibilityChange();

  document.getElementById("taxTableBody").innerHTML = `
    <tr id="taxRow1">
      <td><input type="text" id="taxType1" maxlength="2" class="tax-type"></td>
      <td><input type="number" id="oldFare1" placeholder="0.00" min="0" step="0.01"></td>
      <td><input type="number" id="newFare1" placeholder="0.00" min="0" step="0.01"></td>
      <td id="taxDiff1" class="currency">0.00</td>
      <td><button class="remove-tax-button" onclick="removeTaxRow(1)">Remove</button></td>
    </tr>
  `;

  state.taxRowCount = 1;
  state.calculations = {
    baseFareDiff: 0,
    taxBreakdown: {},
    overallTaxDiff: 0,
    totalFareDiff: 0,
    penalties: {
      airlinePenalty: 0,
      serviceFee: 0
    }
  };

  document.getElementById("totalBaseFare").innerText = "0.00";
  document.getElementById("taxDifference").innerText = "0.00";
  document.getElementById("totalFareDiff").innerText = "0.00";
  updateTaxBreakdownDisplay();

  document.getElementById("maxTaxAlert").style.display = "none";

  bindTaxRowEvents(document.getElementById("taxRow1"));
}

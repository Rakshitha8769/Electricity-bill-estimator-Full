// Electricity Bill Estimator
// Initial version uses sample data stored in browser memory.

// Get HTML elements
const billForm = document.getElementById("bill-form");
const billResult = document.getElementById("bill-result");
const saveButton = document.getElementById("save-btn");
const estimatesList = document.getElementById("estimates-list");
const emptyMessage = document.getElementById("empty-message");
const messageBox = document.getElementById("message");

// Current calculation and sample estimates
let currentEstimate = null;
let editingId = null;
let nextId = 1;
let estimates = [];

// Format numbers as Indian Rupees
function formatRupees(amount) {
    return new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(amount);
}

// Display a message
function showMessage(message, type = "success") {
    messageBox.textContent = message;
    messageBox.className = `message message-${type}`;

    // Hide the message automatically after 4 seconds
    setTimeout(() => {
        messageBox.classList.add("hidden");
    }, 4000);
}

// Read and validate form values
function getFormValues() {
    const consumerName = document
        .getElementById("consumer-name")
        .value.trim();

    const units = Number(document.getElementById("units").value);
    const rate = Number(document.getElementById("rate").value);
    const additionalCharges = Number(
        document.getElementById("additional-charges").value
    );

    if (!consumerName) {
        throw new Error("Please enter a consumer name.");
    }

    if (
        document.getElementById("units").value.trim() === "" ||
        !Number.isFinite(units) ||
        units < 0 ||
        units > 1000000
    ) {
        throw new Error("Enter valid units between 0 and 1,000,000.");
    }

    if (
        document.getElementById("rate").value.trim() === "" ||
        !Number.isFinite(rate) ||
        rate < 0 ||
        rate > 100000
    ) {
        throw new Error("Enter a valid rate per unit.");
    }

    if (
        document.getElementById("additional-charges").value.trim() === "" ||
        !Number.isFinite(additionalCharges) ||
        additionalCharges < 0 ||
        additionalCharges > 10000000
    ) {
        throw new Error("Enter valid additional charges.");
    }

    const energyCharges = Math.round(units * rate * 100) / 100;
    const estimatedTotal =
        Math.round((energyCharges + additionalCharges) * 100) / 100;

    return {
        consumer_name: consumerName,
        units_consumed: units,
        rate_per_unit: rate,
        additional_charges: additionalCharges,
        estimated_total: estimatedTotal
    };
}

// Display the calculated bill
function displayResult(estimate) {
    document.getElementById("result-name").textContent =
        estimate.consumer_name;

    document.getElementById("result-units").textContent =
        `${estimate.units_consumed} kWh`;

    document.getElementById("result-rate").textContent =
        formatRupees(estimate.rate_per_unit);

    document.getElementById("result-energy").textContent =
        formatRupees(
            estimate.units_consumed * estimate.rate_per_unit
        );

    document.getElementById("result-additional").textContent =
        formatRupees(estimate.additional_charges);

    document.getElementById("result-total").textContent =
        formatRupees(estimate.estimated_total);

    billResult.classList.remove("hidden");
}

// Calculate the bill when the form is submitted
billForm.addEventListener("submit", function (event) {
    event.preventDefault();

    try {
        currentEstimate = getFormValues();
        editingId = null;

        saveButton.textContent = "Save Estimate";
        displayResult(currentEstimate);

        showMessage("Bill calculated successfully!");
    } catch (error) {
        showMessage(error.message, "error");
    }
});

// Reset the form and current calculation
billForm.addEventListener("reset", function () {
    currentEstimate = null;
    editingId = null;

    billResult.classList.add("hidden");
    saveButton.textContent = "Save Estimate";

    messageBox.classList.add("hidden");
});

// Save the current estimate in browser memory
saveButton.addEventListener("click", function () {
    if (!currentEstimate) {
        showMessage("Please calculate the bill first.", "error");
        return;
    }

    if (editingId !== null) {
        const index = estimates.findIndex(
            estimate => estimate.id === editingId
        );

        if (index !== -1) {
            estimates[index] = {
                ...currentEstimate,
                id: editingId
            };

            showMessage("Estimate updated successfully!");
        }

        editingId = null;
    } else {
        estimates.push({
            ...currentEstimate,
            id: nextId++,
            created_at: new Date().toLocaleString("en-IN")
        });

        showMessage("Estimate saved successfully!");
    }

    currentEstimate = null;
    billResult.classList.add("hidden");

    renderEstimates();
});

// Display all saved estimates
function renderEstimates() {
    estimatesList.replaceChildren();

    emptyMessage.classList.toggle("hidden", estimates.length > 0);

    estimates.forEach(function (estimate) {
        const item = document.createElement("div");
        item.className = "estimate-item";

        const heading = document.createElement("h3");
        heading.textContent = estimate.consumer_name;

        const units = document.createElement("p");
        units.textContent = `Units: ${estimate.units_consumed} kWh`;

        const rate = document.createElement("p");
        rate.textContent =
            `Rate per unit: ${formatRupees(estimate.rate_per_unit)}`;

        const total = document.createElement("p");
        total.textContent =
            `Estimated total: ${formatRupees(estimate.estimated_total)}`;

        const date = document.createElement("p");
        date.textContent = `Saved: ${estimate.created_at || "Recently"}`;

        const buttons = document.createElement("div");
        buttons.className = "button-group";

        const editButton = document.createElement("button");
        editButton.type = "button";
        editButton.className = "btn-secondary";
        editButton.textContent = "Edit";

        editButton.addEventListener("click", function () {
            editEstimate(estimate.id);
        });

        const deleteButton = document.createElement("button");
        deleteButton.type = "button";
        deleteButton.className = "btn-danger";
        deleteButton.textContent = "Delete";

        deleteButton.addEventListener("click", function () {
            deleteEstimate(estimate.id);
        });

        buttons.append(editButton, deleteButton);
        item.append(heading, units, rate, total, date, buttons);
        estimatesList.appendChild(item);
    });
}

// Load an estimate into the form for editing
function editEstimate(id) {
    const estimate = estimates.find(item => item.id === id);

    if (!estimate) {
        showMessage("Estimate not found.", "error");
        return;
    }

    document.getElementById("consumer-name").value =
        estimate.consumer_name;

    document.getElementById("units").value =
        estimate.units_consumed;

    document.getElementById("rate").value =
        estimate.rate_per_unit;

    document.getElementById("additional-charges").value =
        estimate.additional_charges;

    editingId = id;
    currentEstimate = { ...estimate };

    billResult.classList.add("hidden");
    saveButton.textContent = "Update Estimate";

    billForm.scrollIntoView({
        behavior: "smooth",
        block: "start"
    });

    showMessage("Edit the details and calculate the bill again.");
}

// Delete an estimate
function deleteEstimate(id) {
    const confirmed = window.confirm(
        "Are you sure you want to delete this estimate?"
    );

    if (!confirmed) {
        return;
    }

    estimates = estimates.filter(estimate => estimate.id !== id);

    if (editingId === id) {
        editingId = null;
        currentEstimate = null;
        saveButton.textContent = "Save Estimate";
        billResult.classList.add("hidden");
    }

    renderEstimates();
    showMessage("Estimate deleted successfully!");
}

// Initial display
renderEstimates();
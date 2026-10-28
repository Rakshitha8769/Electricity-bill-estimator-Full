const express = require("express");
const cors = require("cors");
const supabase = require("./supabase");

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: "10kb" }));

// Validate and calculate an estimate on the server
function validateEstimate(data) {
    const consumerName =
        typeof data.consumer_name === "string"
            ? data.consumer_name.trim()
            : "";

    const units = Number(data.units_consumed);
    const rate = Number(data.rate_per_unit);
    const additionalCharges = Number(data.additional_charges ?? 0);

    if (!consumerName || consumerName.length > 100) {
        return { error: "Consumer name is required (maximum 100 characters)." };
    }

    if (
        data.units_consumed === "" ||
        data.units_consumed === null ||
        !Number.isFinite(units) ||
        units < 0 ||
        units > 1000000
    ) {
        return { error: "Units must be between 0 and 1,000,000." };
    }

    if (
        data.rate_per_unit === "" ||
        data.rate_per_unit === null ||
        !Number.isFinite(rate) ||
        rate < 0 ||
        rate > 100000
    ) {
        return { error: "Rate must be between 0 and 100,000." };
    }

    if (
        data.additional_charges === "" ||
        data.additional_charges === null ||
        !Number.isFinite(additionalCharges) ||
        additionalCharges < 0 ||
        additionalCharges > 10000000
    ) {
        return { error: "Additional charges must be between 0 and 10,000,000." };
    }

    const energyCharges = Math.round(units * rate * 100) / 100;
    const estimatedTotal =
        Math.round((energyCharges + additionalCharges) * 100) / 100;

    if (!Number.isFinite(estimatedTotal)) {
        return { error: "The calculated bill is outside the supported range." };
    }

    return {
        value: {
            consumer_name: consumerName,
            units_consumed: units,
            rate_per_unit: rate,
            additional_charges: additionalCharges,
            estimated_total: estimatedTotal
        }
    };
}

// GET: Retrieve all saved estimates
app.get("/api/estimates", async (req, res) => {
    try {
        const { data, error } = await supabase
            .from("bill_estimates")
            .select("*")
            .order("created_at", { ascending: false });

        if (error) throw error;

        res.json(data);
    } catch (error) {
        console.error("Fetch estimates error:", error.message);
        res.status(500).json({ error: "Unable to retrieve estimates." });
    }
});

// GET: Retrieve one estimate
app.get("/api/estimates/:id", async (req, res) => {
    try {
        const { data, error } = await supabase
            .from("bill_estimates")
            .select("*")
            .eq("id", req.params.id)
            .single();

        if (error) {
            if (error.code === "PGRST116") {
                return res.status(404).json({ error: "Estimate not found." });
            }
            throw error;
        }

        res.json(data);
    } catch (error) {
        console.error("Fetch estimate error:", error.message);
        res.status(500).json({ error: "Unable to retrieve this estimate." });
    }
});

// POST: Create a new estimate
app.post("/api/estimates", async (req, res) => {
    const result = validateEstimate(req.body);

    if (result.error) {
        return res.status(400).json({ error: result.error });
    }

    try {
        const { data, error } = await supabase
            .from("bill_estimates")
            .insert(result.value)
            .select()
            .single();

        if (error) throw error;

        res.status(201).json(data);
    } catch (error) {
        console.error("Create estimate error:", error.message);
        res.status(500).json({ error: "Unable to save the estimate." });
    }
});

// PUT: Update an existing estimate
app.put("/api/estimates/:id", async (req, res) => {
    const result = validateEstimate(req.body);

    if (result.error) {
        return res.status(400).json({ error: result.error });
    }

    try {
        const { data, error } = await supabase
            .from("bill_estimates")
            .update(result.value)
            .eq("id", req.params.id)
            .select()
            .single();

        if (error) {
            if (error.code === "PGRST116") {
                return res.status(404).json({ error: "Estimate not found." });
            }
            throw error;
        }

        res.json(data);
    } catch (error) {
        console.error("Update estimate error:", error.message);
        res.status(500).json({ error: "Unable to update the estimate." });
    }
});

// DELETE: Delete an estimate
app.delete("/api/estimates/:id", async (req, res) => {
    try {
        const { data, error } = await supabase
            .from("bill_estimates")
            .delete()
            .eq("id", req.params.id)
            .select("id");

        if (error) throw error;

        if (!data || data.length === 0) {
            return res.status(404).json({ error: "Estimate not found." });
        }

        res.json({ message: "Estimate deleted successfully." });
    } catch (error) {
        console.error("Delete estimate error:", error.message);
        res.status(500).json({ error: "Unable to delete the estimate." });
    }
});

// Health check
app.get("/api/health", (req, res) => {
    res.json({ status: "ok", message: "Electricity Bill Estimator API is running." });
});

// Handle invalid JSON
app.use((err, req, res, next) => {
    if (err instanceof SyntaxError && err.status === 400 && "body" in err) {
        return res.status(400).json({ error: "Invalid JSON request body." });
    }

    next(err);
});

// Start server
app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});
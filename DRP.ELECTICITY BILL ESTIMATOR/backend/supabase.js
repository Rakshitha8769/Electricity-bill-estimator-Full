const { createClient } = require("@supabase/supabase-js");
require("dotenv").config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY;

if (!supabaseUrl || !supabaseSecretKey) {
    throw new Error(
        "Missing Supabase credentials. Check your backend/.env file."
    );
}

const supabase = createClient(
    supabaseUrl,
    supabaseSecretKey
);

module.exports = supabase;
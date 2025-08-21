<?php
// Firebase Realtime Database REST API URL
$firebase_url = "https://wallet-830a8-default-rtdb.firebaseio.com";

// Security key
$API_KEY = "MY_SECRET_KEY"; 

// Get query params
$uid = $_GET['uid'] ?? null;
$amount = floatval($_GET['amount'] ?? 0);
$note = $_GET['note'] ?? "API Credit";
$key = $_GET['key'] ?? null;

// Check API key
if ($key !== $API_KEY) {
    http_response_code(403);
    echo "❌ Invalid API key";
    exit;
}

if (!$uid || $amount <= 0) {
    http_response_code(400);
    echo "❌ Invalid request";
    exit;
}

// Get current balance
$balance_url = "$firebase_url/users/$uid/balance.json";
$current_balance = file_get_contents($balance_url);
$current_balance = $current_balance ? floatval(json_decode($current_balance)) : 0;

// New balance
$new_balance = $current_balance + $amount;

// Update balance
file_put_contents("$firebase_url/users/$uid/balance.json", $new_balance);

// Add transaction
$transaction = [
    "type" => "credit",
    "amount" => $amount,
    "note" => $note,
    "timestamp" => round(microtime(true) * 1000)
];
file_put_contents("$firebase_url/transactions/$uid.json", json_encode($transaction));

echo "✅ Added ₹$amount to UID $uid. New balance: ₹$new_balance";
?>
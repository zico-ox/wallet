document.addEventListener('DOMContentLoaded', () => {
    const currentUID = localStorage.getItem("wallet_uid");
    const currentName = localStorage.getItem("wallet_name");

    // Get references to interactive elements
    const withdrawBtn = document.getElementById('withdrawBtn');
    const submitWithdrawalBtn = document.getElementById('submitWithdrawalBtn');
    const withdrawForm = document.getElementById("withdrawForm");
    const menuToggle = document.getElementById('menuToggle');
    const navLinks = document.getElementById('navLinks');
    const logoutBtn = document.getElementById('logoutBtn');

    if (!currentUID || !currentName) {
        window.location.href = "login.html";
        return; // Stop script execution if not logged in
    }

    document.getElementById("userName").innerText = currentName;
    document.getElementById("userUid").innerText = currentUID;

    // Fetches and displays core user data like balance and total earnings.
    function loadUserData() {
        db.ref(`users/${currentUID}`).on("value", (snap) => {
            const user = snap.val();
            if (user) {
                const balanceValue = parseFloat(user.balance ?? 0);
                const totalCreditsValue = parseFloat(user.totalCredits ?? 0);
                document.getElementById("balance").textContent = balanceValue.toFixed(2);
                document.getElementById("totalCredits").textContent = totalCreditsValue.toFixed(2);
            }
        });
    }

    // Fetches and displays the list of recent transactions.
    function loadTransactions() {
        // Use a more efficient query to get the last 20 transactions
        db.ref(`transactions/${currentUID}`).orderByChild('timestamp').limitToLast(20).on("value", (snap) => {
            const txs = snap.val();
            const txList = document.getElementById("txList");
            txList.innerHTML = "";

            if (!txs) {
                txList.innerHTML = "<li>No Transactions Yet</li>";
                return;
            }

            // Firebase returns an object, convert to array and sort descending
            const sortedTxs = Object.values(txs).sort((a, b) => b.timestamp - a.timestamp);

            sortedTxs.forEach((tx) => {
                const li = document.createElement("li");
                const date = new Date(tx.timestamp);
                const formattedTime = `${date.toLocaleDateString()} ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;

                const isCredit = tx.type === "credit";
                const isWithdrawal = tx.note?.toLowerCase().includes("withdrawal");

                li.className = "tx-card";
                if (isWithdrawal) {
                    li.classList.add("withdrawal");
                    if (tx.note?.toLowerCase().includes("approved")) {
                        li.classList.add("withdrawal-approved");
                    }
                }

                li.innerHTML = `
                  <div class="tx-info">
                    <div class="tx-name">${tx.note || "Transaction"}</div>
                    <div class="tx-time">On ${formattedTime}</div>
                    <div class="tx-badge">${isCredit ? "🪙 Money Received" : isWithdrawal ? "Withdrawal" : "🪙 Transfers"}</div>
                  </div>
                  <div class="tx-amount">
                    ${isCredit ? "+" : "-"} ₹${tx.amount}
                  </div>
                `;

                txList.appendChild(li);
            });
        });
    }

    function toggleWithdraw() {
        withdrawForm.classList.toggle('active');
    }

    function submitWithdrawal() {
        const amount = parseFloat(document.getElementById("withdrawAmount").value);
        const upi = document.getElementById("withdrawUpi").value.trim();

        // Fetch withdrawal settings first
        db.ref('settings/withdrawal').once('value').then(settingsSnapshot => {
            const settings = settingsSnapshot.val() || { enabled: false, minAmount: 25 };

            if (settings.enabled !== true) {
                alert("Withdrawals are temporarily disabled. Please try again later.");
                return;
            }

            if (!amount || amount <= 0) {
                alert("Enter a valid amount");
                return;
            }
            if (amount < settings.minAmount) {
                alert(`Minimum withdrawal amount is ₹${settings.minAmount}`);
                return;
            }
            if (!upi || !upi.includes("@")) {
                alert("Enter a valid UPI ID");
                return;
            }

            db.ref(`users/${currentUID}/balance`).once("value").then((snap) => {
                const currentBalance = snap.val() ?? 0;
                if (currentBalance < amount) {
                    alert("Insufficient balance");
                    return;
                }

                // Use a transaction to safely deduct the balance
                db.ref(`users/${currentUID}/balance`).set(currentBalance - amount);

                // Create a new unique key for both the transaction and withdrawal
                const withdrawalKey = db.ref(`withdrawals/${currentUID}`).push().key;

                // Prepare a multi-path update for atomicity
                const updates = {};
                updates[`/transactions/${currentUID}/${withdrawalKey}`] = {
                    type: "debit",
                    amount,
                    note: "Withdrawal requested",
                    timestamp: firebase.database.ServerValue.TIMESTAMP,
                };
                updates[`/withdrawals/${currentUID}/${withdrawalKey}`] = {
                    amount,
                    upi,
                    status: "pending",
                    requestedAt: firebase.database.ServerValue.TIMESTAMP,
                };
                updates[`/users/${currentUID}/upi`] = upi;

                // Execute the multi-path update
                db.ref().update(updates).then(() => {
                    alert("Withdrawal requested");
                    document.getElementById("withdrawAmount").value = "";
                    document.getElementById("withdrawUpi").value = "";
                    withdrawForm.classList.remove('active');
                });
            });
        });
    }

    // --- Event Listeners ---
    withdrawBtn.addEventListener('click', toggleWithdraw);
    submitWithdrawalBtn.addEventListener('click', submitWithdrawal);
    
    // Menu Toggle Functionality for mobile view
    menuToggle.addEventListener('click', () => {
        navLinks.classList.toggle('active');
        menuToggle.classList.toggle('active');

        // Toggle ARIA attribute for accessibility
        const isExpanded = menuToggle.getAttribute('aria-expanded') === 'true';
        menuToggle.setAttribute('aria-expanded', !isExpanded);
    });

    // Logout Functionality
    logoutBtn.addEventListener('click', (e) => {
        e.preventDefault(); // Prevent default anchor behavior
        localStorage.removeItem('wallet_uid');
        localStorage.removeItem('wallet_name');
        window.location.href = 'login.html';
    });

    loadUserData();
    loadTransactions();
});
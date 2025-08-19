let allAdminUsers = []; // Cache for user search functionality

// --- Dashboard Stats ---
function loadDashboardStats() {
    const usersRef = db.ref('users');
    const withdrawalsRef = db.ref('withdrawals');
    // Calculate total balance and user count from 'users'
    usersRef.on('value', (snapshot) => {
        const users = snapshot.val();
        let totalBalance = 0;
        let userCount = 0;
        let totalEarnings = 0;
        if (users) {
            const userIds = Object.keys(users);
            userCount = userIds.length;
            Object.values(users).forEach(user => {
                totalBalance += parseFloat(user.balance || 0);
                totalEarnings += parseFloat(user.totalCredits || 0);
            });
        }
        document.getElementById('totalBalance').textContent = totalBalance.toFixed(2);
        document.getElementById('totalEarnings').textContent = totalEarnings.toFixed(2);
        document.getElementById('totalUsers').textContent = userCount;
    });
    // Calculate total withdrawn from 'withdrawals'
    withdrawalsRef.on('value', (snapshot) => {
        const allWithdrawals = snapshot.val();
        let totalWithdrawn = 0;
        if (allWithdrawals) {
            Object.values(allWithdrawals).forEach(userWithdrawals => {
                Object.values(userWithdrawals).forEach(withdrawal => {
                    if (withdrawal.status === 'approved') {
                        totalWithdrawn += parseFloat(withdrawal.amount || 0);
                    }
                });
            });
        }
        document.getElementById('totalWithdrawn').textContent = totalWithdrawn.toFixed(2);
    });
}

// --- Load User List ---
function loadUsers() {
    const usersRef = db.ref('users');
    usersRef.on('value', (snapshot) => {
        const users = snapshot.val() || {};
        const usersTableBody = document.getElementById('usersTableBody');
        usersTableBody.innerHTML = ''; // Clear previous entries

        // Convert users object to an array and store it for searching
        allAdminUsers = Object.entries(users).map(([uid, data]) => ({ ...data, uid }));

        // Use a copy of the mapped array for sorting to not affect the original order if needed elsewhere
        const sortedUsers = [...allAdminUsers]
            .sort((a, b) => (b.balance || 0) - (a.balance || 0));

        if (sortedUsers.length === 0) {
            const row = usersTableBody.insertRow();
            row.innerHTML = `<td colspan="3" style="text-align: center;">No users found.</td>`;
            return;
        }

        sortedUsers.forEach(user => {
            const row = usersTableBody.insertRow();
            const userName = user.name || 'N/A';
            row.innerHTML = `
                <td>${userName}</td>
                <td class="clickable-uid" onclick="loginAsUser('${user.uid}', '${userName}')">${user.uid}</td>
                <td>${parseFloat(user.balance || 0).toFixed(2)}</td>
            `;
        });
    });
}

// --- Load Global Transactions ---
function loadGlobalTransactions() {
    const transactionsRef = db.ref('transactions');
    transactionsRef.on('value', (snapshot) => {
        const allUserTransactions = snapshot.val() || {};
        const globalTxTableBody = document.getElementById('globalTxTableBody');
        globalTxTableBody.innerHTML = '';
        
        let allTxs = [];
        // This is inefficient for large datasets. A better approach would be a flattened global transaction log.
        // For now, this will work for a small number of users.
        Object.keys(allUserTransactions).forEach(uid => {
            const userTxs = allUserTransactions[uid];
            Object.values(userTxs).forEach(tx => {
                allTxs.push({ ...tx, uid });
            });
        });

        if (allTxs.length === 0) {
            globalTxTableBody.innerHTML = '<tr><td colspan="2" style="text-align: center;">No transactions found.</td></tr>';
            return;
        }

        // Sort by timestamp descending and take the most recent 20
        allTxs.sort((a, b) => b.timestamp - a.timestamp)
            .slice(0, 20)
            .forEach(tx => {
                const row = globalTxTableBody.insertRow();
                const isCredit = tx.type === 'credit';
                const amountClass = isCredit ? 'credit' : 'debit';
                const amountSign = isCredit ? '+' : '-';
                const amount = parseFloat(tx.amount || 0);
                const txDate = new Date(tx.timestamp).toLocaleDateString();

                row.innerHTML = `
                    <td>
                        <div class="tx-note">${tx.note || 'Transaction'}</div>
                        <div class="tx-user-info">User: ${tx.uid} &bull; ${txDate}</div>
                    </td>
                    <td class="tx-amount-admin ${amountClass}" style="text-align: right; white-space: nowrap;">
                        ${amountSign} ₹${amount.toFixed(2)}
                    </td>
                `;
            });
    });
}

// --- Admin Actions ---
function loginAsUser(uid, name) {
    // This provides a "login as user" functionality for admins.
    // It opens the user's wallet in a new tab.
    localStorage.setItem("wallet_uid", uid);
    localStorage.setItem("wallet_name", name);
    window.open('index.html', '_blank');
}

function toggleCreditForm() {
    const formContainer = document.getElementById('creditFormContainer');
    formContainer.classList.toggle('active');
}

async function addFunds() {
    const userId = document.getElementById('creditUserId').value.trim();
    const amountStr = document.getElementById('creditAmount').value;
    const note = document.getElementById('creditNote').value.trim() || 'Admin Credit';

    if (!userId || !amountStr) {
        alert('Please provide a User ID and an amount.');
        return;
    }

    const amount = parseFloat(amountStr);
    if (isNaN(amount) || amount <= 0) {
        alert('Please enter a valid positive amount.');
        return;
    }

    const userRef = db.ref(`users/${userId}`);

    try {
        const snapshot = await userRef.once('value');
        if (!snapshot.exists()) {
            alert('Error: User does not exist.');
            return;
        }

        // Use a transaction to ensure atomic update of balance and totalCredits
        await userRef.transaction((currentUserData) => {
            if (currentUserData === null) {
                // This handles crediting a user that somehow exists but has no data
                return { balance: amount, totalCredits: amount };
            }
            // Atomically update both balance and total lifetime credits
            currentUserData.balance = (currentUserData.balance || 0) + amount;
            currentUserData.totalCredits = (currentUserData.totalCredits || 0) + amount;
            return currentUserData;
        });

        // Push a new transaction record for the user
        const txRef = db.ref(`transactions/${userId}`);
        await txRef.push({
            type: 'credit',
            amount: amount,
            note: note,
            timestamp: firebase.database.ServerValue.TIMESTAMP // Use server-side timestamp
        });

        alert(`Successfully credited ₹${amount.toFixed(2)} to user ${userId}.`);
        // Clear input fields after success
        document.getElementById('creditUserId').value = '';
        document.getElementById('creditAmount').value = '';
        document.getElementById('creditNote').value = '';

    } catch (error) {
        console.error("Error crediting funds: ", error);
        alert('An error occurred while crediting funds. Please check the console for details.');
    }
}

/**
 * Sets up a live search on the "Credit Funds" UID input field.
 * Displays user details when a valid UID is entered.
 */
function setupCreditUserSearch() {
    const uidInput = document.getElementById('creditUserId');
    const suggestionsBox = document.getElementById('creditUserSuggestions');
    const detailsBox = document.getElementById('creditUserDetails');

    if (!uidInput || !suggestionsBox || !detailsBox) return;

    uidInput.addEventListener('input', () => {
        const searchTerm = uidInput.value.trim();
        suggestionsBox.innerHTML = ''; // Clear previous suggestions
        detailsBox.style.display = 'none'; // Hide details box while typing

        if (searchTerm.length < 1) {
            suggestionsBox.style.display = 'none';
            return;
        }

        const filteredUsers = allAdminUsers.filter(user =>
            user.uid.startsWith(searchTerm)
        );

        if (filteredUsers.length > 0) {
            filteredUsers.forEach(user => {
                const item = document.createElement('div');
                item.classList.add('suggestion-item');
                item.textContent = `${user.name} - ${user.uid}`;
                item.addEventListener('click', () => {
                    // When a user is clicked from the list
                    uidInput.value = user.uid; // Set the input value to the selected UID
                    suggestionsBox.innerHTML = ''; // Clear suggestions
                    suggestionsBox.style.display = 'none'; // Hide suggestions box

                    // Show the details of the selected user
                    detailsBox.innerHTML = `
                        <p><strong>User:</strong> ${user.name || 'N/A'}</p>
                        <p><strong>Current Balance:</strong> ₹${parseFloat(user.balance || 0).toFixed(2)}</p>
                    `;
                    detailsBox.style.display = 'block';
                });
                suggestionsBox.appendChild(item);
            });
            suggestionsBox.style.display = 'block';
        } else {
            suggestionsBox.style.display = 'none';
        }
    });

    // Add a listener to close the suggestions if user clicks elsewhere
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.autocomplete-container')) {
            suggestionsBox.style.display = 'none';
        }
    });
}

/**
 * Sets up quick-add buttons for the credit amount input.
 */
function setupQuickAddButtons() {
    const creditAmountInput = document.getElementById('creditAmount');
    // Use event delegation on the container for efficiency
    document.querySelector('.quick-amount-buttons')?.addEventListener('click', (e) => {
        if (e.target.classList.contains('quick-amount-btn')) {
            // Prevent default button behavior (like form submission)
            e.preventDefault();
            const amount = e.target.dataset.amount;
            if (amount) {
                creditAmountInput.value = amount;
            }
        }
    });
}

// --- Load & Manage Withdrawal Requests ---
function loadWithdrawalRequests() {
    const requestsRef = db.ref('withdrawals');
    const usersRef = db.ref('users');

    requestsRef.on('value', async (snapshot) => {
        const withdrawalRequestsList = document.getElementById('withdrawalRequestsList');
        withdrawalRequestsList.innerHTML = '';
        const allRequests = snapshot.val() || {};
        let hasPendingRequests = false;

        // Fetch all users once to avoid multiple calls inside the loop
        const usersSnapshot = await usersRef.once('value');
        const users = usersSnapshot.val() || {};

        for (const userId in allRequests) {
            const userRequests = allRequests[userId];
            const user = users[userId] || { name: 'Unknown User' };

            for (const requestId in userRequests) {
                const request = userRequests[requestId];

                if (request.status === 'pending') {
                    hasPendingRequests = true;
                    const li = document.createElement('li');
                    const date = new Date(request.requestedAt);
                    const formattedTime = `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`;

                    li.innerHTML = `
                        <div class="withdrawal-info">
                            <span class="user-name">${user.name} - ₹${request.amount}</span>
                            <span class="user-details">UPI: <strong>${request.upi || 'N/A'}</strong></span>
                            <span class="user-details">UID: ${userId} | On: ${formattedTime}</span>
                        </div>
                        <div class="withdrawal-actions">
                            <button class="btn-approve" onclick="approveWithdrawal('${userId}', '${requestId}')">Approve</button>
                            <button class="btn-reject" onclick="rejectWithdrawal('${userId}', '${requestId}')">Reject</button>
                        </div>
                    `;
                    withdrawalRequestsList.appendChild(li);
                }
            }
        }

        if (!hasPendingRequests) {
            withdrawalRequestsList.innerHTML = '<li>No pending requests.</li>';
        }
    });
}

async function approveWithdrawal(userId, requestId) {
    const withdrawalRef = db.ref(`withdrawals/${userId}/${requestId}`);
    const transactionRef = db.ref(`transactions/${userId}`);
    const userRef = db.ref(`users/${userId}`);

    try {
        // Fetch user data and withdrawal data concurrently for efficiency
        const [userSnapshot, withdrawalSnapshot] = await Promise.all([
            userRef.once('value'),
            withdrawalRef.once('value')
        ]);

        const userData = userSnapshot.val();
        const withdrawalData = withdrawalSnapshot.val();

        if (!withdrawalData || withdrawalData.status !== 'pending') {
            alert('This request may have already been processed.');
            return;
        }

        if (!userData) {
            alert('Error: Could not find user data for this request.');
            return;
        }

        // Fetch the UPI from the user's profile, not the request itself
        const upiId = userData.upi || 'NOT FOUND';
        const userName = userData.name || 'Unknown User';
        const amount = withdrawalData.amount;

        // Show a confirmation dialog with the fetched UPI ID for the admin
        const isConfirmed = confirm(
            `Please confirm the following withdrawal:\n\n` +
            `User: ${userName} (UID: ${userId})\n` +
            `Amount: ₹${amount}\n` +
            `UPI ID: ${upiId}\n\n` +
            `Click OK to approve this transaction.`
        );

        if (!isConfirmed) {
            return; // Admin cancelled the action
        }

        // Update withdrawal status
        await withdrawalRef.update({ status: 'approved' });

        // Add a new transaction to notify the user of approval
        await transactionRef.push({
            type: 'debit',
            amount: withdrawalData.amount,
            note: 'Withdrawal Approved',
            timestamp: firebase.database.ServerValue.TIMESTAMP
        });

        alert('Withdrawal approved successfully.');
    } catch (error) {
        console.error("Error approving withdrawal: ", error);
        alert('An error occurred while approving the request.');
    }
}

async function rejectWithdrawal(userId, requestId) {
    const withdrawalRef = db.ref(`withdrawals/${userId}/${requestId}`);
    const userBalanceRef = db.ref(`users/${userId}/balance`);
    const transactionRef = db.ref(`transactions/${userId}`);

    try {
        const withdrawalSnapshot = await withdrawalRef.once('value');
        const withdrawalData = withdrawalSnapshot.val();

        if (!withdrawalData || withdrawalData.status !== 'pending') {
            alert('This request may have already been processed.');
            return;
        }

        // Use a transaction to safely refund the user
        await userBalanceRef.transaction((currentBalance) => {
            return (currentBalance || 0) + parseFloat(withdrawalData.amount);
        });

        // Update withdrawal status to rejected
        await withdrawalRef.update({ status: 'rejected' });

        // Add a transaction to notify the user of rejection and refund
        await transactionRef.push({
            type: 'credit', // It's a credit back to their account
            amount: withdrawalData.amount,
            note: 'Withdrawal Rejected (Amount Refunded)',
            timestamp: firebase.database.ServerValue.TIMESTAMP
        });

        alert('Withdrawal rejected and funds returned to user.');
    } catch (error) {
        console.error("Error rejecting withdrawal: ", error);
        alert('An error occurred while rejecting the request.');
    }
}

// --- Initial Load ---
// Wait for the DOM to be fully loaded before running scripts
document.addEventListener('DOMContentLoaded', () => {
    loadDashboardStats();
    loadUsers();
    loadGlobalTransactions();
    loadWithdrawalRequests();
    setupCreditUserSearch(); // Initialize the search feature
    setupQuickAddButtons(); // Initialize quick-add amount buttons

    // Attach event listener for the add funds button
    document.getElementById('addFundsBtn')?.addEventListener('click', addFunds);

    // Attach event listener for the manage funds toggle button
    document.getElementById('manageFundsBtn')?.addEventListener('click', toggleCreditForm);

    // Attach event listener for the admin logout button
    const adminLogoutBtn = document.getElementById('adminLogoutBtn');
    if (adminLogoutBtn) {
        adminLogoutBtn.addEventListener('click', () => {
            localStorage.removeItem('adminLoggedIn');
            localStorage.removeItem('adminUid');
            window.location.href = 'login.html';
        });
    }
});
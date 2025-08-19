let allUsers = []; // Cache for all users to enable fast searching

function renderUsersTable(usersToRender) {
    const usersTableBody = document.getElementById('allUsersTableBody');
    usersTableBody.innerHTML = ''; // Clear previous entries

    if (usersToRender.length === 0) {
        const row = usersTableBody.insertRow();
        row.innerHTML = `<td colspan="5" style="text-align: center;">No users match your search.</td>`;
        return;
    }

    usersToRender.forEach(user => {
        const row = usersTableBody.insertRow();
        const userName = user.name || 'N/A';
        const userBalance = parseFloat(user.balance || 0).toFixed(2);
        const totalCredits = parseFloat(user.totalCredits || 0).toFixed(2);

        row.innerHTML = `
            <td>${userName}</td>
            <td>${user.uid}</td>
            <td>${userBalance}</td>
            <td>${totalCredits}</td>
            <td class="user-actions">
                <button class="btn-edit" onclick="openEditModal('${user.uid}', '${userName}')">Edit</button>
                <button class="btn-delete" onclick="deleteUser('${user.uid}')">Delete</button>
            </td>
        `;
    });
}

function loadAllUsersData() {
    const usersRef = db.ref('users');
    usersRef.on('value', (snapshot) => {
        const users = snapshot.val() || {};
        
        allUsers = Object.entries(users)
            .map(([uid, data]) => ({ ...data, uid }))
            .sort((a, b) => (b.balance || 0) - (a.balance || 0));

        renderUsersTable(allUsers);
    });
}

function handleSearch() {
    const searchTerm = document.getElementById('userSearchInput').value.toLowerCase();
    const filteredUsers = allUsers.filter(user => 
        user.name.toLowerCase().includes(searchTerm) || 
        user.uid.toLowerCase().includes(searchTerm)
    );
    renderUsersTable(filteredUsers);
}

async function recalculateAllEarnings() {
    const confirmation = confirm(
        "This will scan all transactions for every user and update their 'Total Earnings'. " +
        "This can fix historical data but should only be run if you suspect inconsistencies. " +
        "This may take a few moments. Continue?"
    );

    if (!confirmation) {
        return;
    }

    const recalcButton = document.getElementById('recalculateBtn');
    recalcButton.disabled = true;
    recalcButton.textContent = 'Recalculating...';

    try {
        const usersSnapshot = await db.ref('users').once('value');
        const users = usersSnapshot.val() || {};
        const userIds = Object.keys(users);
        let usersUpdated = 0;

        for (const uid of userIds) {
            const txSnapshot = await db.ref(`transactions/${uid}`).once('value');
            const transactions = txSnapshot.val() || {};
            
            let totalEarnings = 0;
            Object.values(transactions).forEach(tx => {
                if (tx.type === 'credit') {
                    totalEarnings += parseFloat(tx.amount || 0);
                }
            });

            // Update the totalCredits field for the user
            await db.ref(`users/${uid}/totalCredits`).set(totalEarnings);
            usersUpdated++;
        }

        alert(`Recalculation complete! Updated total earnings for ${usersUpdated} users.`);

    } catch (error) {
        console.error("Error during earnings recalculation: ", error);
        alert("An error occurred during recalculation. Check the console for details.");
    } finally {
        recalcButton.disabled = false;
        recalcButton.textContent = 'Recalculate All Earnings';
    }
}

// --- Modal Logic ---
function openEditModal(uid, currentName) {
    document.getElementById('modalUserUid').textContent = uid;
    document.getElementById('modalUserNameInput').value = currentName;
    document.getElementById('editUserModal').style.display = 'flex';

    // Set up the save button's action for this specific user
    document.getElementById('modalSaveButton').onclick = () => saveUserChanges(uid);
}

function closeEditModal() {
    document.getElementById('editUserModal').style.display = 'none';
}

function saveUserChanges(uid) {
    const newNameInput = document.getElementById('modalUserNameInput');
    const newName = newNameInput.value.trim();

    if (!newName) {
        alert('User name cannot be empty.');
        return;
    }

    db.ref(`users/${uid}/name`).set(newName)
        .then(() => {
            alert('User name updated successfully.');
            closeEditModal();
        })
        .catch((error) => {
            console.error("Error updating name: ", error);
            alert('Failed to update user name.');
        });
}

function deleteUser(uid) {
    if (confirm(`Are you sure you want to permanently delete user ${uid} and all their data? This action cannot be undone.`)) {
        console.log(`Attempting to delete user: ${uid}`);
        // To fully delete a user, you would remove them from all relevant database paths.
        // This includes users, transactions, and withdrawals.
        const updates = {};
        updates[`/users/${uid}`] = null;
        updates[`/transactions/${uid}`] = null;
        updates[`/withdrawals/${uid}`] = null;

        db.ref().update(updates)
            .then(() => {
                alert(`User ${uid} and all associated data have been deleted.`);
            })
            .catch((error) => {
                console.error("Error deleting user data: ", error);
                alert(`Error deleting user: ${error.message}`);
            });
    }
}

document.addEventListener('DOMContentLoaded', () => {
    loadAllUsersData();
    document.getElementById('userSearchInput').addEventListener('input', handleSearch);
    // Close modal if user clicks outside the content area
    document.getElementById('editUserModal').addEventListener('click', (e) => {
        if (e.target.id === 'editUserModal') closeEditModal();
    });
});
document.addEventListener('DOMContentLoaded', () => {
    const db = firebase.database();
    const adminsRef = db.ref('admins');

    const adminsTableBody = document.getElementById('adminsTableBody');
    const addAdminBtn = document.getElementById('addAdminBtn');

    // Modal elements
    const editModal = document.getElementById('editAdminModal');
    const modalUid = document.getElementById('modalAdminUid');
    const modalPassInput = document.getElementById('modalAdminPassInput');
    const modalSaveBtn = document.getElementById('modalSaveButton');
    let editingAdminUid = null;

    // Load and display all admins
    function loadAdmins() {
        adminsRef.on('value', (snapshot) => {
            adminsTableBody.innerHTML = '';
            const admins = snapshot.val();
            if (!admins) {
                adminsTableBody.innerHTML = '<tr><td colspan="3" style="text-align: center;">No admins found.</td></tr>';
                return;
            }

            Object.entries(admins).forEach(([uid, adminData]) => {
                const row = adminsTableBody.insertRow();
                row.innerHTML = `
                    <td>${uid}</td>
                    <td>••••••••</td>
                    <td class="user-actions">
                        <button class="btn-edit" onclick="openEditModal('${uid}', '${adminData.password}')">Edit</button>
                        <button class="btn-delete" onclick="deleteAdmin('${uid}')">Delete</button>
                    </td>
                `;
            });
        });
    }

    // Add a new admin
    function addAdmin() {
        const uid = document.getElementById('newAdminUid').value.trim();
        const pass = document.getElementById('newAdminPass').value.trim();

        if (!uid || !pass) {
            alert('Please provide both a UID and a password.');
            return;
        }

        adminsRef.child(uid).set({ password: pass })
            .then(() => {
                alert(`Admin ${uid} added successfully.`);
                document.getElementById('newAdminUid').value = '';
                document.getElementById('newAdminPass').value = '';
            })
            .catch(error => {
                console.error("Error adding admin:", error);
                alert("Failed to add admin.");
            });
    }

    // Delete an admin
    window.deleteAdmin = (uid) => {
        if (confirm(`Are you sure you want to delete admin with UID: ${uid}?`)) {
            adminsRef.child(uid).remove()
                .then(() => alert(`Admin ${uid} deleted.`))
                .catch(error => console.error("Error deleting admin:", error));
        }
    };

    // --- Modal Logic ---
    window.openEditModal = (uid, currentPassword) => {
        editingAdminUid = uid;
        modalUid.textContent = uid;
        modalPassInput.value = currentPassword;
        editModal.style.display = 'flex';
    };

    window.closeEditModal = () => {
        editModal.style.display = 'none';
        editingAdminUid = null;
    };

    function saveAdminChanges() {
        if (!editingAdminUid) return;

        const newPassword = modalPassInput.value.trim();
        if (!newPassword) {
            alert('Password cannot be empty.');
            return;
        }

        adminsRef.child(editingAdminUid).update({ password: newPassword })
            .then(() => {
                alert('Admin password updated successfully.');
                closeEditModal();
            })
            .catch(error => {
                console.error("Error updating admin:", error);
                alert('Failed to update admin password.');
            });
    }

    // Event Listeners
    addAdminBtn.addEventListener('click', addAdmin);
    modalSaveBtn.addEventListener('click', saveAdminChanges);

    // Close modal if clicking outside of it
    window.addEventListener('click', (event) => {
        if (event.target === editModal) {
            closeEditModal();
        }
    });

    // Initial Load
    loadAdmins();
});
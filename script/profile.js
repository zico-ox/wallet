document.addEventListener('DOMContentLoaded', () => {
    const currentUID = localStorage.getItem("wallet_uid");
    const currentName = localStorage.getItem("wallet_name");

    if (!currentUID || !currentName) {
        window.location.href = "login.html";
        return;
    }

    // Display info from localStorage first
    document.getElementById('profileName').textContent = currentName;
    document.getElementById('profileUid').textContent = currentUID;

    // Fetch password from Firebase
    const db = firebase.database();
    db.ref(`users/${currentUID}/password`).once('value')
        .then(snapshot => {
            const password = snapshot.val();
            document.getElementById('profilePass').textContent = password || 'Not set';
        })
        .catch(error => {
            console.error("Error fetching password:", error);
            document.getElementById('profilePass').textContent = 'Error loading';
        });
});
document.addEventListener('DOMContentLoaded', () => {
    // This ensures the script runs after the DOM is fully loaded.
    // It's good practice, though with `onclick` it's not strictly necessary.
});

// --- Form Switching ---
const loginForm = document.getElementById('loginForm');
const registerForm = document.getElementById('registerForm');
const formTitle = document.getElementById('formTitle');

function showRegister() {
    loginForm.classList.add('hidden');
    registerForm.classList.remove('hidden');
    formTitle.textContent = 'Create an Account';
}

function showLogin() {
    registerForm.classList.add('hidden');
    loginForm.classList.remove('hidden');
    formTitle.textContent = 'Login to INR Wallet';
}

// --- Login Logic ---
async function login() {
    const uid = document.getElementById('loginUid').value.trim();
    const pass = document.getElementById('loginPass').value.trim();

    if (!uid || !pass) {
        alert('Please enter both phone number and password.');
        return;
    }

    try {
        // 1. Check if the UID is an admin
        const adminSnapshot = await db.ref('admins/' + uid).once('value');
        if (adminSnapshot.exists()) {
            const adminData = adminSnapshot.val();
            if (adminData.password === pass) {
                // Admin login successful
                console.log('Admin login successful. Redirecting...');
                // Set local storage items to keep the admin logged in across sessions
                localStorage.setItem('adminLoggedIn', 'true');
                localStorage.setItem('adminUid', uid);
                window.location.href = 'admin.html';
                return;
            }
        }

        // 2. If not an admin, check if it's a regular user
        const userSnapshot = await db.ref('users/' + uid).once('value');
        if (userSnapshot.exists()) {
            const userData = userSnapshot.val();
            if (userData.password === pass) {
                // User login successful
                localStorage.setItem('wallet_uid', uid);
                localStorage.setItem('wallet_name', userData.name);
                window.location.href = 'index.html';
                return;
            }
        }

        // 3. If neither check passes, login fails
        alert('Invalid phone number or password.');

    } catch (error) {
        console.error("Login Error:", error);
        alert("An error occurred during login. Please try again.");
    }
}

// --- Registration Logic ---
function register() {
    const name = document.getElementById('regName').value.trim();
    const phone = document.getElementById('regPhone').value.trim();
    const pass = document.getElementById('regPass').value.trim();

    if (!name || !phone || !pass) {
        alert('Please fill in all fields.');
        return;
    }

    if (phone.length < 10) {
        alert('Please enter a valid 10-digit phone number.');
        return;
    }

    const userRef = db.ref('users/' + phone);
    userRef.once('value', (snapshot) => {
        if (snapshot.exists()) {
            alert('A user with this phone number already exists. Please login.');
        } else {
            // Create new user
            userRef.set({
                name: name,
                password: pass,
                balance: 0,
                totalCredits: 0,
                upi: ''
            }).then(() => {
                alert('Registration successful! Logging you in...');
                localStorage.setItem('wallet_uid', phone);
                localStorage.setItem('wallet_name', name);
                window.location.href = 'index.html';
            }).catch(error => {
                console.error("Registration Error:", error);
                alert("An error occurred during registration. Please try again.");
            });
        }
    });
}
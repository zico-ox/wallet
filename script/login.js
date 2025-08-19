document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Elements ---
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    const formTitle = document.getElementById('formTitle');
    const showRegisterLink = document.getElementById('showRegisterLink');
    const showLoginLink = document.getElementById('showLoginLink');
    const messageContainer = document.getElementById('messageContainer');

    // --- Form Switching Logic ---
    showRegisterLink.addEventListener('click', () => {
        loginForm.classList.add('hidden');
        registerForm.classList.remove('hidden');
        formTitle.textContent = 'Create an Account';
        messageContainer.style.display = 'none'; // Hide messages on switch
    });

    showLoginLink.addEventListener('click', () => {
        registerForm.classList.add('hidden');
        loginForm.classList.remove('hidden');
        formTitle.textContent = 'Login';
        messageContainer.style.display = 'none'; // Hide messages on switch
    });

    // --- Event Listeners for Forms ---
    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        login();
    });

    registerForm.addEventListener('submit', (e) => {
        e.preventDefault();
        register();
    });

    // --- UI Helper Functions ---
    /**
     * Toggles the loading state of a button.
     * @param {HTMLButtonElement} button - The button element.
     * @param {boolean} isLoading - Whether to show the loading state.
     */
    function setButtonLoading(button, isLoading) {
        const btnText = button.querySelector('.btn-text');
        const spinner = button.querySelector('.spinner');
        if (isLoading) {
            button.disabled = true;
            btnText.classList.add('hidden');
            spinner.classList.remove('hidden');
        } else {
            button.disabled = false;
            btnText.classList.remove('hidden');
            spinner.classList.add('hidden');
        }
    }

    /**
     * Displays a message to the user.
     * @param {string} message - The message to display.
     * @param {'success' | 'error'} type - The type of message.
     */
    function showMessage(message, type) {
        messageContainer.textContent = message;
        messageContainer.className = `message-container ${type}`;
    }

    // --- Login Logic ---
    async function login() {
        const uidInput = document.getElementById('loginUid');
        const passInput = document.getElementById('loginPass');
        const loginBtn = document.getElementById('loginBtn');

        const uid = uidInput.value.trim();
        const pass = passInput.value.trim();

        if (!uid || !pass) {
            showMessage('Please enter both phone number and password.', 'error');
            return;
        }

        setButtonLoading(loginBtn, true);

        try {
            // 🚨 CRITICAL SECURITY WARNING: Storing and checking passwords in plaintext is
            // extremely insecure. Anyone with database access can see all user passwords.
            // This should be replaced with Firebase Authentication for a production app.

            // 1. Check if the UID is an admin
            const adminSnapshot = await db.ref('admins/' + uid).once('value');
            if (adminSnapshot.exists() && adminSnapshot.val().password === pass) {
                localStorage.setItem('adminLoggedIn', 'true');
                localStorage.setItem('adminUid', uid);
                window.location.href = 'admin.html';
                return; // Stop execution after successful login
            }

            // 2. If not an admin, check if it's a regular user
            const userSnapshot = await db.ref('users/' + uid).once('value');
            if (userSnapshot.exists() && userSnapshot.val().password === pass) {
                const userData = userSnapshot.val();
                localStorage.setItem('wallet_uid', uid);
                localStorage.setItem('wallet_name', userData.name);
                window.location.href = 'index.html';
                return; // Stop execution after successful login
            }

            // 3. If neither check passes, login fails
            showMessage('Invalid phone number or password.', 'error');

        } catch (error) {
            console.error("Login Error:", error);
            showMessage("An error occurred during login. Please try again.", 'error');
        } finally {
            setButtonLoading(loginBtn, false);
        }
    }

    // --- Registration Logic ---
    async function register() {
        const nameInput = document.getElementById('regName');
        const phoneInput = document.getElementById('regPhone');
        const passInput = document.getElementById('regPass');
        const registerBtn = document.getElementById('registerBtn');

        const name = nameInput.value.trim();
        const phone = phoneInput.value.trim();
        const pass = passInput.value.trim();

        if (!name || !phone || !pass) {
            showMessage('Please fill in all fields.', 'error');
            return;
        }

        if (!/^\d{10}$/.test(phone)) {
            showMessage('Please enter a valid 10-digit phone number.', 'error');
            return;
        }

        setButtonLoading(registerBtn, true);

        try {
            const userRef = db.ref('users/' + phone);
            const snapshot = await userRef.once('value');

            if (snapshot.exists()) {
                showMessage('A user with this phone number already exists. Please login.', 'error');
            } else {
                // Create new user
                await userRef.set({
                    name: name,
                    password: pass, // 🚨 INSECURE: Storing plaintext password
                    balance: 0,
                    totalCredits: 0,
                    upi: ''
                });

                showMessage('Registration successful! Logging you in...', 'success');
                
                // Log the user in automatically after registration
                localStorage.setItem('wallet_uid', phone);
                localStorage.setItem('wallet_name', name);
                
                // Add a small delay to allow user to read success message
                setTimeout(() => {
                    window.location.href = 'index.html';
                }, 1500);
            }
        } catch (error) {
            console.error("Registration Error:", error);
            showMessage("An error occurred during registration. Please try again.", 'error');
        } finally {
            // Don't turn off loading if redirecting, unless there's an error
            if (!localStorage.getItem('wallet_uid')) {
                 setButtonLoading(registerBtn, false);
            }
        }
    }
});
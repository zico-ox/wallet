document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Element References ---
    // For TS, you'd cast these: e.g., document.getElementById(...) as HTMLInputElement;
    const withdrawalStatusToggle = document.getElementById('withdrawalStatusToggle');
    const statusLabel = document.getElementById('statusLabel');
    const minWithdrawalAmountInput = document.getElementById('minWithdrawalAmount');
    const apiCreditingToggle = document.getElementById('apiCreditingToggle');
    const apiStatusLabel = document.getElementById('apiStatusLabel');
    const apiSecretKeyInput = document.getElementById('apiSecretKey');
    const toggleApiSecretBtn = document.getElementById('toggleApiSecretBtn');
    const generateApiSecretBtn = document.getElementById('generateApiSecretBtn');
    const saveSettingsBtn = document.getElementById('saveSettingsBtn');

    // Check if all required elements are on the page
    const requiredElements = [
        withdrawalStatusToggle, statusLabel, minWithdrawalAmountInput,
        apiCreditingToggle, apiStatusLabel, apiSecretKeyInput,
        toggleApiSecretBtn, generateApiSecretBtn, saveSettingsBtn
    ];

    if (requiredElements.some(el => !el)) {
        console.error("One or more required HTML elements for the settings page are missing.");
        alert("Error: Page elements could not be found. Cannot initialize settings.");
        return;
    }

    const db = firebase.database();

    // --- Functions ---

    // Function to load all settings from Firebase
    const loadSettings = () => {
        const withdrawalRef = db.ref('settings/withdrawal');
        const apiRef = db.ref('settings/api');

        // Fetch both settings concurrently
        Promise.all([withdrawalRef.once('value'), apiRef.once('value')])
            .then(([withdrawalSnapshot, apiSnapshot]) => {
                // Process withdrawal settings
                const withdrawalSettings = withdrawalSnapshot.val() || {};
                withdrawalStatusToggle.checked = withdrawalSettings.enabled === true;
                minWithdrawalAmountInput.value = withdrawalSettings.minAmount || '';
                updateWithdrawalStatusLabel();

                // Process API settings
                const apiSettings = apiSnapshot.val() || {};
                apiCreditingToggle.checked = apiSettings.enabled === true;
                apiSecretKeyInput.value = apiSettings.secretKey || '';
                updateApiStatusLabel();
            })
            .catch(error => {
                console.error("Error loading settings:", error);
                alert("Could not load settings from the database.");
            });
    };

    // Function to save all settings to Firebase
    const saveSettings = () => {
        const minAmount = parseFloat(minWithdrawalAmountInput.value);
        if (isNaN(minAmount) || minAmount < 0) {
            alert("Please enter a valid, non-negative minimum withdrawal amount.");
            return;
        }

        const withdrawalSettings = {
            enabled: withdrawalStatusToggle.checked,
            minAmount: minAmount
        };

        const apiSettings = {
            enabled: apiCreditingToggle.checked,
            secretKey: apiSecretKeyInput.value.trim()
        };

        if (apiSettings.enabled && !apiSettings.secretKey) {
            alert('Please generate an API Secret Key before enabling API crediting.');
            return;
        }

        // Use a single update operation for atomicity
        const updates = {
            '/settings/withdrawal': withdrawalSettings,
            '/settings/api': apiSettings
        };

        db.ref().update(updates)
            .then(() => {
                alert('Settings saved successfully!');
            })
            .catch((error) => {
                console.error('Error saving settings:', error);
                alert('Failed to save settings. See console for details.');
            });
    };

    // Function to generate a secure random API key
    const generateApiKey = () => {
        // crypto.randomUUID() is a modern, standard way to create a strong unique ID
        const newKey = crypto.randomUUID();
        apiSecretKeyInput.value = newKey;
        apiSecretKeyInput.type = 'password';
        toggleApiSecretBtn.textContent = 'Show';
    };

    // Function to toggle API key visibility
    const toggleApiSecretVisibility = () => {
        const isPassword = apiSecretKeyInput.type === 'password';
        apiSecretKeyInput.type = isPassword ? 'text' : 'password';
        toggleApiSecretBtn.textContent = isPassword ? 'Hide' : 'Show';
    };

    // UI Update Functions
    const updateWithdrawalStatusLabel = () => {
        statusLabel.textContent = withdrawalStatusToggle.checked ? 'Enabled' : 'Disabled';
        statusLabel.style.color = withdrawalStatusToggle.checked ? '#28a745' : '#c62828';
    };

    const updateApiStatusLabel = () => {
        apiStatusLabel.textContent = apiCreditingToggle.checked ? 'Enabled' : 'Disabled';
        apiStatusLabel.style.color = apiCreditingToggle.checked ? '#28a745' : '#c62828';
    };

    // --- Event Listeners ---
    withdrawalStatusToggle.addEventListener('change', updateWithdrawalStatusLabel);
    apiCreditingToggle.addEventListener('change', updateApiStatusLabel);
    saveSettingsBtn.addEventListener('click', saveSettings);
    generateApiSecretBtn.addEventListener('click', generateApiKey);
    toggleApiSecretBtn.addEventListener('click', toggleApiSecretVisibility);

    // --- Initial Load ---
    loadSettings();
});
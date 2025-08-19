document.addEventListener('DOMContentLoaded', function () {
    const db = firebase.database();
    const allTransactionsTableBody = document.getElementById('allTransactionsTableBody');
    const searchInput = document.getElementById('txSearchInput');
    const exportPdfBtn = document.getElementById('exportPdfBtn');

    // This will hold a copy of all transactions for client-side searching
    let allTransactions = [];

    /**
     * Renders a list of transaction objects into the table.
     * @param {Array<Object>} transactions - The transactions to display.
     */
    function renderTransactions(transactions) {
        allTransactionsTableBody.innerHTML = ''; // Clear the "Loading..." or previous data

        if (!transactions || transactions.length === 0) {
            allTransactionsTableBody.innerHTML = '<tr><td colspan="6" style="text-align: center;">No transactions found.</td></tr>';
            return;
        }

        transactions.forEach(tx => {
            const row = document.createElement('tr');

            // Use the CSS classes from admin.css for styling credit/debit types
            const typeClass = tx.type === 'credit' ? 'tx-type-credit' : 'tx-type-debit';
            const amountSign = tx.type === 'credit' ? '+' : '-';

            row.innerHTML = `
                <td>${new Date(tx.timestamp).toLocaleString()}</td>
                <td>${tx.uid || 'N/A'}</td>
                <td><span class="${typeClass}">${tx.type}</span></td>
                <td>${amountSign} ₹${parseFloat(tx.amount).toFixed(2)}</td>
                <td>${tx.note || 'No details'}</td>
                <td>${tx.status || 'Completed'}</td>
            `;
            allTransactionsTableBody.appendChild(row);
        });
    }

    /**
     * Fetches all transactions from the 'global_transactions' node in Firebase.
     */
    function fetchTransactions() {
        // Point to the correct 'transactions' node which contains nested data by user ID.
        const transactionsRef = db.ref('transactions');
        transactionsRef.on('value', (snapshot) => {
            const allUserTransactions = snapshot.val();
            let flattenedTxs = [];

            if (allUserTransactions) {
                // Iterate over each user's transactions (e.g., '1234567890')
                Object.keys(allUserTransactions).forEach(uid => {
                    const userTxs = allUserTransactions[uid];
                    // Iterate over each transaction for the user (e.g., '-Nq...abc')
                    Object.keys(userTxs).forEach(txId => {
                        flattenedTxs.push({
                            id: txId,
                            uid: uid, // Add the UID to the transaction object for display
                            ...userTxs[txId]
                        });
                    });
                });
            }

            // Sort all collected transactions by timestamp, showing the newest first.
            allTransactions = flattenedTxs.sort((a, b) => b.timestamp - a.timestamp);
            
            renderTransactions(allTransactions);

        }, (error) => {
            console.error("Error fetching transactions:", error);
            allTransactionsTableBody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: red;">Error loading data. See console for details.</td></tr>';
        });
    }

    // Add an event listener to the search input field
    searchInput.addEventListener('input', () => {
        const searchTerm = searchInput.value.toLowerCase().trim();

        const filteredTransactions = allTransactions.filter(tx => {
            const searchCorpus = `${tx.uid || ''} ${tx.type || ''} ${tx.note || ''}`.toLowerCase();
            return searchCorpus.includes(searchTerm);
        });

        renderTransactions(filteredTransactions);
    });

    /**
     * Exports the current list of all transactions to a PDF file.
     */
    function exportToPdf() {
        if (allTransactions.length === 0) {
            alert('No transaction data to export.');
            return;
        }

        // Ensure jsPDF is loaded from the CDN
        const { jsPDF } = window.jspdf;
        if (!jsPDF) {
            alert('PDF generation library is not loaded. Please try again.');
            return;
        }

        const doc = new jsPDF();

        doc.text('Transaction History', 14, 16);

        const tableColumn = ["Date & Time", "User (UID)", "Type", "Amount (₹)", "Note", "Status"];
        const tableRows = [];

        allTransactions.forEach(tx => {
            const txData = [
                new Date(tx.timestamp).toLocaleString(),
                tx.uid || 'N/A',
                tx.type,
                `${tx.type === 'credit' ? '+' : '-'} ${parseFloat(tx.amount).toFixed(2)}`,
                tx.note || 'No details',
                tx.status || 'Completed'
            ];
            tableRows.push(txData);
        });

        doc.autoTable(tableColumn, tableRows, { startY: 20 });
        doc.save(`transaction-history-${new Date().toISOString().slice(0, 10)}.pdf`);
    }

    // Attach event listener for the export button
    exportPdfBtn.addEventListener('click', exportToPdf);

    // Initial fetch of data when the page loads
    fetchTransactions();
});
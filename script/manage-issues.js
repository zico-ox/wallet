document.addEventListener('DOMContentLoaded', () => {
    const db = firebase.database();
    const issuesTableBody = document.getElementById('issuesTableBody');

    function loadIssues() {
        const issuesRef = db.ref('issues').orderByChild('timestamp');
        issuesRef.on('value', (snapshot) => {
            issuesTableBody.innerHTML = ''; // Clear existing data
            const issues = snapshot.val();

            if (!issues) {
                issuesTableBody.innerHTML = '<tr><td colspan="5" style="text-align: center;">No issues submitted.</td></tr>';
                return;
            }

            // Convert to array and sort so newest are first
            const issuesArray = Object.entries(issues)
                .map(([key, value]) => ({ id: key, ...value }))
                .sort((a, b) => b.timestamp - a.timestamp);

            issuesArray.forEach(issue => {
                const row = document.createElement('tr');
                const date = new Date(issue.timestamp).toLocaleString();
                const statusClass = `status-${issue.status}`; // e.g., status-pending

                row.innerHTML = `
                    <td>${date}</td>
                    <td>${issue.userName} (${issue.userUid})</td>
                    <td class="issue-text">${issue.issueText}</td>
                    <td><span class="status-badge ${statusClass}">${issue.status}</span></td>
                    <td class="issue-actions">
                        ${issue.status === 'pending' ? `<button class="btn-approve" data-id="${issue.id}">Mark as Resolved</button>` : ''}
                        <button class="btn-delete" data-id="${issue.id}">Delete</button>
                    </td>
                `;
                issuesTableBody.appendChild(row);
            });
        });
    }

    function updateIssueStatus(issueId, newStatus) {
        db.ref(`issues/${issueId}`).update({ status: newStatus })
            .then(() => console.log(`Issue ${issueId} marked as ${newStatus}`))
            .catch(error => console.error(`Error updating issue ${issueId}:`, error));
    }

    function deleteIssue(issueId) {
        if (confirm('Are you sure you want to delete this issue? This cannot be undone.')) {
            db.ref(`issues/${issueId}`).remove()
                .then(() => console.log(`Issue ${issueId} deleted.`))
                .catch(error => console.error(`Error deleting issue ${issueId}:`, error));
        }
    }

    // Event delegation for action buttons
    issuesTableBody.addEventListener('click', (e) => {
        const target = e.target;
        const issueId = target.dataset.id;

        if (!issueId) return;

        if (target.classList.contains('btn-approve')) {
            updateIssueStatus(issueId, 'resolved');
        } else if (target.classList.contains('btn-delete')) {
            deleteIssue(issueId);
        }
    });

    loadIssues();
});
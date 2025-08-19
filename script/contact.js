document.addEventListener('DOMContentLoaded', () => {
    const currentUID = localStorage.getItem("wallet_uid");
    const currentName = localStorage.getItem("wallet_name");

    if (!currentUID || !currentName) {
        window.location.href = "login.html";
        return;
    }

    const db = firebase.database();
    const submitIssueBtn = document.getElementById('submitIssueBtn');
    const issueText = document.getElementById('issueText');
    const whatsappLink = document.getElementById('whatsappLink');

    // Setup WhatsApp link
    const whatsappNumber = '9656514372';
    const whatsappMessage = encodeURIComponent(`Hi, I am ${currentName}, need support.`);
    whatsappLink.href = `https://wa.me/${whatsappNumber}?text=${whatsappMessage}`;

    // Handle issue submission
    submitIssueBtn.addEventListener('click', () => {
        const issue = issueText.value.trim();
        if (!issue) {
            alert('Please describe your issue before submitting.');
            return;
        }

        const issueData = {
            userUid: currentUID,
            userName: currentName,
            issueText: issue,
            timestamp: firebase.database.ServerValue.TIMESTAMP,
            status: 'pending'
        };

        // Push to a new 'issues' node in Firebase
        db.ref('issues').push(issueData).then(() => {
            alert('Your issue has been submitted successfully!');
            issueText.value = '';
        }).catch(error => {
            console.error('Error submitting issue:', error);
            alert('An error occurred while submitting your issue. Please try again.');
        });
    });
});

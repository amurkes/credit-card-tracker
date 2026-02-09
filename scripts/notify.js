/**
 * Send Windows notifications from Node.js
 * Usage: node scripts/notify.js "Title" "Message"
 */

import { exec } from 'child_process';

const title = process.argv[2] || '[Kilo] Notification';
const message = process.argv[3] || 'Task complete';

// Escape quotes for PowerShell
const safeTitle = title.replace(/"/g, '\\"');
const safeMessage = message.replace(/"/g, '\\"');

const psCommand = `powershell -Command "New-BurntToastNotification -Text '${safeTitle}', '${safeMessage}' -UniqueIdentifier 'KiloNotify-$(Get-Random)'"`;

exec(psCommand, (error) => {
    if (error) {
        console.error('Notification failed:', error.message);
    } else {
        console.log('Notification sent:', title, '-', message);
    }
});

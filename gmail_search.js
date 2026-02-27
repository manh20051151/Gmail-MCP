const fs = require('fs');
const path = require('path');
const { google } = require('googleapis');
const os = require('os');

const GMAIL_MCP_DIR = path.join(os.homedir(), '.gmail-mcp');
const CREDENTIALS_PATH = path.join(GMAIL_MCP_DIR, 'credentials.json');
const OAUTH_KEYS_PATH = path.join(GMAIL_MCP_DIR, 'gcp-oauth.keys.json');

async function main() {
    // Load OAuth keys
    const oauthKeys = JSON.parse(fs.readFileSync(OAUTH_KEYS_PATH, 'utf8'));
    const keyData = oauthKeys.installed || oauthKeys.web;

    // Load saved credentials
    const savedCreds = JSON.parse(fs.readFileSync(CREDENTIALS_PATH, 'utf8'));

    const oauth2Client = new google.auth.OAuth2(
        keyData.client_id,
        keyData.client_secret,
        keyData.redirect_uris ? keyData.redirect_uris[0] : 'http://localhost:3000/oauth2callback'
    );

    oauth2Client.setCredentials(savedCreds);

    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

    // Tìm email ứng tuyển trong Sent
    console.log('=== TÌM EMAIL ỨNG TUYỂN TRONG SENT ===\n');

    const queries = [
        'in:sent ứng tuyển',
        'in:sent apply',
        'in:sent application',
        'in:sent CV',
        'in:sent resume',
        'in:sent xin việc',
        'in:sent tuyển dụng',
    ];

    let allMessages = [];

    for (const q of queries) {
        try {
            const res = await gmail.users.messages.list({
                userId: 'me',
                q: q,
                maxResults: 10
            });
            if (res.data.messages) {
                allMessages = allMessages.concat(res.data.messages);
                console.log(`Query "${q}": tìm thấy ${res.data.messages.length} email`);
            } else {
                console.log(`Query "${q}": không tìm thấy`);
            }
        } catch (e) {
            console.log(`Query "${q}": lỗi - ${e.message}`);
        }
    }

    // Loại trùng
    const uniqueIds = [...new Set(allMessages.map(m => m.id))];
    console.log(`\n=== TỔNG: ${uniqueIds.length} email unique ===\n`);

    // Lấy chi tiết từng email
    for (const id of uniqueIds.slice(0, 10)) {
        try {
            const msg = await gmail.users.messages.get({
                userId: 'me',
                id: id,
                format: 'full'
            });

            const headers = msg.data.payload.headers;
            const subject = headers.find(h => h.name === 'Subject')?.value || '(no subject)';
            const to = headers.find(h => h.name === 'To')?.value || '';
            const date = headers.find(h => h.name === 'Date')?.value || '';
            const from = headers.find(h => h.name === 'From')?.value || '';

            // Lấy body - xử lý nhiều cấp
            let body = '';
            const extractBody = (payload) => {
                if (payload.body && payload.body.data) {
                    return Buffer.from(payload.body.data, 'base64').toString('utf8');
                }
                if (payload.parts) {
                    for (const part of payload.parts) {
                        if (part.mimeType === 'text/plain' && part.body && part.body.data) {
                            return Buffer.from(part.body.data, 'base64').toString('utf8');
                        }
                    }
                    for (const part of payload.parts) {
                        const result = extractBody(part);
                        if (result) return result;
                    }
                }
                return '';
            };
            body = extractBody(msg.data.payload);

            const first10words = body.trim().replace(/\s+/g, ' ').split(' ').slice(0, 10).join(' ');

            console.log('---');
            console.log(`ID: ${id}`);
            console.log(`ThreadId: ${msg.data.threadId}`);
            console.log(`From: ${from}`);
            console.log(`To: ${to}`);
            console.log(`Subject: ${subject}`);
            console.log(`Date: ${date}`);
            console.log(`10 từ đầu: "${first10words}"`);
        } catch (e) {
            console.log(`ID ${id}: lỗi - ${e.message}`);
        }
    }
}

main().catch(console.error);

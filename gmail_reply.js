const fs = require('fs');
const path = require('path');
const { google } = require('googleapis');
const os = require('os');

const GMAIL_MCP_DIR = path.join(os.homedir(), '.gmail-mcp');
const CREDENTIALS_PATH = path.join(GMAIL_MCP_DIR, 'credentials.json');
const OAUTH_KEYS_PATH = path.join(GMAIL_MCP_DIR, 'gcp-oauth.keys.json');

async function main() {
    const oauthKeys = JSON.parse(fs.readFileSync(OAUTH_KEYS_PATH, 'utf8'));
    const keyData = oauthKeys.installed || oauthKeys.web;
    const savedCreds = JSON.parse(fs.readFileSync(CREDENTIALS_PATH, 'utf8'));

    const oauth2Client = new google.auth.OAuth2(
        keyData.client_id,
        keyData.client_secret,
        keyData.redirect_uris ? keyData.redirect_uris[0] : 'http://localhost:3000/oauth2callback'
    );
    oauth2Client.setCredentials(savedCreds);
    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

    // Email ứng tuyển mới nhất đã tìm được:
    const targetMessageId = '19c98fc7514f75e5';
    const targetThreadId = '19c98fa7b55dda11';
    const originalTo = 'vina@hanbiro.com';
    const originalSubject = 'Thực tập sinh lập trình web - Nguyễn Viết Mạnh';
    const originalDate = 'Thu, 26 Feb 2026 15:06:42 +0700';

    // Lấy Message-ID gốc để dùng In-Reply-To
    const msg = await gmail.users.messages.get({
        userId: 'me',
        id: targetMessageId,
        format: 'metadata',
        metadataHeaders: ['Message-ID', 'From', 'To', 'Subject', 'Date']
    });
    const headers = msg.data.payload.headers;
    const originalMessageId = headers.find(h => h.name === 'Message-ID')?.value || '';
    const senderFrom = headers.find(h => h.name === 'From')?.value || 'nguyenvietmanh1409@gmail.com';

    console.log('=== THÔNG TIN EMAIL GỐC ===');
    console.log(`Message-ID: ${originalMessageId}`);
    console.log(`From: ${senderFrom}`);
    console.log(`To: ${originalTo}`);
    console.log(`Subject: ${originalSubject}`);
    console.log(`Date: ${originalDate}`);

    // Tạo nội dung reply
    const replyBody = `Kính gửi anh/chị tại ${originalTo},

Đây là email reply được gửi tự động qua Gmail MCP (Model Context Protocol) tích hợp với Antigravity AI Assistant.

Xác nhận: Email ứng tuyển vị trí "Thực tập sinh lập trình web" đã được gửi thành công vào lúc ${originalDate}.

Trân trọng,
Nguyễn Viết Mạnh
(Reply gửi qua Gmail MCP - không qua Gmail UI)`;

    // Tạo email theo định dạng RFC 2822
    const replySubject = `Re: ${originalSubject}`;
    const emailLines = [
        `From: ${senderFrom}`,
        `To: ${originalTo}`,
        `Subject: ${replySubject}`,
        `In-Reply-To: ${originalMessageId}`,
        `References: ${originalMessageId}`,
        `Content-Type: text/plain; charset=utf-8`,
        ``,
        replyBody
    ];

    const rawEmail = emailLines.join('\r\n');
    const encodedEmail = Buffer.from(rawEmail).toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');

    console.log('\n=== GỬI REPLY QUA GMAIL MCP ===');

    try {
        const sentReply = await gmail.users.messages.send({
            userId: 'me',
            requestBody: {
                raw: encodedEmail,
                threadId: targetThreadId
            }
        });

        console.log('✅ Reply đã được gửi thành công!');
        console.log(`Reply Message ID: ${sentReply.data.id}`);
        console.log(`Thread ID: ${sentReply.data.threadId}`);
        console.log(`Trạng thái: ${sentReply.data.labelIds?.join(', ')}`);
    } catch (err) {
        console.error('❌ Lỗi khi gửi reply:', err.message);
        if (err.response) {
            console.error('Response data:', JSON.stringify(err.response.data, null, 2));
        }
    }
}

main().catch(console.error);

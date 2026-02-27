/**
 * gmail_tool.js  –  Antigravity + Gmail MCP
 * Chạy: node gmail_tool.js
 */
const fs = require('fs');
const path = require('path');
const readline = require('readline');
const { google } = require('googleapis');
const os = require('os');

// ═══════════════════════════════════════════════════════════════════
// ⚙️  CẤU HÌNH – Chỉnh tại đây để thay đổi hành vi tìm kiếm
// ═══════════════════════════════════════════════════════════════════
const CONFIG = {
    /** Số email tối đa trả về (Gmail API max 500) */
    maxResults: 10,

    /**
     * Query Gmail (cú pháp giống ô tìm kiếm Gmail)
     * Ví dụ:
     *   "in:sent subject:ứng tuyển"
     *   "in:sent subject:CV has:attachment"
     *   "in:sent to:hr@company.com subject:ứng tuyển"
     *   "in:sent subject:ứng tuyển after:2024/01/01 before:2025/01/01"
     */
    query: "in:sent subject:ứng tuyển OR subject:xin việc OR subject:application OR subject:CV",
};

// ── Màu terminal (ANSI) ──────────────────────────────────────────────────────
const C = {
    reset: '\x1b[0m',
    bold: '\x1b[1m',
    dim: '\x1b[2m',
    cyan: '\x1b[36m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    red: '\x1b[31m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    white: '\x1b[97m',
    bgBlue: '\x1b[44m',
    bgGreen: '\x1b[42m',
};

const GMAIL_MCP_DIR = path.join(os.homedir(), '.gmail-mcp');
const CREDENTIALS_PATH = path.join(GMAIL_MCP_DIR, 'credentials.json');
const OAUTH_KEYS_PATH = path.join(GMAIL_MCP_DIR, 'gcp-oauth.keys.json');

// ── Helpers ──────────────────────────────────────────────────────────────────
function prompt(question) {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    return new Promise(r => rl.question(question, ans => { rl.close(); r(ans.trim()); }));
}

function extractBody(payload) {
    if (payload.body?.data)
        return Buffer.from(payload.body.data, 'base64').toString('utf8');
    if (payload.parts) {
        for (const p of payload.parts)
            if (p.mimeType === 'text/plain' && p.body?.data)
                return Buffer.from(p.body.data, 'base64').toString('utf8');
        for (const p of payload.parts) {
            const r = extractBody(p);
            if (r) return r;
        }
    }
    return '';
}

/** Lấy 10 từ đầu từ body email */
function getFirst10Words(text) {
    return text.trim().replace(/\s+/g, ' ').split(' ').slice(0, 10).join(' ');
}

/** Format ngày giờ sang giờ Việt Nam */
function formatDate(dateHeader) {
    return new Date(dateHeader).toLocaleString('vi-VN', {
        timeZone: 'Asia/Ho_Chi_Minh',
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit', second: '2-digit',
    });
}

function divider(char = '─', len = 58) {
    return C.dim + char.repeat(len) + C.reset;
}

function step(n, label) {
    console.log(`\n${C.bgBlue}${C.white}${C.bold}  BƯỚC ${n}  ${C.reset} ${C.bold}${C.cyan}${label}${C.reset}`);
    console.log(divider());
}

function log(icon, label, value) {
    const pad = ' '.repeat(Math.max(0, 12 - label.length));
    console.log(`  ${icon} ${C.bold}${label}${C.reset}${pad}: ${C.white}${value}${C.reset}`);
}

// ── Main ─────────────────────────────────────────────────────────────────────
async function main() {
    // ── Banner ──────────────────────────────────────────────────────────────
    console.log('\n' + C.bold + C.cyan +
        '╔══════════════════════════════════════════════════════════╗\n' +
        '║         ANTIGRAVITY  +  GMAIL MCP  TOOL                  ║\n' +
        '║         Tìm email ứng tuyển – Xem chi tiết – Reply       ║\n' +
        '╚══════════════════════════════════════════════════════════╝' +
        C.reset + '\n');

    // ── Khởi tạo Gmail API ──────────────────────────────────────────────────
    const oauthKeys = JSON.parse(fs.readFileSync(OAUTH_KEYS_PATH, 'utf8'));
    const keyData = oauthKeys.installed || oauthKeys.web;
    const savedCreds = JSON.parse(fs.readFileSync(CREDENTIALS_PATH, 'utf8'));

    const oauth2Client = new google.auth.OAuth2(
        keyData.client_id,
        keyData.client_secret,
        keyData.redirect_uris?.[0] || 'http://localhost:3000/oauth2callback'
    );
    oauth2Client.setCredentials(savedCreds);
    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
    console.log(`  ${C.green}✔ Đã kết nối Gmail API${C.reset}`);

    // ══════════════════════════════════════════════════════════════════════════
    // BƯỚC 1 – Nhập tiêu đề & Tìm email ứng tuyển đã gửi
    // ══════════════════════════════════════════════════════════════════════════
    step(1, 'Tìm email ứng tuyển (mcp_gmail_search_emails)');

    const inputTitle = await prompt(`  ${C.yellow}🔍 Nhập tiêu đề (subject) cần tìm${C.reset} [Enter để dùng mặc định]: `);
    const searchQuery = inputTitle
        ? `in:sent subject:${inputTitle}`
        : CONFIG.query;

    console.log(`\n  ${C.yellow}▶ Query     ${C.reset}: ${searchQuery}`);
    console.log(`  ${C.yellow}▶ maxResults${C.reset}: ${CONFIG.maxResults}\n`);

    const searchRes = await gmail.users.messages.list({
        userId: 'me',
        q: searchQuery,
        maxResults: CONFIG.maxResults,
    });

    if (!searchRes.data.messages?.length) {
        console.log(`  ${C.red}⚠  Không tìm thấy email nào khớp.${C.reset}`);
        process.exit(0);
    }
    console.log(`  ${C.green}✔ Tìm thấy ${searchRes.data.messages.length} email${C.reset}`);

    // ══════════════════════════════════════════════════════════════════════════
    // BƯỚC 2 – Đọc chi tiết từng email ứng tuyển
    // ══════════════════════════════════════════════════════════════════════════
    step(2, 'Đọc chi tiết email (mcp_gmail_read_email)');

    const emails = [];
    for (const m of searchRes.data.messages) {
        process.stdout.write(`  ${C.dim}→ Đang đọc ID ${m.id}...${C.reset}\r`);
        const msg = await gmail.users.messages.get({ userId: 'me', id: m.id, format: 'full' });
        const hdrs = msg.data.payload.headers;
        const get = name => hdrs.find(h => h.name === name)?.value || '';
        const body = extractBody(msg.data.payload);

        emails.push({
            id: m.id,
            threadId: msg.data.threadId,
            subject: get('Subject') || '(no subject)',
            to: get('To'),
            from: get('From'),
            date: get('Date'),
            msgId: get('Message-ID'),
            first10: getFirst10Words(body),
            body,
        });
    }

    // Xoá dòng "đang đọc"
    process.stdout.write(' '.repeat(60) + '\r');

    emails.forEach((e, i) => {
        console.log(`\n  ${C.bold}${C.magenta}[${i + 1}]${C.reset} ${C.bold}${e.subject}${C.reset}`);
        log('📅', 'Ngày gửi', formatDate(e.date));
        log('📧', 'Gửi đến', e.to);
        log('💬', '10 từ đầu', `"${e.first10}"`);
    });

    // ══════════════════════════════════════════════════════════════════════════
    // BƯỚC 3 – Chọn email ứng tuyển để lấy nội dung
    // ══════════════════════════════════════════════════════════════════════════
    step(3, 'Chọn email ứng tuyển để lấy nội dung');

    const choiceSent = await prompt(`\n  📌 Chọn số email ứng tuyển muốn dùng (1-${emails.length}): `);
    const idxSent = parseInt(choiceSent, 10) - 1;
    if (isNaN(idxSent) || idxSent < 0 || idxSent >= emails.length) {
        console.log(`\n  ${C.red}❌ Lựa chọn không hợp lệ!${C.reset}`);
        process.exit(1);
    }

    const selSent = emails[idxSent];
    console.log(`\n  ${C.green}✔ Đã chọn email ứng tuyển: "${selSent.subject}"${C.reset}`);
    console.log(divider());

    // Nội dung sẽ dùng để reply
    const replyBody =
        `Email ứng tuyển đã gửi vào lúc: ${formatDate(selSent.date)}\n` +
        `10 từ đầu tiên: "${selSent.first10}"`;

    console.log(`\n  ${C.cyan}📝 Nội dung sẽ dùng để reply:${C.reset}\n`);
    replyBody.split('\n').forEach(l => console.log(`  ${C.dim}│${C.reset} ${l}`));

    // ══════════════════════════════════════════════════════════════════════════
    // BƯỚC 4 – Tìm email cần reply (email nhận được)
    // ══════════════════════════════════════════════════════════════════════════
    step(4, 'Tìm email cần reply (mcp_gmail_search_emails)');

    const replyTitle = await prompt(`\n  ${C.yellow}🔍 Nhập tiêu đề email cần reply${C.reset} [Enter để tìm tất cả inbox]: `);
    const replyQuery = replyTitle
        ? `subject:${replyTitle}`
        : 'in:inbox';

    console.log(`\n  ${C.yellow}▶ Query     ${C.reset}: ${replyQuery}`);
    console.log(`  ${C.yellow}▶ maxResults${C.reset}: ${CONFIG.maxResults}\n`);

    const replySearchRes = await gmail.users.messages.list({
        userId: 'me',
        q: replyQuery,
        maxResults: CONFIG.maxResults,
    });

    if (!replySearchRes.data.messages?.length) {
        console.log(`  ${C.red}⚠  Không tìm thấy email nào khớp để reply.${C.reset}`);
        process.exit(0);
    }
    console.log(`  ${C.green}✔ Tìm thấy ${replySearchRes.data.messages.length} email${C.reset}`);

    // ── Đọc chi tiết các email tìm được ──────────────────────────────────────
    const replyEmails = [];
    for (const m of replySearchRes.data.messages) {
        process.stdout.write(`  ${C.dim}→ Đang đọc ID ${m.id}...${C.reset}\r`);
        const msg = await gmail.users.messages.get({ userId: 'me', id: m.id, format: 'full' });
        const hdrs = msg.data.payload.headers;
        const get = name => hdrs.find(h => h.name === name)?.value || '';

        replyEmails.push({
            id: m.id,
            threadId: msg.data.threadId,
            subject: get('Subject') || '(no subject)',
            from: get('From'),
            to: get('To'),
            date: get('Date'),
            msgId: get('Message-ID'),
        });
    }

    process.stdout.write(' '.repeat(60) + '\r');

    replyEmails.forEach((e, i) => {
        console.log(`\n  ${C.bold}${C.magenta}[${i + 1}]${C.reset} ${C.bold}${e.subject}${C.reset}`);
        log('📅', 'Ngày nhận', formatDate(e.date));
        log('👤', 'Từ', e.from);
    });

    // ══════════════════════════════════════════════════════════════════════════
    // BƯỚC 5 – Chọn email sẽ reply
    // ══════════════════════════════════════════════════════════════════════════
    step(5, 'Chọn email để reply');

    const choiceReply = await prompt(`\n  📌 Chọn số email muốn reply (1-${replyEmails.length}): `);
    const idxReply = parseInt(choiceReply, 10) - 1;
    if (isNaN(idxReply) || idxReply < 0 || idxReply >= replyEmails.length) {
        console.log(`\n  ${C.red}❌ Lựa chọn không hợp lệ!${C.reset}`);
        process.exit(1);
    }

    const sel = replyEmails[idxReply];
    console.log(`\n  ${C.green}✔ Sẽ reply vào email: "${sel.subject}"${C.reset}`);
    console.log(`  ${C.green}✔ Từ: ${sel.from}${C.reset}`);
    console.log(divider());

    // ══════════════════════════════════════════════════════════════════════════
    // BƯỚC 6 – Chọn ảnh từ thư mục để đính kèm
    // ══════════════════════════════════════════════════════════════════════════
    step(6, 'Chọn ảnh đính kèm từ thư mục');

    const imgDir = await prompt(`\n  📁 Nhập đường dẫn thư mục chứa ảnh [Enter để dùng thư mục hiện tại]: `);
    const targetDir = imgDir || process.cwd();

    const IMG_EXTS = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp'];
    let imgFiles = [];
    try {
        imgFiles = fs.readdirSync(targetDir)
            .filter(f => IMG_EXTS.includes(path.extname(f).toLowerCase()))
            .map(f => ({ name: f, fullPath: path.join(targetDir, f) }));
    } catch (e) {
        console.log(`  ${C.red}❌ Không thể đọc thư mục: ${e.message}${C.reset}`);
    }

    let attachPath = null;
    let attachName = null;

    if (imgFiles.length === 0) {
        console.log(`  ${C.yellow}⚠  Không tìm thấy file ảnh nào trong thư mục. Email sẽ không có đính kèm.${C.reset}`);
    } else {
        console.log(`\n  ${C.green}✔ Tìm thấy ${imgFiles.length} file ảnh:${C.reset}\n`);
        imgFiles.forEach((f, i) => {
            const size = (fs.statSync(f.fullPath).size / 1024).toFixed(1);
            console.log(`  ${C.magenta}[${i + 1}]${C.reset} ${f.name} ${C.dim}(${size} KB)${C.reset}`);
        });

        const imgChoice = await prompt(`\n  🖼  Chọn số ảnh để đính kèm (1-${imgFiles.length}) [Enter để bỏ qua]: `);
        const imgIdx = parseInt(imgChoice, 10) - 1;

        if (!isNaN(imgIdx) && imgIdx >= 0 && imgIdx < imgFiles.length) {
            attachPath = imgFiles[imgIdx].fullPath;
            attachName = imgFiles[imgIdx].name;
            console.log(`\n  ${C.green}✔ Đã chọn ảnh: ${attachName}${C.reset}`);
        } else if (imgChoice !== '') {
            console.log(`  ${C.yellow}⚠  Bỏ qua đính kèm ảnh.${C.reset}`);
        }
    }

    // ── Tạo MIME message ──────────────────────────────────────────────────────
    // Reply vào email nhận được (sel), dùng nội dung từ email đã gửi (selSent)
    const replySubject = sel.subject.startsWith('Re:') ? sel.subject : `Re: ${sel.subject}`;
    const boundary = `boundary_${Date.now()}_${Math.random().toString(36).slice(2)}`;

    // Địa chỉ người nhận = người đã gửi email cho mình
    const replyTo = sel.from;

    let rawString;
    if (attachPath) {
        const imgData = fs.readFileSync(attachPath);
        const imgB64 = imgData.toString('base64');
        const ext = path.extname(attachName).slice(1).toLowerCase();
        const mimeType = ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg'
            : ext === 'png' ? 'image/png'
                : ext === 'gif' ? 'image/gif'
                    : ext === 'webp' ? 'image/webp'
                        : 'application/octet-stream';

        rawString = [
            `To: ${replyTo}`,
            `Subject: ${replySubject}`,
            `In-Reply-To: ${sel.msgId}`,
            `References: ${sel.msgId}`,
            `MIME-Version: 1.0`,
            `Content-Type: multipart/mixed; boundary="${boundary}"`,
            ``,
            `--${boundary}`,
            `Content-Type: text/plain; charset="UTF-8"`,
            ``,
            replyBody,
            ``,
            `--${boundary}`,
            `Content-Type: ${mimeType}; name="${attachName}"`,
            `Content-Disposition: attachment; filename="${attachName}"`,
            `Content-Transfer-Encoding: base64`,
            ``,
            imgB64.match(/.{1,76}/g).join('\r\n'),
            ``,
            `--${boundary}--`,
        ].join('\r\n');
    } else {
        rawString = [
            `To: ${replyTo}`,
            `Subject: ${replySubject}`,
            `In-Reply-To: ${sel.msgId}`,
            `References: ${sel.msgId}`,
            `Content-Type: text/plain; charset=utf-8`,
            ``,
            replyBody,
        ].join('\r\n');
    }

    const raw = Buffer.from(rawString)
        .toString('base64')
        .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

    console.log(`\n  ${C.dim}📤 Đang gửi email reply...${C.reset}`);

    try {
        const sent = await gmail.users.messages.send({
            userId: 'me',
            requestBody: { raw, threadId: sel.threadId },
        });

        console.log('\n' + C.bold + C.green +
            '╔══════════════════════════════════════════════════════════╗\n' +
            '║            ĐÃ GỬI REPLY THÀNH CÔNG!                      ║\n' +
            '╚══════════════════════════════════════════════════════════╝' +
            C.reset);

        log('🆔', 'Message ID', sent.data.id);
        log('📧', 'Reply đến', replyTo);
        log('📋', 'Subject', replySubject);
        log('📅', 'Email gốc', `"${sel.subject}" - ${formatDate(sel.date)}`);
        log('📧', 'Nội dung từ', `"${selSent.subject}"`);
        log('💬', '10 từ đầu', `"${selSent.first10}"`);
        if (attachName) log('🖼 ', 'Ảnh đính kèm', attachName);

        console.log(`\n  ${C.cyan}👉 Email đã xuất hiện trong Gmail > Đã gửi (Sent).${C.reset}\n`);
    } catch (err) {
        console.error(`\n  ${C.red}❌ Lỗi khi gửi email: ${err.message}${C.reset}`);
        if (err.response) console.error(JSON.stringify(err.response.data, null, 2));
    }
}

main().catch(err => {
    console.error(`\n${C.red}❌ Lỗi: ${err.message}${C.reset}`);
    process.exit(1);
});

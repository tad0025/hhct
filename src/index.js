const http = require('http');
const { CONFIG } = require('./config/constants');
const { loadAccounts } = require('./config/AccountLoader');
const NoteManager = require('./core/NoteManager');
const TaskRunner = require('./runners/TaskRunner');

async function runCycle(accounts, runner, isOnce = false) {
  for (const acc of accounts) {
    try {
      await runner.runAccount(acc);
      await new Promise(r => setTimeout(r, 2000));
    } catch (err) {
      console.error(`[Main] Lỗi tài khoản [${acc.email}]:`, err.message);
    }
  }

  if (isOnce) {
    console.log('\n[Main] Đã hoàn thành đợt chạy tức thì (--now). Kết thúc chương trình.');
    process.exit(0);
  }
}

async function main() {
  console.log('👑 ========================================================');
  console.log('👑 BOT HOÀNG HẬU CÁT TƯỜNG (HHCT) - NẤU ĐAN, CUNG VỤ, NỘI VỤ');
  console.log('👑 ========================================================');

  const allAccounts = loadAccounts();
  const activeAccounts = allAccounts.filter(a => a.enabled);

  if (activeAccounts.length === 0) {
    console.warn('[Main] ⚠️ Không có tài khoản nào có trạng thái "on" trong config.json!');
    process.exit(0);
  }

  console.log(`[Main] Đã nạp ${activeAccounts.length}/${allAccounts.length} tài khoản đang kích hoạt (status: "on").\n`);

  const noteManager = new NoteManager();
  const runner = new TaskRunner(noteManager);

  const isNowMode = process.argv.includes('--now');
  if (isNowMode) {
    await runCycle(activeAccounts, runner, true);
    return;
  }

  const server = http.createServer((req, res) => {
    if (req.url === '/' || req.url === '/health') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'ok', service: 'hhct-thue', time: new Date().toISOString() }));
      return;
    }
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not Found');
  });

  server.listen(CONFIG.PORT, () => {
    console.log(`[HTTP] Web Service đang lắng nghe tại cổng ${CONFIG.PORT}`);
  });

  await runCycle(activeAccounts, runner, false);

  console.log('\n[Scheduler] ⏳ Bắt đầu vòng lập lịch kiểm tra theo thời gian nextRunTime (chu kỳ 60s)...');

  setInterval(async () => {
    try {
      const noteData = await noteManager.fetchNoteData();
      const now = Date.now();

      for (const acc of activeAccounts) {
        const accRecord = noteData && (noteData[acc.accKey] || (noteData.accounts && noteData.accounts[acc.accKey]));
        if (!accRecord || !accRecord.nextRun) {
          await runner.runAccount(acc);
          continue;
        }

        const nextRunTimestamp = new Date(accRecord.nextRun).getTime();
        if (now >= nextRunTimestamp) {
          console.log(`[Scheduler] ⏰ Đến thời điểm chạy tiếp theo của [${acc.email} - S${acc.serverId}]. Kích hoạt phiên...`);
          await runner.runAccount(acc);
        }
      }
    } catch (err) {
      console.error('[Scheduler] Lỗi chu kỳ lập lịch:', err.message);
    }
  }, 60000);
}

main().catch(err => {
  console.error('[Main] Lỗi nghiêm trọng:', err.message);
  process.exit(1);
});

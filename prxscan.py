import requests
import re
import argparse
import time
import os

headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"}

# Cấu hình Telegram Bot
TELEGRAM_BOT_TOKEN = "7318225955:AAF6ZD3Hxvtj_vDj6fgpW3E3HXfIyzN1LD4"
TELEGRAM_CHAT_ID = "7371969470"

# Hàm gửi tin nhắn qua Telegram
def send_telegram_message(message):
    url = f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage"
    data = {"chat_id": TELEGRAM_CHAT_ID, "text": message, "parse_mode": "Markdown"}
    try:
        response = requests.post(url, data=data)
        if response.status_code == 200:
            print("📤 Tin nhắn đã gửi thành công.")
        else:
            print(f"⚠️ Lỗi gửi tin nhắn Telegram: {response.status_code}")
    except Exception as e:
        print(f"⚠️ Lỗi kết nối tới Telegram: {e}")

# Hàm đọc danh sách các trang proxy từ file
def load_proxy_sites(file_path):
    try:
        with open(file_path) as f: return [line.strip() for line in f if line.strip()]
    except FileNotFoundError:
        print(f"🚨 Không tìm thấy file: {file_path}")
        return []

# Hàm quét proxy từ trang web
def scrape_proxies(site):
    try:
        response = requests.get(site, headers=headers, timeout=7)
        if response.status_code == 200:
            proxies = re.findall(r"\d+\.\d+\.\d+\.\d+:\d+", response.text)
            print(f"\n{'='*50}\nĐang quét: {site}\nGET {response.status_code}\nSố lượng proxy: {len(proxies)}\n{'='*50}")
            return proxies
        return print(f"\n{'='*50}\nĐang quét: {site}\nGET {response.status_code}\nThất bại\n{'='*50}")
    except requests.exceptions.RequestException as e:
        return print(f"\n{'='*50}\nĐang quét: {site}\nLỗi: {e}\n{'='*50}")

# Hàm lưu proxy vào file
def save_proxies(proxies, filename="live.txt"):
    with open(filename, "w") as file: file.writelines(f"{proxy}\n" for proxy in proxies)
    return len(proxies)

# Hàm xóa bảng tổng kết cũ
def clear_screen(): os.system('cls' if os.name == 'nt' else 'clear')

# Hàm chính quét và xử lý proxy
def main():
    parser = argparse.ArgumentParser(description="Quét proxy từ các trang web.")
    parser.add_argument("-l", "--list", required=True, help="Đường dẫn đến file chứa danh sách các trang web proxy.")
    args = parser.parse_args()
    
    proxy_sites = load_proxy_sites(args.list)
    if not proxy_sites: return print("⚠️ Danh sách proxy rỗng hoặc không hợp lệ.")

    while True:
        clear_screen()  # Xóa bảng tổng kết cũ
        all_proxies = set()  # Làm mới danh sách proxy mỗi lần quét
        message = "📡 Kết quả quét proxy:\n"

        for site in proxy_sites:
            proxies = scrape_proxies(site)
            if proxies:
                all_proxies.update(proxies)  # Cập nhật proxy mới
                message += f"\nĐang quét: {site}\nSố lượng proxy: {len(proxies)}\n{'='*50}"

        if all_proxies:
            proxies_saved = save_proxies(all_proxies)
            message += f"\n💾 Đã lưu {proxies_saved} proxy vào *live.txt*."
            message += f"\n✅ Tổng proxy tìm thấy: {len(all_proxies)}"
            print(message)
            send_telegram_message(message)  # Gửi tin nhắn về Telegram
        else:
            message = "⚠️ Không tìm thấy proxy hợp lệ."
            print(message)
            send_telegram_message(message)  # Gửi tin nhắn về Telegram
        
        print(f"⏳ Đợi 5 phút trước khi quét lại...")
        time.sleep(150)  # Đợi (150 giây)

if __name__ == "__main__":
    main()

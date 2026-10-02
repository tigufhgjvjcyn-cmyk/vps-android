# Cloud Games Bot — Auto RDP

Repository này đã tích hợp trực tiếp Cloud Games Discord Bot V7 với GitHub Actions.

## GitHub Secrets bắt buộc
- `DISCORD_AUTH_KEY`: Discord Bot Token
- `CLIENT_ID`: Discord Application/Client ID
- `GUILD_ID`: ID server Discord (khuyến nghị để đăng ký slash commands nhanh)

## Chạy
- Push lên branch `main` → workflow tự chạy.
- Hoặc vào Actions → `Cloud Games Bot - Auto RDP` → Run workflow.
- Mặc định mỗi phiên 5h30m và tự tạo phiên tiếp theo.

Bot được chạy bằng `npm start` và nếu process Node bị dừng trong phiên, workflow sẽ tự khởi động lại.

Lưu ý: GitHub Actions có giới hạn thời gian runner; đây không phải VPS 24/7 thực sự.


## 🔐 GitHub Secrets
Không commit file `.env` chứa token. Vào **Settings → Secrets and variables → Actions → New repository secret** và tạo:
- `DISCORD_TOKEN` = Discord Bot Token mới
- `CLIENT_ID` = Application ID
- `GUILD_ID` = ID server Discord

Workflow tự nạp các Secret khi chạy. `data/config.json` vẫn được commit/push để giữ cấu hình bot giữa các phiên.

Nếu token từng xuất hiện trong repository hoặc ảnh/log, hãy **Reset Token** trong Discord Developer Portal trước khi chạy lại.

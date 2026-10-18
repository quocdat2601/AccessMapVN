import { spawnSync } from 'node:child_process';

const optional = process.argv.includes('--optional');

function runAdb(args, capture = false) {
  return spawnSync('adb', args, {
    encoding: 'utf8',
    stdio: capture ? ['ignore', 'pipe', 'pipe'] : 'inherit',
    windowsHide: true,
  });
}

const devicesResult = runAdb(['devices'], true);
if (devicesResult.error) {
  const message = 'ADB không có trong PATH. Có thể tiếp tục bằng Expo LAN/QR nếu không dùng Android dev client.';
  if (optional) {
    console.warn(`[device:ports] ${message}`);
    process.exit(0);
  }
  console.error(`[device:ports] ${message}`);
  process.exit(1);
}

const devices = devicesResult.stdout
  .split(/\r?\n/)
  .slice(1)
  .map((line) => line.trim().split(/\s+/))
  .filter((parts) => parts.length >= 2 && parts[1] === 'device')
  .map((parts) => parts[0]);

if (devices.length === 0) {
  const message = 'Không tìm thấy Android device đã authorize. Hãy bật USB/Wireless debugging rồi thử lại.';
  if (optional) {
    console.warn(`[device:ports] ${message}`);
    process.exit(0);
  }
  console.error(`[device:ports] ${message}`);
  process.exit(1);
}

const serial = process.env.ANDROID_SERIAL || devices[0];
if (!devices.includes(serial)) {
  console.error(`[device:ports] ANDROID_SERIAL=${serial} không nằm trong danh sách device đang online.`);
  process.exit(1);
}

for (const port of [8081, 5256, 8000]) {
  const result = runAdb(['-s', serial, 'reverse', `tcp:${port}`, `tcp:${port}`]);
  if (result.status !== 0) process.exit(result.status ?? 1);
}

console.log(`[device:ports] ${serial}: 8081 (Metro), 5256 (API), 8000 (AI) đã được nối về máy tính.`);

// Auto-launch the Development Client app on the connected device
const launchPackages = ['com.qd2601.AccessMapVN', 'com.anonymous.AccessMapVN'];
for (const pkg of launchPackages) {
  const check = runAdb(['-s', serial, 'shell', 'pm', 'path', pkg], true);
  if (check.stdout && check.stdout.includes('package:')) {
    const launchResult = runAdb([
      '-s', serial, 'shell', 'am', 'start',
      '-a', 'android.intent.action.VIEW',
      '-d', 'accessmapvn://expo-development-client/?url=http%3A%2F%2Flocalhost%3A8081',
      pkg,
    ], true);
    if (launchResult.status === 0) {
      console.log(`[device:launch] Đã tự động mở ứng dụng ${pkg} trên điện thoại.`);
    } else {
      runAdb(['-s', serial, 'shell', 'am', 'start', '-n', `${pkg}/.MainActivity`], true);
      console.log(`[device:launch] Đã mở màn hình chính ${pkg} trên điện thoại.`);
    }
    break;
  }
}


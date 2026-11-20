import { spawnSync } from 'node:child_process';

const args = process.argv.slice(2);
const waitForBackend = !args.includes('--no-backend');
const waitForMetro = !args.includes('--no-metro');

function getArgValue(flag, defaultValue) {
  const index = args.indexOf(flag);
  return index >= 0 && args[index + 1] ? args[index + 1] : defaultValue;
}

const backendPort = Number(getArgValue('--backend-port', '5256'));
const metroPort = Number(getArgValue('--metro-port', '8081'));

function runAdb(adbArgs, capture = false) {
  return spawnSync('adb', adbArgs, {
    encoding: 'utf8',
    stdio: capture ? ['ignore', 'pipe', 'pipe'] : 'inherit',
    windowsHide: true,
  });
}

async function checkBackend(port) {
  try {
    const res = await fetch(`http://127.0.0.1:${port}/`, {
      signal: AbortSignal.timeout(1200),
    });
    // Any HTTP response (including 404, 200, etc.) means Kestrel is active and serving
    return res.status !== undefined;
  } catch {
    return false;
  }
}

async function checkMetro(port) {
  try {
    const res = await fetch(`http://127.0.0.1:${port}/status`, {
      signal: AbortSignal.timeout(1200),
    });
    if (!res.ok) return false;
    const body = await res.text();
    return body.includes('packager-status:running');
  } catch {
    return false;
  }
}

function getConnectedDevice() {
  const devicesResult = runAdb(['devices'], true);
  if (devicesResult.error || !devicesResult.stdout) {
    return null;
  }

  const devices = devicesResult.stdout
    .split(/\r?\n/)
    .slice(1)
    .map((line) => line.trim().split(/\s+/))
    .filter((parts) => parts.length >= 2 && parts[1] === 'device')
    .map((parts) => parts[0]);

  if (devices.length === 0) return null;

  const preferredSerial = process.env.ANDROID_SERIAL;
  if (preferredSerial && devices.includes(preferredSerial)) {
    return preferredSerial;
  }
  return devices[0];
}

async function launchAppOnDevice(serial) {
  // Ensure reverse port forwarding is active
  for (const port of [metroPort, backendPort, 8000]) {
    runAdb(['-s', serial, 'reverse', `tcp:${port}`, `tcp:${port}`], true);
  }

  const launchPackages = ['com.qd2601.AccessMapVN', 'com.anonymous.AccessMapVN'];
  for (const pkg of launchPackages) {
    const check = runAdb(['-s', serial, 'shell', 'pm', 'path', pkg], true);
    if (check.stdout && check.stdout.includes('package:')) {
      const launchResult = runAdb([
        '-s', serial, 'shell', 'am', 'start',
        '-a', 'android.intent.action.VIEW',
        '-d', `accessmapvn://expo-development-client/?url=http%3A%2F%2Flocalhost%3A${metroPort}`,
        pkg,
      ], true);

      if (launchResult.status === 0) {
        console.log(`[launch] 🚀 Đã mở ứng dụng ${pkg} trên điện thoại (${serial}).`);
      } else {
        runAdb(['-s', serial, 'shell', 'am', 'start', '-n', `${pkg}/.MainActivity`], true);
        console.log(`[launch] 🚀 Đã mở màn hình chính ${pkg} trên điện thoại (${serial}).`);
      }
      return true;
    }
  }

  console.warn(`[launch] ⚠️ Không tìm thấy package ứng dụng (${launchPackages.join(' hoặc ')}) trên thiết bị ${serial}.`);
  return false;
}

async function main() {
  const waitingFor = [];
  if (waitForBackend) waitingFor.push(`Backend (cổng ${backendPort})`);
  if (waitForMetro) waitingFor.push(`Metro (cổng ${metroPort})`);

  console.log(`[launch] ⏳ Đang đợi ${waitingFor.join(' và ')} khởi động xong...`);

  let backendReady = !waitForBackend;
  let metroReady = !waitForMetro;
  const startTime = Date.now();
  const maxTimeoutMs = 180000; // 3 minutes timeout

  while (Date.now() - startTime < maxTimeoutMs) {
    if (!backendReady && waitForBackend) {
      backendReady = await checkBackend(backendPort);
      if (backendReady) {
        console.log(`[launch] ✅ Backend (.NET Core trên cổng ${backendPort}) đã sẵn sàng!`);
      }
    }

    if (!metroReady && waitForMetro) {
      metroReady = await checkMetro(metroPort);
      if (metroReady) {
        console.log(`[launch] ✅ Metro Bundler (cổng ${metroPort}) đã sẵn sàng!`);
      }
    }

    if (backendReady && metroReady) {
      break;
    }

    await new Promise((resolve) => setTimeout(resolve, 800));
  }

  if (!backendReady || !metroReady) {
    console.warn('[launch] ⚠️ Quá thời gian chờ khởi động (3 phút). Bỏ qua tự động bật ứng dụng.');
  } else {
    // Small grace period (500ms) to ensure socket handlers are completely initialized
    await new Promise((resolve) => setTimeout(resolve, 500));

    const deviceSerial = getConnectedDevice();
    if (deviceSerial) {
      console.log(`[launch] 📱 Phát hiện điện thoại kết nối: ${deviceSerial}. Tiến hành mở app...`);
      await launchAppOnDevice(deviceSerial);
    } else {
      console.log('[launch] ℹ️ Không phát hiện thiết bị Android kết nối (hoặc ADB không có sẵn). Bỏ qua tự động mở app.');
    }
  }

  // Keep process alive so concurrently doesn't trigger -k (kill-others) to shut down other dev services
  const keepAlive = setInterval(() => {}, 60000);
  for (const signal of ['SIGINT', 'SIGTERM']) {
    process.on(signal, () => {
      clearInterval(keepAlive);
      process.exit(0);
    });
  }
}

main().catch((err) => {
  console.error('[launch] Lỗi launcher:', err);
});

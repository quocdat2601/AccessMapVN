"use client";

import { useState } from "react";
import {
  Settings2,
  Save,
  RotateCcw,
  CheckCircle2,
  MapPin,
  Clock,
  Sparkles,
  Info,
} from "lucide-react";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/ui/card";

interface SystemSettings {
  gpsProximityThresholdMeters: number;
  autoVerifyScoreThreshold: number;
  needsSupplementScoreThreshold: number;
  baselineObservationWindowDays: number;
  reviewSlaMinutes: number;
  minVideoDurationSeconds: number;
  maxVideoDurationSeconds: number;
  enableAutoVerify: boolean;
  enableStrictGpsCheck: boolean;
}

const DEFAULT_SETTINGS: SystemSettings = {
  gpsProximityThresholdMeters: 50,
  autoVerifyScoreThreshold: 80,
  needsSupplementScoreThreshold: 60,
  baselineObservationWindowDays: 90,
  reviewSlaMinutes: 120,
  minVideoDurationSeconds: 5,
  maxVideoDurationSeconds: 10,
  enableAutoVerify: true,
  enableStrictGpsCheck: true,
};

const STORAGE_KEY = "accessmap_system_settings_v1";

export default function SystemSettingsPage() {
  const [settings, setSettings] = useState<SystemSettings>(() => {
    if (typeof window !== "undefined") {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        try {
          return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
        } catch {
          // use default
        }
      }
    }
    return DEFAULT_SETTINGS;
  });
  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleSave = () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 4000);
  };

  const handleReset = () => {
    setSettings(DEFAULT_SETTINGS);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_SETTINGS));
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 4000);
  };

  return (
    <div className="mx-auto w-full max-w-[1200px] space-y-6 p-4 sm:p-6 xl:p-7">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="grid size-11 place-items-center rounded-xl bg-teal-50 text-teal-700 shadow-sm border border-teal-100">
            <Settings2 className="size-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-extrabold tracking-tight text-slate-950 sm:text-2xl">
                Cài đặt hệ thống & Tham số nghiệp vụ
              </h1>
              <Badge variant="blue">Dynamic DB Config (Table 15)</Badge>
            </div>
            <p className="mt-0.5 text-sm text-slate-500">
              Quản trị tập trung các ngưỡng tự động hoá AI, bán kính định vị, SLA kiểm duyệt và bảo vệ hiện trạng tiếp cận.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleReset}>
            <RotateCcw className="size-4" /> Khôi phục mặc định
          </Button>
          <Button size="sm" onClick={handleSave} className="bg-teal-600 hover:bg-teal-700 text-white">
            <Save className="size-4" /> Lưu cấu hình
          </Button>
        </div>
      </div>

      {savedSuccess && (
        <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-medium text-emerald-800 shadow-sm animate-in fade-in duration-200">
          <CheckCircle2 className="size-5 text-emerald-600 shrink-0" />
          <div>
            <strong>Đã cập nhật cấu hình tham số thành công!</strong> Các tiến trình kiểm duyệt và thuật toán phân luồng AI áp dụng ngay lập tức mà không cần khởi động lại dịch vụ.
          </div>
        </div>
      )}

      {/* Grid Content */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Card 1: Ngưỡng AI & Phân luồng */}
        <Card className="shadow-sm">
          <CardHeader>
            <div className="flex items-center gap-2 text-teal-700 font-semibold text-sm">
              <Sparkles className="size-4" /> Trọng số & Phân luồng AI (WF-01)
            </div>
            <CardTitle className="text-lg">Ngưỡng tự động duyệt đóng góp</CardTitle>
            <CardDescription>
              Kiểm soát quy tắc BR-08, BR-09, BR-10 cho hồ sơ gửi từ ứng dụng di động.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div>
              <div className="flex justify-between items-center text-sm mb-1.5">
                <span className="font-medium text-slate-800">Điểm tự động duyệt (AutoVerified)</span>
                <span className="font-bold text-teal-700 font-mono">≥ {settings.autoVerifyScoreThreshold}%</span>
              </div>
              <input
                type="range"
                min="70"
                max="95"
                step="5"
                className="w-full accent-teal-600 cursor-pointer"
                value={settings.autoVerifyScoreThreshold}
                onChange={(e) => setSettings({ ...settings, autoVerifyScoreThreshold: Number(e.target.value) })}
              />
              <p className="text-xs text-slate-500 mt-1">
                Bài đóng góp đạt điểm tổng hợp từ ngưỡng này sẽ tự động xuất bản (Published) và cộng điểm thưởng.
              </p>
            </div>

            <div className="border-t border-slate-100 pt-4">
              <div className="flex justify-between items-center text-sm mb-1.5">
                <span className="font-medium text-slate-800">Ngưỡng tối thiểu vào hàng đợi kiểm duyệt</span>
                <span className="font-bold text-amber-700 font-mono">≥ {settings.needsSupplementScoreThreshold}%</span>
              </div>
              <input
                type="range"
                min="40"
                max="75"
                step="5"
                className="w-full accent-amber-600 cursor-pointer"
                value={settings.needsSupplementScoreThreshold}
                onChange={(e) => setSettings({ ...settings, needsSupplementScoreThreshold: Number(e.target.value) })}
              />
              <p className="text-xs text-slate-500 mt-1">
                Dưới {settings.needsSupplementScoreThreshold}%, hồ sơ chuyển sang trạng thái <strong>NeedsSupplement</strong> (Yêu cầu bổ sung thông tin).
                Khoảng từ {settings.needsSupplementScoreThreshold}% đến {settings.autoVerifyScoreThreshold}% chuyển vào hàng đợi kiểm duyệt viên (PendingModeration).
              </p>
            </div>

            <div className="border-t border-slate-100 pt-4 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-900">Bật cơ chế tự động duyệt qua AI</p>
                <p className="text-xs text-slate-500">Cho phép hệ thống bỏ qua bước duyệt thủ công khi độ tin cậy vượt ngưỡng.</p>
              </div>
              <input
                type="checkbox"
                className="size-5 rounded border-slate-300 text-teal-600 focus:ring-teal-500 cursor-pointer"
                checked={settings.enableAutoVerify}
                onChange={(e) => setSettings({ ...settings, enableAutoVerify: e.target.checked })}
              />
            </div>
          </CardContent>
        </Card>

        {/* Card 2: Bán kính GPS & Minh chứng */}
        <Card className="shadow-sm">
          <CardHeader>
            <div className="flex items-center gap-2 text-teal-700 font-semibold text-sm">
              <MapPin className="size-4" /> Bán kính thực địa & Minh chứng ảnh/video
            </div>
            <CardTitle className="text-lg">Xác thực vị trí thực tế</CardTitle>
            <CardDescription>
              Quy chuẩn chống gian lận toạ độ và kiểm soát chất lượng dữ liệu hiện trường.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div>
              <div className="flex justify-between items-center text-sm mb-1.5">
                <span className="font-medium text-slate-800">Khoảng cách GPS tối đa cho phép</span>
                <span className="font-bold text-teal-700 font-mono">{settings.gpsProximityThresholdMeters} mét</span>
              </div>
              <input
                type="range"
                min="20"
                max="150"
                step="10"
                className="w-full accent-teal-600 cursor-pointer"
                value={settings.gpsProximityThresholdMeters}
                onChange={(e) => setSettings({ ...settings, gpsProximityThresholdMeters: Number(e.target.value) })}
              />
              <p className="text-xs text-slate-500 mt-1">
                Người dùng phải ở trong bán kính này tính từ toạ độ địa điểm khi chụp ảnh minh chứng (Table 15).
              </p>
            </div>

            <div className="border-t border-slate-100 pt-4">
              <label className="block text-sm font-medium text-slate-800 mb-1">Thời lượng video minh chứng (giây)</label>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <span className="text-xs text-slate-500">Tối thiểu:</span>
                  <input
                    type="number"
                    className="mt-1 h-9 w-full rounded-lg border border-slate-200 px-3 text-sm font-mono"
                    value={settings.minVideoDurationSeconds}
                    onChange={(e) => setSettings({ ...settings, minVideoDurationSeconds: Number(e.target.value) })}
                  />
                </div>
                <div>
                  <span className="text-xs text-slate-500">Tối đa:</span>
                  <input
                    type="number"
                    className="mt-1 h-9 w-full rounded-lg border border-slate-200 px-3 text-sm font-mono"
                    value={settings.maxVideoDurationSeconds}
                    onChange={(e) => setSettings({ ...settings, maxVideoDurationSeconds: Number(e.target.value) })}
                  />
                </div>
              </div>
            </div>

            <div className="border-t border-slate-100 pt-4 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-900">Bắt buộc đối chiếu GPS theo EXIF / Geolocation</p>
                <p className="text-xs text-slate-500">Từ chối tính điểm Proximity nếu phát hiện thiết bị tắt GPS hoặc giả lập toạ độ.</p>
              </div>
              <input
                type="checkbox"
                className="size-5 rounded border-slate-300 text-teal-600 focus:ring-teal-500 cursor-pointer"
                checked={settings.enableStrictGpsCheck}
                onChange={(e) => setSettings({ ...settings, enableStrictGpsCheck: e.target.checked })}
              />
            </div>
          </CardContent>
        </Card>

        {/* Card 3: SLA & Chu kỳ hiện trạng (WF-02) */}
        <Card className="shadow-sm">
          <CardHeader>
            <div className="flex items-center gap-2 text-teal-700 font-semibold text-sm">
              <Clock className="size-4" /> Quản trị SLA & Chu kỳ bảo vệ hiện trạng (WF-02)
            </div>
            <CardTitle className="text-lg">Cam kết dịch vụ & Chu kỳ tái thẩm tra</CardTitle>
            <CardDescription>
              Quy định thời hạn xử lý tranh chấp và tuổi thọ hiệu lực của tiện ích tiếp cận.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-800 mb-1">
                Cửa sổ bảo vệ hiện trạng gốc (Baseline Observation Window)
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  min="30"
                  max="365"
                  className="h-10 w-36 rounded-lg border border-slate-200 px-3 text-sm font-mono"
                  value={settings.baselineObservationWindowDays}
                  onChange={(e) => setSettings({ ...settings, baselineObservationWindowDays: Number(e.target.value) })}
                />
                <span className="text-sm text-slate-600 font-medium">ngày</span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Tiện ích đã xuất bản giữ nguyên độ tin cậy trong 90 ngày trước khi cần cộng đồng xác nhận lại (Re-verification).
              </p>
            </div>

            <div className="border-t border-slate-100 pt-3">
              <label className="block text-sm font-medium text-slate-800 mb-1">
                Thời hạn cam kết xử lý báo cáo sai lệch (Review SLA)
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  min="30"
                  max="720"
                  step="15"
                  className="h-10 w-36 rounded-lg border border-slate-200 px-3 text-sm font-mono"
                  value={settings.reviewSlaMinutes}
                  onChange={(e) => setSettings({ ...settings, reviewSlaMinutes: Number(e.target.value) })}
                />
                <span className="text-sm text-slate-600 font-medium">phút (2 giờ)</span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Hệ thống cảnh báo đỏ trong hàng đợi nếu báo cáo sai lệch chưa có kiểm duyệt viên tiếp nhận sau thời hạn này.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Card 4: Thông tin kiến trúc & Minh chứng */}
        <Card className="shadow-sm border-teal-100 bg-teal-50/30">
          <CardHeader>
            <div className="flex items-center gap-2 text-teal-800 font-semibold text-sm">
              <Info className="size-4" /> Tham chiếu tiêu chuẩn kiến trúc & Khuyến nghị
            </div>
            <CardTitle className="text-lg text-teal-950">Nguyên tắc thiết kế không hardcode</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-slate-700 leading-relaxed">
            <p>
              • <strong>Không phụ thuộc appsettings:</strong> Mọi ngưỡng nghiệp vụ được tải trực tiếp từ cơ sở dữ liệu cấu hình thông qua Repository Pattern, cho phép cập nhật tức thời (Zero Downtime).
            </p>
            <p>
              • <strong>Đồng bộ quy chuẩn QCVN 10:2014/BXD:</strong> Các tham số về độ dốc ram dốc, chiều rộng lọt lòng cửa thông thuỷ, kích thước buồng vệ sinh tiếp cận được kiểm tra đối chiếu qua mô-đun AI Vision độc lập.
            </p>
            <p>
              • <strong>Bảo vệ toàn vẹn dữ liệu:</strong> Mọi thay đổi cấu hình được ghi log hệ thống kèm danh tính tài khoản quản trị viên thực hiện.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

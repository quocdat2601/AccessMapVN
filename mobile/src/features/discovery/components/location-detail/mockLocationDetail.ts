import { LocationDetailData } from './types';

export const MOCK_SAIGON_CENTRE_DETAIL: LocationDetailData = {
  id: 'saigon-centre',
  name: 'Saigon Centre (Takashimaya)',
  address: '65 Lê Lợi, Phường Bến Nghé, Quận 1, TP. Hồ Chí Minh',
  standardLabel: 'Đạt QCVN 10:2014',
  trustPercent: 88,
  confirmationCount: 12,
  lastVerified: '3 ngày trước',
  verificationState: 'Đang ổn định',
  features: [
    {
      id: 'step-free',
      icon: 'wheelchair-accessibility',
      label: 'Không bậc thềm',
      confirmations: 9,
    },
    {
      id: 'elevator',
      icon: 'elevator-passenger',
      label: 'Thang máy > 1,1m',
      confirmations: 14,
    },
    {
      id: 'ramp',
      icon: 'slope-uphill',
      label: 'Dốc lối Pasteur',
      confirmations: 11,
    },
    {
      id: 'restroom',
      icon: 'toilet',
      label: 'WC tiếp cận',
      confirmations: 8,
    },
  ],
  reviews: [
    {
      id: 'review-minh-anh',
      author: 'Minh Anh',
      initials: 'MA',
      age: '4 ngày trước',
      helpfulCount: 15,
      comment: 'Lối vào phía Pasteur dễ tiếp cận và ram dốc thoải hơn cổng Lê Lợi rất nhiều.',
    },
    {
      id: 'review-tuan-linh',
      author: 'Tuấn Linh',
      initials: 'TL',
      age: '1 tuần trước',
      helpfulCount: 9,
      comment: 'Nhà vệ sinh tiếp cận ở tầng 2 gần quầy thông tin, cửa rộng và dễ sử dụng.',
    },
  ],
  evidence: [
    {
      id: 'evidence-pasteur-ramp',
      title: 'Ram dốc lối Pasteur',
      subtitle: 'Cập nhật 2 giờ trước • Bởi Mai Anh',
      badge: 'Dốc 1:12 đạt chuẩn',
      isFaceBlurred: true,
    },
    {
      id: 'evidence-elevator',
      title: 'Thang máy tầng trệt',
      subtitle: 'Cập nhật hôm qua • Bởi Tuấn Linh',
      badge: 'Cửa rộng 1,2m',
    },
  ],
};

const numberFormatter = new Intl.NumberFormat("vi-VN");

export const formatNumber = (value: number) => numberFormatter.format(value);

export const formatCompactNumber = (value: number) =>
  new Intl.NumberFormat("vi-VN", { notation: "compact", maximumFractionDigits: 1 }).format(value);

export const formatPercent = (value: number, fractionDigits = 0) =>
  `${value.toLocaleString("vi-VN", { maximumFractionDigits: fractionDigits })}%`;

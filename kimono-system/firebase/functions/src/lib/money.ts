export function calculateOrderTotal(input: {
  depositJpy: number;
  kimonoPriceJpy: number;
  hairFeeJpy: number;
  makeupFeeJpy?: number;
  photoFeeJpy: number;
  discountRate: number;
}) {
  const discountRate = input.discountRate > 0 ? input.discountRate : 10;
  const discountedKimono = Math.round(input.kimonoPriceJpy * discountRate / 10);
  const totalJpy = discountedKimono + input.hairFeeJpy + Number(input.makeupFeeJpy || 0) + input.photoFeeJpy;
  const onsiteDueJpy = Math.max(0, totalJpy - input.depositJpy);
  return { discountedKimono, totalJpy, onsiteDueJpy };
}

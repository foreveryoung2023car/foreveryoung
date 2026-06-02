export function calculateOrderTotal(input) {
    const discountRate = input.discountRate > 0 ? input.discountRate : 10;
    const discountedKimono = Math.round(input.kimonoPriceJpy * discountRate / 10);
    const totalJpy = discountedKimono + input.hairFeeJpy + input.photoFeeJpy;
    const onsiteDueJpy = Math.max(0, totalJpy - input.depositJpy);
    return { discountedKimono, totalJpy, onsiteDueJpy };
}
//# sourceMappingURL=money.js.map
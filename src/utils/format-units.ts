import BigNumber from "bignumber.js";

export function fromDisplayToBaseUnit(
  displayBalance: number,
  decimals: number
): number {
  return displayBalance * 10 ** decimals;
}

export function fromBaseToDisplayUnit(baseBalance: number, decimals: number) {
  const decimalsBigNumber = new BigNumber(decimals);
  const divisor = new BigNumber(10).pow(decimalsBigNumber);

  const bigValue = BigNumber.isBigNumber(baseBalance)
    ? baseBalance
    : new BigNumber(baseBalance);

  return bigValue.dividedBy(divisor);
}

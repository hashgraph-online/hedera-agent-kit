import { Logger as StandardsSdkLogger } from '@hashgraphonline/standards-sdk';
import {
  CustomFee,
  AccountId,
  TokenId,
  CustomFixedFee,
  CustomFractionalFee,
  CustomRoyaltyFee,
  FeeAssessmentMethod,
  Long,
} from '@hashgraph/sdk';

/**
 * Parses a JSON string representing an array of custom fee objects into an array of SDK CustomFee instances.
 * @param {string} customFeesJson - The JSON string to parse.
 * @param {StandardsSdkLogger} logger - Logger instance for error/warning logging.
 * @returns {CustomFee[]} An array of SDK CustomFee objects.
 * @throws {Error} If JSON parsing fails or fee data is invalid.
 */
export function parseCustomFeesJson(
  customFeesJson: string,
  logger: StandardsSdkLogger
): CustomFee[] {
  let parsedFeesInput: any[];
  try {
    parsedFeesInput = JSON.parse(customFeesJson) as any[];
    if (!Array.isArray(parsedFeesInput)) {
      throw new Error('customFeesJson did not parse to an array.');
    }
  } catch (error: any) {
    logger.error('Invalid JSON string for customFeesJson:', error.message);
    throw new Error(`Invalid JSON string for customFeesJson: ${error.message}`);
  }

  return parsedFeesInput.map((feeData, index) => {
    const feeCollectorAccountIdStr = feeData.feeCollectorAccountId;
    if (
      !feeCollectorAccountIdStr ||
      typeof feeCollectorAccountIdStr !== 'string'
    ) {
      throw new Error(
        `Fee #${
          index + 1
        }: feeCollectorAccountId is required and must be a string.`
      );
    }
    const feeCollectorAccountId = AccountId.fromString(
      feeCollectorAccountIdStr
    );

    let newFee: CustomFee;

    switch (feeData.feeType) {
      case 'FIXED_FEE':
        const fixedFee = new CustomFixedFee().setFeeCollectorAccountId(
          feeCollectorAccountId
        );
        if (feeData.denominatingTokenId) {
          fixedFee.setDenominatingTokenId(
            TokenId.fromString(feeData.denominatingTokenId)
          );
        }
        if (feeData.amount === undefined || feeData.amount === null) {
          throw new Error(`Fee #${index + 1} (FIXED_FEE): amount is required.`);
        }
        fixedFee.setAmount(
          typeof feeData.amount === 'string'
            ? Long.fromString(feeData.amount)
            : Long.fromNumber(feeData.amount)
        );
        newFee = fixedFee;
        break;

      case 'FRACTIONAL_FEE':
        if (
          feeData.numerator === undefined ||
          feeData.denominator === undefined
        ) {
          throw new Error(
            `Fee #${
              index + 1
            } (FRACTIONAL_FEE): numerator and denominator are required.`
          );
        }
        const fractionalFee = new CustomFractionalFee()
          .setFeeCollectorAccountId(feeCollectorAccountId)
          .setNumerator(Long.fromValue(feeData.numerator))
          .setDenominator(Long.fromValue(feeData.denominator));
        if (feeData.minimumAmount ) {
          fractionalFee.setMin(
            typeof feeData.minimumAmount === 'string'
              ? Long.fromString(feeData.minimumAmount)
              : Long.fromNumber(feeData.minimumAmount)
          );
        }
        if (feeData.maximumAmount ) {
          fractionalFee.setMax(
            typeof feeData.maximumAmount === 'string'
              ? Long.fromString(feeData.maximumAmount)
              : Long.fromNumber(feeData.maximumAmount)
          );
        }
        if (
          feeData.assessmentMethod === 'EXCLUSIVE' ||
          feeData.netOfTransfers === true
        ) {
          fractionalFee.setAssessmentMethod(FeeAssessmentMethod.Exclusive);
        } else {
          fractionalFee.setAssessmentMethod(FeeAssessmentMethod.Inclusive);
        }
        newFee = fractionalFee;
        break;

      case 'ROYALTY_FEE':
        if (
          feeData.numerator === undefined ||
          feeData.denominator === undefined
        ) {
          throw new Error(
            `Fee #${
              index + 1
            } (ROYALTY_FEE): numerator and denominator are required.`
          );
        }
        const royaltyFee = new CustomRoyaltyFee()
          .setFeeCollectorAccountId(feeCollectorAccountId)
          .setNumerator(Long.fromValue(feeData.numerator))
          .setDenominator(Long.fromValue(feeData.denominator));
        if (feeData.fallbackFee) {
          if (
            typeof feeData.fallbackFee !== 'object' ||
            feeData.fallbackFee === null
          ) {
            throw new Error(
              `Fee #${
                index + 1
              } (ROYALTY_FEE): fallbackFee must be an object if provided.`
            );
          }
          const fallback = new CustomFixedFee().setFeeCollectorAccountId(
            feeCollectorAccountId
          );
          if (feeData.fallbackFee.denominatingTokenId) {
            fallback.setDenominatingTokenId(
              TokenId.fromString(feeData.fallbackFee.denominatingTokenId)
            );
          }
          if (
            feeData.fallbackFee.amount === undefined ||
            feeData.fallbackFee.amount === null
          ) {
            throw new Error(
              `Fee #${index + 1} (ROYALTY_FEE): fallbackFee.amount is required.`
            );
          }
          fallback.setAmount(
            typeof feeData.fallbackFee.amount === 'string'
              ? Long.fromString(feeData.fallbackFee.amount)
              : Long.fromNumber(feeData.fallbackFee.amount)
          );
          royaltyFee.setFallbackFee(fallback);
        }
        newFee = royaltyFee;
        break;

      default:
        throw new Error(
          `Fee #${index + 1}: Unknown custom fee type: ${
            feeData.feeType
          }. Supported types are FIXED_FEE, FRACTIONAL_FEE, ROYALTY_FEE.`
        );
    }

    if (
      feeData.allCollectorsAreExempt  &&
      typeof feeData.allCollectorsAreExempt === 'boolean'
    ) {
      newFee.setAllCollectorsAreExempt(feeData.allCollectorsAreExempt);
    }
    return newFee;
  });
}

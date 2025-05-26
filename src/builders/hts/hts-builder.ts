import {
  AccountId,
  CustomFee,
  TokenCreateTransaction,
  TokenSupplyType,
  TokenType,
  TokenId,
  Long,
  TokenMintTransaction,
  TokenBurnTransaction,
  TransferTransaction,
  TokenAssociateTransaction,
  TokenDissociateTransaction,
  Hbar,
  TokenWipeTransaction,
  TokenFreezeTransaction,
  TokenUnfreezeTransaction,
  TokenGrantKycTransaction,
  TokenRevokeKycTransaction,
  TokenPauseTransaction,
  TokenUnpauseTransaction,
  TokenUpdateTransaction,
  TokenDeleteTransaction,
  TokenFeeScheduleUpdateTransaction,
  NftId,
  TokenAirdropTransaction,
  TokenClaimAirdropTransaction,
  TokenCancelAirdropTransaction,
  TokenRejectTransaction,
  CustomFixedFee,
  CustomFractionalFee,
  CustomRoyaltyFee,
  KeyList,
  PublicKey,
  FeeAssessmentMethod,
} from '@hashgraph/sdk';

import {
  FTCreateParams,
  NFTCreateParams,
  MintFTParams,
  BurnFTParams,
  MintNFTParams,
  BurnNFTParams,
  TransferNFTParams,
  AssociateTokensParams,
  DissociateTokensParams,
  TransferTokensParams,
  FungibleTokenTransferSpec,
  WipeTokenAccountParams,
  FreezeTokenAccountParams,
  UnfreezeTokenAccountParams,
  GrantKycTokenParams,
  RevokeKycTokenParams,
  PauseTokenParams,
  UnpauseTokenParams,
  UpdateTokenParams,
  DeleteTokenParams,
  TokenFeeScheduleUpdateParams,
  AirdropTokenParams,
  ClaimAirdropParams,
  CancelAirdropParams,
  RejectAirdropParams,
} from '../../types';
import { BaseServiceBuilder } from '../base-service-builder';
import { Buffer } from 'buffer';
import { HederaAgentKit } from '../../agent/agent';
import { Logger } from '@hashgraphonline/standards-sdk';
import { CustomFeeInputData } from '../../langchain/tools/hts/create-fungible-token-tool';
import { AgentOperationalMode } from '../../types';

const DEFAULT_AUTORENEW_PERIOD_SECONDS = 7776000;

function generateDefaultSymbol(tokenName: string): string {
  if (!tokenName) {
    return 'TOKEN';
  }
  const symbol = tokenName
    .replace(/[^a-zA-Z0-9]/g, '')
    .substring(0, 5)
    .toUpperCase();
  if (symbol) {
    return symbol;
  }
  return 'TOKEN';
}

function mapToSdkCustomFees(
  fees: CustomFeeInputData[],
  parseAmountFn: (amount?: number | string | Long | BigNumber) => Long,
  logger: Logger,
  kitUserAccountId?: string,
  kitOperationalMode?: AgentOperationalMode,
  addNoteFn?: (note: string) => void
): CustomFee[] {
  if (!fees || fees.length === 0) {
    return [];
  }

  return fees.map((feeData: CustomFeeInputData) => {
    let feeCollectorStringToParse = feeData.feeCollectorAccountId;

    if (
      !feeCollectorStringToParse &&
      kitUserAccountId &&
      kitOperationalMode === 'provideBytes'
    ) {
      feeCollectorStringToParse = kitUserAccountId;
      if (addNoteFn) {
        let feeTypeForNote = 'custom';
        if (feeData.type === 'FIXED' || feeData.type === 'FIXED_FEE') {
          feeTypeForNote = 'fixed';
        } else if (
          feeData.type === 'FRACTIONAL' ||
          feeData.type === 'FRACTIONAL_FEE'
        ) {
          feeTypeForNote = 'fractional';
        } else if (
          feeData.type === 'ROYALTY' ||
          feeData.type === 'ROYALTY_FEE'
        ) {
          feeTypeForNote = 'royalty';
        }
        addNoteFn(
          `Fee collector for a ${feeTypeForNote} fee was defaulted to your account (${kitUserAccountId}).`
        );
      }
    }

    if (!feeCollectorStringToParse) {
      throw new Error(
        `Fee collector account ID is required for custom fee type ${feeData.type} but was not provided or defaulted.`
      );
    }

    let feeCollectorSdkAccountId: AccountId;
    try {
      feeCollectorSdkAccountId = AccountId.fromString(
        feeCollectorStringToParse
      );
    } catch (e) {
      logger.error(
        `Invalid feeCollectorAccountId: ${feeCollectorStringToParse}`,
        e
      );
      throw new Error(
        `Invalid feeCollectorAccountId: ${feeCollectorStringToParse}`
      );
    }

    switch (feeData.type) {
      case 'FIXED':
      case 'FIXED_FEE': {
        const fixedFee = new CustomFixedFee()
          .setFeeCollectorAccountId(feeCollectorSdkAccountId)
          .setAmount(parseAmountFn(feeData.amount));
        if (feeData.denominatingTokenId) {
          try {
            fixedFee.setDenominatingTokenId(
              TokenId.fromString(feeData.denominatingTokenId)
            );
          } catch (e) {
            logger.error(
              `Invalid denominatingTokenId for fixed fee: ${feeData.denominatingTokenId}`,
              e
            );
            throw new Error(
              `Invalid denominatingTokenId for fixed fee: ${feeData.denominatingTokenId}`
            );
          }
        }
        return fixedFee;
      }
      case 'FRACTIONAL':
      case 'FRACTIONAL_FEE': {
        const fractionalFee = new CustomFractionalFee()
          .setFeeCollectorAccountId(feeCollectorSdkAccountId)
          .setNumerator(parseAmountFn(feeData.numerator).toNumber())
          .setDenominator(parseAmountFn(feeData.denominator).toNumber());
        if (feeData.minAmount !== undefined) {
          fractionalFee.setMin(parseAmountFn(feeData.minAmount));
        }
        if (feeData.maxAmount !== undefined) {
          fractionalFee.setMax(parseAmountFn(feeData.maxAmount));
        }
        const fractionalFeeData = feeData as Extract<
          CustomFeeInputData,
          { type: 'FRACTIONAL' | 'FRACTIONAL_FEE' }
        >;
        if (fractionalFeeData.assessmentMethodInclusive !== undefined) {
          if (fractionalFeeData.assessmentMethodInclusive) {
            fractionalFee.setAssessmentMethod(FeeAssessmentMethod.Inclusive);
          } else {
            fractionalFee.setAssessmentMethod(FeeAssessmentMethod.Exclusive);
          }
        }
        return fractionalFee;
      }
      case 'ROYALTY':
      case 'ROYALTY_FEE': {
        const royaltyFee = new CustomRoyaltyFee()
          .setFeeCollectorAccountId(feeCollectorSdkAccountId)
          .setNumerator(parseAmountFn(feeData.numerator).toNumber())
          .setDenominator(parseAmountFn(feeData.denominator).toNumber());
        const royaltyFeeData = feeData as Extract<
          CustomFeeInputData,
          { type: 'ROYALTY' | 'ROYALTY_FEE' }
        >;
        if (royaltyFeeData.fallbackFee) {
          let fallbackFeeCollectorStringToParse =
            royaltyFeeData.fallbackFee.feeCollectorAccountId;
          if (
            !fallbackFeeCollectorStringToParse &&
            kitUserAccountId &&
            kitOperationalMode === 'provideBytes'
          ) {
            fallbackFeeCollectorStringToParse = kitUserAccountId;
            if (addNoteFn) {
              addNoteFn(
                `Fallback fee collector for a royalty fee was also defaulted to your account (${kitUserAccountId}).`
              );
            }
          }
          if (!fallbackFeeCollectorStringToParse) {
            throw new Error(
              `Fallback fee collector account ID is required for royalty fee but was not provided or defaulted.`
            );
          }
          let fallbackFeeCollectorSdkAccountId: AccountId;
          try {
            fallbackFeeCollectorSdkAccountId = AccountId.fromString(
              fallbackFeeCollectorStringToParse
            );
          } catch (e) {
            logger.error(
              `Invalid feeCollectorAccountId in fallbackFee: ${fallbackFeeCollectorStringToParse}`,
              e
            );
            throw new Error(
              `Invalid feeCollectorAccountId in fallbackFee: ${fallbackFeeCollectorStringToParse}`
            );
          }
          const fallback = new CustomFixedFee()
            .setFeeCollectorAccountId(fallbackFeeCollectorSdkAccountId)
            .setAmount(parseAmountFn(royaltyFeeData.fallbackFee.amount));
          if (royaltyFeeData.fallbackFee.denominatingTokenId) {
            try {
              fallback.setDenominatingTokenId(
                TokenId.fromString(
                  royaltyFeeData.fallbackFee.denominatingTokenId
                )
              );
            } catch (e) {
              logger.error(
                `Invalid denominatingTokenId in fallbackFee: ${royaltyFeeData.fallbackFee.denominatingTokenId}`,
                e
              );
              throw new Error(
                `Invalid denominatingTokenId in fallbackFee: ${royaltyFeeData.fallbackFee.denominatingTokenId}`
              );
            }
          }
          royaltyFee.setFallbackFee(fallback);
        }
        return royaltyFee;
      }
      default: {
        const exhaustiveCheck: never = feeData;
        logger.warn(
          `Unsupported custom fee type encountered: ${
            (exhaustiveCheck as any).type
          }`
        );
        throw new Error(
          `Unsupported custom fee type: ${(exhaustiveCheck as any).type}`
        );
      }
    }
  });
}

/**
 * HtsBuilder facilitates the construction and execution of Hedera Token Service (HTS) transactions.
 */
export class HtsBuilder extends BaseServiceBuilder {
  constructor(hederaKit: HederaAgentKit) {
    super(hederaKit);
  }

  /**
   * @param {FTCreateParams} params
   * @returns {Promise<this>}
   * @throws {Error}
   */
  public async createFungibleToken(params: FTCreateParams): Promise<this> {
    this.clearNotes();
    let treasuryAccId = params.treasuryAccountId;
    if (
      !treasuryAccId &&
      this.kit.userAccountId &&
      this.kit.operationalMode === 'provideBytes'
    ) {
      this.logger.info(
        `[HtsBuilder.createFungibleToken] Using userAccountId ${this.kit.userAccountId} as treasury for FT creation in provideBytes mode.`
      );
      treasuryAccId = AccountId.fromString(this.kit.userAccountId);
      this.addNote(
        `Since no treasury was specified, your account (${this.kit.userAccountId}) has been set as the token's treasury.`
      );
    }
    if (!treasuryAccId) {
      throw new Error(
        '[HtsBuilder.createFungibleToken] Treasury Account ID is required (e.g., explicitly, via userAccountId for provideBytes mode, or via agent operator for directExecution if applicable).'
      );
    }

    let tokenSymbolToUse = params.tokenSymbol;
    if (!tokenSymbolToUse) {
      tokenSymbolToUse = generateDefaultSymbol(params.tokenName);
      this.addNote(
        `We've generated a token symbol '${tokenSymbolToUse}' for you, based on the token name '${params.tokenName}'.`
      );
    }

    let sdkSupplyType: TokenSupplyType;
    if (typeof params.supplyType === 'string') {
      const supplyTypeString: string = params.supplyType;
      if (
        supplyTypeString.toUpperCase() ===
        TokenSupplyType.Finite.toString().toUpperCase()
      ) {
        sdkSupplyType = TokenSupplyType.Finite;
      } else if (
        supplyTypeString.toUpperCase() ===
        TokenSupplyType.Infinite.toString().toUpperCase()
      ) {
        sdkSupplyType = TokenSupplyType.Infinite;
      } else {
        this.logger.warn(
          `Invalid string for supplyType: ${supplyTypeString}. Defaulting to INFINITE.`
        );
        this.addNote(
          `Invalid supplyType string '${supplyTypeString}' received, defaulted to INFINITE.`
        );
        sdkSupplyType = TokenSupplyType.Infinite;
      }
    } else {
      sdkSupplyType = params.supplyType;
    }

    const transaction = new TokenCreateTransaction()
      .setTokenName(params.tokenName)
      .setTokenSymbol(tokenSymbolToUse)
      .setTreasuryAccountId(treasuryAccId)
      .setTokenType(TokenType.FungibleCommon)
      .setSupplyType(sdkSupplyType)
      .setInitialSupply(this.parseAmount(params.initialSupply))
      .setDecimals(params.decimals);

    if (sdkSupplyType === TokenSupplyType.Finite && params.maxSupply) {
      transaction.setMaxSupply(this.parseAmount(params.maxSupply));
    }
    if (params.adminKey) {
      const parsedKey = await this.parseKey(params.adminKey);
      if (parsedKey) transaction.setAdminKey(parsedKey);
    }
    if (params.kycKey) {
      const parsedKey = await this.parseKey(params.kycKey);
      if (parsedKey) transaction.setKycKey(parsedKey);
    }
    if (params.freezeKey) {
      const parsedKey = await this.parseKey(params.freezeKey);
      if (parsedKey) transaction.setFreezeKey(parsedKey);
    }
    if (params.wipeKey) {
      const parsedKey = await this.parseKey(params.wipeKey);
      if (parsedKey) transaction.setWipeKey(parsedKey);
    }
    if (params.supplyKey) {
      const parsedKey = await this.parseKey(params.supplyKey);
      if (parsedKey) transaction.setSupplyKey(parsedKey);
    }
    if (params.feeScheduleKey) {
      const parsedKey = await this.parseKey(params.feeScheduleKey);
      if (parsedKey) transaction.setFeeScheduleKey(parsedKey);
    }
    if (params.pauseKey) {
      const parsedKey = await this.parseKey(params.pauseKey);
      if (parsedKey) transaction.setPauseKey(parsedKey);
    }
    if (params.memo) {
      transaction.setTokenMemo(params.memo);
    }
    if (params.customFees && params.customFees.length > 0) {
      const sdkCustomFees = mapToSdkCustomFees(
        params.customFees as unknown as CustomFeeInputData[],
        this.parseAmount.bind(this),
        this.logger,
        this.kit.userAccountId,
        this.kit.operationalMode,
        this.addNote.bind(this)
      );
      transaction.setCustomFees(sdkCustomFees);
    }
    if (params.autoRenewAccountId) {
      transaction.setAutoRenewAccountId(params.autoRenewAccountId);
    }
    if (params.autoRenewPeriod) {
      transaction.setAutoRenewPeriod(params.autoRenewPeriod);
    } else if (params.autoRenewAccountId) {
      transaction.setAutoRenewPeriod(DEFAULT_AUTORENEW_PERIOD_SECONDS);
      this.addNote(
        `A standard auto-renew period of ${
          DEFAULT_AUTORENEW_PERIOD_SECONDS / (24 * 60 * 60)
        } days has been set for this token.`
      );
    }

    this.setCurrentTransaction(transaction);
    return this;
  }

  /**
   * Creates a non-fungible token. If the supply key is not provided, the operator's public key will be used.
   * @param {NFTCreateParams} params
   * @returns {Promise<this>}
   * @throws {Error}
   */
  public async createNonFungibleToken(params: NFTCreateParams): Promise<this> {
    this.clearNotes();
    let treasuryAccId = params.treasuryAccountId;
    if (
      !treasuryAccId &&
      this.kit.userAccountId &&
      this.kit.operationalMode === 'provideBytes'
    ) {
      this.logger.info(
        `[HtsBuilder.createNonFungibleToken] Using userAccountId ${this.kit.userAccountId} as treasury for NFT creation in provideBytes mode.`
      );
      treasuryAccId = AccountId.fromString(this.kit.userAccountId);
      this.addNote(
        `Since no treasury was specified, your account (${this.kit.userAccountId}) has been set as the NFT collection's treasury.`
      );
    }
    if (!treasuryAccId) {
      throw new Error(
        '[HtsBuilder.createNonFungibleToken] Treasury Account ID is required (e.g., explicitly, via userAccountId for provideBytes mode, or via agent operator for directExecution if applicable).'
      );
    }

    let tokenSymbolToUse = params.tokenSymbol;
    if (!tokenSymbolToUse) {
      tokenSymbolToUse = generateDefaultSymbol(params.tokenName);
      this.addNote(
        `We've generated an NFT collection symbol '${tokenSymbolToUse}' for you, based on the collection name '${params.tokenName}'.`
      );
    }

    let sdkSupplyType: TokenSupplyType;
    if (typeof params.supplyType === 'string') {
      const supplyTypeString: string = params.supplyType;
      if (
        supplyTypeString.toUpperCase() ===
        TokenSupplyType.Finite.toString().toUpperCase()
      ) {
        sdkSupplyType = TokenSupplyType.Finite;
      } else if (
        supplyTypeString.toUpperCase() ===
        TokenSupplyType.Infinite.toString().toUpperCase()
      ) {
        sdkSupplyType = TokenSupplyType.Infinite;
      } else {
        this.logger.warn(
          `Invalid string for NFT supplyType: ${supplyTypeString}. Defaulting to FINITE as per NFT common practice.`
        );
        this.addNote(
          `Invalid supplyType string '${supplyTypeString}' received for NFT, defaulted to FINITE.`
        );
        sdkSupplyType = TokenSupplyType.Finite;
      }
    } else {
      sdkSupplyType = params.supplyType;
    }

    const transaction = new TokenCreateTransaction()
      .setTokenName(params.tokenName)
      .setTokenSymbol(tokenSymbolToUse)
      .setTreasuryAccountId(treasuryAccId)
      .setTokenType(TokenType.NonFungibleUnique)
      .setSupplyType(sdkSupplyType)
      .setInitialSupply(0)
      .setDecimals(0);

    if (sdkSupplyType === TokenSupplyType.Finite && params.maxSupply) {
      transaction.setMaxSupply(this.parseAmount(params.maxSupply));
    } else if (sdkSupplyType === TokenSupplyType.Finite && !params.maxSupply) {
      this.logger.warn(
        'NFT supplyType is FINITE but no maxSupply was provided. This might lead to an unmintable token or undesired SDK default. Consider prompting user for maxSupply or setting a builder default.'
      );
      this.addNote(
        'For this FINITE NFT collection, a specific maximum supply was not provided. The Hedera network might apply its own default or limit minting.'
      );
    }
    if (params.adminKey) {
      const parsedKey = await this.parseKey(params.adminKey);
      if (parsedKey) transaction.setAdminKey(parsedKey);
    }
    if (params.kycKey) {
      const parsedKey = await this.parseKey(params.kycKey);
      if (parsedKey) transaction.setKycKey(parsedKey);
    }
    if (params.freezeKey) {
      const parsedKey = await this.parseKey(params.freezeKey);
      if (parsedKey) transaction.setFreezeKey(parsedKey);
    }
    if (params.wipeKey) {
      const parsedKey = await this.parseKey(params.wipeKey);
      if (parsedKey) {
        transaction.setWipeKey(parsedKey);
      }
    }

    if (params.supplyKey) {
      const parsedKey = await this.parseKey(params.supplyKey);
      if (parsedKey) {
        transaction.setSupplyKey(parsedKey);
      }
    } else {
      const operator = await this.kit.query().getAccountInfo(treasuryAccId);
      const key = operator?.key?.key;
      if (key) {
        transaction.setSupplyKey(PublicKey.fromString(key));
      }
    }

    if (params.feeScheduleKey) {
      const parsedKey = await this.parseKey(params.feeScheduleKey);
      if (parsedKey) {
        transaction.setFeeScheduleKey(parsedKey);
      }
    }
    if (params.pauseKey) {
      const parsedKey = await this.parseKey(params.pauseKey);
      if (parsedKey) {
        transaction.setPauseKey(parsedKey);
      }
    }
    if (params.memo) {
      transaction.setTokenMemo(params.memo);
    }
    if (params.customFees && params.customFees.length > 0) {
      const sdkCustomFees = mapToSdkCustomFees(
        params.customFees as unknown as CustomFeeInputData[],
        this.parseAmount.bind(this),
        this.logger,
        this.kit.userAccountId,
        this.kit.operationalMode,
        this.addNote.bind(this)
      );
      transaction.setCustomFees(sdkCustomFees);
    }
    if (params.autoRenewAccountId) {
      transaction.setAutoRenewAccountId(params.autoRenewAccountId);
    }
    if (params.autoRenewPeriod) {
      transaction.setAutoRenewPeriod(params.autoRenewPeriod);
    } else if (params.autoRenewAccountId) {
      transaction.setAutoRenewPeriod(DEFAULT_AUTORENEW_PERIOD_SECONDS);
      this.addNote(
        `A standard auto-renew period of ${
          DEFAULT_AUTORENEW_PERIOD_SECONDS / (24 * 60 * 60)
        } days has been set for this NFT collection.`
      );
    }

    this.setCurrentTransaction(transaction);
    return this;
  }

  /**
   * @param {MintFTParams} params
   * @returns {this}
   */
  public mintFungibleToken(params: MintFTParams): this {
    const transaction = new TokenMintTransaction()
      .setTokenId(params.tokenId)
      .setAmount(this.parseAmount(params.amount));
    this.setCurrentTransaction(transaction);
    return this;
  }

  /**
   * @param {BurnFTParams} params
   * @returns {this}
   */
  public burnFungibleToken(params: BurnFTParams): this {
    const transaction = new TokenBurnTransaction()
      .setTokenId(params.tokenId)
      .setAmount(this.parseAmount(params.amount));
    this.setCurrentTransaction(transaction);
    return this;
  }

  /**
   * @param {MintNFTParams} params
   * @returns {this}
   * @throws {Error}
   */
  public mintNonFungibleToken(params: MintNFTParams): this {
    const transaction = new TokenMintTransaction()
      .setTokenId(params.tokenId)
      .setMetadata(
        params.metadata.map((m) => {
          if (typeof m === 'string') {
            return Buffer.from(m, 'utf8');
          }
          return m;
        })
      );
    this.setCurrentTransaction(transaction);
    return this;
  }

  /**
   * @param {BurnNFTParams} params
   * @returns {this}
   */
  public burnNonFungibleToken(params: BurnNFTParams): this {
    if (!params.serials || params.serials.length === 0) {
      throw new Error('Serial numbers are required to burn NFTs.');
    }
    const serialsAsLong = params.serials.map((s) => this.parseAmount(s));
    const transaction = new TokenBurnTransaction()
      .setTokenId(params.tokenId)
      .setSerials(serialsAsLong);
    this.setCurrentTransaction(transaction);
    return this;
  }

  /**
   * @param {TransferNFTParams} params - Parameters for transferring a single NFT.
   * @returns {this}
   */
  public transferNft(params: TransferNFTParams): this {
    let transaction: TransferTransaction = new TransferTransaction();

    if (!params.isApproved) {
      transaction = transaction.addNftTransfer(
        params.nftId,
        params.senderAccountId,
        params.receiverAccountId
      );
    } else {
      transaction = transaction.addApprovedNftTransfer(
        params.nftId,
        params.senderAccountId,
        params.receiverAccountId
      );
    }

    if (params.memo) {
      transaction.setTransactionMemo(params.memo);
    }

    this.setCurrentTransaction(transaction);
    return this;
  }

  /**
   * @param {AssociateTokensParams} params
   * @returns {this}
   */
  public associateTokens(params: AssociateTokensParams): this {
    const transaction = new TokenAssociateTransaction()
      .setAccountId(params.accountId)
      .setTokenIds(
        params.tokenIds.map((id) =>
          typeof id === 'string' ? TokenId.fromString(id) : id
        )
      );
    this.setCurrentTransaction(transaction);
    return this;
  }

  /**
   * @param {DissociateTokensParams} params
   * @returns {this}
   */
  public dissociateTokens(params: DissociateTokensParams): this {
    const transaction = new TokenDissociateTransaction()
      .setAccountId(params.accountId)
      .setTokenIds(
        params.tokenIds.map((id) =>
          typeof id === 'string' ? TokenId.fromString(id) : id
        )
      );
    this.setCurrentTransaction(transaction);
    return this;
  }

  /**
   * @param {TransferTokensParams} params - Parameters for transferring fungible tokens, NFTs, and/or HBAR.
   * @returns {this}
   */
  public transferTokens(params: TransferTokensParams): this {
    const transaction = new TransferTransaction();

    if (params.tokenTransfers && params.tokenTransfers.length > 0) {
      for (const transferInput of params.tokenTransfers) {
        if (transferInput.type === 'fungible') {
          const fungibleTransfer = transferInput as FungibleTokenTransferSpec;
          transaction.addTokenTransfer(
            typeof fungibleTransfer.tokenId === 'string'
              ? TokenId.fromString(fungibleTransfer.tokenId)
              : fungibleTransfer.tokenId,
            typeof fungibleTransfer.accountId === 'string'
              ? AccountId.fromString(fungibleTransfer.accountId)
              : fungibleTransfer.accountId,
            this.parseAmount(fungibleTransfer.amount)
          );
        } else if (transferInput.type === 'nft') {
          const toolNftInput = transferInput as any;

          const sdkTokenId = TokenId.fromString(toolNftInput.tokenId as string);

          let serialValueForLong: number | Long;
          if (typeof toolNftInput.serial === 'string') {
            serialValueForLong = parseInt(toolNftInput.serial, 10);
          } else {
            serialValueForLong = toolNftInput.serial as number | Long;
          }
          const sdkSerial = Long.fromValue(serialValueForLong);
          const sdkNftId = new NftId(sdkTokenId, sdkSerial);

          const senderAccountId = AccountId.fromString(
            toolNftInput.senderAccountId as string
          );
          const receiverAccountId = AccountId.fromString(
            toolNftInput.receiverAccountId as string
          );

          if (toolNftInput.isApproved) {
            transaction.addApprovedNftTransfer(
              sdkNftId,
              senderAccountId,
              receiverAccountId
            );
          } else {
            transaction.addNftTransfer(
              sdkNftId,
              senderAccountId,
              receiverAccountId
            );
          }
        }
      }
    }

    if (params.hbarTransfers && params.hbarTransfers.length > 0) {
      for (const hbarInput of params.hbarTransfers) {
        const sdkHbarAmount = Hbar.fromString(hbarInput.amount.toString());
        transaction.addHbarTransfer(
          typeof hbarInput.accountId === 'string'
            ? AccountId.fromString(hbarInput.accountId)
            : hbarInput.accountId,
          sdkHbarAmount
        );
      }
    }

    if (params.memo) {
      transaction.setTransactionMemo(params.memo);
    }

    this.setCurrentTransaction(transaction);
    return this;
  }

  /**
   * @param {WipeTokenAccountParams} params
   * @returns {this}
   * @throws {Error}
   */
  public wipeTokenAccount(params: WipeTokenAccountParams): this {
    const transaction = new TokenWipeTransaction()
      .setAccountId(params.accountId)
      .setTokenId(
        typeof params.tokenId === 'string'
          ? TokenId.fromString(params.tokenId)
          : params.tokenId
      );
    if (params.amount) {
      transaction.setAmount(this.parseAmount(params.amount));
    }
    if (params.serials && params.serials.length > 0) {
      transaction.setSerials(params.serials.map((s) => this.parseAmount(s)));
    }
    this.setCurrentTransaction(transaction);
    return this;
  }

  /**
   * @param {FreezeTokenAccountParams} params
   * @returns {this}
   */
  public freezeTokenAccount(params: FreezeTokenAccountParams): this {
    const transaction = new TokenFreezeTransaction()
      .setAccountId(params.accountId)
      .setTokenId(
        typeof params.tokenId === 'string'
          ? TokenId.fromString(params.tokenId)
          : params.tokenId
      );
    this.setCurrentTransaction(transaction);
    return this;
  }

  /**
   * @param {UnfreezeTokenAccountParams} params
   * @returns {this}
   */
  public unfreezeTokenAccount(params: UnfreezeTokenAccountParams): this {
    const transaction = new TokenUnfreezeTransaction()
      .setAccountId(params.accountId)
      .setTokenId(
        typeof params.tokenId === 'string'
          ? TokenId.fromString(params.tokenId)
          : params.tokenId
      );
    this.setCurrentTransaction(transaction);
    return this;
  }

  /**
   * @param {GrantKycTokenParams} params
   * @returns {this}
   */
  public grantKycToken(params: GrantKycTokenParams): this {
    const transaction = new TokenGrantKycTransaction()
      .setAccountId(params.accountId)
      .setTokenId(
        typeof params.tokenId === 'string'
          ? TokenId.fromString(params.tokenId)
          : params.tokenId
      );
    this.setCurrentTransaction(transaction);
    return this;
  }

  /**
   * @param {RevokeKycTokenParams} params
   * @returns {this}
   */
  public revokeKycToken(params: RevokeKycTokenParams): this {
    const transaction = new TokenRevokeKycTransaction()
      .setAccountId(params.accountId)
      .setTokenId(
        typeof params.tokenId === 'string'
          ? TokenId.fromString(params.tokenId)
          : params.tokenId
      );
    this.setCurrentTransaction(transaction);
    return this;
  }

  /**
   * @param {PauseTokenParams} params
   * @returns {this}
   */
  public pauseToken(params: PauseTokenParams): this {
    const transaction = new TokenPauseTransaction().setTokenId(
      typeof params.tokenId === 'string'
        ? TokenId.fromString(params.tokenId)
        : params.tokenId
    );
    this.setCurrentTransaction(transaction);
    return this;
  }

  /**
   * @param {UnpauseTokenParams} params
   * @returns {this}
   */
  public unpauseToken(params: UnpauseTokenParams): this {
    const transaction = new TokenUnpauseTransaction().setTokenId(
      typeof params.tokenId === 'string'
        ? TokenId.fromString(params.tokenId)
        : params.tokenId
    );
    this.setCurrentTransaction(transaction);
    return this;
  }

  /**
   * @param {UpdateTokenParams} params
   * @returns {Promise<this>}
   * @throws {Error}
   */
  public async updateToken(params: UpdateTokenParams): Promise<this> {
    if (!params.tokenId) {
      throw new Error('Token ID is required to update a token.');
    }
    this.logger.info(
      `[HtsBuilder.updateToken] Starting update for token ID: ${params.tokenId.toString()}`
    );
    const transaction = new TokenUpdateTransaction().setTokenId(
      typeof params.tokenId === 'string'
        ? TokenId.fromString(params.tokenId)
        : params.tokenId
    );

    if (Object.prototype.hasOwnProperty.call(params, 'tokenName')) {
      transaction.setTokenName(
        params.tokenName === null ? '' : params.tokenName!
      );
    }
    if (Object.prototype.hasOwnProperty.call(params, 'tokenSymbol')) {
      transaction.setTokenSymbol(
        params.tokenSymbol === null ? '' : params.tokenSymbol!
      );
    }
    if (params.treasuryAccountId) {
      transaction.setTreasuryAccountId(params.treasuryAccountId);
    }

    if (Object.prototype.hasOwnProperty.call(params, 'adminKey')) {
      if (params.adminKey === null) transaction.setAdminKey(new KeyList());
      else if (params.adminKey) {
        const pk = await this.parseKey(params.adminKey);
        if (pk) transaction.setAdminKey(pk);
      }
    }
    if (Object.prototype.hasOwnProperty.call(params, 'kycKey')) {
      if (params.kycKey === null) transaction.setKycKey(new KeyList());
      else if (params.kycKey) {
        const pk = await this.parseKey(params.kycKey);
        if (pk) transaction.setKycKey(pk);
      }
    }
    if (Object.prototype.hasOwnProperty.call(params, 'freezeKey')) {
      if (params.freezeKey === null) transaction.setFreezeKey(new KeyList());
      else if (params.freezeKey) {
        const pk = await this.parseKey(params.freezeKey);
        if (pk) transaction.setFreezeKey(pk);
      }
    }
    if (Object.prototype.hasOwnProperty.call(params, 'wipeKey')) {
      if (params.wipeKey === null) transaction.setWipeKey(new KeyList());
      else if (params.wipeKey) {
        const pk = await this.parseKey(params.wipeKey);
        if (pk) transaction.setWipeKey(pk);
      }
    }
    if (Object.prototype.hasOwnProperty.call(params, 'supplyKey')) {
      if (params.supplyKey === null) transaction.setSupplyKey(new KeyList());
      else if (params.supplyKey) {
        const pk = await this.parseKey(params.supplyKey);
        if (pk) transaction.setSupplyKey(pk);
      }
    }
    if (Object.prototype.hasOwnProperty.call(params, 'feeScheduleKey')) {
      if (params.feeScheduleKey === null)
        transaction.setFeeScheduleKey(new KeyList());
      else if (params.feeScheduleKey) {
        const pk = await this.parseKey(params.feeScheduleKey);
        if (pk) transaction.setFeeScheduleKey(pk);
      }
    }
    if (Object.prototype.hasOwnProperty.call(params, 'pauseKey')) {
      if (params.pauseKey === null) transaction.setPauseKey(new KeyList());
      else if (params.pauseKey) {
        const pk = await this.parseKey(params.pauseKey);
        if (pk) transaction.setPauseKey(pk);
      }
    }

    if (Object.prototype.hasOwnProperty.call(params, 'memo')) {
      transaction.setTokenMemo(params.memo === null ? '' : params.memo!);
    }

    if (Object.prototype.hasOwnProperty.call(params, 'autoRenewAccountId')) {
      const autoRenewId = params.autoRenewAccountId;
      if (autoRenewId === null) {
        transaction.setAutoRenewAccountId(AccountId.fromString('0.0.0'));
      } else if (autoRenewId) {
        transaction.setAutoRenewAccountId(autoRenewId);
      }
    }
    if (params.autoRenewPeriod) {
      transaction.setAutoRenewPeriod(params.autoRenewPeriod);
    }

    this.logger.info(
      '[HtsBuilder.updateToken] Transaction object populated. Setting current transaction.',
      transaction
    );
    this.setCurrentTransaction(transaction);
    this.logger.info(
      '[HtsBuilder.updateToken] Current transaction set. Value:',
      this.currentTransaction
    );
    return this;
  }

  /**
   * @param {DeleteTokenParams} params
   * @returns {this}
   */
  public deleteToken(params: DeleteTokenParams): this {
    if (!params.tokenId) {
      throw new Error('Token ID is required to delete a token.');
    }
    const transaction = new TokenDeleteTransaction().setTokenId(
      typeof params.tokenId === 'string'
        ? TokenId.fromString(params.tokenId)
        : params.tokenId
    );
    this.setCurrentTransaction(transaction);
    return this;
  }

  /**
   * @param {TokenFeeScheduleUpdateParams} params
   * @returns {this}
   */
  public async feeScheduleUpdate(
    params: TokenFeeScheduleUpdateParams
  ): Promise<this> {
    this.clearNotes();
    if (!params.tokenId) {
      throw new Error('Token ID is required to update fee schedule.');
    }
    const sdkCustomFees = mapToSdkCustomFees(
      params.customFees as unknown as CustomFeeInputData[],
      this.parseAmount.bind(this),
      this.logger,
      this.kit.userAccountId,
      this.kit.operationalMode,
      this.addNote.bind(this)
    );
    const transaction = new TokenFeeScheduleUpdateTransaction()
      .setTokenId(
        typeof params.tokenId === 'string'
          ? TokenId.fromString(params.tokenId)
          : params.tokenId
      )
      .setCustomFees(sdkCustomFees);
    this.setCurrentTransaction(transaction);
    return this;
  }

  /**
   * Configures a transaction to airdrop fungible tokens from the operator's account to multiple recipients.
   * This method uses the `TokenAirdropTransaction`.
   * @param {AirdropTokenParams} params - Parameters for the airdrop.
   * @returns {this} The HtsBuilder instance for fluent chaining.
   * @throws {Error} If no recipients are provided or if amounts are invalid.
   */
  public airdropToken(params: AirdropTokenParams): this {
    if (!params.recipients || params.recipients.length === 0) {
      throw new Error('Recipients are required for an airdrop.');
    }

    const transaction = new TokenAirdropTransaction();
    const operatorAccountId = this.kit.signer.getAccountId();
    const tokenId =
      typeof params.tokenId === 'string'
        ? TokenId.fromString(params.tokenId)
        : params.tokenId;
    let validTransfersMade = false;

    for (const recipient of params.recipients) {
      const transferAmount = this.parseAmount(recipient.amount);

      if (transferAmount.isZero() || transferAmount.isNegative()) {
        this.logger.warn(
          `Skipping airdrop to ${recipient.accountId.toString()} with zero or negative amount.`
        );
        continue;
      }

      transaction.addTokenTransfer(
        tokenId,
        operatorAccountId,
        transferAmount.negate()
      );
      transaction.addTokenTransfer(
        tokenId,
        recipient.accountId,
        transferAmount
      );
      validTransfersMade = true;
    }

    if (!validTransfersMade) {
      throw new Error(
        'No valid transfers generated for the airdrop. Check recipient amounts.'
      );
    }

    if (params.memo) {
      transaction.setTransactionMemo(params.memo);
    }

    this.setCurrentTransaction(transaction);
    return this;
  }

  /**
   * Configures a transaction to claim pending airdrops.
   * The operator (signer) is the recipient of the claim.
   * @param {ClaimAirdropParams} params - Parameters specifying which pending airdrops to claim.
   *                                      The `pendingAirdropIds` should be valid `PendingAirdropId` instances from the SDK.
   * @returns {this} The HtsBuilder instance for fluent chaining.
   * @throws {Error} If no `pendingAirdropIds` are provided.
   */
  public claimAirdrop(params: ClaimAirdropParams): this {
    if (!params.pendingAirdropIds || params.pendingAirdropIds.length === 0) {
      throw new Error(
        'pendingAirdropIds must be provided and non-empty for claimAirdrop.'
      );
    }

    const transaction = new TokenClaimAirdropTransaction();

    for (const pendingId of params.pendingAirdropIds) {
      transaction.addPendingAirdropId(pendingId);
    }

    if (params.memo) {
      transaction.setTransactionMemo(params.memo);
    }

    this.setCurrentTransaction(transaction);
    return this;
  }

  /**
   * Configures a transaction to cancel pending airdrops sent by the operator.
   * @param {CancelAirdropParams} params - Parameters specifying which pending airdrops to cancel.
   *                                       The `pendingAirdropIds` should be valid `PendingAirdropId` instances from the SDK.
   * @returns {this} The HtsBuilder instance for fluent chaining.
   * @throws {Error} If no `pendingAirdropIds` are provided.
   */
  public cancelAirdrop(params: CancelAirdropParams): this {
    if (!params.pendingAirdropIds || params.pendingAirdropIds.length === 0) {
      throw new Error(
        'pendingAirdropIds must be provided and non-empty for cancelAirdrop.'
      );
    }
    const transaction = new TokenCancelAirdropTransaction();

    transaction.setPendingAirdropIds(params.pendingAirdropIds);

    if (params.memo) {
      transaction.setTransactionMemo(params.memo);
    }

    this.setCurrentTransaction(transaction);
    return this;
  }

  /**
   * Configures a transaction for the operator to reject future auto-associations with specified token types.
   * @param {RejectAirdropParams} params - Parameters specifying which tokens to reject.
   *        Note: `senderAccountId` and `serials` from `RejectAirdropParams` are currently ignored by this method
   *        as `TokenRejectTransaction` operates on token types for the owner.
   * @returns {this} The HtsBuilder instance for fluent chaining.
   */
  public rejectTokens(params: RejectAirdropParams): this {
    const transaction = new TokenRejectTransaction().setOwnerId(
      this.kit.signer.getAccountId()
    );

    const tokenToReject =
      typeof params.tokenId === 'string'
        ? TokenId.fromString(params.tokenId)
        : params.tokenId;
    transaction.addTokenId(tokenToReject);

    if (params.memo) {
      transaction.setTransactionMemo(params.memo);
    }

    this.setCurrentTransaction(transaction);
    return this;
  }
}

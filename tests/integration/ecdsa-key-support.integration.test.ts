import { describe, it, expect, beforeAll } from 'vitest';
import { PrivateKey, AccountId } from '@hashgraph/sdk';
import { detectKeyTypeFromString } from '@hashgraphonline/standards-sdk';
import { ServerSigner } from '../../src/signer/server-signer';
import { HederaAgentKit } from '../../src/agent/agent';
import { parseKey } from '../../src/utils/key-utils';
import { initializeTestKit } from './utils';
import './setup-env';

describe('ECDSA Key Support Integration Tests', () => {
  let kit: HederaAgentKit;
  let testAccountId: string;
  let testPrivateKey: string;
  let testNetwork: 'testnet' | 'mainnet' = 'testnet';

  beforeAll(async () => {
    testAccountId = process.env.HEDERA_ACCOUNT_ID!;
    testPrivateKey = process.env.HEDERA_PRIVATE_KEY!;

    if (!testAccountId || !testPrivateKey) {
      throw new Error(
        'HEDERA_ACCOUNT_ID and HEDERA_PRIVATE_KEY must be set in environment'
      );
    }

    kit = await initializeTestKit();
  });

  describe('Key Type Detection', () => {
    it('should correctly detect ECDSA key with 0x prefix', () => {
      const ecdsaKey0x =
        '0xabcd1234567890abcd1234567890abcd1234567890abcd1234567890abcd1234';
      const result = detectKeyTypeFromString(ecdsaKey0x);

      expect(result.detectedType).toBe('ecdsa');
      expect(result.privateKey).toBeDefined();
    });

    it('should correctly detect ECDSA key with DER prefix', () => {
      const ecdsaKeyDer =
        '3030020100300706052b8104000a04220420abcd1234567890abcd1234567890abcd1234567890abcd1234567890abcd1234';
      const result = detectKeyTypeFromString(ecdsaKeyDer);

      expect(result.detectedType).toBe('ecdsa');
      expect(result.privateKey).toBeDefined();
    });

    it('should correctly detect ED25519 key', () => {
      const ed25519Key =
        '302e020100300506032b6570042204201234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';
      const result = detectKeyTypeFromString(ed25519Key);

      expect(result.detectedType).toBe('ed25519');
      expect(result.privateKey).toBeDefined();
    });

    it('should handle key detection in parseKey utility', () => {
      const ecdsaKey =
        '0xabcd1234567890abcd1234567890abcd1234567890abcd1234567890abcd1234';
      const parsedKey = parseKey(ecdsaKey);

      expect(parsedKey).toBeDefined();
      expect(parsedKey).not.toBeNull();
    });
  });

  describe('ServerSigner with ECDSA Keys', () => {
    it('should create ServerSigner with ECDSA key string', async () => {
      const ecdsaPrivateKey = PrivateKey.generateECDSA();
      const ecdsaKeyString = ecdsaPrivateKey.toString();

      const signer = new ServerSigner(
        testAccountId,
        ecdsaKeyString,
        testNetwork
      );

      expect(signer).toBeDefined();
      expect(signer.getAccountId().toString()).toBe(testAccountId);
      expect(signer.getKeyTypeSync()).toBeDefined();
    });

    it('should create ServerSigner with ED25519 key string', async () => {
      const ed25519PrivateKey = PrivateKey.generateED25519();
      const ed25519KeyString = ed25519PrivateKey.toString();

      const signer = new ServerSigner(
        testAccountId,
        ed25519KeyString,
        testNetwork
      );

      expect(signer).toBeDefined();
      expect(signer.getAccountId().toString()).toBe(testAccountId);
      expect(signer.getKeyTypeSync()).toBe('ed25519');
    });

    it('should handle PrivateKey object directly', () => {
      const privateKey = PrivateKey.fromString(testPrivateKey);

      const signer = new ServerSigner(testAccountId, privateKey, testNetwork);

      expect(signer).toBeDefined();
      expect(signer.getAccountId().toString()).toBe(testAccountId);
    });
  });

  describe('HederaAgentKit with ECDSA Keys', () => {
    it('should create HederaAgentKit with ECDSA signer', async () => {
      const signer = new ServerSigner(
        testAccountId,
        testPrivateKey,
        testNetwork
      );

      const testKit = new HederaAgentKit(signer);

      expect(testKit).toBeDefined();
      expect(testKit.signer).toBe(signer);
    });
  });

  describe('Account Operations with ECDSA Keys', () => {
    it('should handle ECDSA key in account creation', async () => {
      const signer = new ServerSigner(
        testAccountId,
        testPrivateKey,
        testNetwork
      );

      const testKit = new HederaAgentKit(signer);
      await testKit.initialize();
      const accountBuilder = testKit.accounts();

      const newAccountKey = PrivateKey.generateECDSA();
      const keyString = newAccountKey.toString();

      const transaction = accountBuilder
        .createAccount({ key: keyString })
        .getCurrentTransaction();

      expect(transaction).toBeDefined();
    });

    it('should handle ECDSA key in account update', async () => {
      const signer = new ServerSigner(
        testAccountId,
        testPrivateKey,
        testNetwork
      );

      const testKit = new HederaAgentKit(signer);
      await testKit.initialize();
      const accountBuilder = testKit.accounts();

      const newKey = PrivateKey.generateECDSA();
      const keyString = newKey.toString();

      const transaction = accountBuilder
        .updateAccount({
          accountIdToUpdate: testAccountId,
          key: keyString,
          amount: 0,
        })
        .getCurrentTransaction();

      expect(transaction).toBeDefined();
    });
  });

  describe('File Operations with ECDSA Keys', () => {
    it('should handle ECDSA keys in file creation', async () => {
      const signer = new ServerSigner(
        testAccountId,
        testPrivateKey,
        testNetwork
      );

      const testKit = new HederaAgentKit(signer);
      await testKit.initialize();
      const fileBuilder = testKit.fs();

      const key1 = PrivateKey.generateECDSA().toString();
      const key2 = PrivateKey.generateED25519().toString();

      const transaction = fileBuilder
        .createFile({
          contents: 'Test file with mixed key types',
          keys: [key1, key2],
        })
        .getCurrentTransaction();

      expect(transaction).toBeDefined();
    });
  });

  describe('Contract Operations with ECDSA Admin Keys', () => {
    it('should handle ECDSA admin key in contract creation', async () => {
      const signer = new ServerSigner(
        testAccountId,
        testPrivateKey,
        testNetwork
      );

      const testKit = new HederaAgentKit(signer);
      await testKit.initialize();
      const contractBuilder = testKit.scs();

      const adminKey = PrivateKey.generateECDSA().toString();

      const transaction = contractBuilder
        .createContract({
          bytecode: '0x123456',
          adminKey: adminKey,
          gas: 100000,
        })
        .getCurrentTransaction();

      expect(transaction).toBeDefined();
    });
  });

  describe('Mirror Node Key Type Verification', () => {
    it('should verify key type with mirror node in ServerSigner', async () => {
      const signer = new ServerSigner(
        testAccountId,
        testPrivateKey,
        testNetwork
      );

      const keyType = await signer.getKeyType();
      expect(['ed25519', 'ecdsa']).toContain(keyType);
    });
  });
});

import dotenv from 'dotenv';
import path from 'path';

// Resolve path from this setup file (tests/integration/setup-env.ts) to .env in the project root (hedera-agent-kit/.env)
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
 
console.log('dotenv setup file executed for integration tests (loading .env).');
console.log('HEDERA_ACCOUNT_ID loaded:', !!process.env.HEDERA_ACCOUNT_ID);
console.log('HEDERA_PRIVATE_KEY loaded:', !!process.env.HEDERA_PRIVATE_KEY);
console.log('HEDERA_KEY_TYPE loaded:', !!process.env.HEDERA_KEY_TYPE);
console.log('OPENAI_API_KEY loaded:', !!process.env.OPENAI_API_KEY); 
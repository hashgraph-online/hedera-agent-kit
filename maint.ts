import { ServerSigner, HederaConversationalAgent } from './src/index';
import * as dotenv from 'dotenv';
dotenv.config();

const main = async () => {
    // setting up the agent
    const signer = new ServerSigner(process.env.HEDERA_ACCOUNT_ID!, process.env.HEDERA_PRIVATE_KEY!, 'testnet');
    const agent = new HederaConversationalAgent(signer, {
        openAIApiKey: process.env.OPENAI_API_KEY,
        operationalMode: 'autonomous'
    });
    await agent.initialize();

    const history: Array<{ type: 'human' | 'ai'; content: string }> = [];

    // function for processing user prompts and agent responses
    async function ask(prompt: string) {
        history.push({ type: 'human', content: prompt });
        const res = await agent.processMessage(prompt, history);
        history.push({ type: 'ai', content: res.message! });
        console.log(res.message);
    }

    await ask('What is my HBAR balance?');
}

main();
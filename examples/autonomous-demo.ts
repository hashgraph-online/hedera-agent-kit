if (typeof window === 'undefined') {
    (global as any).window = {};
}
if (typeof self === 'undefined') {
    (global as any).self = global;
}

import * as dotenv from 'dotenv';
dotenv.config();

import './hedera-logger-override';

import { ServerSigner } from '../src/signer/server-signer';
import * as readline from 'readline';
import {
    HederaConversationalAgent,
    AgentResponse,
} from '../src/agent/conversational-agent';
import { HelloWorldPlugin } from './hello-world-plugin';
import { IPlugin } from '@hashgraphonline/standards-agent-kit';
import { NetworkType } from '../../standards-sdk/src';
import chalk from 'chalk';
import gradient from 'gradient-string';
import { enableHederaLogging } from './hedera-logger-override';

function createInterface() {
    return readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });
}

async function main() {
    const hederaGradient = gradient(['#8259ef', '#2d84eb']);
    const successGradient = gradient(['#3ec878', '#2d84eb']);
    const warningColor = chalk.hex('#464646').dim;
    const errorColor = chalk.hex('#464646');
    const primaryPurple = chalk.hex('#8259ef').bold;
    const primaryBlue = chalk.hex('#2d84eb').bold;
    const primaryGreen = chalk.hex('#3ec878').bold;
    const charcoal = chalk.hex('#464646');

    const banner = `
${hederaGradient(
        '╔═══════════════════════════════════════════════════════════════╗'
    )}
${hederaGradient(
        '║                      HEDERA AGENT KIT                        ║'
    )}
${hederaGradient(
        '║                    Autonomous Agent Demo                     ║'
    )}
${hederaGradient(
        '╚═══════════════════════════════════════════════════════════════╝'
    )}
`;

    console.log(banner);
    console.log(primaryGreen('🚀 Initializing Hedera Agent Kit...\n'));

    const operatorId = process.env.HEDERA_ACCOUNT_ID;
    const operatorKey = process.env.HEDERA_PRIVATE_KEY;
    const network = (process.env.HEDERA_NETWORK || 'testnet') as NetworkType;
    const openaiApiKey = process.env.OPENAI_API_KEY;

    if (!operatorId || !operatorKey) {
        throw new Error(
            'HEDERA_ACCOUNT_ID and HEDERA_PRIVATE_KEY must be set in .env'
        );
    }
    if (!openaiApiKey) {
        throw new Error('OPENAI_API_KEY must be set in .env');
    }

    const agentSigner = new ServerSigner(operatorId, operatorKey, network);

    const conversationalAgent = new HederaConversationalAgent(agentSigner, {
        operationalMode: 'autonomous',
        verbose: false,
        openAIApiKey: openaiApiKey,
        openAIModelName: 'gpt-4o-mini',
        pluginConfig: {
            plugins: [new HelloWorldPlugin() as IPlugin],
        },
    });

    const loadingFrames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
    let frameIndex = 0;
    const loadingInterval = setInterval(() => {
        process.stdout.write(
            `\r${primaryBlue(
                `${loadingFrames[frameIndex]} Initializing Hedera Agent Kit...`
            )}`
        );
        frameIndex = (frameIndex + 1) % loadingFrames.length;
    }, 100);

    await conversationalAgent.initialize();

    setTimeout(() => {
        clearInterval(loadingInterval);
        process.stdout.write('\r' + ' '.repeat(50) + '\r');

        console.log(successGradient('✅ Hedera Agent Kit Ready!'));
        console.log(
            `${primaryPurple('🤖 AI Agent:')} ${chalk.white(
                'Connected and operational'
            )}`
        );
        console.log(
            `${primaryBlue('🌐 Network:')} ${chalk.white(network.toUpperCase())}`
        );
        console.log(
            `${primaryPurple('🔗 Agent Account:')} ${chalk.white(operatorId)}`
        );
        console.log(
            `${primaryGreen('⚡ Mode:')} ${chalk.white(
                'Direct Execution'
            )} ${charcoal.dim('(agent signs and pays for all transactions)')}`
        );
        console.log(
            `${primaryGreen('🔧 Tools:')} ${chalk.white('81 Hedera tools loaded')}`
        );
        console.log();
        console.log(
            primaryBlue.dim('💬 Type "exit" to quit, or try "say hello to Hedera"')
        );
        console.log(
            primaryPurple.dim(
                '💡 Try: "create an account", "check balance of 0.0.34567", or "send 1 HBAR to 0.0.123"'
            )
        );
        console.log(
            charcoal.dim(
                '⚠️  Note: All transactions will be executed directly by the agent account'
            )
        );
        console.log();

        console.log(
            charcoal.dim(
                '📊 Initialization logs suppressed for clean startup experience'
            )
        );
        console.log();
        enableHederaLogging();
        askQuestion();
    }, 1000);

    const chatHistory: Array<{ type: 'human' | 'ai'; content: string }> = [];
    const rl = createInterface();

    async function processAndRespond(userInput: string) {
        chatHistory.push({ type: 'human', content: userInput });

        const agentResponse: AgentResponse =
            await conversationalAgent.processMessage(userInput, chatHistory);

        if (agentResponse.notes) {
            console.log(
                `${primaryBlue('Agent Notes >')} ${charcoal.dim(
                    agentResponse.notes.map((note) => `- ${note}`).join('\n')
                )}`
            );
        }

        console.log(
            `${primaryPurple('Agent Message >')} ${chalk.white(
                agentResponse.message
            )}`
        );

        // In direct execution mode, we might get tool outputs (like transaction receipts)
        if (agentResponse.output && agentResponse.output !== agentResponse.message) {
            console.log(
                `${primaryBlue('Agent Tool Output >')} ${charcoal.dim(
                    agentResponse.output
                )}`
            );
        }

        chatHistory.push({
            type: 'ai',
            content: agentResponse.message || agentResponse.output,
        });

        if (agentResponse.error) {
            console.error(
                `${errorColor('Agent >')} ${charcoal.dim('Error reported by agent:')}`,
                agentResponse.error
            );
        }

        askQuestion();
    }

    function askQuestion() {
        setTimeout(() => {
            rl.question(`${primaryGreen('User >')} `, async (input) => {
                if (input.toLowerCase() === 'exit') {
                    rl.close();
                    console.log(
                        `\n${hederaGradient(
                            '🎉 Autonomous agent demo finished. Thank you for using Hedera Agent Kit!'
                        )}`
                    );
                    return;
                }
                try {
                    console.log(
                        `\n${primaryBlue('🤖 Processing request...')} ${chalk.white(
                            `"${input}"`
                        )}`
                    );
                    await processAndRespond(input);
                } catch (e: any) {
                    const errorMsg = e.message || String(e);
                    console.error(
                        `${errorColor('Error during agent invocation:')}`,
                        errorMsg
                    );
                    chatHistory.push({
                        type: 'ai',
                        content: `Sorry, a critical error occurred: ${errorMsg}`,
                    });
                    askQuestion();
                }
            });
        }, 100);
    }
}

main().catch(console.error); 
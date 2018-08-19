/**
 * Copyright(c) Microsoft Corporation.All rights reserved.
 * Licensed under the MIT License.
 */
import { AppInsightsService, BotConfiguration, IAppInsightsService } from 'botframework-config';
import * as chalk from 'chalk';
import * as program from 'commander';
import * as getStdin from 'get-stdin';
import * as txtfile from 'read-text-file';
import { uuidValidate } from './utils';

program.Command.prototype.unknownOption = function (flag: any) {
    console.error(chalk.default.redBright(`Unknown arguments: ${flag}`));
    showErrorHelp();
};

interface ConnectAppInsightsArgs extends IAppInsightsService {
    bot: string;
    secret: string;
    stdin: boolean;
    input?: string;
}

program
    .name('msbot connect appinsights')
    .description('Connect the bot file to Azure App Insights')
    .option('-n, -name <name>', 'friendly name (defaults to serviceName)')
    .option('-t, --tenantId <tenantId>', 'Azure Tenant id (either GUID or xxx.onmicrosoft.com)')
    .option('-s, --subscriptionId <subscriptionId>', 'Azure Subscription Id')
    .option('-r, --resourceGroup <resourceGroup>', 'Azure resource group name')
    .option('-s, --serviceName <serviceName>', 'Azure service name')
    .option("-i, --instrumentationKey <instrumentationKey>", "App Insights InstrumentationKey")
    .option("-a, --applicationId <applicationId>", "(OPTIONAL) App Insights Application Id")

    .option('--input <jsonfile>', 'path to arguments in JSON format { id:\'\',name:\'\', ... }')
    .option('--secret <secret>', 'bot file secret password for encrypting service secrets')
    .option('--stdin', 'arguments are passed in as JSON object via stdin')
    .action((cmd, actions) => {

    });

let args = <ConnectAppInsightsArgs><any>program.parse(process.argv);

if (process.argv.length < 3) {
    program.help();
} else {
    if (!args.bot) {
        BotConfiguration.loadBotFromFolder(process.cwd(), args.secret)
            .then(processConnectAzureArgs)
            .catch((reason) => {
                console.error(chalk.default.redBright(reason.toString().split('\n')[0]));
                showErrorHelp();
            });
    } else {
        BotConfiguration.load(args.bot, args.secret)
            .then(processConnectAzureArgs)
            .catch((reason) => {
                console.error(chalk.default.redBright(reason.toString().split('\n')[0]));
                showErrorHelp();
            });
    }
}

async function processConnectAzureArgs(config: BotConfiguration): Promise<BotConfiguration> {
    if (args.stdin) {
        Object.assign(args, JSON.parse(await getStdin()));
    }
    else if (args.input != null) {
        Object.assign(args, JSON.parse(await txtfile.read(<string>args.input)));
    }

    if (!args.serviceName || args.serviceName.length == 0)
        throw new Error('Bad or missing --serviceName');

    if (!args.tenantId || args.tenantId.length == 0)
        throw new Error('Bad or missing --tenantId');

    if (!args.subscriptionId || !uuidValidate(args.subscriptionId))
        throw new Error('Bad or missing --subscriptionId');

    if (!args.resourceGroup || args.resourceGroup.length == 0)
        throw new Error('Bad or missing --resourceGroup');

    if (!args.instrumentationKey || args.instrumentationKey.length == 0)
        throw new Error('Bad or missing --instrumentationKey');

    let service = new AppInsightsService({
        name: args.hasOwnProperty('name') ? args.name : args.serviceName,
        tenantId: args.tenantId,
        subscriptionId: args.subscriptionId,
        resourceGroup: args.resourceGroup,
        serviceName: args.serviceName,
        instrumentationKey: args.instrumentationKey,
        applicationId: args.applicationId,
        apiKeys: {}
    });
    var id = config.connectService(service);
    await config.save(args.secret);
    process.stdout.write(JSON.stringify(config.findService(id), null, 2));
    return config;
}

function showErrorHelp() {
    program.outputHelp((str) => {
        console.error(str);
        return '';
    });
    process.exit(1);
}
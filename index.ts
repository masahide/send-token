/***************************************************************************************
 *
 *  Example 7: Send any type of token.
 *
 *  Instructions:
 *      (1) - Select Network and Address by commenting/uncommenting the desired
 *              NETWORK section and providing valid BCH address.
 *
 *      (2) - Select a Validation method by commenting/uncommenting the desired
 *              VALIDATOR section. Chose from remote validator or local validator.
 *              Both options rely on remote JSON RPC calls to rest.bitcoin.com.
 *                  - Option 1: REMOTE VALIDATION (rest.bitcoin.com/v2/slp/isTxidValid/)
 *                  - Option 2: LOCAL VALIDATOR / REST JSON RPC
 *                  - Option 3: LOCAL VALIDATOR / LOCAL FULL NODE
 *
 *      (3) - Run `tsc && node <file-name.js>` just before script execution, or for
 *              debugger just run `tsc` in the console and then use vscode debugger 
 *              with "Launch Current File" mode.
 *
 * ************************************************************************************/

import * as BITBOXSDK from "bitbox-sdk";
import { BigNumber } from "bignumber.js";
import { BitboxNetwork, SlpBalancesResult, GetRawTransactionsAsync, LocalValidator, Utils } from "slpjs";

(async () => {

    // FOR MAINNET UNCOMMENT
    const BITBOX = new BITBOXSDK.BITBOX({ restURL: "https://rest.bitcoin.com/v2/" });
    const words = '12words'
    const seed = BITBOX.Mnemonic.toSeed(words)
    const masterHDNode = BITBOX.HDNode.fromSeed(seed,"mainnet")
    const account = BITBOX.HDNode.derivePath(masterHDNode, "m/44'/145'/0'")
    const change = BITBOX.HDNode.derivePath(account, "0/0")
    const cashAddress = BITBOX.HDNode.toCashAddress(change)
    // const cashAddress = BITBOX.HDNode.toCashAddress(change)
    const slpAddress = Utils.toSlpAddress(cashAddress)
    // const wif = BITBOX.HDNode.toWIF(change)
    const wif = BITBOX.HDNode.toWIF(masterHDNode)
    const fundingAddress           = "simpleledger:...";     // <-- must be simpleledger format
    // const fundingAddress           = slpAddress;     // <-- must be simpleledger format
    const fundingWif               = wif;        // <-- compressed WIF format
    const tokenReceiverAddress     = [ "simpleledger:..." ]; // <-- must be simpleledger format
    const bchChangeReceiverAddress = slpAddress;     // <-- must be simpleledger format
    const tokenId = "...";
    // const sendAmounts = [ 0.000001 ];
    const sendAmounts = [ 1 ];

    // FOR TESTNET UNCOMMENT
    // const BITBOX = new BITBOXSDK.BITBOX({ restURL: 'https://trest.bitcoin.com/v2/' });
    // const fundingAddress           = "slptest:qpwyc9jnwckntlpuslg7ncmhe2n423304ueqcyw80l";   // <-- must be simpleledger format
    // const fundingWif               = "cVjzvdHGfQDtBEq7oddDRcpzpYuvNtPbWdi8tKQLcZae65G4zGgy"; // <-- compressed WIF format
    // const tokenReceiverAddress     = "slptest:qpwyc9jnwckntlpuslg7ncmhe2n423304ueqcyw80l";   // <-- must be simpleledger format
    // const bchChangeReceiverAddress = "slptest:qpwyc9jnwckntlpuslg7ncmhe2n423304ueqcyw80l";   // <-- must be simpleledger format
    // let tokenId = "78d57a82a0dd9930cc17843d9d06677f267777dd6b25055bad0ae43f1b884091";
    // let sendAmounts = [ 10 ];

    // VALIDATOR: Option 1: FOR REMOTE VALIDATION
    const bitboxNetwork = new BitboxNetwork(BITBOX);

    // VALIDATOR: Option 2: FOR LOCAL VALIDATOR / REMOTE JSON RPC
    // const getRawTransactions: GetRawTransactionsAsync = async function(txids: string[]) { 
    //     return <string[]>await BITBOX.RawTransactions.getRawTransaction(txids) 
    // }
    // const logger = console;
    // const slpValidator = new LocalValidator(BITBOX, getRawTransactions, logger);
    // const bitboxNetwork = new BitboxNetwork(BITBOX, slpValidator);

    // VALIDATOR: Option 3: LOCAL VALIDATOR / LOCAL FULL NODE JSON RPC
    // const logger = console;
    // const RpcClient = require("bitcoin-rpc-promise");
    // const connectionString = "http://bitcoin:password@localhost:8332";
    // const rpc = new RpcClient(connectionString);
    // const slpValidator = new LocalValidator(BITBOX, async (txids) => [ await rpc.getRawTransaction(txids[0]) ], logger);
    // const bitboxNetwork = new BitboxNetwork(BITBOX, slpValidator);

    // 1) Fetch token information
    const tokenInfo = await bitboxNetwork.getTokenInformation(tokenId);
    const tokenDecimals = tokenInfo.decimals;
    console.log("Token precision: " + tokenDecimals.toString());

    // 2) Check that token balance is greater than our desired sendAmount
    const balances = await bitboxNetwork.getAllSlpBalancesAndUtxos(fundingAddress) as SlpBalancesResult;
    console.log(balances);
    if (balances.slpTokenBalances[tokenId] === undefined) {
        console.log("You need to fund the addresses provided in this example with tokens and BCH.  Change the tokenId as required.")
    }
    console.log("Token balance:", balances.slpTokenBalances[tokenId].toFixed() as any / 10 ** tokenDecimals);

    // 3) Calculate send amount in "Token Satoshis".  In this example we want to just send 1 token unit to someone...
    const sendAmountsBN = sendAmounts.map(a => (new BigNumber(a)).times(10**tokenDecimals));  // Don't forget to account for token precision

    // 4) Get all of our token's UTXOs
    let inputUtxos = balances.slpTokenUtxos[tokenId];

    // 5) Simply sweep our BCH utxos to fuel the transaction
    inputUtxos = inputUtxos.concat(balances.nonSlpUtxos);

    // 6) Set the proper private key for each Utxo
    inputUtxos.forEach((txo) => txo.wif = fundingWif);
    console.log('inputUtxos:',JSON.stringify(inputUtxos, null, 2))

    // 7) Send token
    const sendTxid = await bitboxNetwork.simpleTokenSend(
            tokenId,
            sendAmountsBN,
            inputUtxos,
            tokenReceiverAddress,
            bchChangeReceiverAddress,
        );
    console.log("SEND txn complete:", sendTxid);

})();

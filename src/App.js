import React, { useState, useEffect } from "react";
import './App.css';
import Web3 from 'web3'
import Biconomy from "@biconomy/mexa";
import { NotificationContainer, NotificationManager } from 'react-notifications';
import 'react-notifications/lib/notifications.css';
const { config } = require("./config");
const showErrorMessage = message => {
  NotificationManager.error(message, "Error", 5000);
};
const showSuccessMessage = message => {
  NotificationManager.success(message, "Message", 3000);
};

const showInfoMessage = message => {
  NotificationManager.info(message, "Info", 3000);
};

let contract;
let domainData = {
  name: "SimpleTimeLocked",
  version: "1",
  chainId: "42",  // Kovan
  verifyingContract: config.contract.address
};
const domainType = [
  { name: "name", type: "string" },
  { name: "version", type: "string" },
  { name: "chainId", type: "uint256" },
  { name: "verifyingContract", type: "address" }
];

const metaTransactionType = [
  { name: "nonce", type: "uint256" },
  { name: "from", type: "address" },
  { name: "functionSignature", type: "bytes"}
  
];

let web3;

function App() {

  useEffect(() => {


    if (!window.ethereum) {
      showErrorMessage("Metamask is required to use this DApp")
      return;
    }

    const biconomy = new Biconomy(window.ethereum,{dappId:"sunday",apiKey: "ivDpoR7cT.b00a1b2a-e42f-4cce-8202-dc0dac68fc1b"});

    web3 = new Web3(biconomy);

    biconomy.onEvent(biconomy.READY, async () => {
      // Initialize your dapp here like getting user accounts etc

      await window.ethereum.enable();
      contract = new web3.eth.Contract(config.contract.abi, config.contract.address);
      startApp();
    }).onEvent(biconomy.ERROR, (error, message) => {
      // Handle error while initializing mexa
      console.log(error)
    });
  }
    , []);

  async function startApp() {
    const result = '';
    //any getter display operations from contract like lock expiry and recipient address
  }
  async function onButtonClickClaimEth() {
    console.log(window.ethereum.selectedAddress);
    console.log(contract);
    let tokenAddr = "";
    let nonce = await contract.methods.getNonce(window.ethereum.selectedAddress).call();
    let functionSignature = contract.methods.withdraw().encodeABI();
    let functionSignature2 = contract.methods.withdrawTokens(tokenAddr).encodeABI();
    let message = {};
    message.nonce = parseInt(nonce);
    message.from = window.ethereum.selectedAddress;
    message.functionSignature = functionSignature;

    const dataToSign = JSON.stringify({
      types: {
        EIP712Domain: domainType,
        MetaTransaction: metaTransactionType
      },
      domain: domainData,
      primaryType: "MetaTransaction",
      message: message
    });

    window.web3.currentProvider.sendAsync(
      {
        jsonrpc: "2.0",
        id: 999999999999,
        method: "eth_signTypedData_v4",
        params: [window.ethereum.selectedAddress, dataToSign]
      },
      async function (err, result) {
        if (err) {
          return console.error(err);
        }
        const signature = result.result.substring(2);
        const r = "0x" + signature.substring(0, 64);
        const s = "0x" + signature.substring(64, 128);
        const v = parseInt(signature.substring(128, 130), 16);
        console.log(r, "r")
        console.log(s, "s")
        console.log(v, "v")
        console.log(window.ethereum.selectedAddress, "userAddress")

       /* let gasLimit = await contract.methods
          .executeMetaTransaction(window.ethereum.selectedAddress, functionSignature2, r, s, v)
          .estimateGas({ from: window.ethereum.selectedAddress });*/
        
        console.log('event');   
        const promiEvent = contract.methods
          .executeMetaTransaction(window.ethereum.selectedAddress, functionSignature,r, s, v)
          .send({
            from: window.ethereum.selectedAddress
          
          })
        promiEvent.on("transactionHash", (hash) => {
          showInfoMessage("Transaction sent successfully. Check Console for Transaction hash")
          console.log("Transaction Hash is ", hash)
        }).once("confirmation", (confirmationNumber, receipt) => {
          if (receipt.status) {
            showSuccessMessage("Transaction processed successfully")
            startApp()
          } else {
            showErrorMessage("Transaction Failed");
          }
        })
      }
    );
  }

  async function onButtonClickClaimERC20() {
  }

  return (
    <div className="App">
      *Use this DApp only on Kovan Network
      <header className="App-header">
        <h1>Time Locked Wallet</h1>
        <section className="main">
          <div className="mb-wrap mb-style-2">
            <blockquote cite="http://www.gutenberg.org/ebboks/11">
              <h4>please deposit some tokens first to this address : 0x4f69CbD4eB8012C10a2182323e05eC717DBC526E</h4>
            </blockquote>
          </div>

          <div className="mb-attribution">
          </div>
        </section>
        <section>
          <div className="submit-container">
            <div className="submit-row">
              <button type="button" className="button" onClick={onButtonClickClaimEth}>Claim All Ether</button>
            </div>
            <div className="submit-row">
              <input size="100"
                border-radius="15"
                type="text"
                placeholder="Enter ERC20 token address"
              />
              <button type="button" className="button" onClick={onButtonClickClaimERC20}>Claim ERC20 tokens</button>
            </div>
          </div>
        </section>
      </header>
      <NotificationContainer />
    </div >
  );
}

export default App;
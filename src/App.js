import React, { useState, useEffect } from "react";

//import { Grid, Header, Container, Button, Input, Select } from 'semantic-ui-react';
//import 'semantic-ui-css/semantic.min.css';

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
let ercContract;

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

  const [token, setToken] = useState("This is a default token");
  const [newToken, setNewToken] = useState("");

  const [quantity, setQuantity] = useState("This is a default quantity");
  const [newQuantity, setNewQuantity] = useState("");  

  const [unlockDate, setUnlockDate] = useState("blank");
  const [newUnlockDate, setNewUnlockDate] = useState("");


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


    const onTokenChange = event => {
      //console.log(event.target.value);
      setNewToken(event.target.value);
      console.log(newToken);
    };

    const onQuantityChange = event => {
      console.log(event.target);
      setNewQuantity(event.target.value);
    };

  async function startApp() {
    const result = await contract.methods.info().call({ from: window.ethereum.selectedAddress });
    console.log(result);
    var utcSeconds = result[2];
    let dt = new Date(0); // The 0 there is the key, which sets the date to the epoch
    dt.setUTCSeconds(utcSeconds);
    setUnlockDate(dt);
    //any getter display operations from contract like lock expiry and recipient address
    console.log(dt);
  }
  async function onButtonClickClaimEth() {
    console.log(window.ethereum.selectedAddress);
    console.log(contract);
    let nonce = await contract.methods.getNonce(window.ethereum.selectedAddress).call();
    let functionSignature = contract.methods.withdraw().encodeABI();
    //let functionSignature2 = contract.methods.withdrawTokens(tokenAddr).encodeABI();
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
            showErrorMessage("Transaction Failed. Only recipient can claim funds from this wallet");
          }
        })
      }
    );
  }

  async function onButtonClickDeposit() {
    console.log(window.ethereum.selectedAddress);
    
    return new Promise((resolve, reject) => {

      const { web3 } = window;

      web3.currentProvider.sendAsync({
        
        jsonrpc: "2.0",
        id: 88888888888,
        method: "eth_sendTransaction",
        params: [{"from": window.ethereum.selectedAddress, "to": config.contract.address, "value": web3.toWei((newQuantity*0.00005),'ether')}]
      }, async (err, result) => {
              if(!err){
                  console.log(result);
                  resolve(result);
              } else {
                  reject(err);
              }
          });
  })

  }

  async function onButtonClickDepositERC20() {
    console.log(window.ethereum.selectedAddress);
    // look in config based on drop down option
    console.log(token);

   //tokenAddr = "0x1f9061B953bBa0E36BF50F21876132DcF276fC6e";
    ercContract = new web3.eth.Contract(config.erc20.abi, newToken);
    
    return new Promise((resolve, reject) => {

      const { web3 } = window;

      const ErcContract = web3.eth.contract(config.erc20.abi).at(newToken);

      ErcContract.transfer(config.contract.address, newQuantity, {
          from: window.ethereum.selectedAddress
          }, async (err, transactionHash) => {
              if(!err){
                  console.log(transactionHash);
                  const receipt = await fetchMinedTransactionReceipt(transactionHash);
                  resolve(receipt);
              } else {
                  reject(err);
              }
          });
  })
    
  }

  const fetchMinedTransactionReceipt = (transactionHash) => {

    return new Promise((resolve, reject) => {
      
      const { web3 } = window;
  
      var timer = setInterval(()=> {
        web3.eth.getTransactionReceipt(transactionHash, (err, receipt)=> {
          if(!err && receipt){
            clearInterval(timer);
            resolve(receipt);
          }
        });
      }, 2000)
     
    })
  }


  async function onButtonClickClaimERC20() {
    console.log(window.ethereum.selectedAddress)
    //setNewToken("");
    console.log(contract)
    let nonce = await contract.methods.getNonce(window.ethereum.selectedAddress).call();
    let message = {};
    let functionSignature2 = contract.methods.withdrawTokens(newToken).encodeABI();
    message.nonce = parseInt(nonce);
    message.from = window.ethereum.selectedAddress;
    message.functionSignature = functionSignature2;

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
        
        console.log('event');   
        const promiEvent = contract.methods
          .executeMetaTransaction(window.ethereum.selectedAddress, functionSignature2,r, s, v)
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

  return (
    <div className="App">
      *Use this DApp only on Kovan Network
      <header className="App-header">
        <h1>Time Locked Wallet</h1>
        <section className="main">
          <div className="mb-wrap mb-style-2">
            <blockquote cite="http://www.gutenberg.org/ebboks/11">
              <h4>please deposit some tokens/ether first to this address below</h4>
              <h5>0xD43Da7616C7F82321888D2Bb5e01C8366C766a04</h5>
              
             </blockquote>
          </div>

          <div className="mb-attribution">
          </div>
        </section>
        <section>
        <div><input size="10"
                border-radius="15"
                type="text"
                placeholder="Enter amount"
                onChange={onQuantityChange}
                value={newQuantity}
              />
          </div>
          <div className="submit-row">
             <button type="button" className="button" onClick={onButtonClickDeposit}>Deposit</button>            
          </div>
        </section>


        <section>
        <div><input size="40"
                border-radius="15"
                type="text"
                placeholder="Enter ERC20 token address"
                onChange={onTokenChange}
                value={newToken}
              />
          </div>
          <div><input size="10"
                border-radius="15"
                type="text"
                placeholder="Enter Quantity"
                onChange={onQuantityChange}
                value={newQuantity}
              />
          </div>
         </section>
         <section> 
          <div className="submit-row">
             <button type="button" align="center" className="button" onClick={onButtonClickDepositERC20}>Deposit tokens</button>            
          </div>
        </section>

        <section>
          <div className="submit-container">
            <h5>only intended recipient can do below actions after locking period</h5>
            <div className="submit-row">

              
              <button type="button" className="button" onClick={onButtonClickClaimEth}>Claim All Ether</button>
              
            </div>
            <div className="submit-row">
              <input size="100"
                border-radius="15"
                type="text"
                placeholder="Enter ERC20 token address"
                onChange={onTokenChange}
                value={newToken}
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

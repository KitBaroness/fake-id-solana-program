require('dotenv').config()
import {
  Connection,
  Keypair,
  Signer,
  PublicKey,
  Transaction,
  TransactionInstruction,
  TransactionSignature,
  ConfirmOptions,
  sendAndConfirmRawTransaction,
  sendAndConfirmTransaction,
  RpcResponseAndContext,
  SimulatedTransactionResponse,
  Commitment,
  LAMPORTS_PER_SOL,
  SystemProgram,
  SYSVAR_RENT_PUBKEY,
  clusterApiUrl
} from "@solana/web3.js"
import * as bs58 from 'bs58'
import fs from 'fs'
import * as anchor from '@project-serum/anchor'
import {AccountLayout,MintLayout,TOKEN_PROGRAM_ID,Token,ASSOCIATED_TOKEN_PROGRAM_ID} from "@solana/spl-token";
import { program } from 'commander';
import log from 'loglevel';
import axios  from 'axios'
import { programs } from '@metaplex/js';

program.version('0.0.1');
log.setLevel('info');

// const axios = require('axios');
const { metadata: { Metadata } } = programs
var FormData = require('form-data');
const programId = new PublicKey('8S18mGzHyNGur85jAPoEjad8P8rywTpjyABbBEdmj2gb')
const TOKEN_METADATA_PROGRAM_ID = new PublicKey("metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s")
const idl=JSON.parse(fs.readFileSync('src/usdc-fake-id.json','utf8'))

// const key = 'a498033f45742991a161'
// const secret = '18f6582c5e2a5177785f8d6cdf3e3629f9a6cb57a27977d8725e2aa6ca3ebd7f'

const key = '04d39b53946002f0b125'
const secret = 'e617c84041f0d4f28c3ba632f175ef94babc1a5ea1c483abfd3d2030ca8950c4'

const CONFIG_DATA_SIZE = 4 + 10 + 32 + 2;
const CONFIG_SIZE = 8 + 32 + 4 + CONFIG_DATA_SIZE
const CONFIG_LINE_SIZE = 4 + 32 + 4 + 200

const confirmOption : ConfirmOptions = {
    commitment : 'finalized',
    preflightCommitment : 'finalized',
    skipPreflight : false
}

import * as crypto from 'crypto';
import * as crypto_hash from 'crypto-js';
const nacl = require('tweetnacl')
const SHDW_DRIVE_ENDPOINT = 'https://shadow-storage.genesysgo.net'

import * as path from "path";

const isLocal = "undefined";
const basePath = isLocal ? process.cwd() : path.dirname(process.execPath)

const SaveFileShadowDrive = async (fileUrl: any, fileName: any) => {
  let data;

  // console.log(fileUrl);
  let store_account = new PublicKey("npv3ffY39EpGApjroKZFHX8wM1MBWcrHm41Us8F6YWS") // ask leonel for direction
  data = new FormData();

  const file = fs.readFileSync(fileUrl)
  // console.log("here  file", file)
  /* 
      Ask angel how to get the key pair of an existing wallet without using the secret key
  */

  let SECRET_KEY:string = process.env.CLI_WALLET_PRIVATE_KEY ? process.env.CLI_WALLET_PRIVATE_KEY : "";
  // console.log(SECRET_KEY);
  const keypair = Keypair.fromSecretKey(bs58.decode(SECRET_KEY));
    
  // const keypair = Keypair.fromSecretKey(bs58.decode("3o1nbAYQu8f2sAnQrvig99Z9uoZTdBe3TRnobWUYqLqfDkS8okMu6pe1u5R7sN5ceDULHdSB4xMqULdRmaSzVSpP"));
  let owner_store_account = new PublicKey(keypair.publicKey)
  const _filename = fileName //crypto_hash.SHA1(fileName).toString()
  const fileHashSum = crypto.createHash("sha256");
  const fileNameHashSum = crypto.createHash("sha256");
  fileHashSum.update(
    Buffer.isBuffer(file) ? file : Buffer.from(file)
  );
  fileNameHashSum.update(_filename);
  const fileNameHash = fileNameHashSum.digest("hex");

  let msg = `Shadow Drive Signed Message:\nStorage Account: ${store_account.toString()}\nUpload files with hash: ${fileNameHash}`;
  const encodedMessage = new TextEncoder().encode(msg);
  const signedMessage = nacl.sign.detached(encodedMessage, keypair.secretKey);
  const signature = bs58.encode(signedMessage)

  data.append("file", file, _filename);
  data.append("fileNames", _filename);
  data.append("message", signature.toString());
  data.append("storage_account", store_account.toString());
  data.append("signer", owner_store_account.toString());

    // console.log("name", _filename )
    // console.log("signature", signature.toString())
    // console.log("store", store_account.toString())
    // console.log("owner", owner_store_account.toString())

    // console.log("data:", data);
  return axios
    .post(`${SHDW_DRIVE_ENDPOINT}/upload`, data, {
      maxBodyLength: -1,
      headers: {
          'Content-Type': `multipart/form-data; boundary=${data._boundary}`,
      }
  })
    .then(function (response: any) {
      return {
        success: true,
        shadowUrl: response.data.finalized_locations[0]
      };
    })
    .catch(function (error: any) {
      // console.log("here:::", error)

      console.log("Error here: ", JSON.stringify(error, null, 4))
      return {
        success: false,
        message: error.message,
      }
    });
}

const SaveJsonShadowDrive = async (fileUrl: any, fileName: any) => {
  let data;
  let store_account = new PublicKey("npv3ffY39EpGApjroKZFHX8wM1MBWcrHm41Us8F6YWS") // ask leonel for direction
  
  data = new FormData();

  const file = fileUrl;

  // console.log("Json file", file);
  /* 
      Ask angel how to get the key pair of an existing wallet without using the secret key
  */

  let SECRET_KEY:string = process.env.CLI_WALLET_PRIVATE_KEY ? process.env.CLI_WALLET_PRIVATE_KEY : "";
  // console.log(SECRET_KEY);
  const keypair = Keypair.fromSecretKey(bs58.decode(SECRET_KEY));
    
  // const keypair = Keypair.fromSecretKey(bs58.decode("3o1nbAYQu8f2sAnQrvig99Z9uoZTdBe3TRnobWUYqLqfDkS8okMu6pe1u5R7sN5ceDULHdSB4xMqULdRmaSzVSpP"));
  let owner_store_account = new PublicKey(keypair.publicKey)
  const _filename = fileName //crypto_hash.SHA1(fileName).toString()
  const fileHashSum = crypto.createHash("sha256");
  const fileNameHashSum = crypto.createHash("sha256");
  fileHashSum.update(
    Buffer.isBuffer(file) ? file : Buffer.from(file)
  );
  fileNameHashSum.update(_filename);
  const fileNameHash = fileNameHashSum.digest("hex");

  let msg = `Shadow Drive Signed Message:\nStorage Account: ${store_account.toString()}\nUpload files with hash: ${fileNameHash}`;
  const encodedMessage = new TextEncoder().encode(msg);
  const signedMessage = nacl.sign.detached(encodedMessage, keypair.secretKey);
  const signature = bs58.encode(signedMessage)
  
    // console.log("name", fileUrl )
    // console.log("signature", signature.toString())
    // console.log("store", store_account.toString())
    // console.log("owner", owner_store_account.toString())
  
  data.append("file", file, _filename);
  data.append("fileNames", _filename);
  data.append("message", signature.toString());
  data.append("storage_account", store_account.toString());
  data.append("signer", owner_store_account.toString());

    // console.log("name", file )
    // console.log("name", _filename )
    // console.log("signature", signature.toString())
    // console.log("store", store_account.toString())
    // console.log("owner", owner_store_account.toString())

    // console.log("data:", data);
  return axios
    .post(`${SHDW_DRIVE_ENDPOINT}/upload`, data, {
      maxBodyLength: -1,
      headers: {
          'Content-Type': `multipart/form-data; boundary=${data._boundary}`,
      }
  })
    .then(function (response: any) {
      return {
        success: true,
        shadowUrl: response.data.finalized_locations[0]
      };
    })
    .catch(function (error: any) {
      // console.log("here:::", error)

      console.log("Error here: ", JSON.stringify(error, null, 4))
      return {
        success: false,
        message: error.message,
      }
    });
}

const sleep = (ms : number) => {
    return new Promise(resolve => setTimeout(resolve, ms));
};

function loadWalletKey(keypair : any): Keypair {
  if (!keypair || keypair == '') {
    throw new Error('Keypair is required!');
  }
  const loaded = Keypair.fromSecretKey(
    new Uint8Array(JSON.parse(fs.readFileSync(keypair).toString())),
  );
  log.info(`wallet public key: ${loaded.publicKey}`);
  return loaded;
}

const getTokenWallet = async (
  wallet: anchor.web3.PublicKey,
  mint: anchor.web3.PublicKey
    ) => {
  return (
    await anchor.web3.PublicKey.findProgramAddress(
      [wallet.toBuffer(), TOKEN_PROGRAM_ID.toBuffer(), mint.toBuffer()],
      ASSOCIATED_TOKEN_PROGRAM_ID
    )
  )[0];
}

const getMetadata = async (mint: PublicKey) => {
  return (
    await anchor.web3.PublicKey.findProgramAddress(
      [
        Buffer.from("metadata"),
        TOKEN_METADATA_PROGRAM_ID.toBuffer(),
        mint.toBuffer(),
      ],
      TOKEN_METADATA_PROGRAM_ID
    )
  )[0];
}

const createAssociatedTokenAccountInstruction = (
  associatedTokenAddress: PublicKey,
  payer: PublicKey,
  walletAddress: PublicKey,
  splTokenMintAddress: PublicKey
    ) => {
  const keys = [
    { pubkey: payer, isSigner: true, isWritable: true },
    { pubkey: associatedTokenAddress, isSigner: false, isWritable: true },
    { pubkey: walletAddress, isSigner: false, isWritable: false },
    { pubkey: splTokenMintAddress, isSigner: false, isWritable: false },
    {
      pubkey: SystemProgram.programId,
      isSigner: false,
      isWritable: false,
    },
    { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
    {
      pubkey: SYSVAR_RENT_PUBKEY,
      isSigner: false,
      isWritable: false,
    },
  ];
  return new TransactionInstruction({
    keys,
    programId: ASSOCIATED_TOKEN_PROGRAM_ID,
    data: Buffer.from([]),
  });
}

export const pinJSONToIPFS = async(JSONBody : any) : Promise<any> => {
    const url = `https://api.pinata.cloud/pinning/pinJSONToIPFS`;
    return axios
        .post(url, JSONBody, {
            headers: {
                'pinata_api_key': key,
                'pinata_secret_api_key': secret,
            }
        })
        .then(function (response : any) {
           return {
               success: true,
               pinataUrl: response.data.IpfsHash
           };
        })
        .catch(function (error : any) {
            console.log(error)
            return {
                success: false,
                message: error.message,
            }
        });
};

export const pinFileToIPFS = async(filename : any) => {
    const url = `https://api.pinata.cloud/pinning/pinFileToIPFS`;

    let data = new FormData();
    data.append('file', fs.createReadStream(filename))
    const metadata = JSON.stringify({
        name: 'pic',
        keyvalues: {
            Key: 'Value'
        }
    });
    data.append('pinataMetadata', metadata);

    const pinataOptions = JSON.stringify({
        cidVersion: 0,
        customPinPolicy: {
            regions: [
                {
                    id: 'FRA1',
                    desiredReplicationCount: 1
                },
                {
                    id: 'NYC1',
                    desiredReplicationCount: 2
                }
            ]
        }
    });
    data.append('pinataOptions', pinataOptions);

    return axios
        .post(url, data, {
            maxBodyLength: -1,
            headers: {
                'Content-Type': `multipart/form-data; boundary=${data._boundary}`,
                'pinata_api_key': key,
                'pinata_secret_api_key': secret,
            }
        })
        .then(function (response : any) {
            return {
                success: true,
                pinataUrl: response.data.IpfsHash
            };
        })
        .catch(function (error : any) {
            console.log(error)
            return {
                success: false,
                message: error.message,
            }
        });
};

async function showConfigData(configAccount : PublicKey, conn : Connection){
  try{
    console.log("**    Config   **")
    const wallet = new anchor.Wallet(Keypair.generate())
    const provider = new anchor.Provider(conn,wallet,confirmOption)
    const program = new anchor.Program(idl,programId,provider)
    const config = await program.account.config.fetch(configAccount)
    console.log("Authority : ", config.authority.toBase58())
    console.log("Config Line : ", config.maxNumberOfLines)
    console.log("Symbol : ", config.configData.symbol)
    console.log("Creator : ", config.configData.creator.toBase58())
    console.log("Seller Fee : ", config.configData.sellerFee)
    console.log("Config Lines : ");
    (config.configLines as any[]).map((item,idx) => {
      console.log("no : ",idx," name : ",item.name.replace('\0',''),"   uri : ",item.uri.replace('\0',''))
    })
  } catch(err) {
    console.log(err)
  }
}

async function showPoolData(poolAccount : PublicKey, conn : Connection){
  try{
    console.log("**   Pool   **")
    const wallet = new anchor.Wallet(Keypair.generate())
    const provider = new anchor.Provider(conn,wallet,confirmOption)
    const program = new anchor.Program(idl,programId,provider)
    const pool = await program.account.pool.fetch(poolAccount)
    console.log("Owner : ", pool.owner.toBase58())
    console.log("Config : ", pool.config.toBase58())
    console.log("Minting Count : ", pool.countMinting)
    console.log("Minting Price : ", pool.mintingPrice / LAMPORTS_PER_SOL)
    console.log("Scoby wallet : ", pool.scobyWallet.toBase58())
    // if(pool.countMinting!=0)
      // console.log("Invitaion1 Mint : ", pool.rootInvitation.toBase58())
    console.log("Update authority : ", pool.updateAuthority.toBase58())
    console.log("Royalty for minting : ", pool.royaltyForMinting)
    // console.log("Royalty for trading : ", pool.royaltyForTrading)
    console.log("")
  }catch(err){
    console.log(err)
  }
}

programCommand('init_config')
  .requiredOption(
    '-k, --keypair <path>',
    'Solana wallet location'
  )
  .requiredOption(
    '-i, --info <path>',
    'Information loacation'
  )
  .action(async (directory,cmd)=>{
    try{
      const {env, keypair, info} = cmd.opts()
      const conn = new Connection(clusterApiUrl(env))
      const owner = loadWalletKey(keypair)
      const infoJson = JSON.parse(fs.readFileSync(info).toString())
      const wallet = new anchor.Wallet(owner)
      const provider = new anchor.Provider(conn,wallet,confirmOption)
      const program = new anchor.Program(idl,programId,provider)
      let transaction = new Transaction()
      let space = CONFIG_SIZE + 4 + CONFIG_LINE_SIZE * infoJson.maxNumberOfLines
      let lamports = await conn.getMinimumBalanceForRentExemption(space)
      let configKeypair = Keypair.generate()
      transaction.add(SystemProgram.createAccount({
        fromPubkey : owner.publicKey,
        lamports : lamports,
        newAccountPubkey : configKeypair.publicKey,
        programId : programId,
        space : space
      }))
      transaction.add(program.instruction.initConfig(new anchor.BN(infoJson.maxNumberOfLines),{
          symbol : infoJson.symbol,
          creator : new PublicKey(infoJson.creator),
          sellerFee : infoJson.sellerFee
        },{
        accounts : {
          authority : owner.publicKey,
          config : configKeypair.publicKey,
        }
      }))
      const tx = await sendAndConfirmTransaction(conn, transaction, [owner, configKeypair], confirmOption)
      console.log("config address : ", configKeypair.publicKey.toBase58())
      console.log("transaction : ",tx)
      await showConfigData(configKeypair.publicKey, conn)
    }catch(err){
      console.log(err)
    }
  })

programCommand('update_config')
  .requiredOption(
    '-k, --keypair <path>',
    'Solana wallet location'
  )
  .requiredOption(
    '-i, --info <path>',
    'Information loacation'
  )
  .requiredOption(
    '-c, --config <string>',
    'config account'
  )
  .action(async (directory,cmd)=>{
    try{
      const {env, keypair, info, config} = cmd.opts()
      const conn = new Connection(clusterApiUrl(env))
      const owner = loadWalletKey(keypair)
      const infoJson = JSON.parse(fs.readFileSync(info).toString())
      const configPublicKey = new PublicKey(config)
      const wallet = new anchor.Wallet(owner)
      const provider = new anchor.Provider(conn,wallet,confirmOption)
      const program = new anchor.Program(idl,programId,provider)
      let transaction = new Transaction()
      transaction.add(program.instruction.updateConfig({
          symbol : infoJson.symbol,
          creator : new PublicKey(infoJson.creator),
          sellerFee : infoJson.sellerFee
        },{
        accounts : {
          authority : owner.publicKey,
          config : configPublicKey
        }
        }
      ))
      const tx = await sendAndConfirmTransaction(conn, transaction, [owner], confirmOption)
      console.log("transaction : ",tx)
      await showConfigData(configPublicKey, conn)
    }catch(err){
      console.log(err)
    }
  })  

programCommand("get_config")
  .requiredOption(
    '-c, --config <string>',
    'config account'
  )
  .action(async (directory,cmd)=>{
    const {env, config} = cmd.opts()
    const conn = new Connection(clusterApiUrl(env))
    const configAccount = new PublicKey(config)
    await showConfigData(configAccount, conn)
  })

programCommand('add_config_lines')
  .requiredOption(
    '-k, --keypair <path>',
    'Solana wallet location'
  )
  .requiredOption(
    '-u, --url-asset <string>',
    'Information loacation'
  )
  .requiredOption(
    '-c, --config <string>',
    'Config account'
  )
  .option(
    '-fn, --from-number <number>',
    'art from_number'
  )
  .option(
    '-tn, --to-number <number>',
    'art to_number'
  )
  .action(async (directory,cmd)=>{
    try{
      const {env, keypair, urlAsset, config, fromNumber, toNumber} = cmd.opts()
      const conn = new Connection(clusterApiUrl(env))
      const owner = loadWalletKey(keypair)
      const configPublicKey = new PublicKey(config)
      const wallet = new anchor.Wallet(owner)
      const provider = new anchor.Provider(conn,wallet,confirmOption)
      const program = new anchor.Program(idl,programId,provider)

      for(let i=fromNumber; i<toNumber; i++){
        let imageUrl = urlAsset + '/' + i.toString() + '.png'
        // let imageUrl =`${basePath}/assets/${i}.png`
        let jsonUrl = urlAsset + "/" + i + ".json"
        // let jsonUrl = `${basePath}/assets/${i}.json`
        // let imageRes : any = await pinFileToIPFS(imageUrl)
        let imageRes : any = await SaveFileShadowDrive(imageUrl.toString(), `${i}.png`)
        console.log("shadow", imageRes);
        if(imageRes.success && imageRes.shadowUrl){
          let metadata = JSON.parse(fs.readFileSync(jsonUrl).toString())
          
          metadata.image = imageRes.shadowUrl
          console.log("meta", metadata)
          let jsonRes : any = await SaveJsonShadowDrive(JSON.stringify(metadata), `${i}.json`)
          console.log("shadow", jsonRes);
          if(jsonRes.success && jsonRes.shadowUrl){
            let transaction = new Transaction()
            transaction.add(program.instruction.addConfigLines(
              [{
                name : metadata.name, uri : jsonRes.shadowUrl
              }],{
              accounts:{
                authority : owner.publicKey,
                config : configPublicKey,
              }
            }))
            const tx = await sendAndConfirmTransaction(conn, transaction, [owner], confirmOption)
            await sleep(20000)
            console.log(" NUM ",i," Success : ", tx)
          }else{
            console.log(" NUM ",i," Failed in Json uploading")
            break
          }
        }else{
          console.log(" NUM ",i," Failed in Image uploading")
          break;
        }
      }

    }catch(err){
      console.log(err)
    }
  })

programCommand('update_config_lines')
  .requiredOption(
    '-k, --keypair <path>',
    'Solana wallet location'
  )
  .requiredOption(
    '-u, --url-asset <string>',
    'Information loacation'
  )
  .requiredOption(
    '-c, --config <string>',
    'Config account'
  )
  .option(
    '-fn, --from-number <number>',
    'art from_number'
  )
  .option(
    '-tn, --to-number <number>',
    'art to_number'
  )
  .action(async (directory,cmd)=>{
    try{
      const {env, keypair, urlAsset, config, fromNumber, toNumber} = cmd.opts()
      const conn = new Connection(clusterApiUrl(env))
      const owner = loadWalletKey(keypair)
      const configPublicKey = new PublicKey(config)
      const wallet = new anchor.Wallet(owner)
      const provider = new anchor.Provider(conn,wallet,confirmOption)
      const program = new anchor.Program(idl,programId,provider)

      for(let i=fromNumber; i<toNumber; i++){
        let imageUrl = urlAsset + '/' + i.toString() + '.png'
        let jsonUrl = urlAsset + "/" + i + ".json"
        let imageRes : any = await SaveFileShadowDrive(imageUrl.toString(), `${i}.png`)
        console.log(imageRes.shadowUrl)
        if(imageRes.success && imageRes.shadowUrl){
          let metadata = JSON.parse(fs.readFileSync(jsonUrl).toString())
          metadata.image = imageRes.shadowUrl 
          let jsonRes : any = await SaveJsonShadowDrive(JSON.stringify(metadata), `${i}.json`)
          console.log(jsonRes.shadowUrl)
          if(jsonRes.success && jsonRes.shadowUrl){
            let transaction = new Transaction()
            transaction.add(program.instruction.updateConfigLine(
              new anchor.BN(i),
              {
                name : metadata.name, uri : jsonRes.shadowUrl
              },{
              accounts:{
                authority : owner.publicKey,
                config : configPublicKey,
              }
            }))
            const tx = await sendAndConfirmTransaction(conn, transaction, [owner], confirmOption)
            await sleep(20000)
            console.log(" NUM ",i," Success : ", tx)
          }else{
            console.log(" NUM ",i," Failed in Json uploading")
            break
          }
        }else{
          console.log(" NUM ",i," Failed in Image uploading")
          break;
        }
      }

    }catch(err){
      console.log(err)
    }
  })  

programCommand('init_pool')
  .requiredOption(
    '-k, --keypair <path>',
    'Solana wallet location'
  )
  .requiredOption(
    '-c, --config <string>',
    'Config account'
  )
  .requiredOption(
    '-i, --info <path>',
    'Information loacation'
  )
  .action(async (directory,cmd)=>{
    try{
      const {env, keypair, config, info} = cmd.opts()
      const conn = new Connection(clusterApiUrl(env))
      const owner = loadWalletKey(keypair)
      const configPublicKey = new PublicKey(config)
      const infoJson = JSON.parse(fs.readFileSync(info).toString())
      const wallet = new anchor.Wallet(owner)
      const provider = new anchor.Provider(conn,wallet,confirmOption)
      const program = new anchor.Program(idl,programId,provider)
      const rand = Keypair.generate().publicKey;
      const [pool, bump] = await PublicKey.findProgramAddress([rand.toBuffer()],programId)
      let transaction = new Transaction()
      transaction.add(program.instruction.initPool(
        new anchor.BN(bump),
        new PublicKey(infoJson.updateAuthority),
        new PublicKey(infoJson.scobyWallet),
        new anchor.BN(infoJson.mintingPrice * LAMPORTS_PER_SOL),
        infoJson.royaltyForMinting,
        infoJson.royaltyForTrading,
        {
          accounts:{
            owner : owner.publicKey,
            pool : pool,
            rand : rand,
            config : configPublicKey,
            systemProgram : SystemProgram.programId,
          }
        }
      ))
      const tx = await sendAndConfirmTransaction(conn, transaction, [owner], confirmOption)
      console.log("pool address : ", pool.toBase58())
      console.log("transaction : ",tx)
      await showPoolData(pool, conn)
    }catch(err){
      console.log(err)
    }
  })

programCommand('update_pool')
  .requiredOption(
    '-k, --keypair <path>',
    'Solana wallet location'
  )
  .requiredOption(
    '-i, --info <path>',
    'Information loacation'
  )
  .requiredOption(
    '-p, --pool <string>',
    'pool account'
  )
  .action(async (directory,cmd)=>{
    try{
      const {env, keypair, pool, info} = cmd.opts()
      const conn = new Connection(clusterApiUrl(env))
      const owner = loadWalletKey(keypair)
      const poolPublicKey = new PublicKey(pool)
      const infoJson = JSON.parse(fs.readFileSync(info).toString())
      const wallet = new anchor.Wallet(owner)
      const provider = new anchor.Provider(conn,wallet,confirmOption)
      const program = new anchor.Program(idl,programId,provider)
      let transaction = new Transaction()
      transaction.add(program.instruction.updatePool(
          new PublicKey(infoJson.updateAuthority),
          new PublicKey(infoJson.scobyWallet),
          new anchor.BN(infoJson.mintingPrice * LAMPORTS_PER_SOL),
          infoJson.royaltyForMinting,
          infoJson.royaltyForTrading,
          {
          accounts:{
            owner : owner.publicKey,
            pool : poolPublicKey,
          }
        }
      ))
      const tx = await sendAndConfirmTransaction(conn, transaction, [owner], confirmOption)
      console.log("transaction : ",tx)
      await showPoolData(poolPublicKey, conn)
    } catch(err) {
      console.log(err)
    }
  })


programCommand("get_pool")
  .requiredOption(
    '-p, --pool <string>',
    'pool account'
  )
  .action(async (directory,cmd)=>{
    const {env, pool} = cmd.opts()
    const conn = new Connection(clusterApiUrl(env))
    const poolAccount = new PublicKey(pool)
    await showPoolData(poolAccount, conn)
  })

programCommand("get_nfts_for_owner")
  .requiredOption(
    '-o, --owner <string>',
    'owner pubkey'
  )
  .requiredOption(
    '-p, --pool <string>',
    'pool account'
  )
  .action(async (directory,cmd)=>{
    const {env, owner, pool} = cmd.opts()
    const conn = new Connection(clusterApiUrl(env))
    const ownerAccount = new PublicKey(owner)
    const poolAccount = new PublicKey(pool)
    let allTokens : any[] = []
    const tokenAccounts = await conn.getParsedTokenAccountsByOwner(ownerAccount, {programId: TOKEN_PROGRAM_ID},"finalized");
    const randWallet = new anchor.Wallet(Keypair.generate())
    const provider = new anchor.Provider(conn,randWallet,confirmOption)
    const program = new anchor.Program(idl,programId,provider)
    const poolData = await program.account.pool.fetch(poolAccount)
    const configData = await program.account.config.fetch(poolData.config)
    const symbol = configData.configData.symbol.replace('\0','')
    for (let index = 0; index < tokenAccounts.value.length; index++) {
      try{
        const tokenAccount = tokenAccounts.value[index];
        const tokenAmount = tokenAccount.account.data.parsed.info.tokenAmount;

        if (tokenAmount.amount == "1" && tokenAmount.decimals == "0") {
          let nftMint = new PublicKey(tokenAccount.account.data.parsed.info.mint)
          let pda = await getMetadata(nftMint)
          const accountInfo: any = await conn.getParsedAccountInfo(pda);
          let metadata : any = new Metadata(owner.toString(), accountInfo.value)
          if (metadata.data.data.symbol == "SPORE") {
            let [metadataExtended, bump] = await PublicKey.findProgramAddress([nftMint.toBuffer(), poolAccount.toBuffer()],programId)
            if((await conn.getAccountInfo(metadataExtended)) == null) continue;
            let extendedData = await program.account.metadataExtended.fetch(metadataExtended) 
            const { data }: any = await axios.get(metadata.data.data.uri)
            allTokens.push({
              mint : nftMint, extendedData : extendedData})
          }
        }
      } catch(err) {
        continue;
      }
    }
    allTokens.sort(function(a:any, b: any){
      if(a.extendedData.number < b.extendedData.number) {return -1;}
      if(a.extendedData.number > b.extendedData.number) {return 1;}
      return 0;
    })
    allTokens.map(item=>{
      console.log("mint : ",item.mint.toBase58(),"  =>  parent : ",item.extendedData.parent.toBase58(),"  id:  ",item.extendedData.number, "  followers cound : ",item.extendedData.childrenCount)
    })
    console.log("")    
  })

function programCommand(name: string) {
  return program
    .command(name)
    .option(
      '-e, --env <string>',
      'Solana cluster env name',
      'mainnet-beta',
    )
    .option('-l, --log-level <string>', 'log level', setLogLevel);
}

function setLogLevel(value : any, prev : any) {
  if (value === undefined || value === null) {
    return;
  }
  console.log('setting the log value to: ' + value);
  log.setLevel(value);
}

program.parse(process.argv)
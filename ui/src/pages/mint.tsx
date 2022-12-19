import { Fragment, useRef, useState, useEffect } from 'react';
import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
  TransactionInstruction,
  ConfirmOptions,
  LAMPORTS_PER_SOL,
  SystemProgram,
  clusterApiUrl,
  SYSVAR_RENT_PUBKEY,
  SYSVAR_CLOCK_PUBKEY
} from '@solana/web3.js'
import {AccountLayout,MintLayout,TOKEN_PROGRAM_ID,ASSOCIATED_TOKEN_PROGRAM_ID,Token} from "@solana/spl-token";
import useNotify from './notify'
import * as bs58 from 'bs58'
import * as anchor from "@project-serum/anchor";
import { programs } from '@metaplex/js';
import axios from "axios"
import {WalletConnect, WalletDisconnect} from '../wallet'
import { Container, Snackbar } from '@material-ui/core';
import Alert from '@material-ui/lab/Alert';
import { CircularProgress, Card, CardMedia, Grid, CardContent, Typography, BottomNavigation,
				Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper  } from '@mui/material'
import {createMint,createAssociatedTokenAccountInstruction,sendTransactionWithRetry} from './utility'
import { getOrCreateAssociatedTokenAccount } from '../helper/getOrCreateAssociatedTokenAccount'

let wallet : any
let conn = new Connection(clusterApiUrl('devnet'))
let notify: any

const { metadata: { Metadata } } = programs
const TOKEN_METADATA_PROGRAM_ID = new anchor.web3.PublicKey("metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s")

// membership kind smart contract address and IDL
const FakeIDNFTProgramId = new PublicKey('8S18mGzHyNGur85jAPoEjad8P8rywTpjyABbBEdmj2gb')
const FakeIDNFTIdl = require('./usdc-fake-id.json')

const ParentWallet = new PublicKey('4NCF6k76LThBY5Kx6jUBFeY5b7rLULoFugmGDX9Jx77B')

// meta data for scoby nft
const FakeIDNFTPOOL = new PublicKey('D9iVhtAz1HTrAV6pFvnCjU8D8MUkuhyGSLKvnB7ghEWv')
const FakeIDNFTSYMBOL = "HELLPASS"

// ...  more nfts can be added here




// semi fungible token address and IDL



// ... more sfts can be added here


const confirmOption : ConfirmOptions = {commitment : 'finalized',preflightCommitment : 'finalized',skipPreflight : false}

interface Schedule{
	time : string;
	amount : string;
}

let defaultSchedule = {
	time : '', amount : ''
}

interface AlertState {
  open: boolean;
  message: string;
  severity: 'success' | 'info' | 'warning' | 'error' | undefined;
}

export default function Mint(){
	wallet = useWallet()
	notify = useNotify()

	const [pool, setPool] = useState<PublicKey>(FakeIDNFTPOOL)
	const [alertState, setAlertState] = useState<AlertState>({open: false,message: '',severity: undefined})
    const [isProcessing, setIsProcessing] = useState(false)
    const [holdingNfts, setHoldingNfts] = useState<any[]>([])
	const [poolData, setPoolData] = useState<any>(null)

	useEffect(()=>{
		getPoolData()
	},[pool])

	useEffect(()=>{
		if(poolData != null && wallet.publicKey != null){
			getNftsForOwner(FakeIDNFTProgramId, FakeIDNFTIdl, FakeIDNFTPOOL, FakeIDNFTSYMBOL, wallet.publicKey)
			// getNftsForOwner(wallet.publicKey, SYMBOL)
		}
	},[wallet.publicKey,poolData])

	const getTokenWallet = async (owner: PublicKey,mint: PublicKey) => {
	  return (
	    await PublicKey.findProgramAddress(
	      [owner.toBuffer(), TOKEN_PROGRAM_ID.toBuffer(), mint.toBuffer()],
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
	const getEdition = async (mint: PublicKey) => {
	  return (
	    await anchor.web3.PublicKey.findProgramAddress(
	      [
	        Buffer.from("metadata"),
	        TOKEN_METADATA_PROGRAM_ID.toBuffer(),
	        mint.toBuffer(),
	        Buffer.from("edition")
	      ],
	      TOKEN_METADATA_PROGRAM_ID
	    )
	  )[0];
	}

	const getPoolData = async() => {
		try{
			console.log(pool)
			const poolAddress = new PublicKey(pool)
			const randWallet = new anchor.Wallet(Keypair.generate())
			const provider = new anchor.Provider(conn, randWallet, confirmOption)
			const program = new anchor.Program(FakeIDNFTIdl, FakeIDNFTProgramId, provider)
			const pD = await program.account.pool.fetch(poolAddress)
    		setPoolData(pD)
		} catch(err){
			console.log(err)
			setPoolData(null)
		}
	}

	async function getNftsForOwner(contractAddress : PublicKey, contractIdl : any, collectionPool : PublicKey, symbol : string, owner : PublicKey) {
		console.log("symbol:", symbol);
		let allTokens: any[] = []
		const tokenAccounts = await conn.getParsedTokenAccountsByOwner(owner, {programId: TOKEN_PROGRAM_ID},"finalized");
		const randWallet = new anchor.Wallet(Keypair.generate())
		const provider = new anchor.Provider(conn,randWallet,confirmOption)
		console.log("contract");
		const program = new anchor.Program(contractIdl,contractAddress,provider)
		for (let index = 0; index < tokenAccounts.value.length; index++) {
			try{
				const tokenAccount = tokenAccounts.value[index];
				const tokenAmount = tokenAccount.account.data.parsed.info.tokenAmount;

				if (tokenAmount.amount == "1" && tokenAmount.decimals == "0") {
					let nftMint = new PublicKey(tokenAccount.account.data.parsed.info.mint)
					let pda = await getMetadata(nftMint)
					const accountInfo: any = await conn.getParsedAccountInfo(pda);
					let metadata : any = new Metadata(owner.toString(), accountInfo.value)
					console.log(metadata.data.data.symbol)
					if (metadata.data.data.symbol == symbol) {
						let [metadataExtended, bump] = await PublicKey.findProgramAddress([nftMint.toBuffer(), collectionPool.toBuffer()],contractAddress)

						if((await conn.getAccountInfo(metadataExtended)) == null) continue;
						let extendedData = await program.account.metadataExtended.fetch(metadataExtended)
						// let [parentMetadataExtended, bump2] = await PublicKey.findProgramAddress([extendedData.parentInvitation.toBuffer(), pool.toBuffer()],programId)
						// let parentExtendedData = await program.account.metadataExtended.fetch(parentMetadataExtended)
						
						// const { data }: any = await axios.get(metadata.data.data.uri)
						// const entireData = { ...data, id: Number(data.name.replace( /^\D+/g, '').split(' - ')[0])}

						allTokens.push({
							mint : nftMint, 
							metadata : pda, 
							tokenAccount :  tokenAccount.pubkey,
							metadataExtended : metadataExtended, 
							extendedData : extendedData,
							data : metadata.data.data, 
							// offChainData : entireData, 
							// parentId : parentExtendedData.number
						})
					}
				}
			} 
			catch(err) {
				continue;
			}
		}
		allTokens.sort(function(a:any, b: any){
			if(a.extendedData.number < b.extendedData.number) {return -1;}
			if(a.extendedData.number > b.extendedData.number) {return 1;}
			return 0;
		})
		console.log("all tokens:", allTokens)
		setHoldingNfts(allTokens)
		return allTokens
	}

	const mint = async() =>{
		try{
			// get provider from connection
			const provider = new anchor.Provider(conn, wallet as any, confirmOption)
			
			// get fake id nft program
			const program = new anchor.Program(FakeIDNFTIdl,FakeIDNFTProgramId,provider)
			
			// get fake id nft pool
			const poolData = await program.account.pool.fetch(FakeIDNFTPOOL)
			
			// get config data of above pool
			const configData = await program.account.config.fetch(poolData.config)

			let transaction = new Transaction()
			let createTokenAccountTransaction = new Transaction()
			let instructions : TransactionInstruction[] = []
			let signers : Keypair[] = []
			const mintRent = await conn.getMinimumBalanceForRentExemption(MintLayout.span)
			const mintKey = createMint(instructions, wallet.publicKey,mintRent,0,wallet.publicKey,wallet.publicKey,signers)
			const recipientKey = await getTokenWallet(wallet.publicKey, mintKey)
			createAssociatedTokenAccountInstruction(instructions,recipientKey,wallet.publicKey,wallet.publicKey,mintKey)
			instructions.push(Token.createMintToInstruction(TOKEN_PROGRAM_ID,mintKey,recipientKey,wallet.publicKey,[],1))
			instructions.forEach(item=>transaction.add(item))
			const metadata = await getMetadata(mintKey)
			const masterEdition = await getEdition(mintKey)
			const [metadataExtended, bump] = await PublicKey.findProgramAddress([mintKey.toBuffer(),FakeIDNFTPOOL.toBuffer()], FakeIDNFTProgramId)
			let royaltyList : String[]= []

			var myMint = new PublicKey('4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU');

			var sourceTokenAccount = await getOrCreateAssociatedTokenAccount(
				conn,
				wallet.publicKey,
				myMint,
				wallet.publicKey,
				wallet.signTransaction
			)

			if(sourceTokenAccount[1]) {
				console.log("transaction source", transaction)
				royaltyList.push(wallet.publicKey.toString())
				createTokenAccountTransaction.add(sourceTokenAccount[1])
			}

			var scobyUsdcTokenAccount = await getOrCreateAssociatedTokenAccount(
				conn,
				wallet.publicKey,
				myMint,
				poolData.scobyWallet,
				wallet.signTransaction
			)


			if(scobyUsdcTokenAccount[1]) {
				console.log("transaction scoby", transaction)
				if(royaltyList.findIndex( item => item == poolData.scobyWallet.toString()) == -1) {
					royaltyList.push(poolData.scobyWallet.toString())
					createTokenAccountTransaction.add(scobyUsdcTokenAccount[1])
				}
			}

			// Parent Wallet can be used instead of wallet.publicKey when user mint from other's profile -- ex: let memberships = await getNftsForOwner(FakeIDNFTProgramId, FakeIDNFTIdl, FakeIDNFTPOOL, FakeIDNFTSYMBOL, ParentWallet)
				
			// check if this wallet is holding the fake id nft
			let memberships = await getNftsForOwner(FakeIDNFTProgramId, FakeIDNFTIdl, FakeIDNFTPOOL, FakeIDNFTSYMBOL, wallet.publicKey);
			if(memberships.length != 0) throw new Error('Creator Already Have and Fake ID NFT')

			
			
			if(poolData.countMinting == 0){

				transaction.add(program.instruction.mintRoot(new anchor.BN(bump),{
					accounts : {
						owner : wallet.publicKey,
						pool : FakeIDNFTPOOL,
						config : poolData.config,
						nftMint : mintKey,
						nftAccount : recipientKey,
						metadata : metadata,
						masterEdition : masterEdition,
						metadataExtended : metadataExtended,
						sourceTokenAccount : sourceTokenAccount[0],
						scobyUsdcTokenAccount : scobyUsdcTokenAccount[0],
						
						scobyWallet : poolData.scobyWallet,
						tokenProgram : TOKEN_PROGRAM_ID,
						tokenMetadataProgram : TOKEN_METADATA_PROGRAM_ID,
						systemProgram : SystemProgram.programId,
						rent : SYSVAR_RENT_PUBKEY,
					}
				}))
			}else{

				// check if parent wallet is holding fake id nft
				memberships = await getNftsForOwner(FakeIDNFTProgramId, FakeIDNFTIdl, FakeIDNFTPOOL, FakeIDNFTSYMBOL, ParentWallet);
				
				let parentMembership = memberships[0];

				let [parentMetadataExtended, bumpTemp] = await PublicKey.findProgramAddress([parentMembership.extendedData.parentNfp.toBuffer(), FakeIDNFTPOOL.toBuffer()],FakeIDNFTProgramId);
				
				
				// creator
				const creatorMint = poolData.rootNft
				console.log(creatorMint.toString());
				const creatorResp = await conn.getTokenLargestAccounts(creatorMint,'finalized')
				console.log("creator response", creatorResp);
				if(creatorResp==null || creatorResp.value==null || creatorResp.value.length==0) throw new Error("Invalid creator")
				const creatorNftAccount = creatorResp.value[0].address
				const creatorInfo = await conn.getAccountInfo(creatorNftAccount,'finalized')
				if(creatorInfo == null) throw new Error('Creator NFT info failed')
				const accountCreatorInfo = AccountLayout.decode(creatorInfo.data)
				if(Number(accountCreatorInfo.amount)==0) throw new Error("Invalid Creator Info")
				const creatorWallet = new PublicKey(accountCreatorInfo.owner)

				var creatorUsdcTokenAccount = await getOrCreateAssociatedTokenAccount(
					conn,
					wallet.publicKey,
					myMint,
					creatorWallet,
					wallet.signTransaction
				)
	
	
				if(creatorUsdcTokenAccount[1]) {
					console.log("transaction creator", transaction)
					createTokenAccountTransaction.add(creatorUsdcTokenAccount[1])
				}

				// // creator scout
				// const creatorScoutMint = poolData.creatorScout
				// const creatorScoutResp = await conn.getTokenLargestAccounts(creatorScoutMint,'finalized')
				// if(creatorScoutResp==null || creatorScoutResp.value==null || creatorScoutResp.value.length==0) throw new Error("Invalid creator Scout")
				// const creatorScoutNftAccount = creatorScoutResp.value[0].address
				// const creatorScoutInfo = await conn.getAccountInfo(creatorScoutNftAccount,'finalized')
				// if(creatorScoutInfo == null) throw new Error('Creator Scout NFT info failed')
				// const accountCreatorScoutInfo = AccountLayout.decode(creatorScoutInfo.data)
				// if(Number(accountCreatorScoutInfo.amount)==0) throw new Error("Invalid Creator Scout Info")
				// const creatorScoutWallet = new PublicKey(accountCreatorScoutInfo.owner)

				// var creatorScoutUsdcTokenAccount = await getOrCreateAssociatedTokenAccount(
				// 	conn,
				// 	wallet.publicKey,
				// 	myMint,
				// 	creatorScoutWallet,
				// 	wallet.signTransaction
				// )
	
	
				// if(creatorScoutUsdcTokenAccount[1]) {
				// 	console.log("transaction scout", transaction)
				// 	if(royaltyList.findIndex( item => item == accountCreatorScoutInfo.owner) == -1) {
				// 		royaltyList.push(accountCreatorScoutInfo.owner)
				// 		createTokenAccountTransaction.add(creatorScoutUsdcTokenAccount[1])
				// 	}
				// }

				// parent 
				const parentMembershipResp = await conn.getTokenLargestAccounts(parentMembership.extendedData.mint, 'finalized')
				if(parentMembershipResp==null || parentMembershipResp.value==null || parentMembershipResp.value.length==0) throw new Error("Invalid NFP")
				const parentMembershipAccount = parentMembershipResp.value[0].address
				let info = await conn.getAccountInfo(parentMembershipAccount, 'finalized')
				if(info == null) throw new Error('parent membership info failed');
				let accountInfo = AccountLayout.decode(info.data)
				if(Number(accountInfo.amount)==0) throw new Error("Invalid Parent Membership Nft info")
				console.log(accountInfo.owner);
				const parentMembershipOwner = new PublicKey(accountInfo.owner)

				var parentMembershipUsdcTokenAccount = await getOrCreateAssociatedTokenAccount(
					conn,
					wallet.publicKey,
					myMint,
					parentMembershipOwner,
					wallet.signTransaction
				)
	
	
				if(parentMembershipUsdcTokenAccount[1]) {
					console.log("transaction parent", transaction)
					if(royaltyList.findIndex( item => item == accountInfo.owner) == -1) {
						royaltyList.push(accountInfo.owner)
						createTokenAccountTransaction.add(parentMembershipUsdcTokenAccount[1])
					}
				}

				// grand parent 
				const grandParentMembershipResp = await conn.getTokenLargestAccounts(parentMembership.extendedData.parentNfp, 'finalized')
				if(grandParentMembershipResp==null || grandParentMembershipResp.value==null || grandParentMembershipResp.value.length==0) throw new Error("Invalid NFP")
				const grandParentMembershipAccount = grandParentMembershipResp.value[0].address
				info = await conn.getAccountInfo(grandParentMembershipAccount, 'finalized')
				if(info == null) throw new Error('grand parent membership info failed');
				accountInfo = AccountLayout.decode(info.data)
				if(Number(accountInfo.amount)==0) throw new Error("Invalid Grand Parent Membership Nft info")
				console.log(accountInfo.owner);
				const grandParentMembershipOwner = new PublicKey(accountInfo.owner)

				var grandParentMembershipUsdcTokenAccount = await getOrCreateAssociatedTokenAccount(
					conn,
					wallet.publicKey,
					myMint,
					grandParentMembershipOwner,
					wallet.signTransaction
				)
	
	
				if(grandParentMembershipUsdcTokenAccount[1]) {
					console.log("transaction grand parent", transaction)
					if(royaltyList.findIndex( item => item == accountInfo.owner) == -1) {
						royaltyList.push(accountInfo.owner)
						createTokenAccountTransaction.add(grandParentMembershipUsdcTokenAccount[1])
					}
				}

				// grand grand parent
				const grandGrandParentMembershipResp = await conn.getTokenLargestAccounts(parentMembership.extendedData.grandParentNfp, 'finalized')
				if(grandGrandParentMembershipResp==null || grandGrandParentMembershipResp.value==null || grandGrandParentMembershipResp.value.length==0) throw new Error("Invalid NFP")
				const grandGrandParentMembershipAccount = grandGrandParentMembershipResp.value[0].address
				info = await conn.getAccountInfo(grandGrandParentMembershipAccount, 'finalized')
				if(info == null) throw new Error('grand parent membership info failed');
				accountInfo = AccountLayout.decode(info.data)
				if(Number(accountInfo.amount)==0) throw new Error("Invalid Grand Parent Membership Nft info")
				const grandGrandParentMembershipOwner = new PublicKey(accountInfo.owner)

				var grandGrandParentMembershipUsdcTokenAccount = await getOrCreateAssociatedTokenAccount(
					conn,
					wallet.publicKey,
					myMint,
					grandGrandParentMembershipOwner,
					wallet.signTransaction
				)
	
	
				if(grandGrandParentMembershipUsdcTokenAccount[1]) {
					console.log("transaction grand parent", transaction)
					if(royaltyList.findIndex( item => item == accountInfo.owner) == -1) {
						royaltyList.push(accountInfo.owner)
						createTokenAccountTransaction.add(grandGrandParentMembershipUsdcTokenAccount[1])
					}
				}

				
				const grandGrandGrandParentMembershipResp = await conn.getTokenLargestAccounts(parentMembership.extendedData.grandGrandParentNfp, 'finalized')
				if(grandGrandGrandParentMembershipResp==null || grandGrandGrandParentMembershipResp.value==null || grandGrandGrandParentMembershipResp.value.length==0) throw new Error("Invalid NFP")
				const grandGrandGrandParentMembershipAccount = grandGrandGrandParentMembershipResp.value[0].address
				info = await conn.getAccountInfo(grandGrandGrandParentMembershipAccount, 'finalized')
				if(info == null) throw new Error('grand parent membership info failed');
				accountInfo = AccountLayout.decode(info.data)
				if(Number(accountInfo.amount)==0) throw new Error("Invalid Grand Parent Membership Nft info")
				const grandGrandGrandParentMembershipOwner = new PublicKey(accountInfo.owner)

				var grandGrandGrandParentMembershipUsdcTokenAccount = await getOrCreateAssociatedTokenAccount(
					conn,
					wallet.publicKey,
					myMint,
					grandGrandGrandParentMembershipOwner,
					wallet.signTransaction
				)
	
	
				if(grandGrandGrandParentMembershipUsdcTokenAccount[1]) {
					console.log("transaction grand parent", transaction)
					if(royaltyList.findIndex( item => item == accountInfo.owner) == -1) {
						royaltyList.push(accountInfo.owner)
						createTokenAccountTransaction.add(grandGrandGrandParentMembershipUsdcTokenAccount[1])
					}
				}

				transaction.add(program.instruction.mint(new anchor.BN(bump),{
					accounts : {
						owner : wallet.publicKey,
						pool : FakeIDNFTPOOL,
						config : poolData.config,
						nftMint : mintKey,
						nftAccount : recipientKey,
						metadata : metadata,
						masterEdition : masterEdition,
						metadataExtended : metadataExtended,
						// parentNftMint : parentMembership.extendedData.mint,
						parentNftAccount : parentMembershipAccount,
						// parentNftOwner : parentMembershipOwner,
						parentMetadataExtended : parentMembership.metadataExtended,
						// grandParentNftMint : parentMembership.extendedData.parentNfp,
						grandParentNftAccount : grandParentMembershipAccount,
						// grandParentNftOwner : grandParentMembershipOwner,
						
						// grandGrandParentNftMint : parentMembership.extendedData.grandParentNfp,
						grandGrandParentNftAccount : grandGrandParentMembershipAccount,
						// grandGrandParentNftOwner : grandGrandParentMembershipOwner,
						// grandGrandGrandParentNftMint : parentMembership.extendedData.grandGrandParentNfp,
						grandGrandGrandParentNftAccount : grandGrandGrandParentMembershipAccount,
						// grandGrandGrandParentNftOwner : grandGrandGrandParentMembershipOwner,
						
						// scobyWallet : poolData.scobyWallet,
						creatorNftAccount : creatorNftAccount,
						// creatorWallet : creatorWallet,
						// creatorScoutNftAccount : creatorScoutNftAccount,
						// creatorScoutWallet : creatorScoutWallet,
						sourceTokenAccount : sourceTokenAccount[0],
						scobyUsdcTokenAccount : scobyUsdcTokenAccount[0],
						creatorUsdcTokenAccount: creatorUsdcTokenAccount[0],
						// creatorScoutUsdcTokenAccount : creatorScoutUsdcTokenAccount[0],
						parentMembershipUsdcTokenAccount: parentMembershipUsdcTokenAccount[0],
						grandParentMembershipUsdcTokenAccount : grandParentMembershipUsdcTokenAccount[0],
						grandGrandParentMembershipUsdcTokenAccount : grandGrandParentMembershipUsdcTokenAccount[0],
						grandGrandGrandParentMembershipUsdcTokenAccount : grandGrandGrandParentMembershipUsdcTokenAccount[0],
						tokenProgram : TOKEN_PROGRAM_ID,
						tokenMetadataProgram : TOKEN_METADATA_PROGRAM_ID,
						systemProgram : SystemProgram.programId,
						rent : SYSVAR_RENT_PUBKEY,					
					}
				}))
			}
			// await sendTransaction(tx,[])

			console.log("transaction", transaction);
			console.log(royaltyList);
			if(createTokenAccountTransaction.instructions.length > 0 )
			{
				console.log(createTokenAccountTransaction)
				const blockHash = await conn.getRecentBlockhash()
				createTokenAccountTransaction.feePayer = await wallet.publicKey
				createTokenAccountTransaction.recentBlockhash = await blockHash.blockhash
				const signed = await wallet.signTransaction(createTokenAccountTransaction)
				await conn.sendRawTransaction(await signed.serialize())
				console.log("kkk");
			}
			await sendTransaction(transaction,signers)
			setAlertState({open: true, message:"Congratulations! Succeeded!",severity:'success'})
			await getPoolData()
		}catch(err){
			console.log(err)
			setAlertState({open: true, message:"Failed! Please try again!",severity:'error'})
		}
	}

	async function sendTransaction(transaction : Transaction, signers : Keypair[]) {
		transaction.feePayer = wallet.publicKey
		transaction.recentBlockhash = (await conn.getRecentBlockhash('max')).blockhash;
		await transaction.setSigners(wallet.publicKey,...signers.map(s => s.publicKey));
		if(signers.length != 0) await transaction.partialSign(...signers)
		const signedTransaction = await wallet.signTransaction(transaction);
		let hash = await conn.sendRawTransaction(await signedTransaction.serialize());
		await conn.confirmTransaction(hash);
		return hash
	}

	return <>
		<main className='content'>
			<div className="card">
			{
				poolData != null && 
				<h6 className="card-title">Mint Membership: {poolData.countMinting+ "  Scoby Passes were minted"}</h6>
			}
				<form className="form">
					{
						(wallet && wallet.connected) &&
						<button type="button" disabled={isProcessing==true} className="form-btn" style={{"justifyContent" : "center"}} onClick={async ()=>{
							setIsProcessing(true)
							setAlertState({open: true, message:"Processing transaction",severity: "warning"})
							await mint()
							setIsProcessing(false)
						}}>
							{ isProcessing==true ? "Processing..." :"Mint" }
						</button>
					}
					<WalletConnect/>
				</form>
			</div>
			<Grid container spacing={1}>
			{
				holdingNfts.map((item, idx)=>{
					return <Grid item xs={2}>
						<Card key={idx} sx={{minWidth : 300}}>
							{/* <CardMedia component="img" height="200" image={item.offChainData.image} alt="green iguana"/> */}
							<CardContent>
								<Typography gutterBottom variant="h6" component="div">
								{item.data.name}
								</Typography>
								<Typography variant="body2" color="text.secondary">
								{"mint : " + item.extendedData.mint}
								</Typography>
								<Typography variant="body2" color="text.secondary">
								{"parent : " + item.extendedData.parentNfp}
								</Typography>
								<Typography variant="body2" color="text.secondary">
								{"grandparent : "+ item.extendedData.grandParentNfp}
								</Typography>
								<Typography variant="body2" color="text.secondary">
								{"Followers : " + item.extendedData.childrenCount}
								</Typography>
							</CardContent>
						</Card>
					</Grid>
				})
			}
			</Grid>
			<Snackbar
        open={alertState.open}
        autoHideDuration={alertState.severity != 'warning' ? 6000 : 1000000}
        onClose={() => setAlertState({ ...alertState, open: false })}
      >
        <Alert
        	iconMapping={{warning : <CircularProgress size={24}/>}}
          onClose={() => setAlertState({ ...alertState, open: false })}
          severity={alertState.severity}
        >
          {alertState.message}
        </Alert>
      </Snackbar>
		</main>
	</>
}
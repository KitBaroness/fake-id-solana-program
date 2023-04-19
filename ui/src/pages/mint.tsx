/* eslint-disable react-hooks/exhaustive-deps */
import { useState, useEffect } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
  TransactionInstruction,
  ConfirmOptions,
  SystemProgram,
  SYSVAR_RENT_PUBKEY,
} from "@solana/web3.js";
import {
  AccountLayout,
  MintLayout,
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  Token,
} from "@solana/spl-token";
import * as anchor from "@project-serum/anchor";
import { programs } from "@metaplex/js";
import { WalletConnect } from "../wallet";
import { Snackbar } from "@material-ui/core";
import Alert from "@material-ui/lab/Alert";
import {
  CircularProgress,
  Card,
  Grid,
  CardContent,
  Typography,
} from "@mui/material";
import { createMint, createAssociatedTokenAccountInstruction } from "./utility";
import { getOrCreateAssociatedTokenAccount } from "../helper/getOrCreateAssociatedTokenAccount";

// IDL of the Contract
const FakeIDNFTIdl = require("./usdc-fake-id.json");

const conn = new Connection("Your URL for connection");

const {
  metadata: { Metadata },
} = programs;

const TOKEN_METADATA_PROGRAM_ID = new anchor.web3.PublicKey(
  "metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s"
);

// Membership kind smart contract address
const FakeIDNFTProgramId = new PublicKey(
  "8S18mGzHyNGur85jAPoEjad8P8rywTpjyABbBEdmj2gb"
);
const ParentWallet = new PublicKey(
  "4NCF6k76LThBY5Kx6jUBFeY5b7rLULoFugmGDX9Jx77B"
);

// Metadata for Fake ID nft
const FakeIDNFTPOOL = new PublicKey(
  "A9ofFEnwc3dnmTMRt3w2Sk9cNDAV55NaB4mF1QrxMe2Y"
);
const FakeIDNFTSYMBOL = "HELLPASS";

const confirmOption: ConfirmOptions = {
  commitment: "finalized",
  preflightCommitment: "finalized",
  skipPreflight: false,
};

interface AlertState {
  open: boolean;
  message: string;
  severity: "success" | "info" | "warning" | "error" | undefined;
}

export default function Mint() {
  const wallet = useWallet();

  const pool = FakeIDNFTPOOL;
  const [alertState, setAlertState] = useState<AlertState>({
    open: false,
    message: "",
    severity: undefined,
  });
  const [isProcessing, setIsProcessing] = useState(false);
  const [holdingNfts, setHoldingNfts] = useState<any[]>([]);
  const [poolData, setPoolData] = useState<any>(null);

  const getPoolData = async () => {
    try {
      console.log(pool);
      const poolAddress = new PublicKey(pool);
      const randWallet = new anchor.Wallet(Keypair.generate());
      const provider = new anchor.Provider(conn, randWallet, confirmOption);
      const program = new anchor.Program(
        FakeIDNFTIdl,
        FakeIDNFTProgramId,
        provider
      );
      const pD = await program.account.pool.fetch(poolAddress);
      setPoolData(pD);
    } catch (err) {
      console.log(err);
      setPoolData(null);
    }
  };

  useEffect(() => {
    getPoolData();
  }, [pool]);

  useEffect(() => {
    if (poolData != null && wallet.publicKey != null) {
      getNftsForOwner(
        FakeIDNFTProgramId,
        FakeIDNFTIdl,
        FakeIDNFTPOOL,
        FakeIDNFTSYMBOL,
        wallet.publicKey
      );
    }
  }, [wallet.publicKey, poolData]);

  const getTokenWallet = async (owner: PublicKey, mint: PublicKey) => {
    return (
      await PublicKey.findProgramAddress(
        [owner.toBuffer(), TOKEN_PROGRAM_ID.toBuffer(), mint.toBuffer()],
        ASSOCIATED_TOKEN_PROGRAM_ID
      )
    )[0];
  };
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
  };
  const getEdition = async (mint: PublicKey) => {
    return (
      await anchor.web3.PublicKey.findProgramAddress(
        [
          Buffer.from("metadata"),
          TOKEN_METADATA_PROGRAM_ID.toBuffer(),
          mint.toBuffer(),
          Buffer.from("edition"),
        ],
        TOKEN_METADATA_PROGRAM_ID
      )
    )[0];
  };

  async function getNftsForOwner(
    contractAddress: PublicKey,
    contractIdl: any,
    collectionPool: PublicKey,
    symbol: string,
    owner: PublicKey
  ) {
    const allTokens: any[] = [];
    const tokenAccounts = await conn.getParsedTokenAccountsByOwner(
      owner,
      { programId: TOKEN_PROGRAM_ID },
      "finalized"
    );
    const randWallet = new anchor.Wallet(Keypair.generate());
    const provider = new anchor.Provider(conn, randWallet, confirmOption);
    console.log("contract");
    const program = new anchor.Program(contractIdl, contractAddress, provider);

    for (let index = 0; index < tokenAccounts.value.length; index++) {
      try {
        const tokenAccount = tokenAccounts.value[index];
        const tokenAmount = tokenAccount.account.data.parsed.info.tokenAmount;

        if (tokenAmount.amount == "1" && tokenAmount.decimals == "0") {
          let nftMint = new PublicKey(
            tokenAccount.account.data.parsed.info.mint
          );
          let pda = await getMetadata(nftMint);
          const accountInfo: any = await conn.getParsedAccountInfo(pda);
          let metadata: any = new Metadata(owner.toString(), accountInfo.value);
          console.log(metadata.data.data.symbol);

          if (metadata.data.data.symbol == symbol) {
            const [metadataExtended] = await PublicKey.findProgramAddress(
              [nftMint.toBuffer(), collectionPool.toBuffer()],
              contractAddress
            );

            if ((await conn.getAccountInfo(metadataExtended)) == null) continue;

            const extendedData = await program.account.metadataExtended.fetch(
              metadataExtended
            );

            allTokens.push({
              mint: nftMint,
              metadata: pda,
              tokenAccount: tokenAccount.pubkey,
              metadataExtended: metadataExtended,
              extendedData: extendedData,
              data: metadata.data.data,
            });
          }
        }
      } catch (err) {
        continue;
      }
    }

    allTokens.sort(function (a: any, b: any) {
      if (a.extendedData.number < b.extendedData.number) {
        return -1;
      }
      if (a.extendedData.number > b.extendedData.number) {
        return 1;
      }
      return 0;
    });
    setHoldingNfts(allTokens);
    return allTokens;
  }

  const mint = async () => {
    try {
      // get provider from connection
      const provider = new anchor.Provider(conn, wallet as any, confirmOption);

      // get fake id nft program
      const program = new anchor.Program(
        FakeIDNFTIdl,
        FakeIDNFTProgramId,
        provider
      );

      // get fake id nft pool
      const poolData = await program.account.pool.fetch(FakeIDNFTPOOL);

      const transaction = new Transaction();
      const createTokenAccountTransaction = new Transaction();
      const instructions: TransactionInstruction[] = [];
      const signers: Keypair[] = [];

      const mintRent = await conn.getMinimumBalanceForRentExemption(
        MintLayout.span
      );

      const mintKey = createMint(
        instructions,
        wallet.publicKey!,
        mintRent,
        0,
        wallet.publicKey!,
        wallet.publicKey!,
        signers
      );

      const recipientKey = await getTokenWallet(wallet.publicKey!, mintKey);

      createAssociatedTokenAccountInstruction(
        instructions,
        recipientKey,
        wallet.publicKey!,
        wallet.publicKey!,
        mintKey
      );
      instructions.push(
        Token.createMintToInstruction(
          TOKEN_PROGRAM_ID,
          mintKey,
          recipientKey,
          wallet.publicKey!,
          [],
          1
        )
      );
      instructions.forEach((item) => transaction.add(item));

      const metadata = await getMetadata(mintKey);
      const masterEdition = await getEdition(mintKey);
      const [metadataExtended, bump] = await PublicKey.findProgramAddress(
        [mintKey.toBuffer(), FakeIDNFTPOOL.toBuffer()],
        FakeIDNFTProgramId
      );

      const royaltyList: String[] = [];

      const formData = {
        name: "Sally the Clubhouse Wallet",
        uri: `https://shdw-drive.genesysgo.net/7nPP797RprCMJaSXsyoTiFvMZVQ6y1dUgobvczdWGd35/clubhouse-wallet.json`,
      };

      const usdcToken = new PublicKey(
        "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"
      );

      const sourceTokenAccount = await getOrCreateAssociatedTokenAccount(
        conn,
        wallet.publicKey!,
        usdcToken,
        wallet.publicKey!,
        wallet.signTransaction!
      );

      if (sourceTokenAccount[1]) {
        royaltyList.push(wallet.publicKey!.toString());
        createTokenAccountTransaction.add(sourceTokenAccount[1]);
      }

      const scobyUsdcTokenAccount = await getOrCreateAssociatedTokenAccount(
        conn,
        wallet.publicKey!,
        usdcToken,
        poolData.scobyWallet,
        wallet.signTransaction!
      );

      if (scobyUsdcTokenAccount[1]) {
        if (
          royaltyList.findIndex(
            (item) => item === poolData.scobyWallet.toString()
          ) === -1
        ) {
          royaltyList.push(poolData.scobyWallet.toString());
          createTokenAccountTransaction.add(scobyUsdcTokenAccount[1]);
        }
      }

      // Parent Wallet can be used instead of wallet.publicKey when user mint from other's profile -- ex: let memberships = await getNftsForOwner(FakeIDNFTProgramId, FakeIDNFTIdl, FakeIDNFTPOOL, FakeIDNFTSYMBOL, ParentWallet)
      // check if this wallet is holding the fake id nft
      let memberships = await getNftsForOwner(
        FakeIDNFTProgramId,
        FakeIDNFTIdl,
        FakeIDNFTPOOL,
        FakeIDNFTSYMBOL,
        wallet.publicKey!
      );
      if (memberships.length !== 0)
        throw new Error("Creator Already Have and Fake ID NFT");

      if (poolData.countMinting === 0) {
        // Mints the NFT 0
        transaction.add(
          program.instruction.mintRoot(new anchor.BN(bump), formData, {
            accounts: {
              owner: wallet.publicKey!,
              pool: FakeIDNFTPOOL,
              config: poolData.config,
              nftMint: mintKey,
              nftAccount: recipientKey,
              metadata: metadata,
              masterEdition: masterEdition,
              metadataExtended: metadataExtended,
              sourceTokenAccount: sourceTokenAccount[0],
              scobyUsdcTokenAccount: scobyUsdcTokenAccount[0],

              scobyWallet: poolData.scobyWallet,
              tokenProgram: TOKEN_PROGRAM_ID,
              tokenMetadataProgram: TOKEN_METADATA_PROGRAM_ID,
              systemProgram: SystemProgram.programId,
              rent: SYSVAR_RENT_PUBKEY,
            },
          })
        );
      } else {
        // check if parent wallet is holding fake id nft
        memberships = await getNftsForOwner(
          FakeIDNFTProgramId,
          FakeIDNFTIdl,
          FakeIDNFTPOOL,
          FakeIDNFTSYMBOL,
          ParentWallet
        );

        let parentMembership = memberships[0];

        // Gets the creator and validates it
        const creatorMint = poolData.rootNft;

        const creatorResp = await conn.getTokenLargestAccounts(
          creatorMint,
          "finalized"
        );

        if (
          creatorResp == null ||
          creatorResp.value == null ||
          creatorResp.value.length === 0
        )
          throw new Error("Invalid creator");

        const creatorNftAccount = creatorResp.value[0].address;
        const creatorInfo = await conn.getAccountInfo(
          creatorNftAccount,
          "finalized"
        );

        if (creatorInfo == null) throw new Error("Creator NFT info failed");
        const accountCreatorInfo = AccountLayout.decode(creatorInfo.data);
        if (Number(accountCreatorInfo.amount) === 0)
          throw new Error("Invalid Creator Info");
        const creatorWallet = new PublicKey(accountCreatorInfo.owner);

        const creatorUsdcTokenAccount = await getOrCreateAssociatedTokenAccount(
          conn,
          wallet.publicKey!,
          usdcToken,
          creatorWallet,
          wallet.signTransaction!
        );

        if (creatorUsdcTokenAccount[1]) {
          console.log("transaction creator", transaction);
          createTokenAccountTransaction.add(creatorUsdcTokenAccount[1]);
        }

        /*    Retrieves all the information for the Royalties Distribution    */

        // Gets parent
        const parentMembershipResp = await conn.getTokenLargestAccounts(
          parentMembership.extendedData.mint,
          "finalized"
        );
        if (
          parentMembershipResp == null ||
          parentMembershipResp.value == null ||
          parentMembershipResp.value.length === 0
        )
          throw new Error("Invalid NFP");
        const parentMembershipAccount = parentMembershipResp.value[0].address;

        let info = await conn.getAccountInfo(
          parentMembershipAccount,
          "finalized"
        );

        if (info == null) throw new Error("parent membership info failed");

        let accountInfo = AccountLayout.decode(info.data);

        if (Number(accountInfo.amount) === 0)
          throw new Error("Invalid Parent Membership Nft info");
        console.log(accountInfo.owner);
        const parentMembershipOwner = new PublicKey(accountInfo.owner);

        const parentMembershipUsdcTokenAccount =
          await getOrCreateAssociatedTokenAccount(
            conn,
            wallet.publicKey!,
            usdcToken,
            parentMembershipOwner,
            wallet.signTransaction!
          );

        if (parentMembershipUsdcTokenAccount[1]) {
          if (
            royaltyList.findIndex((item) => item === accountInfo.owner) === -1
          ) {
            royaltyList.push(accountInfo.owner);
            createTokenAccountTransaction.add(
              parentMembershipUsdcTokenAccount[1]
            );
          }
        }

        // Gets grand parent
        const grandParentMembershipResp = await conn.getTokenLargestAccounts(
          parentMembership.extendedData.parentNfp,
          "finalized"
        );
        if (
          grandParentMembershipResp == null ||
          grandParentMembershipResp.value == null ||
          grandParentMembershipResp.value.length === 0
        )
          throw new Error("Invalid NFP");
        const grandParentMembershipAccount =
          grandParentMembershipResp.value[0].address;
        info = await conn.getAccountInfo(
          grandParentMembershipAccount,
          "finalized"
        );
        if (info == null)
          throw new Error("grand parent membership info failed");

        accountInfo = AccountLayout.decode(info.data);

        if (Number(accountInfo.amount) === 0)
          throw new Error("Invalid Grand Parent Membership Nft info");

        const grandParentMembershipOwner = new PublicKey(accountInfo.owner);

        const grandParentMembershipUsdcTokenAccount =
          await getOrCreateAssociatedTokenAccount(
            conn,
            wallet.publicKey!,
            usdcToken,
            grandParentMembershipOwner,
            wallet.signTransaction!
          );

        if (grandParentMembershipUsdcTokenAccount[1]) {
          if (
            royaltyList.findIndex((item) => item === accountInfo.owner) === -1
          ) {
            royaltyList.push(accountInfo.owner);
            createTokenAccountTransaction.add(
              grandParentMembershipUsdcTokenAccount[1]
            );
          }
        }

        // Gets great grand parent
        const grandGrandParentMembershipResp =
          await conn.getTokenLargestAccounts(
            parentMembership.extendedData.grandParentNfp,
            "finalized"
          );
        if (
          grandGrandParentMembershipResp == null ||
          grandGrandParentMembershipResp.value == null ||
          grandGrandParentMembershipResp.value.length === 0
        )
          throw new Error("Invalid NFP");
        const grandGrandParentMembershipAccount =
          grandGrandParentMembershipResp.value[0].address;
        info = await conn.getAccountInfo(
          grandGrandParentMembershipAccount,
          "finalized"
        );
        if (info == null)
          throw new Error("grand parent membership info failed");
        accountInfo = AccountLayout.decode(info.data);
        if (Number(accountInfo.amount) === 0)
          throw new Error("Invalid Grand Parent Membership Nft info");
        const grandGrandParentMembershipOwner = new PublicKey(
          accountInfo.owner
        );

        const grandGrandParentMembershipUsdcTokenAccount =
          await getOrCreateAssociatedTokenAccount(
            conn,
            wallet.publicKey!,
            usdcToken,
            grandGrandParentMembershipOwner,
            wallet.signTransaction!
          );

        if (grandGrandParentMembershipUsdcTokenAccount[1]) {
          if (
            royaltyList.findIndex((item) => item === accountInfo.owner) === -1
          ) {
            royaltyList.push(accountInfo.owner);
            createTokenAccountTransaction.add(
              grandGrandParentMembershipUsdcTokenAccount[1]
            );
          }
        }

        // Gets great great grand parent
        const grandGrandGrandParentMembershipResp =
          await conn.getTokenLargestAccounts(
            parentMembership.extendedData.grandGrandParentNfp,
            "finalized"
          );
        if (
          grandGrandGrandParentMembershipResp == null ||
          grandGrandGrandParentMembershipResp.value == null ||
          grandGrandGrandParentMembershipResp.value.length === 0
        )
          throw new Error("Invalid NFP");
        const grandGrandGrandParentMembershipAccount =
          grandGrandGrandParentMembershipResp.value[0].address;
        info = await conn.getAccountInfo(
          grandGrandGrandParentMembershipAccount,
          "finalized"
        );
        if (info == null)
          throw new Error("grand parent membership info failed");
        accountInfo = AccountLayout.decode(info.data);
        if (Number(accountInfo.amount) === 0)
          throw new Error("Invalid Grand Parent Membership Nft info");

        const grandGrandGrandParentMembershipOwner = new PublicKey(
          accountInfo.owner
        );

        const grandGrandGrandParentMembershipUsdcTokenAccount =
          await getOrCreateAssociatedTokenAccount(
            conn,
            wallet.publicKey!,
            usdcToken,
            grandGrandGrandParentMembershipOwner,
            wallet.signTransaction!
          );

        if (grandGrandGrandParentMembershipUsdcTokenAccount[1]) {
          if (
            royaltyList.findIndex((item) => item === accountInfo.owner) === -1
          ) {
            royaltyList.push(accountInfo.owner);
            createTokenAccountTransaction.add(
              grandGrandGrandParentMembershipUsdcTokenAccount[1]
            );
          }
        }

        transaction.add(
          program.instruction.mint(new anchor.BN(bump), formData, {
            accounts: {
              owner: wallet.publicKey!,
              pool: FakeIDNFTPOOL,
              config: poolData.config,
              nftMint: mintKey,
              nftAccount: recipientKey,
              metadata: metadata,
              masterEdition: masterEdition,
              metadataExtended: metadataExtended,
              parentNftMetadataExtended: parentMembership.metadataExtended,
              creatorNftAccount: creatorNftAccount,
              sourceTokenAccount: sourceTokenAccount[0],
              scobyUsdcTokenAccount: scobyUsdcTokenAccount[0],
              creatorUsdcTokenAccount: creatorUsdcTokenAccount[0],
              parentNftUsdcTokenAccount: parentMembershipUsdcTokenAccount[0],
              grandParentNftUsdcTokenAccount:
                grandParentMembershipUsdcTokenAccount[0],
              grandGrandParentNftUsdcTokenAccount:
                grandGrandParentMembershipUsdcTokenAccount[0],
              grandGrandGrandParentNftUsdcTokenAccount:
                grandGrandGrandParentMembershipUsdcTokenAccount[0],
              tokenProgram: TOKEN_PROGRAM_ID,
              tokenMetadataProgram: TOKEN_METADATA_PROGRAM_ID,
              systemProgram: SystemProgram.programId,
              rent: SYSVAR_RENT_PUBKEY,
            },
          })
        );
      }

      if (createTokenAccountTransaction.instructions.length > 0) {
        console.log(createTokenAccountTransaction);
        const blockHash = await conn.getRecentBlockhash();
        createTokenAccountTransaction.feePayer = wallet.publicKey!;
        createTokenAccountTransaction.recentBlockhash = blockHash.blockhash;
        const signed = await wallet.signTransaction!(
          createTokenAccountTransaction
        );
        await conn.sendRawTransaction(signed.serialize());
      }
      await sendTransaction(transaction, signers);
      setAlertState({
        open: true,
        message: "Congratulations! Succeeded!",
        severity: "success",
      });
      await getPoolData();
    } catch (err) {
      console.log(err);
      setAlertState({
        open: true,
        message: "Failed! Please try again!",
        severity: "error",
      });
    }
  };

  async function sendTransaction(transaction: Transaction, signers: Keypair[]) {
    transaction.feePayer = wallet.publicKey!;
    transaction.recentBlockhash = (
      await conn.getRecentBlockhash("max")
    ).blockhash;
    transaction.setSigners(
      wallet.publicKey!,
      ...signers.map((s) => s.publicKey)
    );

    if (signers.length !== 0) transaction.partialSign(...signers);

    const signedTransaction = await wallet.signTransaction!(transaction);
    let hash = await conn.sendRawTransaction(signedTransaction.serialize());
    await conn.confirmTransaction(hash);
    return hash;
  }

  return (
    <>
      <main className="content">
        <div className="card">
          {poolData != null && (
            <h6 className="card-title">
              Mint Membership:{" "}
              {poolData.countMinting + "  Scoby Passes were minted"}
            </h6>
          )}
          <form className="form">
            {wallet && wallet.connected && (
              <button
                type="button"
                disabled={isProcessing}
                className="form-btn"
                style={{ justifyContent: "center" }}
                onClick={async () => {
                  setIsProcessing(true);
                  setAlertState({
                    open: true,
                    message: "Processing transaction",
                    severity: "warning",
                  });
                  await mint();
                  setIsProcessing(false);
                }}
              >
                {isProcessing ? "Processing..." : "Mint"}
              </button>
            )}
            <WalletConnect />
          </form>
        </div>
        <Grid container spacing={1}>
          {holdingNfts.map((item, idx) => {
            return (
              <Grid item xs={2}>
                <Card key={idx} sx={{ minWidth: 300 }}>
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
                      {"grandparent : " + item.extendedData.grandParentNfp}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {"Followers : " + item.extendedData.childrenCount}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            );
          })}
        </Grid>
        <Snackbar
          open={alertState.open}
          autoHideDuration={alertState.severity !== "warning" ? 6000 : 1000000}
          onClose={() => setAlertState({ ...alertState, open: false })}
        >
          <Alert
            iconMapping={{ warning: <CircularProgress size={24} /> }}
            onClose={() => setAlertState({ ...alertState, open: false })}
            severity={alertState.severity}
          >
            {alertState.message}
          </Alert>
        </Snackbar>
      </main>
    </>
  );
}


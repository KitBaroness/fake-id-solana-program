## STRUCTURE

This repository has 3 folders:

Configuration: `cli/` which contains configuration functions calls to create all the Config data and the Pool for the Fake IDs via CLI commands provided by NodeJS `commander`.
  All of those functions are in `cli/src/index.ts`.
Sample Website: `ui/` containing a simple Website to test the Fake ID minting
Smart Contract: `contract/` contains the Solana Smart Contract logic, both for configuration and for Fake ID minting

## CONFIGURATION

Please check `Readme.md` at `cli/Readme.md` for information about how to create all the needed configuration for the Fake ID minting

## SAMPLE WEBSITE

Check `ui/README.md` for information to run the Sample Website for minting Fake IDs

## SMART CONTRACT

All of the main logic is on `contract/solana_anchor/src/lib.rs`, there you'll find both
instructions to create the `Config` Address and the `Pool` Address as well as the 
`mint_root` and `mint` functions
`mint_root`: Mints the NFT 0 (It's triggered when the Pool `count_minting` is equal to 0). This should be called by the same wallet address that has been configured sa the `Creator` 
`mint`: Mints all of the others NFTs, after the 0 has been successfully minted
Those functions also contains the Royalty Distribution logic

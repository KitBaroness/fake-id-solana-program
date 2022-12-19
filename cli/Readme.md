## FLOW

1. Create/Update Config account

```
	ts-node src/index.ts init_config -k ./id.json -i ./info.json

	ts-node src/index.ts update_config -k ./id.json -i ./info.json -c <config address>
```

You can get config account address( for example, F5DPS9gkCVEus9DgZ5vJwCw6ECwEjR7WBSEJgVRgtCj2)

In Info.json, we need some values like : 

```
maxNumberOfLines : in our case, this value will be 1000

symbol : collection symbol

creator : creator wallet

sellerFee : 0 ~ 10000 (the same as metadata sellerFee)

```

2. Add config lines

```
	ts-node src/index.ts add_config_lines -k ./id.json -u ./assets -fn <start_number> -tn <last_number > -c <config address>
```

You can check config account with following cli

```
	ts-node src/index.ts get_config -c <config address>
```

3. Create pool

```
	ts-node src/index.ts init_pool -k ./id.json -i ./info.json -c <config address>

	ts-node src/index.ts update_pool -k ./id.json -i ./info.json -p <pool address>
```

You can get new pool account

```
	ts-node src/index.ts get_pool -p <Pool address>
```

4. Set simple-ui

You should update these values : programId, conn, pool address, symbol

## ALGORITHM

Constructing config account is similar to candy machine. We should store all metadata json url on config account.

In pool account, we store some properties such as :

```
owner : pool owner

config : config account address

count_minting : nft number we minted. If no nft minted, this value is 0(with this value, we recognize mint_root and mint)

minting_price : in our case 0.6sol

updateAuthority : metadata updateAuthority

royalty_for_minting, royalty_for_trading

pool_wallet : wallet address getting fees
```

If count_minting==0, will call mint_root, else call mint endpoint



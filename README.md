# Suibox

## Quick Start

Install package: `npm install @suia/suibox`

Usage example:

```typescript
import { SuiboxContract } from '@suia/suibox';
import { devnetConnection, Ed25519Keypair, JsonRpcProvider, RawSigner } from '@mysten/sui.js';

async function main(): Promise<void> {
  // init connection and signer
  const connection = devnetConnection;
  const provider = new JsonRpcProvider(connection);
  const keypairseed = process.env.KEY_PAIR_SEED;
  const keypair = Ed25519Keypair.fromSecretKey(Uint8Array.from(Buffer.from(keypairseed!, 'hex')));
  const signer = new RawSigner(keypair, provider);

  // publish a new suibox contract
  const suiboxContract = await SuiboxContract.publish(signer);

  // you can also specify an existing suibox contract with the function below
  // const suiboxContract = new Contract(packageId, signer);

  // create a new suibox
  const suibox = await suiboxContract.createSuibox({
    name: 'suibox name',
    description: 'suibox description',
    image_url: 'suibox image url',
    layout: '9-box grid',
  });

  // list all suiboxes owned by the signer
  const suiboxes = await suiboxContract.listSuiboxes();

  // add an nft to the suibox
  await suibox.add({ objectId: nft.objectId }, position);

  // list all nfts in the suibox
  const nftsAfterAddNFT = await suibox.listNFTs();

  // extract the nft from the suibox
  await suibox.extract(nftTypestruct, position);
}
```

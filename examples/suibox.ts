import { SuiboxContract } from '../src/suibox';
import { devnetConnection, Ed25519Keypair, JsonRpcProvider, RawSigner } from '@mysten/sui.js';

async function main(): Promise<void> {
  console.log('Hello from Suibox');

  // init connection and signer
  const connection = devnetConnection;
  const provider = new JsonRpcProvider(connection);
  const keypairseed = process.env.KEY_PAIR_SEED;
  const keypair = Ed25519Keypair.fromSecretKey(Uint8Array.from(Buffer.from(keypairseed!, 'hex')));
  const signer = new RawSigner(keypair, provider);

  const addr = await signer.getAddress();
  console.log('addr: ', addr);
  await provider.requestSuiFromFaucet(addr);

  // wait for the faucet to send the sui
  await new Promise((resolve) => setTimeout(resolve, 3000));

  // publish a new suibox contract
  const suiboxContract = await SuiboxContract.publish(signer);
  // you can also specify an existing suibox contract with the function below
  // const suiboxContract = new Contract(packageId, signer);

  // list all suiboxes
  let suiboxes = await suiboxContract.listSuiboxes();
  console.log('suiboxes: ', suiboxes);
  const suibox = await suiboxContract.createSuibox({
    name: 'suibox name',
    description: 'suibox description',
    image_url: 'suibox image url',
    layout: '9-box grid',
  });
  suiboxes = await suiboxContract.listSuiboxes();
  console.log('suiboxes: ', suiboxes);

  // create a new suibox as a nft and add it to the suibox created above
  const nft = await suiboxContract.createSuibox({
    name: 'nft',
    description: 'nft',
    image_url: 'nft',
    layout: 'nft',
  });
  await new Promise((resolve) => setTimeout(resolve, 3000));
  await suibox.add({ objectId: nft.objectId }, 0);
  const nftsAfterAddNFT = await suibox.listNFTs();
  console.log('nftsAfterAddNFT: ', nftsAfterAddNFT);

  // extract the nft from the suibox
  await suibox.extract(`${await nft.getPackageId()}::suibox::Suibox`, 0);
  const nftsAfterExtractNFT = await suibox.listNFTs();
  console.log('nftsAfterExtractNFT: ', nftsAfterExtractNFT);
  console.log('----------- suibox example end -----------');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

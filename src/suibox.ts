import {
  JsonRpcProvider,
  RawSigner,
  SuiObjectChangeCreated,
  SuiObjectChangePublished,
  TransactionBlock,
  normalizeSuiObjectId,
  fromB64,
  SuiObjectResponse,
} from '@mysten/sui.js';
import * as compiledModulesAndDeps from './contract_assets.json';

export interface SuiboxParams {
  name: string;
  description: string;
  image_url: string;
  layout: string;
}

export interface NftParams {
  objectId: string;
  typestruct?: string;
}

export interface NftInSuibox {
  position: number;
  objectId: string;
  objectType: string;
}

async function getNftType(objectId: string, provider: JsonRpcProvider): Promise<string> {
  const res = await provider.getObject({
    id: objectId,
    options: {
      showType: true,
    },
  });
  // console.log('res', JSON.stringify(res, null, 2));
  return res.data!.type!;
}

export class SuiboxContract {
  readonly packageId: string;
  readonly signer: RawSigner;

  constructor(packageId: string, signer: RawSigner) {
    this.packageId = packageId;
    this.signer = signer;
  }

  static async publish(signer: RawSigner): Promise<SuiboxContract> {
    const tx = new TransactionBlock();
    const [upgradeCap] = tx.publish({
      modules: compiledModulesAndDeps.modules.map((m: any) => Array.from(fromB64(m))),
      dependencies: compiledModulesAndDeps.dependencies.map((addr: string) => normalizeSuiObjectId(addr)),
    });
    tx.transferObjects([upgradeCap], tx.pure(await signer.getAddress()));
    const publishTxn = await signer.signAndExecuteTransactionBlock({
      transactionBlock: tx,
      options: {
        showInput: true,
        showEffects: true,
        showEvents: true,
        showObjectChanges: true,
      },
    });
    console.log('publishTxn', JSON.stringify(publishTxn, null, 2));
    const packageId = (publishTxn.objectChanges!.filter((o) => o.type === 'published')[0] as SuiObjectChangePublished)
      .packageId;
    return new SuiboxContract(packageId, signer);
  }

  async listSuiboxes(): Promise<Suibox[]> {
    const owner = await this.signer.getAddress();
    let suiboxes: Suibox[] = [];
    let cursor: string | null = null;
    while (true) {
      let res: any = await this.signer.provider.getOwnedObjects({
        owner,
        cursor,
        filter: {
          StructType: `${this.packageId}::suibox::Suibox`,
        },
        options: {
          showType: true,
        },
      });
      // console.log("res", JSON.stringify(res, null, 2));
      for (let obj of res.data) {
        suiboxes.push(new Suibox(obj.data!.objectId, this.signer, this.packageId));
      }
      if (res.hasNextPage) {
        cursor = res.cursor;
      } else {
        return suiboxes;
      }
    }
  }

  async createSuibox(params: SuiboxParams): Promise<Suibox> {
    const tx = new TransactionBlock();
    tx.moveCall({
      target: `${this.packageId}::suibox::create_suibox`,
      typeArguments: [],
      arguments: [tx.pure(params.name), tx.pure(params.description), tx.pure(params.image_url), tx.pure(params.layout)],
    });
    const txnRes = await this.signer.signAndExecuteTransactionBlock({
      transactionBlock: tx,
      options: {
        showInput: true,
        showEffects: true,
        showEvents: true,
        showObjectChanges: true,
      },
    });
    const suiboxObjectId = (
      txnRes.objectChanges!.filter(
        (o) => o.type === 'created' && o.objectType.endsWith('::suibox::Suibox'),
      )[0] as SuiObjectChangeCreated
    ).objectId;
    return new Suibox(suiboxObjectId, this.signer, this.packageId);
  }
}

export class Suibox {
  objectId: string;
  signer: RawSigner;
  packageId: string | undefined;

  constructor(address: string, signer: RawSigner, packageId?: string) {
    this.objectId = address;
    this.signer = signer;
    this.packageId = packageId;
  }

  async listNFTs(): Promise<NftInSuibox[]> {
    const suiboxDetail: any = await this.signer.provider.getObject({
      id: this.objectId,
      options: {
        showContent: true,
      },
    });
    const bagId = suiboxDetail.data.content.fields.nfts.fields.id.id;
    let cursor: string | null = null;
    let res = [];
    while (true) {
      const nfts: any = await this.signer.provider.getDynamicFields({
        parentId: bagId,
        cursor,
      });
      // console.log("nfts", JSON.stringify(nfts, null, 2));
      for (let nft of nfts.data) {
        res.push({
          position: parseInt(nft.name.value),
          objectId: nft.objectType,
          objectType: nft.objectId,
        });
      }
      if (nfts.hasNextPage) {
        cursor = nfts.cursor;
      } else {
        return res;
      }
    }
  }

  async getPackageId(): Promise<string> {
    if (this.packageId) {
      return this.packageId;
    }
    const res = await this.signer.provider.getObject({
      id: this.objectId,
      options: {
        showType: true,
      },
    });
    this.packageId = res.data!.type!.split('::')[0];
    return this.packageId;
  }

  async add(nft: NftParams, position: number) {
    const tx = new TransactionBlock();
    if (!nft.typestruct) {
      nft.typestruct = await getNftType(nft.objectId, this.signer.provider);
    }
    tx.moveCall({
      target: `${await this.getPackageId()}::suibox::add_nft_to_suibox`,
      typeArguments: [nft.typestruct],
      arguments: [tx.object(this.objectId), tx.object(nft.objectId), tx.pure(position)],
    });
    await this.signer.signAndExecuteTransactionBlock({
      transactionBlock: tx,
      options: {
        showInput: true,
        showEffects: true,
        showEvents: true,
        showObjectChanges: true,
      },
    });
  }

  async extract(typestruct: string, position: number) {
    const tx = new TransactionBlock();
    tx.moveCall({
      target: `${await this.getPackageId()}::suibox::extract_from_suibox`,
      typeArguments: [typestruct],
      arguments: [tx.object(this.objectId), tx.pure(position)],
    });
    await this.signer.signAndExecuteTransactionBlock({
      transactionBlock: tx,
      options: {
        showInput: true,
        showEffects: true,
        showEvents: true,
        showObjectChanges: true,
      },
    });
  }

  connect(signer: RawSigner): Suibox {
    return new Suibox(this.objectId, signer);
  }
}

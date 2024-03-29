import { AuthorityScope } from '@metaplex-foundation/mpl-auction-house';
import type { PublicKey } from '@solana/web3.js';
import { AuctionHouseAccount } from '../accounts';
import { Mint, Pda } from '@metaplex-foundation/js';
import { assert } from '@metaplex-foundation/js/src/utils/';

export type AuctionHouse = Readonly<
  {
    /** A model identifier to distinguish models in the SDK. */
    model: 'auctionHouse';

    /** The address of the Auction House. */
    address: Pda;

    /** The address of the Auction House creator. */
    creatorAddress: PublicKey;

    /** The address of the authority that is allowed to manage this Auction House. */
    authorityAddress: PublicKey;

    /**
     * The address of the Auction House treasury mint.
     * The token you accept as the purchase currency.
     * By default Auction House uses the `WRAPPED_SOL_MINT` treasury mint.
     */
    treasuryMint: Mint;

    /** The account that used to pay the fees for selling and buying. */
    feeAccountAddress: Pda;

    /** The account that receives the AuctionHouse fees. */
    treasuryAccountAddress: Pda;

    /** The account that is marked as a destination of withdrawal from the fee account. */
    feeWithdrawalDestinationAddress: PublicKey;

    /** The account that is marked as a destination of withdrawal from the treasury account. */
    treasuryWithdrawalDestinationAddress: PublicKey;

    /** The share of the sale the auction house takes on all NFTs as a fee. */
    sellerFeeBasisPoints: number;

    /** This allows the centralised authority to gate which NFT can be listed, bought and sold. */
    requiresSignOff: boolean;

    /**
     * Is intended to be used with the Auction House that requires sign off.
     * If the seller intentionally lists their NFT for a price of 0, a new FreeSellerTradeState is made.
     * The Auction House can then change the price to match a matching Bid that is greater than 0.
     */
    canChangeSalePrice: boolean;

    /**
     * If this is true, then it means that Auction House accepts SOL as the purchase currency.
     * In other case, different SPL token is set as the purchase currency.
     */
    isNative: boolean;

    /**
     * The list of scopes available to the user in the Auction House.
     * For example Bid, List, Execute Sale.
     */
    scopes: AuthorityScope[];
  }
>;

/** @group Model Helpers */
export const isAuctionHouse = (value: any): value is AuctionHouse =>
  typeof value === 'object' && value.model === 'auctionHouse';

/** @group Model Helpers */
export function assertAuctionHouse(value: any): asserts value is AuctionHouse {
  assert(isAuctionHouse(value), `Expected AuctionHouse type`);
}

/** @group Model Helpers */
export const toAuctionHouse = (
  auctionHouseAccount: AuctionHouseAccount,
  treasuryMint: Mint,
): AuctionHouse => {
  return {
    model: 'auctionHouse',
    address: new Pda(
      auctionHouseAccount.publicKey,
      auctionHouseAccount.data.bump
    ),
    creatorAddress: auctionHouseAccount.data.creator,
    authorityAddress: auctionHouseAccount.data.authority,
    treasuryMint,
    feeAccountAddress: new Pda(
      auctionHouseAccount.data.auctionHouseFeeAccount,
      auctionHouseAccount.data.feePayerBump
    ),
    treasuryAccountAddress: new Pda(
      auctionHouseAccount.data.auctionHouseTreasury,
      auctionHouseAccount.data.treasuryBump
    ),
    feeWithdrawalDestinationAddress:
      auctionHouseAccount.data.feeWithdrawalDestination,
    treasuryWithdrawalDestinationAddress:
      auctionHouseAccount.data.treasuryWithdrawalDestination,
    sellerFeeBasisPoints: auctionHouseAccount.data.sellerFeeBasisPoints,
    requiresSignOff: auctionHouseAccount.data.requiresSignOff,
    canChangeSalePrice: auctionHouseAccount.data.canChangeSalePrice,
    isNative: treasuryMint.isWrappedSol,
    scopes: auctionHouseAccount.data.scopes.reduce<number[]>(
      (acc, isAllowed, index) => (isAllowed ? [...acc, index] : acc),
      [] as number[]
    ),
  };
};

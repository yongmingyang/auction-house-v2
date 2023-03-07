import type { PublicKey } from '@solana/web3.js';
import {  toAuctionHouseAccount } from '../accounts';
import { AuctionHouse, toAuctionHouse } from '../models/AuctionHouse';
import {
  Operation,
  OperationHandler,
  OperationScope,
  useOperation,
} from '@metaplex-foundation/js';
import type { Metaplex } from '@metaplex-foundation/js';

// -----------------
// Operation
// -----------------

const Key = 'FindAuctionHouseByAddressOperation' as const;

/**
 * Finds an Auction House by its address.
 *
 * ```ts
 * const nft = await metaplex
 *   .auctionHouse()
 *   .findByAddress({ address };
 * ```
 *
 * @group Operations
 * @category Constructors
 */
export const findAuctionHouseByAddressOperation =
  useOperation<FindAuctionHouseByAddressOperation>(Key);

/**
 * @group Operations
 * @category Types
 */
export type FindAuctionHouseByAddressOperation = Operation<
  typeof Key,
  FindAuctionHouseByAddressInput,
  AuctionHouse
>;

/**
 * @group Operations
 * @category Inputs
 */
export type FindAuctionHouseByAddressInput = {
  /** The address of the Auction House. */
  address: PublicKey;
};

/**
 * @group Operations
 * @category Handlers
 */
export const findAuctionHouseByAddressOperationHandler: OperationHandler<FindAuctionHouseByAddressOperation> =
  {
    handle: async (
      operation: FindAuctionHouseByAddressOperation,
      metaplex: Metaplex,
      scope: OperationScope
    ) => {
      const { programs, commitment } = scope;
      const { address } = operation.input;
    
      const accountsToFetch = [address].filter(
        (account): account is PublicKey => !!account
      );

      const accounts = await metaplex
        .rpc()
        .getMultipleAccounts(accountsToFetch, commitment);
      scope.throwIfCanceled();

      const auctionHouseAccount = toAuctionHouseAccount(accounts[0]);
      const mintModel = await metaplex
        .tokens()
        .findMintByAddress(
          { address: auctionHouseAccount.data.treasuryMint },
          scope
        );
      scope.throwIfCanceled();
      return toAuctionHouse(auctionHouseAccount, mintModel);
    },
  };
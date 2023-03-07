import * as anchor from "@project-serum/anchor";
import { Program } from "@project-serum/anchor";
import { AuctionHouseV2 } from "../target/types/auction_house_v2";

describe("auction-house-v2", () => {
  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.AnchorProvider.env());

  const program = anchor.workspace.AuctionHouseV2 as Program<AuctionHouseV2>;

  it("Is initialized!", async () => {
    // Add your test here.
    const tx = await program.methods.initialize().rpc();
    console.log("Your transaction signature", tx);
  });
});

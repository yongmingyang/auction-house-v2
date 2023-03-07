use anchor_lang::{prelude::*, solana_program::program::invoke, AnchorDeserialize};
use solana_program::program_memory::sol_memset;

use crate::{constants::*, errors::*, utils::*, AuctionHouse, *};

/// Accounts for the [`cancel` handler](auction_house/fn.cancel.html).
#[derive(Accounts)]
#[instruction(buyer_price: u64, token_size: u64)]
pub struct Cancel<'info> {
    /// CHECK: Verified in cancel_logic.
    /// User wallet account.
    #[account(mut)]
    pub wallet: UncheckedAccount<'info>,

    /// SPL token account containing the token of the sale to be canceled.
    #[account(mut)]
    pub token_account: Box<Account<'info, TokenAccount>>,

    /// Token mint account of SPL token.
    pub token_mint: Box<Account<'info, Mint>>,

    /// CHECK: Validated as a signer in cancel_logic.
    /// Auction House instance authority account.
    pub authority: UncheckedAccount<'info>,

    /// Auction House instance PDA account.
    #[account(
        seeds = [
            PREFIX.as_bytes(),
            auction_house.creator.as_ref(),
            auction_house.treasury_mint.as_ref()
        ],
        bump=auction_house.bump,
        has_one=authority,
        has_one=auction_house_fee_account
    )]
    pub auction_house: Box<Account<'info, AuctionHouse>>,

    /// CHECK: Not dangerous. Account seeds checked in constraint.
    /// Auction House instance fee account.
    #[account(
        mut,
        seeds = [
            PREFIX.as_bytes(),
            auction_house.key().as_ref(),
            FEE_PAYER.as_bytes()
        ],
        bump=auction_house.fee_payer_bump
    )]
    pub auction_house_fee_account: UncheckedAccount<'info>,

    /// CHECK: Validated in cancel_logic.
    /// Trade state PDA account representing the bid or ask to be canceled.
    #[account(mut)]
    pub trade_state: UncheckedAccount<'info>,

    pub token_program: Program<'info, Token>,
}

// Cancel a bid or ask by revoking the token delegate, transferring all lamports from the trade state account to the fee payer, and setting the trade state account data to zero so it can be garbage collected.
pub fn cancel<'info>(
    ctx: Context<'_, '_, '_, 'info, Cancel<'info>>,
    buyer_price: u64,
    token_size: u64,
) -> Result<()> {
    cancel_logic(ctx.accounts, buyer_price, token_size)
}

#[allow(clippy::needless_lifetimes)]
fn cancel_logic<'info>(
    accounts: &mut Cancel<'info>,
    buyer_price: u64,
    token_size: u64,
) -> Result<()> {
    let wallet = &accounts.wallet;
    let token_account = &accounts.token_account;
    let token_mint = &accounts.token_mint;
    let authority = &accounts.authority;
    let auction_house = &accounts.auction_house;
    let auction_house_fee_account = &accounts.auction_house_fee_account;
    let trade_state = &accounts.trade_state;
    let token_program = &accounts.token_program;

    let ts_bump = trade_state.try_borrow_data()?[0];
    assert_valid_trade_state(
        &wallet.key(),
        auction_house,
        buyer_price,
        token_size,
        &trade_state.to_account_info(),
        &token_account.mint.key(),
        &token_account.key(),
        ts_bump,
    )?;
    assert_keys_equal(token_mint.key(), token_account.mint)?;
    if !wallet.to_account_info().is_signer && !authority.to_account_info().is_signer {
        return Err(AuctionHouseError::NoValidSignerPresent.into());
    }

    let auction_house_key = auction_house.key();
    let seeds = [
        PREFIX.as_bytes(),
        auction_house_key.as_ref(),
        FEE_PAYER.as_bytes(),
        &[auction_house.fee_payer_bump],
    ];

    let (fee_payer, _) = get_fee_payer(
        authority,
        auction_house,
        wallet.to_account_info(),
        auction_house_fee_account.to_account_info(),
        &seeds,
    )?;

    if token_account.owner == wallet.key() && wallet.is_signer {
        invoke(
            &revoke(
                &token_program.key(),
                &token_account.key(),
                &wallet.key(),
                &[],
            )
            .unwrap(),
            &[
                token_program.to_account_info(),
                token_account.to_account_info(),
                wallet.to_account_info(),
            ],
        )?;
    }

    let curr_lamp = trade_state.lamports();
    **trade_state.lamports.borrow_mut() = 0;

    **fee_payer.lamports.borrow_mut() = fee_payer
        .lamports()
        .checked_add(curr_lamp)
        .ok_or(AuctionHouseError::NumericalOverflow)?;
    sol_memset(*trade_state.try_borrow_mut_data()?, 0, TRADE_STATE_SIZE);

    Ok(())
}

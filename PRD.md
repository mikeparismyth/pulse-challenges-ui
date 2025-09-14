# **Pulse Challenges --- Web App POC PRD (Next.js + Privy + Abstract)** {#pulse-challenges-web-app-poc-prd-next.js-privy-abstract}

**Owner:** Michael Paris  
**Contributors:** Product, Platform, Wallet, Data, Legal/Compliance  
**Last updated:** Sept 4, 2025  
**Status:** Draft v0.1

## **0) Executive Summary** {#executive-summary}

We will build **Pulse Challenges** as a responsive **web app**
(mobile-first, desktop-ready) that we can ship rapidly, demo cleanly,
and hand off to engineers for production hardening. It will use
**Next.js** + **Vercel** for velocity, **Privy** for progressive auth +
embedded/external wallets (EVM & Solana), and target **Abstract L2
(EVM)** first for on-chain escrow + payouts, with **Pudgy Party** as the
flagship game. The app must preserve the Pulse tournament business logic
(Top‑12 leaderboard, fees, low‑participation rules) and add
multi‑token/multi‑network selection for entry/payouts (MYTH on Abstract;
PENGU on Abstract and/or Solana; admin‑addable tokens).

Key differences from the prior MVP:

- **Wallet & Auth:** Replace Turnkey with Privy (embedded wallets,
  > social/OTP, external wallet linking; key export enabled for
  > non‑custodial UX).

- **Chain:** Target **Abstract (EVM)** and later Solana for
  > escrow/payouts

- **Contracts:** Integrate a **third‑party tournament escrow provider
  > (TEP)** or ship an interim audited EVM contract (escrow + fee
  > splits) while we evaluate multi‑chain options.

- **Game:** Spec for **Pudgy Party** leaderboard modes (i.e.
  > Top‑1/Top‑3/Top‑10 Finishes, Coins Earned, etc.).

- **Admin‑gated creation:** Challenge creation initially restricted to
  > admins; designed to unlock UGC later.

- **Analytics:** Snowplow + Looker with a clean event schema from auth →
  > join → play → payout.

## **1) Goals & Non‑Goals** {#goals-nongoals}

### **1.1 Goals** {#goals}

- Ship a polished **web POC** of Challenges that is:

  - **Production‑lean**: Clean architecture, typed interfaces, test
    > coverage, infra ready to scale.

  - **Playable end‑to‑end**: login → link wallets/accounts → join → play
    > → leaderboard → payout.

  - **Multi‑chain aware**: EVM first (Abstract), with adapters for
    > Solana tokens later.

  - **Admin tools**: Create/edit challenges; operational views for
    > support & payouts.

- Respect existing **Pulse tournament rules**: fees, Top‑12 splits,
  > cancellations, fallbacks.

- Design with **wallet‑app expansion** in mind (future Pulse Wallet
  > features).

### **1.2 Non‑Goals (v0/v1)** {#nongoals-v0v1}

- Native iOS/Android apps (we'll keep the codebase portable to mobile
  > later).

- Full push notification service (we'll implement rich in‑app toasts;
  > push later).

- On‑chain anti‑cheat or trustless oracles (we'll use signed server
  > telemetry; oracle vendors evaluated).

- Marketplace features, chat/DMs, staking, or brand‑sponsored escalator
  > mechanics (future phases).

## **2) System Architecture** {#system-architecture}

### **2.1 High‑Level Diagram** {#highlevel-diagram}

- **Next.js App Router** on Vercel (SSR + ISR for SEO pages; mostly
  > client‑side for app shell).

- **Privy React SDK**: Auth + wallets (embedded + external) for **EVM
  > (Abstract)** and **Solana** (Phantom et al.).

- **EVM RPC**: Abstract mainnet/testnet via RPC endpoints; viem/wagmi
  > for EVM calls.

- **Contracts layer**: TEP integration for escrow/payouts. Fallback: our
  > audited EVM tournament escrow + 0xSplits for fee distribution.

- **Backend API**: Next.js API routes or a lightweight Node service for:

  - challenge CRUD (admin),

  - join/pay flow (intent checks, allowance/permit flows),

  - leaderboard ingestion from **Pudgy Party** server webhooks,

  - payouts orchestration and post‑settlement accounting.

- **DB**: Postgres (Neon), Prisma ORM.

- **Cache/Real‑time**: Redis (Upstash) + WebSockets (Vercel
  > WebSockets/Ably/Pusher).

- **Telemetry**: Snowplow JS + server emitters → BigQuery → Looker
  > dashboards.

- **Images**: LLM image gen service (OpenAI image API) with prompt
  > guardrails + review queue.

### **2.2 Environments** {#environments}

- **Dev** (preview branches); **Staging**; **Prod**.

- Automatic Vercel previews per PR; feature flags via @vercel/flags or
  > ConfigCat.

## **3) Authentication & Account Linking** {#authentication-account-linking}

### **3.1 Login Methods** {#login-methods}

- Enable: **Email OTP**, **Passkey/WebAuthn**, **Discord**, **Google**,
  > **Wallet (SIWE/SIWS)**.

- Progressive onboarding: allow browse → prompt to authenticate at
  > join/payout actions.

### **3.2 User Object & Linking** {#user-object-linking}

- Single user may attach: **many wallets** (EVM + Solana), **one
  > email**, **many passkeys**.

- **Mythical Account linking** (FusionAuth OAuth):

  - Start link → FusionAuth OAuth consent → redirect back with code →
    > exchange for token → store user↔Mythical mapping with scopes (game
    > stats read).

  - Unlink revokes token & marks data stale.

### **3.3 Sessions & Security** {#sessions-security}

- Privy session token + app JWT for API calls; rotate 24h; refresh on
  > activity.

- CSRF on POST; rate limits on sensitive endpoints (join/create/payout).

- Device fingerprint (soft) for risk scoring (suspicious rapid account
  > creation).

### **3.4 Acceptance Criteria** {#acceptance-criteria}

- User can login with OTP/Discord/Google, link ≥1 EVM wallet and
  > Phantom, view all under **Profile → Linked Wallets**; sign a test
  > message; export embedded key.

- Logging out invalidates the app JWT; refresh is required for new
  > actions.

### **3.5 Mythical Account Linking Flow** {#mythical-account-linking-flow}

**Requirement**: All users must link Mythical account to access
challenges (required for scoring/leaderboard data).

**Technical Flow:**

1.  **Post-Privy Auth**: After successful Privy login, check if user has
    > linked Mythical account

2.  **Blocking Modal**: If not linked, show \"Connect Your Game
    > Account\" modal (cannot dismiss)

3.  **OAuth Initiation**: Click \"Connect Mythical\" → Redirect to
    > FusionAuth OAuth consent screen

4.  **OAuth Scopes**: Request profile:read, gameplay:read for username +
    > match data access

5.  **Callback Handling**: /api/mythical/oauth/callback → Exchange code
    > for access token

6.  **Profile Fetch**: Call Mythical API to get displayName (Pudgy
    > username, NFL Rivals username, etc.)

7.  **Database Storage**: Store mythicalAccountId, displayName,
    > accessToken (encrypted), refreshToken

8.  **Unlock App**: User can now access challenge listings and join
    > flows

**Error Handling:**

- OAuth rejection → Show retry modal with support contact

- API failures → Temporary \"Try Again\" with fallback to support email

- Token expiry → Auto-refresh on webhook failures, re-prompt user if
  > refresh fails

**Acceptance Criteria:**

- New users cannot access challenge listings without Mythical link

- Profile shows linked Mythical username

- Webhook payload matching works via mythicalAccountId

- Unlink option in Profile → clears tokens, blocks app access until
  > re-link

## **4) Wallets & Chains** {#wallets-chains}

### **4.1 Supported Tokens & Networks** {#supported-tokens-networks}

**Supported Tokens (Entry Fees & Prizes):**

- **MYTH**: Abstract L2, Ethereum Mainnet

- **PENGU**: Abstract L2, Solana

- **USDC**: Abstract L2, Ethereum, Solana, Polygon, Avalanche

- **ETH**: Ethereum Mainnet, Abstract L2

- ~~**MATIC**: Polygon~~

- ~~**AVAX**: Avalanche~~

- **SOL**: Solana

**Network Support:**

- **EVM Networks**: Abstract L2 (primary), Ethereum Mainnet,
  > ~~Polygon~~, Avalanche

- **Non-EVM**: Solana

**Price Display Requirements:**

- All token amounts must show USD equivalent

- Live price updates every 1 minute via CoinGecko API

- Format: \"10 MYTH (\~\$45.67 USD)\" throughout UI

- Cache prices server-side with 60-second TTL

### **4.2 Wallet Types** {#wallet-types}

- **Embedded EVM wallet** (Privy) auto‑provisioned on login
  > (configurable) with **key export** in **Profile**.

- **External EVM wallets**: MetaMask, Rainbow, Coinbase Wallet via
  > connectors.

- **Solana wallets**: Phantom et al. (link for holding/prizes; writes
  > post‑MVP if required).

### **4.3 Preferred Payout Wallets** {#preferred-payout-wallets}

- In **Profile → Payouts**, user selects **preferred wallet per
  > network** (EVM/Abstract; Solana).

- If unset, default to embedded EVM wallet on Abstract for MYTH payouts.
  > Solana payouts require Phantom linked.

### **4.4 Multi-Network Wallet Support** {#multi-network-wallet-support}

**Challenge Network Compatibility:**

- Each challenge specifies required network (e.g., \"Abstract L2\" for
  > MYTH entry)

- Join flow checks if user\'s preferred payout wallet supports challenge
  > network

**Wallet-Network Mismatch Scenarios:**

**Scenario 1: Preferred wallet doesn\'t support challenge network**

- Show wallet switcher filtered to compatible wallets only

- If no compatible wallets linked: Prompt \"Connect \[Network\] Wallet\"
  > → Privy connector flow

- Fallback: Use embedded wallet (supports all EVM networks via RPC
  > switching)

**Scenario 2: External wallet on wrong network**

- Show \"Switch to \[Correct Network\]\" button → Triggers Privy network
  > switching

- If wallet doesn\'t support network: Prompt to use different wallet or
  > embedded wallet

**Network Display Rules:**

- Challenge cards show network badge (e.g., \"Abstract L2\", \"Solana\")

- Entry fee displays include network: \"10 MYTH on Abstract L2\"

- Wallet selector shows network compatibility: \"MetaMask ✓ Abstract\"
  > vs \"MetaMask ✗ Solana\"

**Acceptance Criteria**: Users can always join challenges regardless of
wallet/network mismatches through guided flows

- 

## **5) Challenges --- Core Objects** {#challenges-core-objects}

### **5.1 Challenge Model** {#challenge-model}

- id (uuid)

- slug (derived from title)

- visibility = public \| private (invite code) \| unlisted

- game = PUDGY_PARTY (v0; enum allows future games)

- mode = LEADERBOARD

- **Leaderboard config  
  > **

  - score_by = TOP1_COUNT \| TOP3_COUNT \| TOP10_COUNT \| COINS_EARNED
    > \| CUSTOM_METRIC

  - higher_is_better = true

  - time_window (UTC start/end)

- **Entry & Prizes  
  > **

  - entry_token = { chain: ABSTRACT \| SOLANA \| ETHEREUM, symbol,
    > tokenAddr/mint, decimals }

  - entry_fee (min units)

  - prize_token = entry_token (MUST match - same token, same network)  
    > max_participants (optional)

- **Fees  
  > **

  - developer_fee_bps (default 800 = 8%)

  - organizer_fee_bps (0--1000)

  - fee destinations: dev_fee_wallet, organizer_fee_wallet

- **State = DRAFT → UPCOMING → LIVE → ENDED → SETTLED \| CANCELLED \|
  > DISPUTE**

- **Created by** (userId), allow_user_generated (feature flag)

- dispute_window_hours = 24 // Time allowed for result disputes after
  > ENDED

### **5.2 Display Buckets (App Home)** {#display-buckets-app-home}

- **Active** -- challenges the user **joined** and are **LIVE**.

- **Happening Now** -- all **LIVE** challenges.

- **Upcoming** -- start within **36h**; not started yet.

- **Created by you** -- user‑created DRAFT/UPCOMING/LIVE (admin‑only at
  > v0).

### **5.3 Acceptance Criteria** {#acceptance-criteria-1}

- Only sections with ≥1 item render; sorting by startTime asc or join
  > recency; infinite scroll.

## **6) Challenge Creation (Admin v0)** {#challenge-creation-admin-v0}

### **6.1 Form Fields** {#form-fields}

- Title, Description, Hero image (LLM‑generated or upload), Visibility,
  > Invite code (if private), Game, Leaderboard score_by, Start/End
  > time, Entry Token+Network, Entry Fee, Prize Token+Network, Max
  > participants (4-1000), Organizer Fee (0-10%), Terms checkbox.

### **6.2 Validation** {#validation}

- Entry fees & prize tokens must be whitelisted (admin list).

- Start \< End; min duration 30m; cannot overlap with conflicting admin
  > policy windows if any.

- Organizer fee range 0--10% (enforced by UI & server).

### **6.3 Smart Contract Hooks (EVM v0)** {#smart-contract-hooks-evm-v0}

- On **Publish**:

  1.  Create tournament object off‑chain (DB) with status UPCOMING.

  2.  Initialize **escrow contract** via TEP (or our EVM contract) with:
      > entry token addr, min fee, fee split config, payout recipients
      > resolver (we provide winners post‑end). Store escrowAddress +
      > escrowId.

- Store contract deployment/interaction gas estimates for user display

### **6.4 Acceptance Criteria** {#acceptance-criteria-2}

- Admin can create/publish; a view page exists; contract init succeeds
  > on Abstract testnet; errors roll back server state.

### **6.5 Challenge Editing Permissions** {#challenge-editing-permissions}

**Always Editable (Admin only):**

- Challenge description

- Hero image

**Editable Until First Participant Joins:**

- Title, start/end times, entry fee amount, prize token configuration,
  > max participants, organizer fee percentage, visibility settings

**Never Editable After Publishing:**

- Game selection, scoring method (score_by), entry token/network, escrow
  > contract references

**State-Based Restrictions:**

- **DRAFT**: All fields editable

- **UPCOMING** (no participants): Limited editing allowed

- **UPCOMING** (≥1 participant): Only description/image editable

- **LIVE/ENDED/SETTLED**: Read-only

## **7) Join Flow (Entry Fee & Lock‑in)** {#join-flow-entry-fee-lockin}

### **7.1 UX** {#ux}

- **Join drawer** shows: Entry Fee, Token/Network, Prize Pool estimate,
  > Fees (Dev + Organizer), Deadline, and **Selected Wallet**
  > (switcher).

- **First‑time**: prompt to link wallet(s); otherwise default to user's
  > preferred EVM wallet.

### **7.2 On‑chain Steps (EVM)** {#onchain-steps-evm}

- For ERC‑20 entry:

  - Estimate gas costs for approve + join transaction → Display total
    > cost (entry fee + estimated gas) to user→ Check allowance →
    > trigger **approve** (or permit if supported) → **deposit** into
    > escrow join(tournamentId).

- Record on server: join_tx_hash, participant link.

### **7.3 Cancel & Refund Rules** {#cancel-refund-rules}

- Auto‑cancel if ≤3 participants by cutoff; refund 100% (minus network
  > fees).

- If 4--11 participants, distribute prize pot to top N per fallback
  > logic (below), after fees.

### **7.4 Gas Estimation & Cost Display** {#gas-estimation-cost-display}

**Pre-Transaction Gas Estimates:**

1.  **ERC-20 Approval**: Use eth_estimateGas for approve(spender,
    > amount) call

2.  **Join Transaction**: Estimate gas for join(tournamentId) contract
    > call

3.  **Total Cost Calculation**: Entry fee + (gas estimate × current gas
    > price)

4.  **Gas Price Source**: Network\'s suggested gas price (fast/standard
    > tier)

**UI Display in Join Drawer:**

- ****Entry Fee: 10 MYTH (\~\$45.00)

- Network Fee: \~0.002 ETH (\~\$6.40)

- ────────────────────────────

> Total Cost: \~\$51.40

**Dynamic Updates:**

- Refresh gas estimates every 30 seconds while drawer is open

- Show \"Estimating\...\" state during calculation

- Warning if gas price spikes \>50% from initial estimate

**Error Handling:**

- Gas estimation failures → Show \"Gas estimate unavailable, proceed
  > with caution\"

- Network congestion → Display \"High network activity, consider
  > waiting\"

- Insufficient gas token → \"Insufficient ETH for transaction fees\"
  > with \"Add Funds\" link

**Acceptance Criteria**: Users see accurate total costs before signing,
gas failures don\'t block transactions

## **8) Leaderboards & Scoring (Pudgy Party v0)** {#leaderboards-scoring-pudgy-party-v0}

### **8.1 Modes** {#modes}

- **Top‑1 Finishes** -- count of 1st place finishes in the time window.

- **Top‑3 Finishes** -- count of top‑3 placements.

- **Top‑10 Finishes** -- count of top‑10 placements.

- **Coins Earned** -- sum of in‑match coins.

### **8.2 Data Ingestion** {#data-ingestion}

- **Primary**: Pudgy Party **server → webhook** to Challenges API with
  > signed JWT (shared secret/rotating keys). Payload includes
  > mythicalAccountId, matchId, placements\[\], coins, timestamp.

- **Authentication & Mapping:**

  - **Webhook Security**: Shared secret HMAC signature verification +
    > rotating JWT tokens

  - **Payload Validation**: Verify challengeId exists and is in LIVE
    > state

  - **User Mapping**: mythicalAccountId from webhook → lookup linked
    > Pulse user via OAuth mapping table

  - **Username Validation**: Cross-reference webhook mythicalAccountId
    > with stored displayName for audit trail

<!-- -->

- **Idempotency & Deduplication:**

  - **Match ID Uniqueness**: matchId serves as idempotency key per
    > challenge

  - **Upsert Logic**: New match → insert; duplicate matchId → update
    > existing aggregates

  - **Score Reconciliation**: Handle out-of-order webhook delivery with
    > timestamp-based conflict resolution

<!-- -->

- **Latency**: ≤ 10 seconds typical; interim UI shows \"Pending
  > updates...\".

- **Webhook retry policy:** \"Retry policy: exponential backoff up to 5
  > attempts over 30 minutes for failed webhook deliveries\"

### **8.3 Anti‑tamper** {#antitamper}

- Only server‑signed events are accepted; optional score caps per
  > window; anomaly detection (e.g., \> X firsts per hour) flags review.

### **8.4 Acceptance Criteria** {#acceptance-criteria-3}

- Leaderboard updates in near‑real time; ties broken by earliest
  > achievement; downloadable CSV; winner preview matches the final
  > payout set.

## **9) Payouts & Settlement** {#payouts-settlement}

### **9.1 Fee Model** {#fee-model}

- **Developer fee**: default **8%** of **total entry pool**,
  > configurable per challenge by admin within policy.

- **Organizer fee**: **0--10%** configurable per challenge.

- Fees are taken **before** player payouts.

### **9.2 Payout Logic & Distribution** {#payout-logic-distribution}

**Fee Calculation (Applied First):**

- **Developer Fee**: 8% of total entry pool

- **Organizer Fee**: 0-10% of total entry pool (set during creation)

- **Net Prize Pool (P)**: Total entries - dev fee - organizer fee

**Cancellation Rules:**

- **≤3 participants**: Auto-cancel 30 minutes before end

- **Full refunds**: 100% entry fees returned, zero fees collected

- **UI Message**: \"Challenge cancelled due to insufficient
  > participation\"

**Standard Distribution (12+ participants):**

- Use Top-12 percentage table from net prize pool (P)

- **Minimum guarantee**: Ranks 7-12 receive at least full entry fee
  > refund

- **Holds true as long as total fees \< 50%**

**Low Participation (4-11 participants):**

1.  Apply Top-12 percentages to actual participant count

2.  Calculate unallocated percentage from unfilled ranks (7-12)

3.  Redistribute unallocated amount evenly across all actual ranks

4.  **Example (6 participants, 1000 MYTH net pool)**:

    - Standard allocation: 1st=450, 2nd=180, 3rd=100, 4th-6th=50 each

    - Total allocated: 880 MYTH

    - Unallocated: 120 MYTH (from ranks 7-12)

    - Redistribution: +20 MYTH to each rank

    - **Final**: 1st=470, 2nd=200, 3rd=120, 4th-6th=70 each

### **9.3 Prize Types** {#prize-types}

- **ERC‑20/SPL** prize pool (always to rank‑1)

### **9.4 Payout Execution (EVM v0)** {#payout-execution-evm-v0}

- At **END**:

  1.  Server computes winners & shares; obtains admin review.

  2.  Server calls TEP (or our escrow): settle(tournamentId,
      > winners\[\], amounts\[\], feeRecipients\[\]) from operator.

  3.  Contract emits Payout events; UI updates state to **SETTLED**.

- User receives tokens to **preferred payout wallet** for that network.

- Fallback: If preferred payout wallet fails (insufficient gas,
  > blacklisted), attempt payout to embedded wallet with user
  > notification

### **9.5 Acceptance Criteria** {#acceptance-criteria-4}

- Payout tx shown on challenge page & profile; fee receipts recorded;
  > handle revert paths (insufficient liquidity, paused token) with
  > retry queue.

### **9.6 Token Matching Requirements** {#token-matching-requirements}

**Simplified Rule**: Entry token and prize token MUST be identical (same
token contract, same network)

**Rationale**: Eliminates cross-chain bridging complexity, token
conversion rates, and liquidity management

**Examples:**

- ✅ Valid: Entry = 10 MYTH on Abstract, Prize Pool = MYTH on Abstract

- ✅ Valid: Entry = 5 PENGU on Solana, Prize Pool = PENGU on Solana

- ❌ Invalid: Entry = MYTH on Abstract, Prize = PENGU on Solana

- ❌ Invalid: Entry = USDC on Ethereum, Prize = USDC on Polygon

**Challenge Creation Validation**:

- Prize token field auto-populates to match entry token selection

- Prize token field is read-only (cannot be changed independently)

- UI shows: \"Prize Pool: Paid in \[ENTRY_TOKEN\] on \[NETWORK\]\"

**Acceptance Criteria**: All challenges have matching entry/prize
tokens, creation form enforces this rule, no cross-chain conversion
needed

## **10) Token Prices & Display** {#token-prices-display}

**Primary Price Source**: CoinGecko API (server-side cached, 60s TTL)

**Fallback Strategy (CoinGecko failures):**

1.  **Stale Cache**: Extend cached prices up to 5 minutes with \"Price
    > may be outdated\" disclaimer

2.  **Secondary API**: CoinMarketCap API as backup (30-second delay
    > between attempts)

3.  **Graceful Degradation**: If all APIs fail, show token amounts only
    > with \"(USD unavailable)\" label

**Display Format**: \"10 MYTH (\~\$5.67 USD)\" with price source
indicator when using fallbacks

**Acceptance Criteria**: Price failures don\'t block core functionality,
clear user messaging about data freshness

## **11) Notifications (In‑App Toasters)** {#notifications-inapp-toasters}

### **11.1 Design Principles** {#design-principles}

- **Short, punchy, gamified**; clear primary CTA; respect rate limits.

### **11.2 MVP Notifications** {#mvp-notifications}

See Challenge Related Notifications to be included:
[[https://docs.google.com/spreadsheets/d/1pn1KQe8sQXpYsyjlWEKEwIa315m_wnkbVXUvd-byeqQ/edit?usp=sharing]{.underline}](https://docs.google.com/spreadsheets/d/1pn1KQe8sQXpYsyjlWEKEwIa315m_wnkbVXUvd-byeqQ/edit?usp=sharing)

| **Event**                             | **App Trigger**                                                                                | **Toast Notification Title Copy**                                  | **Toast Notification Subtitle Copy**                                         | **Link/CTA**                                       |
|---------------------------------------|------------------------------------------------------------------------------------------------|--------------------------------------------------------------------|------------------------------------------------------------------------------|----------------------------------------------------|
| Challenge Starting                    | Challenge Start Time                                                                           | {Challenge Title} is starting!                                     | It\'s time to compete and climb the leaderboard! \<Challenge image preview\> | Challenge Detail Page                              |
| Challenge Top 12 Winner               | Challenge ends and user places Top 12                                                          | You crushed it! 🏆 Placed \#{placement 1-12} in {Challenge Title}! | You won {amount} MYTH. Check out the results! \<Challenge image preview\>    | Challenge Results Modal (on Challenge Detail Page) |
| Challenge Non-Winner                  | Challenge ends and user does not place Top 12                                                  | 🏁 {Challenge Title} has ended!                                    | See where you ranked on the leaderboard for {Challenge Title}                | Challenge Results Modal (on Challenge Detail Page) |
| Challenge Joined                      | User\'s join/participation in challenge was processed                                          | 🎉 You\'re In!                                                     | You've successfully joined the challenge: {Challenge Title}. Good luck!      | Challenge Detail Page                              |
| Challenge Join Failure                | User could not join challenge due to capacity met or other errror                              | 😕 Something Went Wrong                                            | Your entry couldn't be processed. No funds were deducted. Please try again.  | Challenge Detail Page                              |
| Challenge Cancelled                   | Challege cancelled due to low participation (\<4 participants (played matches) on leaderboard) | 😕 {Challenge Title} has been cancelled!                           | Fewer than 4 players qualified. Your entry fee has been refunded.            | Challenge Detail Page                              |
| Leaderboard Position Change (Up/Down) | User's position on leaderboard changes                                                         | 📈 You moved to \#{newPosition}!                                   | Keep playing to climb higher in {Challenge Title}.                           | Challenge Detail Page                              |
| New Participant Joined                | Another user joins the same challenge                                                          | 👋 {username} just joined!                                         | The competition in {Challenge Title} is heating up. Jump back in!            | Challenge Detail Page                              |
| Challenge Starting Soon -- 30 min     | 30 minutes before challenge start                                                              | ⏳ {Challenge Title} starts in 30 min                              | Get ready to play and secure your spot on the leaderboard.                   | Challenge Detail Page                              |
| Challenge Starting Soon -- 3 min      | 3 minutes before challenge start                                                               | ⚡ {Challenge Title} is about to start!                            | Don't miss the party! Time to get in the game.                               | Challenge Detail Page                              |
| Challenge Ending Soon -- 30 min       | 30 minutes before challenge ends                                                               | ⏳ {Challenge Title} ends in 30 min                                | Last chance to improve your rank before time runs out!                       | Challenge Detail Page                              |
| Challenge Ending Soon -- 3 min        | 3 minutes before challenge ends                                                                | ⚡ {Challenge Title} is almost over!                               | Just 3 minutes left. Now\'s your time to shine.                              | Challenge Detail Page                              |

## **12) Admin & Ops** {#admin-ops}

- Admin panel: challenge CRUD; participant list; anti‑cheat flags;
  > payout preview; manual settle/cancel; CSV exports; feature flags
  > (UGC toggle).

- Audit log of admin actions.

## **13) Legal/Compliance Notes (Non‑binding)** {#legalcompliance-notes-nonbinding}

- Terms/Privacy hosted on **mythical.games** or **pulse.xyz** per org
  > policy; in‑app surfaces link at sign‑up and join.

- Regional restrictions and age gating TBD; organizer fee disclosures on
  > join screen.

- No gambling/wagering verbiage; "entry fees" and "skill competition."

## **14) Telemetry & Analytics (Snowplow)** {#telemetry-analytics-snowplow}

### **14.1 Core KPIs** {#core-kpis}

- Funnel: **signup → link Mythical → link wallet → join → place (ranked)
  > → payout**.

- Engagement: D1/D7/D30 retention; **active challenges joined/created**;
  > **LLM image attach rate**.

- Monetization: total entry volume by token/chain; dev/organizer fees;
  > payout velocity.

### **14.2 Event Schema (selected)** {#event-schema-selected}

- auth_login_started { method }

- auth_login_succeeded { method, hasEmbeddedWallet }

- wallet_linked { chain, wallet_type, is_default }

- mythical_linked { scopes }

- challenge_created { id, game, score_by, entry_token, fee_bps }

- challenge_join_started { id, token, fee }

- challenge_join_confirmed { id, tx_hash, wallet }

- leaderboard_update { id, score_by, delta }

- payout_settled { id, winners: \[{rank, amount, wallet}\], dev_fee,
  > org_fee }

- 

- Page views on each page

- All tracked with user_id and session context; PII minimized.

## **15) Detailed Flows** {#detailed-flows}

### **15.1 Sign Up / Sign In (Privy Integration)** {#sign-up-sign-in-privy-integration}

**Supported Login Methods:**

- **Email OTP** (Privy native)

- **SMS OTP** (Privy native)

- **Social SSO**: Apple, Google, Discord

- **External Wallets**: MetaMask, WalletConnect, Rainbow, Phantom

- **Passkey/WebAuthn** (Privy native)

- **MFA Support** (Privy native, post-login)

**Flow:**

1.  User lands on home page (browsable without auth)

2.  Click **Sign In** → Privy modal opens with method selection

3.  **First-time users**: Choose method → complete auth → Privy
    > auto-provisions embedded EVM wallet

4.  **Returning users**: Sign in → access existing linked
    > wallets/accounts

5.  **Post-auth**: Route to Challenges Home with user pill modal in
    > nav/drawer displaying embedded privy wallet address

6.  **Progressive onboarding**: Prompt for additional wallet linking and
    > Mythical Account connection (Mythical account connection required,
    > wallet linking optional, as Privy auto-provisions a privy wallet)

**Privy Cross-App Ecosystem Integration:**

- Enable \"Log in to Abstract\" flow for Abstract L2 ecosystem wallets

- Support cross-app wallet sharing within Privy ecosystem

- Maintain wallet state across supported dApps

**Terms & Privacy:**

- Privy handles terms acceptance during signup flow

- Link to mythical.games/pulse.xyz privacy policy as required

**Edge Cases:**

- In-app browser OAuth fallback to OTP/SMS

- Wallet connection failures → retry with guidance

- Show Privy\'s native error handling UX

### **15.2 Profile Settings & Account Management (Privy UI)** {#profile-settings-account-management-privy-ui}

**Leverage Privy\'s existing UI screens for:**

- **Linked Accounts**: View/manage social logins (Apple, Google,
  > Discord)

- **Security**: MFA setup, passkey management, password changes

- **Wallets**: View linked external wallets, export embedded wallet
  > private key

- **Sessions**: Active device management, logout options

**Custom Pulse Settings (our UI):**

- **Preferred Payout Wallets**: Set default per network (EVM/Abstract,
  > Solana)

- **Notifications**: Opt-in/out of toast notifications per event type

- **Mythical Account Linking**: Connect/disconnect OAuth integration

### **15.3 Join Challenge Flow (Transaction Signing)** {#join-challenge-flow-transaction-signing}

**Wallet Selection:**

1.  User clicks **Join** on challenge detail page

2.  **Join Drawer** shows: Entry fee, token/network, total cost
    > estimate, selected wallet switcher

3.  **Wallet Options**: All linked wallets (embedded + external) for the
    > challenge\'s network

4.  **Default**: User\'s preferred payout wallet for that network;
    > fallback to embedded wallet

**External Wallet Flow (MetaMask, Rainbow, etc.):**

1.  Select external wallet → Privy triggers wallet connection

2.  Check token balance + allowance for entry fee

3.  If insufficient allowance: Request **approve** transaction → user
    > signs in wallet

4.  Request **join/deposit** transaction → user signs in wallet

5.  Both transactions show gas estimates in wallet UI

**Embedded Wallet Flow (Privy):**

1.  Select embedded wallet → Privy handles internally

2.  Check balance/allowance (same logic)

3.  Privy\'s embedded wallet UI for transaction approval

4.  User confirms via Privy\'s secure signing flow (biometric/PIN if
    > configured)

**Abstract L2 Integration:**

- Support Privy\'s \"Sign with Abstract\" functionality

- Display Abstract network-specific gas estimates

- Handle Abstract L2 RPC calls via Privy connectors

**Error Handling:**

- Insufficient balance → Show \"Add Funds\" options or wallet switcher

- Transaction rejected → Retry guidance with clear error messaging

- Network switching prompts via Privy\'s network management

### **15.4 Challenge Creation & Contract Integration** {#challenge-creation-contract-integration}

**Pre-Publishing (DRAFT state):**

1.  Admin completes creation form → Save as DRAFT

2.  No contract interaction yet

3.  All fields remain editable

**Publishing Flow:**

1.  Admin clicks **Publish** → Triggers contract deployment

2.  **TEP Integration**: Call createTournament(config) → Returns
    > escrowId and escrowAddress

3.  Store contract references in database

4.  Update challenge state: DRAFT → UPCOMING

5.  **Configuration Lock**: Once first participant joins, challenge
    > config becomes immutable

**Contract Association:**

- Each published challenge maps to unique escrow contract instance

- Entry fees flow to challenge-specific escrow address

- Settlement calls reference escrowId for payout distribution

### **15.5 End & Settlement**  {#end-settlement}

**Auto-Cancellation (≤3 participants):**

1.  Check participant count 30 minutes before end

2.  If ≤3 participants: Auto-cancel → Full refunds via cancel(escrowId)

3.  UI notification: \"Challenge cancelled - entry fees refunded\"

**Normal Settlement (4+ participants):**

1.  Challenge ends → Ingest final scores → Compute rankings

2.  **Admin Review**: Preview winners & payout amounts

3.  **Calculate Fees**: 8% dev + 0-10% organizer from total entry pool

4.  **Apply Payout Logic**:

    - 4-11 participants: Use simplified redistribution (see detailed
      > math below)

    - 12+ participants: Standard Top-12 split

5.  **Contract Settlement**: Call settle(escrowId, winners\[\],
    > amounts\[\], feeRecipients\[\])

6.  **Payout Execution**: Tokens sent to users\' preferred payout
    > wallets

7.  **UI Updates**: Show \"SETTLED\" state with transaction links

## **16) Third‑Party Tournament Escrow Provider (TEP) --- Interface Requirements** {#thirdparty-tournament-escrow-provider-tep-interface-requirements}

> We will evaluate providers that support **EVM (Abstract)** now and
> **Solana** next. If none satisfy both, we ship our own audited EVM
> contract now, and integrate a Solana program later.

**Must‑have API (conceptual):**

- createTournament(config) → escrowId, escrowAddress

- join(escrowId, participant, amount) (ERC‑20 approve/permit supported)

- cancel(escrowId) → refunds all deposits

- settle(escrowId, winners\[\], amounts\[\], feeRecipients\[\])

- Events: Joined, Cancelled, Settled

- Query methods:

  - getTournamentState(escrowId) → state, participants, totalDeposits

  - getParticipantDeposit(escrowId, participant) → amount, timestamp

**Contract semantics:**

- Token‑agnostic (any ERC‑20); supports dynamic fee split recipients;
  > safe math; reentrancy guards.

- Admin/owner role for **operator** (Pulse) to trigger settle.

- Pluggable **oracle hook** later for trustless result attestation.

**If building in‑house (EVM v0):**

- Minimal TournamentEscrow + PrizeDistributor + **0xSplits** for dev/org
  > fees.

- Add **Chainlink Automation** to guard settle windows; **EAS**
  > attestations for result proofs later.

## **17) LLM Image Generation (Challenge Banners)** {#llm-image-generation-challenge-banners}

- Prompt template swaps **NFL** assets for **Pudgy** style: cute arctic
  > settings, celebratory confetti, abstracted jerseys with **no logos
  > or numbers**, penguin mascots in generic gear; mobile‑safe focal
  > point; text‑free images.

- Admin preview & approve; fallback to a fixed safe set if model outputs
  > fail policy checks.

**Prompt scaffold (example):**

> "Create a dynamic, colorful banner for a **Pudgy Party** mobile game
> challenge titled '**Icy Sprint**'. Show cheerful, stylized penguin
> characters racing through a winter obstacle course with balloons,
> confetti, and glowing coin pickups. Avoid real logos, team branding,
> numbers, faces, or athletes. Keep composition center‑weighted for a
> 16:9 mobile banner. No text."

## **18) UI/UX --- Screens & Components** {#uiux-screens-components}

### **18.1 Tech Stack & Libraries** {#tech-stack-libraries}

- **Next.js (App Router)**, **TypeScript**, **Tailwind**, **shadcn/ui**,
  > **framer‑motion**, **wagmi/viem**, **Privy React SDK**.

### **18.2 Global** {#global}

- App shell with sticky bottom nav (mobile): **Home**, **My
  > Challenges**, **Create** (admin), **Profile**.

- Theme: dark; subtle glass blur; rounded‑2xl; micro‑interactions on
  > actions (join/settle).

### **18.3 Home / Listings** {#home-listings}

- Sections: Active, Happening Now, Upcoming.

- Cards show: hero, title, game tag, time status, entry token/network +
  > fee, prize pool (with USD est), joined indicator.

### **18.4 Challenge Detail** {#challenge-detail}

- Tabs: **Overview**, **Leaderboard**, **Rules**.

- Overview shows: time remaining, entry details, fees disclosure (Fees:
  > 8% Dev + up to 10% Organizer), prize pool calculator, **Join** CTA.

- Leaderboard: top ranks with sticky your‑rank row; live deltas.

### **18.5 Create/Edit (Admin)** {#createedit-admin}

- Multi‑step wizard: Basics → Tokens & Fees → Schedule → Review.

- Token selectors filtered by chain; validation on decimals/minimums.

### **18.6 Profile** {#profile}

- **Linked Accounts** (Mythical, Discord/Google), **Linked Wallets**
  > (EVM/Solana), **Preferred Payouts**, **Export Embedded Key**,
  > **Notifications** opt‑in/opt‑out.

### **18.7 Microcopy (concise)** {#microcopy-concise}

- Prize pool note on Overview: "**MYTH prize pool** is funded by entry
  > fees. Dev (8%) & Organizer (up to 10%) fees are deducted before
  > payouts."

## **19) APIs & Data Contracts** {#apis-data-contracts}

### **19.1 Public API (server routes)** {#public-api-server-routes}

- POST /api/auth/webhook -- Privy auth webhooks (user
  > created/linked/unlinked)

- POST /api/mythical/oauth/callback -- link exchange

- POST /api/challenges -- admin create

- POST /api/challenges/{id}/publish -- create escrow + set UPCOMING

- POST /api/challenges/{id}/join -- record intent; return contract
  > calldata; server signs permit if applicable

- POST /api/challenges/{id}/settle -- admin settle (payouts)

- POST /api/pudgy/webhook -- signed game events

### **19.2 Webhook (Pudgy → Pulse)** {#webhook-pudgy-pulse}

****{

\"id\": \"evt_123\",

\"version\": \"1.0\", // Schema version for backward compatibility

\"mythicalAccountId\": \"myth_abc\",

\"challengeId\": \"uuid\", // Direct challenge reference

\"serverTimestamp\": \"2025-09-04T12:34:56Z\",

\"matches\":
\[{\"matchId\":\"m1\",\"placement\":1,\"coins\":45,\"ts\":\"2025-09-04T12:34:56Z\"}\],

\"signature\": \"base64(jwt)\",

\"checksum\": \"sha256hash\" // Payload integrity check

}

### **19.3 DB (Prisma schema excerpt)** {#db-prisma-schema-excerpt}

****model Challenge {

id String @id @default(uuid())

slug String @unique

title String

description String?

game Game

state State @default(DRAFT)

startAt DateTime

endAt DateTime

entryToken TokenRef

prizeToken TokenRef

devFeeBps Int @default(800)

orgFeeBps Int @default(0)

escrowAddress String?

createdById String

createdAt DateTime @default(now())

disputeWindowHours Int @default(24)

disputeState DisputeState @default(NONE)

}

model Participant {

id String @id @default(uuid())

challengeId String

userId String

joinTx String?

createdAt DateTime @default(now())

}

model WalletPref {

userId String @id

evmPayoutAddr String?

solPayoutAddr String?

}



## **20) Fee & Payout Math (Deterministic)** {#fee-payout-math-deterministic}

Given:

- E = sum(entry_fees)

- dev = E \* devFeeBps/10_000

- org = E \* orgFeeBps/10_000

- P = E - dev - org

Top‑12 weights W = \[45,18,10,5,5,5,2,2,2,2,2,2\] → normalized shares.  
If participants ≤ 3 → cancel & refund.  
If 4 ≤ participants \< 12 → let R = participants; distribute P using the
first R weights from the Top-12 table, then redistribute the remaining
weight sum equally among those R positions (equal split across filled
ranks).

**Precision:** Use integer math in token minimal units; only rounding
down to avoid over‑distribution; leftovers (\< 1 unit per token) accrue
to a designated sink (dev wallet) or are redistributed to rank‑1.

## **21) Edge Cases & Fallbacks** {#edge-cases-fallbacks}

- Wallet rejected or insufficient allowance → show guided retry.

- Token paused/blacklisted → block join; surface error.

- Webhook outages → pause leaderboard updates; show timestamp of last
  > update; allow manual upload CSV by admin for emergency settle
  > (admin‑only).

- Image gen fail → fallback to curated banner set.

## **22) Performance & SLOs** {#performance-slos}

- P95 route latency \< 300ms (cached) / \< 800ms (uncached).

- Leaderboard update fan‑out \< 3s to clients.

- Join throughput: 50 TPS burst (queued/signature gating), 500
  > concurrent users browsing.

## **23) Security Checklist** {#security-checklist}

- Strict Content Security Policy; isolate wallet iframes; same‑site
  > cookies Lax; JWT exp ≤ 24h.

- Reentrancy & checks‑effects‑interactions in any owned contracts;
  > pause/guardian role.

- Admin actions require 2FA + audit log.

## **24) Instrumentation & Observability** {#instrumentation-observability}

- Snowplow events as above; Sentry errors (frontend/backend); Log drains
  > to Datadog.

- Health endpoints + synthetic join/settle tests on cron.

## **25) Rollout Plan** {#rollout-plan}

- **Phase A (v0 POC)**: Abstract testnet; embedded wallets; admin‑only
  > create; MYTH test token; end‑to‑end join→settle.

- **Phase B**: Abstract mainnet; external wallets; MYTH on Abstract;
  > production payouts; Pudgy ingested telemetry; image gen gating.

- **Phase C**: Solana adapter for PENGU (Phantom payouts), cross‑chain
  > token selector; oracle/attestation option.

## **26) Implementation Tasks (Jira‑ready excerpts)** {#implementation-tasks-jiraready-excerpts}

> Use these as templates; break down further as needed. Each task has
> **User Story**, **Description**, **Tech Spec**, **Acceptance
> Criteria**.

### **26.1 Auth & Wallets** {#auth-wallets}

**PCH‑A1 --- Integrate Privy Auth & Embedded EVM Wallet (Next.js)**

- **Story:** As a user, I can sign in with OTP/social and receive an
  > embedded EVM wallet.

- **Spec:** Add @privy-io/react-auth, configure login methods, enable
  > embedded wallets on login.

- **AC:** OTP & Google sign‑in success; user.wallets contains an
  > embedded wallet; can sign message; logout clears session.

**PCH‑A2 --- External Wallet Linking (EVM & Solana)**

- **Story:** As a user, I can link MetaMask and Phantom to my account.

- **Spec:** Enable connectors, UI for link/unlink; show addresses under
  > Profile.

- **AC:** Link/unlink flows succeed; multiple wallets are shown; active
  > wallet switcher on join.

**PCH‑A3 --- Preferred Payout Wallets**

- **Story:** I can set default payout wallets per network.

- **Spec:** DB WalletPref; Profile UI; server validates address
  > checksums.

- **AC:** Payouts use selected wallet; update persists across sessions.

**PCH‑A4 --- Mythical OAuth Link**

- **Story:** I can link my Mythical account for scoring.

- **Spec:** OAuth code grant; tokens stored encrypted; mapping table.

- **AC:** Linked state shown; unlink revokes; webhook from Pudgy
  > resolves to my user.

### **26.2 Challenges & Contracts** {#challenges-contracts}

**PCH‑C1 --- Challenge CRUD (Admin)**

- **Story:** Admin can create/edit/publish challenges.

- **Spec:** Form wizard; validation; publish triggers escrow init (TEP
  > stub).

- **AC:** Challenge visible in listings; state transitions valid.

**PCH‑C2 --- Join Flow (EVM)**

- **Story:** I can pay the entry fee and join.

- **Spec:** Allowance check, approve/permit → join; server records tx.

- **AC:** User shows as participant; on‑chain join event present; UI
  > success toast.

**PCH‑C3 --- Payout & Settle**

- **Story:** Admin can settle and winners get paid.

- **Spec:** Compute shares; call TEP settle; write payout receipts.

- **AC:** Winners' wallets receive tokens; fees routed; explorer links
  > shown.

### **26.3 Leaderboards & Telemetry** {#leaderboards-telemetry}

**PCH‑L1 --- Pudgy Webhook Ingestion**

- **Story:** Scores update in near real‑time.

- **Spec:** Signed JWT webhook; idempotent upsert; aggregate by
  > challenge/time window & metric.

- **AC:** Live leaderboard updates; replay safe.

**PCH‑L2 --- Snowplow Schema & Emitters**

- **Story:** Product can analyze conversion & payouts.

- **Spec:** Implement events; context schema; server‑side forwarding for
  > sensitive events.

- **AC:** Dashboard shows funnel; sample data validated.

### **26.4 Images & UI** {#images-ui}

**PCH‑I1 --- LLM Banner Generation + Review Queue**

- **Story:** Admin can generate/approve a safe banner per challenge.

- **Spec:** Prompt templates; moderation checks; asset CDN.

- **AC:** Approved image attaches; fallback on failure.

**PCH‑U1 --- Gamified Toasts**

- **Story:** I get delightful, timely nudges.

- **Spec:** Toast queue with rate limit; standardized variants;
  > deeplinks.

- **AC:** Toasters appear per triggers; a11y & motion‑reduced variants.

## **27) Open Questions** {#open-questions}

- Preferred **TEP** candidates for EVM+Solana? If none, green‑light
  > in‑house EVM escrow now + Solana program later.

- Regulatory review for multi‑region token entry fees; any blocked geos?

- Who owns dev fee wallet(s) and revenue accounting flow?

- Final domain policy (mythical.games vs pulse.xyz) for Terms/Privacy
  > links.

## **28) Risks & Mitigations** {#risks-mitigations}

- **Multi‑chain complexity** → Stage Solana integration; start EVM on
  > Abstract first.

- **Oracle/trust** → Use server‑signed telemetry initially; plan oracle
  > vendor RFP.

- **Fraud/abuse** → Rate limits, anomaly detection, admin reviews,
  > capped entries/user.

- **Token volatility** → Price display is informational; payouts based
  > on token amounts.

## **29) Glossary (A--Z)** {#glossary-az}

## **0xSplits** --- On-chain protocol that splits incoming funds (ETH/ERC‑20) to multiple recipients based on fixed percentages. Useful for automatically routing **Developer** and **Organizer** fees during settlement. {#xsplits-on-chain-protocol-that-splits-incoming-funds-etherc20-to-multiple-recipients-based-on-fixed-percentages.-useful-for-automatically-routing-developer-and-organizer-fees-during-settlement.}

## **Account Abstraction (AA, ERC‑4337)** --- A framework that lets **smart‑contract wallets** behave like normal accounts. Enables features like **gas sponsorship** (Paymasters), **bundled actions**, and **social recovery** using a new transaction type called a **UserOperation** handled by **Bundlers**. {#account-abstraction-aa-erc4337-a-framework-that-lets-smartcontract-wallets-behave-like-normal-accounts.-enables-features-like-gas-sponsorship-paymasters-bundled-actions-and-social-recovery-using-a-new-transaction-type-called-a-useroperation-handled-by-bundlers.}

## **Admin / Operator** --- Privileged role (backend and/or contract) allowed to publish challenges, trigger settlement, cancel, and manage fee destinations. All actions are audited. {#admin-operator-privileged-role-backend-andor-contract-allowed-to-publish-challenges-trigger-settlement-cancel-and-manage-fee-destinations.-all-actions-are-audited.}

## **Allowance** --- ERC‑20 approval amount a user grants to a contract (e.g., escrow) allowing it to move tokens up to a limit; set via approve() or signed **Permit**. {#allowance-erc20-approval-amount-a-user-grants-to-a-contract-e.g.-escrow-allowing-it-to-move-tokens-up-to-a-limit-set-via-approve-or-signed-permit.}

## **Allowlist (Token)** --- Curated list of tokens/networks permitted for entry fees and prize pools. {#allowlist-token-curated-list-of-tokensnetworks-permitted-for-entry-fees-and-prize-pools.}

## **API Route** --- Next.js server endpoint (e.g., /api/challenges/{id}/join) used by the web app for challenge CRUD, join orchestration, webhooks, and settlements. {#api-route-next.js-server-endpoint-e.g.-apichallengesidjoin-used-by-the-web-app-for-challenge-crud-join-orchestration-webhooks-and-settlements.}

## **Attestation (EAS)** --- Verifiable claim recorded on-chain (e.g., final results attested by Pulse or an oracle). Optional future trust layer. {#attestation-eas-verifiable-claim-recorded-on-chain-e.g.-final-results-attested-by-pulse-or-an-oracle.-optional-future-trust-layer.}

## **Basis Points (BPS)** --- Finance unit of one‑hundredth of a percent: 1 bps = 0.01%. Example: 8% developer fee = **800 bps**. {#basis-points-bps-finance-unit-of-onehundredth-of-a-percent-1-bps-0.01.-example-8-developer-fee-800-bps.}

## **BigQuery / Looker** --- Data warehouse and BI stack receiving Snowplow events for dashboards (funnel, engagement, revenue). {#bigquery-looker-data-warehouse-and-bi-stack-receiving-snowplow-events-for-dashboards-funnel-engagement-revenue.}

## **Bundler (4337)** --- Network service that collects **UserOperations** from smart‑contract wallets and submits them to the chain as transactions. {#bundler-4337-network-service-that-collects-useroperations-from-smartcontract-wallets-and-submits-them-to-the-chain-as-transactions.}

## **Cancelation Rules** --- Automatic outcomes based on participation thresholds (e.g., ≤3 participants → cancel & full refunds; 4--11 → fallback distribution). {#cancelation-rules-automatic-outcomes-based-on-participation-thresholds-e.g.-3-participants-cancel-full-refunds-411-fallback-distribution.}

## **Chain ID** --- Numeric identifier for a blockchain network (used by wallets/RPC). Example: each EVM chain/L2 has a unique Chain ID. {#chain-id-numeric-identifier-for-a-blockchain-network-used-by-walletsrpc.-example-each-evm-chainl2-has-a-unique-chain-id.}

## **Chainlink Automation** --- Scheduled/triggered jobs run by Chainlink nodes (a possible guardrail to enforce settle windows on EVM). {#chainlink-automation-scheduledtriggered-jobs-run-by-chainlink-nodes-a-possible-guardrail-to-enforce-settle-windows-on-evm.}

## **Challenge (Object)** --- Core tournament entity with title, schedule, scoring mode, token/network, fees, and prize configuration; transitions through states **DRAFT → UPCOMING → LIVE → ENDED → SETTLED/CANCELLED**. {#challenge-object-core-tournament-entity-with-title-schedule-scoring-mode-tokennetwork-fees-and-prize-configuration-transitions-through-states-draft-upcoming-live-ended-settledcancelled.}

## **CoinGecko API** --- Price feed used to show USD approximations for tokens (server‑side cached). {#coingecko-api-price-feed-used-to-show-usd-approximations-for-tokens-serverside-cached.}

## **CSRF** --- Cross‑Site Request Forgery protections for state‑changing HTTP requests (join/create/settle). {#csrf-crosssite-request-forgery-protections-for-statechanging-http-requests-joincreatesettle.}

## **Custodial vs. Non‑custodial Wallet** --- Custodial keys are held by a service; non‑custodial keys are controlled by the user (e.g., Privy embedded wallet with export enabled, or MetaMask/Phantom). {#custodial-vs.-noncustodial-wallet-custodial-keys-are-held-by-a-service-noncustodial-keys-are-controlled-by-the-user-e.g.-privy-embedded-wallet-with-export-enabled-or-metamaskphantom.}

## **DB / Prisma / Postgres / Neon** --- Application database (Postgres) accessed via Prisma ORM; Neon provides serverless Postgres hosting. {#db-prisma-postgres-neon-application-database-postgres-accessed-via-prisma-orm-neon-provides-serverless-postgres-hosting.}

## **EOA (Externally Owned Account)** --- A regular EVM wallet controlled by a private key (e.g., MetaMask address). Contrasts with **smart‑contract wallets**. {#eoa-externally-owned-account-a-regular-evm-wallet-controlled-by-a-private-key-e.g.-metamask-address.-contrasts-with-smartcontract-wallets.}

## **EVM (Ethereum Virtual Machine)** --- Execution environment for Ethereum‑style smart contracts. "EVM‑compatible" chains (e.g., L2s) run the same bytecode/tooling. {#evm-ethereum-virtual-machine-execution-environment-for-ethereumstyle-smart-contracts.-evmcompatible-chains-e.g.-l2s-run-the-same-bytecodetooling.}

## **ERC‑20 / ERC‑721 / ERC‑1155** --- Token standards on EVM chains for fungible tokens (ERC‑20) and NFTs (721 single‑id, 1155 multi‑token). {#erc20-erc721-erc1155-token-standards-on-evm-chains-for-fungible-tokens-erc20-and-nfts-721-singleid-1155-multitoken.}

## **Escrow (Tournament)** --- Smart contract or provider holding entry fees during a challenge; releases funds on **settlement** per rules and fee splits. {#escrow-tournament-smart-contract-or-provider-holding-entry-fees-during-a-challenge-releases-funds-on-settlement-per-rules-and-fee-splits.}

## **Explorer** --- Public web UI (e.g., block explorer) for viewing transactions, addresses, and contract state. {#explorer-public-web-ui-e.g.-block-explorer-for-viewing-transactions-addresses-and-contract-state.}

## **Fees (Developer / Organizer)** --- Percentages of the **total entry pool** routed to the developer (default 8%) and organizer (0--10%) **before** player payouts. {#fees-developer-organizer-percentages-of-the-total-entry-pool-routed-to-the-developer-default-8-and-organizer-010-before-player-payouts.}

## **Feature Flags** --- Runtime switches to enable/disable functionality (e.g., UGC creation) per env/user cohort. {#feature-flags-runtime-switches-to-enabledisable-functionality-e.g.-ugc-creation-per-envuser-cohort.}

## **FusionAuth (OAuth2)** --- Identity provider used by Mythical; we link users' Mythical accounts via OAuth to fetch gameplay stats. {#fusionauth-oauth2-identity-provider-used-by-mythical-we-link-users-mythical-accounts-via-oauth-to-fetch-gameplay-stats.}

## **Gas** --- Network fee paid to execute a transaction (in the chain's native token). {#gas-network-fee-paid-to-execute-a-transaction-in-the-chains-native-token.}

## **Gas Sponsorship / Paymaster** --- In ERC‑4337, a **Paymaster** can subsidize or charge a different token for gas on behalf of a user's smart‑contract wallet. {#gas-sponsorship-paymaster-in-erc4337-a-paymaster-can-subsidize-or-charge-a-different-token-for-gas-on-behalf-of-a-users-smartcontract-wallet.}

## **Idempotency** --- Property of API/webhook processing where repeated requests with the same key produce one effect (prevents duplicate score inserts). {#idempotency-property-of-apiwebhook-processing-where-repeated-requests-with-the-same-key-produce-one-effect-prevents-duplicate-score-inserts.}

## **Join (Flow)** --- Client and contract sequence where a participant approves (or Permits) the entry token, then deposits into tournament escrow. {#join-flow-client-and-contract-sequence-where-a-participant-approves-or-permits-the-entry-token-then-deposits-into-tournament-escrow.}

## **JSON Web Token (JWT)** --- Signed token encoding user/session claims; used for authenticated API calls (short expiry, rotated). {#json-web-token-jwt-signed-token-encoding-usersession-claims-used-for-authenticated-api-calls-short-expiry-rotated.}

## **KYC/AML** --- Know‑Your‑Customer / Anti‑Money Laundering checks. Out of scope for POC; may affect regional access/payout thresholds later. {#kycaml-knowyourcustomer-antimoney-laundering-checks.-out-of-scope-for-poc-may-affect-regional-accesspayout-thresholds-later.}

## **Leaderboard** --- Real‑time ranking list calculated from Pudgy telemetry (e.g., Top‑1/Top‑3/Top‑10 finishes; Coins Earned) within the challenge window. {#leaderboard-realtime-ranking-list-calculated-from-pudgy-telemetry-e.g.-top1top3top10-finishes-coins-earned-within-the-challenge-window.}

## **LLM Image Generation** --- Automated banner art creation from prompts with content guardrails (no logos, faces, or trademarked assets). {#llm-image-generation-automated-banner-art-creation-from-prompts-with-content-guardrails-no-logos-faces-or-trademarked-assets.}

## **L1 / L2** --- Layer‑1 base chains (e.g., Ethereum, Solana) vs. Layer‑2 networks built atop an L1 (e.g., EVM L2s) for scalability and lower fees. {#l1-l2-layer1-base-chains-e.g.-ethereum-solana-vs.-layer2-networks-built-atop-an-l1-e.g.-evm-l2s-for-scalability-and-lower-fees.}

## **MetaMask / Phantom** --- Popular external wallets for EVM (MetaMask) and Solana (Phantom). Users can link them via Privy. {#metamask-phantom-popular-external-wallets-for-evm-metamask-and-solana-phantom.-users-can-link-them-via-privy.}

## **MYTH / PENGU** --- Project tokens used for entry fees/prizes (MYTH on Abstract L2; PENGU on Solana and Abstract ecosystem) {#myth-pengu-project-tokens-used-for-entry-feesprizes-myth-on-abstract-l2-pengu-on-solana-and-abstract-ecosystem}

## **NFT** --- Non‑fungible token representing unique assets (e.g., ERC‑721 on EVM, SPL NFT on Solana).  {#nft-nonfungible-token-representing-unique-assets-e.g.-erc721-on-evm-spl-nft-on-solana.}

## **Oracle (Results)** --- External data attester that posts/verifies tournament outcomes on‑chain. We start with server‑signed scores; oracle integration is a future enhancement. {#oracle-results-external-data-attester-that-postsverifies-tournament-outcomes-onchain.-we-start-with-serversigned-scores-oracle-integration-is-a-future-enhancement.}

## **Permit (EIP‑2612) / Permit2** --- Signed approvals allowing a contract to transfer ERC‑20 tokens without a separate on‑chain approve() (gas/user‑flow optimization). **Permit2** is a generalized approval system. {#permit-eip2612-permit2-signed-approvals-allowing-a-contract-to-transfer-erc20-tokens-without-a-separate-onchain-approve-gasuserflow-optimization.-permit2-is-a-generalized-approval-system.}

## **Payout (Settlement)** --- Final distribution of escrowed funds after fees. Implements Top‑12 split, or fallback splits for 4--11 participants; transaction(s) recorded and linked in UI. {#payout-settlement-final-distribution-of-escrowed-funds-after-fees.-implements-top12-split-or-fallback-splits-for-411-participants-transactions-recorded-and-linked-in-ui.}

## **Post‑fee Prize Pool (P)** --- P = sum(entries) − developerFee − organizerFee; basis for Top‑12 payouts. {#postfee-prize-pool-p-p-sumentries-developerfee-organizerfee-basis-for-top12-payouts.}

## **Preferred Payout Wallet** --- User‑selected wallet per network where winnings are sent (e.g., Abstract EVM address, Solana address). {#preferred-payout-wallet-userselected-wallet-per-network-where-winnings-are-sent-e.g.-abstract-evm-address-solana-address.}

## **Privy** --- Auth + wallet toolkit providing social/OTP login, **embedded** non‑custodial EVM wallets (exportable), and external wallet linking (EVM + Solana) with transaction signing. {#privy-auth-wallet-toolkit-providing-socialotp-login-embedded-noncustodial-evm-wallets-exportable-and-external-wallet-linking-evm-solana-with-transaction-signing.}

## **RPC Endpoint** --- Remote node URL used by the app to read/write blockchain state. {#rpc-endpoint-remote-node-url-used-by-the-app-to-readwrite-blockchain-state.}

## **Score‑by Methods** --- Challenge scoring modes for Pudgy Party: **Top‑1/Top‑3/Top‑10 finishes** and **Coins Earned** (sum). Higher is better unless specified. {#scoreby-methods-challenge-scoring-modes-for-pudgy-party-top1top3top10-finishes-and-coins-earned-sum.-higher-is-better-unless-specified.}

## **Server‑signed Telemetry** --- Game server posts signed webhooks with match outcomes; Pulse verifies signatures before updating leaderboards. {#serversigned-telemetry-game-server-posts-signed-webhooks-with-match-outcomes-pulse-verifies-signatures-before-updating-leaderboards.}

## **SIWE / SIWS** --- **Sign‑In With Ethereum** / **Sign‑In With Solana** message‑signature login flows that prove wallet control without sharing keys. {#siwe-siws-signin-with-ethereum-signin-with-solana-messagesignature-login-flows-that-prove-wallet-control-without-sharing-keys.}

## **Smart‑contract Wallet** --- Wallet implemented as a contract (vs. EOA), enabling AA features like session keys, spending limits, social recovery. {#smartcontract-wallet-wallet-implemented-as-a-contract-vs.-eoa-enabling-aa-features-like-session-keys-spending-limits-social-recovery.}

## **Snowplow** --- Event analytics SDK + pipeline feeding product metrics (funnel, retention, revenue) into BigQuery/Looker. {#snowplow-event-analytics-sdk-pipeline-feeding-product-metrics-funnel-retention-revenue-into-bigquerylooker.}

## **SPL (Solana Program Library)** --- Solana's token/NFT standard stack (SPL tokens are the canonical fungible tokens on Solana). {#spl-solana-program-library-solanas-tokennft-standard-stack-spl-tokens-are-the-canonical-fungible-tokens-on-solana.}

## **TEP (Tournament Escrow Provider)** --- Third‑party or in‑house smart‑contract system handling tournament **escrow, joins, cancellations, and settlement**, with fee routing. {#tep-tournament-escrow-provider-thirdparty-or-inhouse-smartcontract-system-handling-tournament-escrow-joins-cancellations-and-settlement-with-fee-routing.}

## **Token (Fungible)** --- Blockchain asset with decimals and supply (e.g., MYTH ERC‑20, PENGU SPL). Distinct from NFTs. {#token-fungible-blockchain-asset-with-decimals-and-supply-e.g.-myth-erc20-pengu-spl.-distinct-from-nfts.}

## **Top‑12 Distribution** --- Default payout weights of **45/18/10/5/5/5/2/2/2/2/2/2** applied to the **post‑fee** pool. Low‑participation rules adjust payouts or cancel. {#top12-distribution-default-payout-weights-of-451810555222222-applied-to-the-postfee-pool.-lowparticipation-rules-adjust-payouts-or-cancel.}

## **UserOperation (4337)** --- Data structure representing an intended action by a smart‑contract wallet; submitted by a bundler and executed on-chain. {#useroperation-4337-data-structure-representing-an-intended-action-by-a-smartcontract-wallet-submitted-by-a-bundler-and-executed-on-chain.}

## **Vercel / Next.js** --- Hosting and framework used for the web app (edge‑friendly, preview deployments, App Router, API routes, ISR/SSR support). {#vercel-next.js-hosting-and-framework-used-for-the-web-app-edgefriendly-preview-deployments-app-router-api-routes-isrssr-support.}

## **Viem / wagmi** --- Type‑safe EVM tooling and React hooks for wallet connection, reads/writes, and contract calls. {#viem-wagmi-typesafe-evm-tooling-and-react-hooks-for-wallet-connection-readswrites-and-contract-calls.}

## **WebAuthn / Passkey** --- Passwordless authentication using platform authenticators (biometrics, device security keys). {#webauthn-passkey-passwordless-authentication-using-platform-authenticators-biometrics-device-security-keys.}

## **Webhook** --- Server‑to‑server HTTP callback used for events (e.g., match results). Must be authenticated, signed, and idempotent. {#webhook-servertoserver-http-callback-used-for-events-e.g.-match-results.-must-be-authenticated-signed-and-idempotent.}

## **WebSockets / Real‑time** --- Pub/sub channel for live leaderboard updates and in‑app toasts (e.g., position changes, payout confirmations). {#websockets-realtime-pubsub-channel-for-live-leaderboard-updates-and-inapp-toasts-e.g.-position-changes-payout-confirmations.}

## 

## **30) Appendix** {#appendix}

- **Top‑12 table** and fallback math proofs.

- **Error code catalog** for wallet and contract failures.

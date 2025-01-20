## Background

Gaia v22 is a major release that will follow the standard governance process for software upgrades on the Cosmos Hub. Feedback on this proposal will be open for roughly 1 week.

Reminder – the Cosmos Hub uses expedited voting for software upgrade proposals. This proposal will have a voting period of just **ONE WEEK**.

If the proposal passes, validators will be required to update the Cosmos Hub binary at the halt-height specified in the on-chain proposal.

## Release Details

* The release candidate can be found[ here](https://github.com/cosmos/gaia/releases/tag/v22.0.0-rc0).
* The changelog can be found[ here](https://github.com/cosmos/gaia/blob/v22.0.0-rc0/CHANGELOG.md).

This release adds no major features.

The release bumps the following dependencies:

* Bump [ibc-go](https://github.com/cosmos/ibc-go) to [v8.5.2](https://github.com/cosmos/ibc-go/releases/tag/v8.5.2) ([#3370](https://github.com/cosmos/gaia/pull/3370))
* Bump [cometbft](https://github.com/cometbft/cometbft) to [v0.38.15](https://github.com/cometbft/cometbft/releases/tag/v0.38.15) ([#3370](https://github.com/cosmos/gaia/pull/3370))
* Bump [cosmos-sdk](https://github.com/cosmos/cosmos-sdk) to [v0.50.11-lsm](https://github.com/cosmos/cosmos-sdk/releases/tag/v0.50.11-lsm) ([#3454](https://github.com/cosmos/gaia/pull/3454))
* Bump [wasmd](https://github.com/CosmWasm/wasmd) to [v0.53.2](https://github.com/CosmWasm/wasmd/releases/tag/v0.53.2) ([#3459](https://github.com/cosmos/gaia/pull/3459))
* Bump [ICS](https://github.com/cosmos/interchain-security) to [v6.4.0](https://github.com/cosmos/interchain-security/releases/tag/v6.4.0). ([#3474](https://github.com/cosmos/gaia/pull/3474))

**This upgrade is state-breaking and mandatory once the on-chain vote passes and the upgrade-height is reached.**

## Testing and Testnets

The v22 release has gone through rigorous testing, including e2e tests, and integration tests by Informal Systems. In addition, the v22 upgrade process has been independently tested by the team at Hypha Co-op and has been performed by validators and node operators on a public testnet prior to cutting the final release.

If you wish to participate in the testnet upgrade process in the future, you can find the relevant information (genesis file, peers, etc.) to join the Cosmos Hub’s Interchain Security Testnet (provider) [here](https://github.com/cosmos/testnets/tree/master/interchain-security).

### Potential risk factors

Although extensive testing and simulation will have taken place there always exists a risk that the Cosmos Hub might experience problems due to potential bugs or errors. In the case of serious problems, validators should stop operating the network immediately.

Coordination with validators will happen in the[ #cosmos-hub-validators-verified](https://discord.com/channels/669268347736686612/798937713474142229) channel of the Cosmos Network Discord to create and execute a contingency plan. Likely this will be an emergency release with fixes or the recommendation to consider the upgrade aborted and revert back to the previous release of gaia (v21.0.1).

### Governance votes

The following items summarize the voting options and what it means for this proposal:

YES - You agree that the Cosmos Hub should be updated with this release.

NO - You disagree that the Cosmos Hub should be updated with this release.

NO WITH VETO - A ‘NoWithVeto’ vote indicates a proposal either (1) is deemed to be spam, i.e., irrelevant to Cosmos Hub, (2) disproportionately infringes on minority interests, or (3) violates or encourages violation of the rules of engagement as currently set out by Cosmos Hub governance. If the number of ‘NoWithVeto’ votes is greater than a third of total votes, the proposal is rejected and the deposits are burned.

ABSTAIN - You wish to contribute to the quorum but you formally decline to vote either for or against the proposal.
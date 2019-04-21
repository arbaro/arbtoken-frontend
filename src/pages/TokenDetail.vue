<template>
  <q-page padding>
    <q-dialog v-model="dividendPrompt" persistent>
      <q-card style="min-width: 400px">
        <q-card-section>
          <div class="text-h6">Issue Dividend</div>
        </q-card-section>
        <q-card-section>
          <q-input
            v-model="dividendAmount"
            :rules="[isNotEmpty, isOverZero]"
            :lazy-rules="true"
            type="number"
            suffix="EOS"
            label="Dividend Amount"
          />
        </q-card-section>

        <q-card-actions align="right" class="text-primary">
          <q-btn flat label="Cancel" v-close-popup />
          <q-btn
            flat
            label="Issue Dividend"
            @click="issueDividend"
            v-close-popup
          />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <q-dialog v-model="transferPrompt" persistent>
      <q-card style="min-width: 400px">
        <q-card-section>
          <div class="text-h6">Transfer {{ $route.params.id }} token</div>
        </q-card-section>
        <q-card-section>
          <q-input
            v-model="recipient"
            label="To"
            :rules="[isEosioName]"
            :lazy-rules="true"
            placeholder="Recipient account"
            error-message="Must be a valid EOS account name"
            autofocus
            @keyup.enter="prompt = false"
          />
        </q-card-section>
        <q-card-section>
          <q-input
            v-model="transferAmount"
            :rules="[isNotEmpty, isOverZero]"
            :lazy-rules="true"
            type="number"
            :suffix="$route.params.id"
            label="Amount"
          />
        </q-card-section>
        <q-card-section>
          <q-input v-model="memo" label="Memo" />
        </q-card-section>

        <q-card-actions align="right" class="text-primary">
          <q-btn flat label="Cancel" v-close-popup />
          <q-btn flat label="Transfer" @click="transfer" v-close-popup />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <q-dialog v-model="issuePrompt" persistent>
      <q-card style="min-width: 400px">
        <q-card-section>
          <div class="text-h6">Issue {{ $route.params.id }} token</div>
        </q-card-section>
        <q-card-section>
          <q-input
            v-model="issueRecipient"
            label="To"
            :rules="[isEosioName]"
            :lazy-rules="true"
            placeholder="Recipient account"
            error-message="Must be a valid EOS account name"
            autofocus
            @keyup.enter="prompt = false"
          />
        </q-card-section>
        <q-card-section>
          <q-input
            v-model="issueAmount"
            :rules="[isNotEmpty, isOverZero]"
            :lazy-rules="true"
            type="number"
            :suffix="$route.params.id"
            label="Amount"
          />
        </q-card-section>
        <q-card-section>
          <q-input v-model="issueMemo" label="Memo" />
        </q-card-section>

        <q-card-actions align="right" class="text-primary">
          <q-btn flat label="Cancel" v-close-popup />
          <q-btn flat label="Issue" @click="issue" v-close-popup />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <div class="row q-col-gutter-xl">
      <div class="col-xs-12 col-sm-6 col-md-3">
        <q-card class="my-card bg-primary text-white col">
          <q-card-section>
            <div class="text-h6">{{ $route.params.id }}</div>
            <div class="text-subtitle2">Issuer: {{ issuer }}</div>
            <div class="text-subtitle2">Total Supply: {{ supply }}</div>
            <div class="text-subtitle2">
              Total Dividends: {{ totaldividends }}
            </div>
          </q-card-section>
          <q-card-section>
            {{ about }}
          </q-card-section>

          <q-separator dark />

          <q-card-actions>
            <q-btn
              flat
              v-if="issuer == $eos.data.accountName"
              @click="issuePrompt = true"
              >Issue</q-btn
            >
            <q-btn flat @click="transferPrompt = true">Transfer</q-btn>
            <q-btn flat @click="dividendPrompt = true">Issue Dividend</q-btn>
            <q-btn flat v-if="claimsAvailable" @click="bulkClaim"
              >Bulk Claim</q-btn
            >

            <q-btn flat @click="refresh">Refresh</q-btn>
          </q-card-actions>
        </q-card>
      </div>

      <div class="col-xs-12 col-sm-6 col-md-6">
        <q-list>
          <q-item-label header>Balances</q-item-label>
          <q-item v-for="balance in balances" :key="balance.holder">
            <q-item-section>
              <q-item-label>{{ balance.holder }}</q-item-label>
              <q-item-label caption>{{ balance.balance }}</q-item-label>
            </q-item-section>

            <q-item-section side top>
              <q-btn
                v-if="balance.lastclaim !== totaldividends"
                color="primary"
                flat
                @click="claim(balance.holder)"
                >Claim {{ balance.awaitingReward }}</q-btn
              >
              <q-item-label v-else caption
                >Latest dividend claimed</q-item-label
              >
            </q-item-section>
          </q-item>
          <q-separator spaced />
        </q-list>
      </div>
    </div>
  </q-page>
</template>

<style></style>

<script>
import wait from "waait";
const HARDCODED_CONTRACT_NAME = "arbtoken";

const calcExpectedReward = (balance, lastclaim, supply, totaldividends) => {
  const percent = balance / supply;
  const portion = totaldividends - lastclaim;
  return (portion * percent).toFixed(4);
};

const parseTokenString = tokenString => {
  const [stringAmount, symbol] = tokenString.split(" ");
  const amount = Number(stringAmount);
  return { amount, symbol };
};

export default {
  name: "PageIndex",
  data: function() {
    return {
      about: "Create your own token on EOS with Dividend functionality.",
      knownHolders: ["test1", "test2", "test3"],
      balances: [],
      supply: null,
      max_supply: null,
      issuer: null,
      dividendAmount: null,
      totaldividends: null,
      transferPrompt: false,
      dividendPrompt: false,
      issuePrompt: false,
      recipient: "",
      transferAmount: "",
      memo: "",
      issueAmount: "",
      issueRecipient: "",
      issueMemo: ""
    };
  },
  created: async function() {
    await this.fetchToken();
    await this.fetchHolders();
  },
  computed: {
    claimsAvailable: function() {
      return (
        !!this.balances.filter(x => parseTokenString(x.awaitingReward).amount)
          .length > 0
      );
    }
  },
  methods: {
    async issue() {
      await this.$eos.tx({
        actions: [
          {
            account: HARDCODED_CONTRACT_NAME,
            name: "issue",
            authorization: [
              {
                actor: this.$eos.data.accountName,
                permission: "active"
              }
            ],
            data: {
              to: this.issueRecipient,
              quantity: `${Number(this.issueAmount).toFixed(4)} ${
                this.$route.params.id
              }`,
              memo: this.issueMemo
            }
          }
        ]
      });
    },
    async transfer() {
      try {
        await this.$eos.tx({
          actions: [
            {
              account: HARDCODED_CONTRACT_NAME,
              name: "transfer",
              authorization: [
                {
                  actor: this.$eos.data.accountName,
                  permission: "active"
                }
              ],
              data: {
                from: this.$eos.data.accountName,
                to: this.recipient,
                quantity: `${Number(this.transferAmount).toFixed(4)} ${
                  this.$route.params.id
                }`,
                memo: this.memo
              }
            }
          ]
        });
      } catch (e) {
        console.log("s");
      }
    },
    async issueDividend() {
      try {
        await this.$eos.tx({
          actions: [
            {
              account: "eosio.token",
              name: "transfer",
              authorization: [
                {
                  actor: this.$eos.data.accountName,
                  permission: "active"
                }
              ],
              data: {
                from: this.$eos.data.accountName,
                to: HARDCODED_CONTRACT_NAME,
                quantity: `${Number(this.dividendAmount).toFixed(4)} EOS`,
                memo: `${this.$route.params.id}:4`
              }
            }
          ]
        });
        await wait(1000);
        await this.refresh();
      } catch (e) {
        console.log(e);
      }
    },
    async claim(owner) {
      try {
        const beforeBalanceObj = await this.$rpc.get_table_rows({
          code: "eosio.token",
          scope: owner,
          table: "accounts"
        });
        const beforeBalance = parseTokenString(beforeBalanceObj.rows[0].balance)
          .amount;
        await this.$eos.tx({
          actions: [
            {
              account: HARDCODED_CONTRACT_NAME,
              name: "claim",
              authorization: [
                {
                  actor: this.$eos.data.accountName,
                  permission: "active"
                }
              ],
              data: {
                owner,
                tokensym: `4,${this.$route.params.id}`
              }
            }
          ]
        });
        const afterBalanceObj = await this.$rpc.get_table_rows({
          code: "eosio.token",
          scope: owner,
          table: "accounts"
        });
        const afterBalance = parseTokenString(afterBalanceObj.rows[0].balance)
          .amount;
        const difference = (afterBalance - beforeBalance).toFixed(4);
        this.$q.notify({
          message: `${owner} awarded ${difference} EOS`,
          position: "bottom-right",
          //   color: "negative",
          icon: "attach_money"
        });
      } catch (e) {
        console.log(e);
      }
    },
    async bulkClaim() {
      const availableClaims = this.balances.filter(
        x => parseTokenString(x.awaitingReward).amount
      );
      for (var i = 0; i < availableClaims.length; i++) {
        await this.claim(availableClaims[i].holder);
      }
      await wait(1000);
      await this.refresh();
    },
    calc(x) {
      console.log(x);
      return "hello";
    },
    async refresh() {
      await this.fetchToken();
      await this.fetchHolders();
    },
    async fetchToken() {
      try {
        const result = await this.$rpc.get_table_rows({
          code: HARDCODED_CONTRACT_NAME,
          table: "stat",
          scope: this.$route.params.id
        });

        const { supply, max_supply, issuer, totaldividends } = result.rows[0];
        console.log({ supply, max_supply, issuer, totaldividends });
        this.supply = supply;
        this.max_supply = max_supply;
        this.issuer = issuer;
        this.totaldividends = totaldividends;
      } catch (e) {
        console.log("Error", e);
      }
    },
    isEosioName(input) {
      return (
        new RegExp("^[a-z][a-z1-5.]{0,10}([a-z1-5]|^.)[a-j1-5]?$").test(
          input
        ) ||
        "Name must only contain characters a-z 1-5 and . No greater than 12 in length."
      );
    },
    isNotEmpty(input) {
      return input.length !== 0 || "Cannot be empty";
    },
    isOverZero(input) {
      return input > 0 || "Must be greater than 0";
    },
    async fetchHolders() {
      const holders = this.knownHolders;
      this.balances = [];
      try {
        for (var i = 0; i < holders.length; i++) {
          const result = await this.$rpc.get_table_rows({
            code: HARDCODED_CONTRACT_NAME,
            table: "accounts",
            scope: holders[i]
          });

          const balanceObj = result.rows.filter(
            x => x.balance.split(" ")[1] == this.$route.params.id
          )[0];

          this.balances = [
            ...this.balances,
            {
              ...balanceObj,
              holder: holders[i],
              awaitingReward: `${calcExpectedReward(
                parseTokenString(balanceObj.balance).amount,
                parseTokenString(balanceObj.lastclaim).amount,
                parseTokenString(this.supply).amount,
                parseTokenString(this.totaldividends).amount
              )} EOS`
            }
          ];
        }
      } catch (e) {
        console.log("Error in token detail", e);
      }
    }
  }
};
</script>
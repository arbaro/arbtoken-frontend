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
            :rules="[this.$eos.isName]"
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
            :rules="[this.$eos.isName]"
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
              v-if="issuer == $eosio.data.accountName"
              @click="issuePrompt = true"
              >Issue</q-btn
            >
            <q-btn
              :disable="!$eosio.data.authed"
              flat
              @click="transferPrompt = true"
              >Transfer</q-btn
            >
            <q-btn
              :disable="!$eosio.data.authed"
              flat
              @click="dividendPrompt = true"
              >Issue Dividend</q-btn
            >
            <q-btn
              :disable="!$eosio.data.authed"
              flat
              v-if="claimsAvailable"
              @click="bulkClaim"
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
                :disable="!$eosio.data.authed"
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
      knownHolders: [],
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
    await this.fetchTrackableHolders();
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
    async fetchTrackableHolders() {
      const result = await this.$rpc.get_table_by_scope({
        code: process.env.CONTRACT,
        table: "accounts"
      });
      const accounts = result.rows.map(x => x.scope);
      this.knownHolders = [];
      for (var i = 0; i < accounts.length; i++) {
        const balance = await this.$eos.getBalance(
          accounts[i],
          this.$route.params.id,
          process.env.CONTRACT
        );
        if (balance) {
          this.knownHolders = [...this.knownHolders, accounts[i]];
        }
      }
    },
    async issue() {
      await this.$eos.tx("issue", {
        to: this.issueRecipient,
        quantity: `${Number(this.issueAmount).toFixed(4)} ${
          this.$route.params.id
        }`,
        memo: this.issueMemo
      });
      await this.refresh(1000);
    },
    async transfer() {
      try {
        await this.$eos.transfer(
          this.recipient,
          `${Number(this.transferAmount).toFixed(4)} ${this.$route.params.id}`,
          this.memo,
          process.env.CONTRACT
        );
      } catch (e) {
        console.log("s");
      }
    },
    async issueDividend() {
      try {
        await this.$eos.transfer(
          process.env.CONTRACT,
          `${Number(this.dividendAmount).toFixed(4)} EOS`,
          `${this.$route.params.id}:4`
        );
        await this.refresh(1000);
      } catch (e) {
        console.log(e);
      }
    },
    async claim(owner, refresh = true) {
      try {
        const beforeBalance = await this.$eos.getBalance(owner);
        await this.$eos.tx("claim", {
          owner,
          tokensym: `4,${this.$route.params.id}`
        });
        const afterBalance = await this.$eos.getBalance(owner);
        const difference = (afterBalance - beforeBalance).toFixed(4);

        this.$q.notify({
          message: `${owner} awarded ${difference} EOS`,
          position: "bottom-right",
          icon: "attach_money"
        });
        if (refresh) {
          this.refresh(1000);
        }
      } catch (e) {
        console.log(e);
      }
    },
    async bulkClaim() {
      const availableClaims = this.balances.filter(
        x => parseTokenString(x.awaitingReward).amount
      );
      for (var i = 0; i < availableClaims.length; i++) {
        await this.claim(availableClaims[i].holder, false);
      }
      await this.refresh(1000);
    },
    async refresh(delay = 0) {
      await wait(delay);
      await this.fetchToken();
      await this.fetchTrackableHolders();
      await this.fetchHolders();
    },
    async fetchToken() {
      try {
        const result = await this.$eos.getTable("stat", this.$route.params.id);
        const { supply, max_supply, issuer, totaldividends } = result.rows[0];
        this.supply = supply;
        this.max_supply = max_supply;
        this.issuer = issuer;
        this.totaldividends = totaldividends;
      } catch (e) {
        console.log("Error", e);
      }
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
            code: process.env.CONTRACT,
            table: "accounts",
            scope: holders[i]
          });

          const balanceObj = result.rows.filter(
            x => x.balance.split(" ")[1] == this.$route.params.id
          )[0];
          if (!balanceObj) return;
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

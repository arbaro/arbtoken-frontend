<template>
  <q-page padding>
    <q-dialog v-model="tokenPrompt" persistent>
      <q-card style="min-width: 400px">
        <q-card-section>
          <div class="text-h6">Create new token</div>
        </q-card-section>
        <q-card-section>
          <q-input
            v-model="issuerField"
            label="Issuer"
            hint="Account which can mint new tokens"
            :rules="[isEosioName]"
            :lazy-rules="true"
            placeholder="Issuer account"
            error-message="Must be a valid EOS account name"
            autofocus
            @keyup.enter="prompt = false"
          />
        </q-card-section>
        <q-card-section>
          <q-input v-model="symbolField" label="Symbol" placeholder="BTC" />
        </q-card-section>
        <q-card-section>
          <q-input
            v-model="maxSupplyField"
            hint="Hard limit of token"
            :lazy-rules="true"
            type="number"
            :suffix="this.symbolField"
            label="Max Supply"
          />
        </q-card-section>
        <q-card-section>
          <q-input
            v-model="precisionField"
            :rules="[isPrecision]"
            hint="Amount of zeros after decimal, 4 is recommended"
            type="number"
            label="Precision"
          />
        </q-card-section>
        <q-card-section> Live Example: {{ draftedToken }} </q-card-section>

        <q-card-actions align="right" class="text-primary">
          <q-btn flat label="Cancel" v-close-popup />
          <q-btn flat label="Create Token" @click="createToken" v-close-popup />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <div class="row q-col-gutter-xl">
      <div class="col-xs-12 col-sm-6 col-md-3">
        <q-card class="my-card bg-primary text-white col">
          <q-card-section>
            <div class="text-h6">Arbaro Token</div>
            <div class="text-subtitle2">by John Williamson</div>
          </q-card-section>
          <q-card-section>
            {{ about }}
          </q-card-section>

          <q-separator dark />

          <q-card-actions>
            <q-btn flat @click="aboutPrompt = true">About</q-btn>
            <q-btn flat @click="donatePrompt = true">Donate</q-btn>
            <q-btn flat @click="refresh">Refresh</q-btn>
          </q-card-actions>
        </q-card>
      </div>

      <div class="col-xs-12 col-sm-6 col-md-6">
        <q-list>
          <q-item-label header>Tokens</q-item-label>
          <q-item
            v-for="token in tokens"
            :key="token.symbol"
            @click="$router.push(`/token/${token.symbol}`)"
            clickable
            v-ripple
          >
            <q-item-section>
              <q-item-label>{{ token.symbol }}</q-item-label>
              <q-item-label caption>{{ token.supply }} Supply</q-item-label>
            </q-item-section>

            <q-item-section side top>
              <q-item-label caption
                >{{ token.totaldividends }} Total Dividends</q-item-label
              >
              <!-- <q-item-label caption>Host: {{ event.eventowner }}</q-item-label> -->
            </q-item-section>
          </q-item>
          <q-separator spaced />
        </q-list>
      </div>
    </div>

    <q-page-sticky
      v-if="$eos.data.authed"
      position="bottom-right"
      :offset="[18, 18]"
    >
      <q-btn fab icon="add" color="primary" @click="initPrompt" />
    </q-page-sticky>
  </q-page>
</template>

<style></style>

<script>
const HARDCODED_CONTRACT_NAME = "arbtoken";

export default {
  name: "PageIndex",
  data: function() {
    return {
      about: "Create your own token on EOS with Dividend functionality.",
      tokens: [],
      trackedTokens: ["EUF", "VBM", "BTC"],
      tokenPrompt: false,
      issuerField: "",
      symbolField: "",
      precisionField: 4,
      maxSupplyField: ""
    };
  },
  created: async function() {
    await this.fetchTokens();
  },
  computed: {
    draftedToken: function() {
      return `${Number(this.maxSupplyField).toFixed(this.precisionField)} ${
        this.symbolField
      }`;
    }
  },
  methods: {
    isPrecision() {
      return this.precisionField >= 0 && this.precisionField <= 8;
    },
    isEosioName(input) {
      return (
        new RegExp("^[a-z][a-z1-5.]{0,10}([a-z1-5]|^.)[a-j1-5]?$").test(
          input
        ) ||
        "Name must only contain characters a-z 1-5 and . No greater than 12 in length."
      );
    },
    async refresh() {
      await this.fetchTokens();
    },
    async fetchTokens() {
      this.tokens = [];
      const tempTokens = this.trackedTokens;

      for (var i = 0; i < tempTokens.length; i++) {
        try {
          const result = await this.$rpc.get_table_rows({
            code: HARDCODED_CONTRACT_NAME,
            table: "stat",
            scope: tempTokens[i]
          });
          this.tokens = [
            ...this.tokens,
            { ...result.rows[0], symbol: tempTokens[i] }
          ];
        } catch (e) {
          console.log("Error", e);
        }
      }
    },
    async initPrompt() {
      if (this.issuerField == "" && this.$eos.data.accountName) {
        this.issuerField = this.$eos.data.accountName;
      }
      this.tokenPrompt = true;
    },
    async createToken() {
      console.log("trying", {
        issuer: this.issuerField,
        max_supply: this.draftedToken
      });
      await this.$eos.tx({
        actions: [
          {
            account: HARDCODED_CONTRACT_NAME,
            name: "create",
            authorization: [
              {
                actor: this.$eos.data.accountName,
                permission: "active"
              }
            ],
            data: {
              issuer: this.issuerField,
              maximum_supply: this.draftedToken
            }
          }
        ]
      });
    }
  }
};
</script>

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
            :rules="[this.$eos.isName]"
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
            <q-btn :disable="!$eosio.data.authed" flat @click="donateTrigger"
              >Donate</q-btn
            >
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

    <q-page-sticky position="bottom-right" :offset="[18, 18]">
      <q-btn
        :disable="!$eosio.data.authed"
        fab
        icon="add"
        color="primary"
        @click="initPrompt"
      />
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
      trackedTokens: [],
      tokenPrompt: false,
      issuerField: "",
      symbolField: "",
      precisionField: 4,
      maxSupplyField: ""
    };
  },
  created: async function() {
    await this.fetchTrackableTokens();
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
    async donateTrigger() {
      await this.$eos.transfer("johnn.y", "1.0000 EOS");
    },
    isPrecision() {
      return this.precisionField >= 0 && this.precisionField <= 8;
    },
    async refresh() {
      await this.fetchTrackableTokens();
      await this.fetchTokens();
    },
    async fetchTrackableTokens() {
      const result = await this.$rpc.get_table_by_scope({
        code: HARDCODED_CONTRACT_NAME,
        table: "stat"
      });
      const scopes = result.rows.map(x => x.scope);
      this.trackedTokens = scopes;
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
            { ...result.rows[0], symbol: result.rows[0].supply.split(" ")[1] }
          ];
        } catch (e) {
          console.log("Error", e);
        }
      }
    },
    async initPrompt() {
      if (this.issuerField == "" && this.$eosio.data.accountName) {
        this.issuerField = this.$eosio.data.accountName;
      }
      this.tokenPrompt = true;
    },
    async createToken() {
      await this.$eos.tx("create", {
        issuer: this.issuerField,
        maximum_supply: this.draftedToken
      });
      await this.refresh(1000);
    }
  }
};
</script>

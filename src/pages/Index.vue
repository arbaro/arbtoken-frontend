<template>
  <q-page padding>
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
      trackedTokens: ["EUF", "VBM"]
    };
  },
  created: async function() {
    await this.fetchTokens();
  },
  methods: {
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
    }
  }
};
</script>

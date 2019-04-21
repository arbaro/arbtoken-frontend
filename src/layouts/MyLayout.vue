<template>
  <q-layout view="lHh Lpr lFf">
    <q-header elevated>
      <q-toolbar>
        <q-btn flat dense round @click="$router.push('/')" aria-label="Menu">
          <q-icon v-bind:name="iconName" />
        </q-btn>

        <q-toolbar-title>Arbaro Token </q-toolbar-title>

        <eosio-button></eosio-button>
      </q-toolbar>
    </q-header>

    <q-page-container>
      <router-view />
    </q-page-container>
  </q-layout>
</template>

<script>
import { openURL } from "quasar";

export default {
  name: "MyLayout",
  data() {
    return {
      leftDrawerOpen: this.$q.platform.is.desktop
    };
  },
  methods: {
    openURL
  },
  created() {
    this.iconName =
      this.$router.app._route.fullPath === "/" ? "home" : "arrow_back";
  },
  watch: {
    $route(to) {
      console.log("Setting home to", to.path === "/");
      this.iconName = to.path === "/" ? "home" : "arrow_back";
    }
  }
};
</script>

<style></style>

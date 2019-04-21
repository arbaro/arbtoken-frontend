import { openURL, Notify } from "quasar";
import { JsonRpc } from "eosjs";

import { Scatter } from "ual-scatter";

import Eos from "ual-quasar-renderer";

const CHAIN_ID =
  "cf057bbfb72640471fd910bcb67639c22df9f92470936cddc1ade0e2f2e7dc4f";
const PROTOCOL = "http";
const HOST = "localhost";
const PORT = 8888;

const myChain = {
  chainId: CHAIN_ID,
  rpcEndpoints: [
    {
      protocol: PROTOCOL,
      host: HOST,
      port: PORT
    }
  ]
};

const appName = "Arbaro Token";
const rpc = new JsonRpc(`${PROTOCOL}://${HOST}:${PORT}`);
const scatter = new Scatter([myChain], { appName });

export default ({ Vue }) => {
  Vue.use(Eos, {
    eosStore: new Eos.Store([myChain], appName, [scatter], Vue, Notify, openURL)
  });

  Vue.prototype.$rpc = rpc;
};

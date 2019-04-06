const zaif = require('zaif.jp');
const config = require('config');

const auth = {
  apikey: config.get('Auth.apikey'),
  secretkey: config.get('Auth.secretkey')
}

const api = zaif.createPrivateApi(auth.apikey, auth.secretkey, 'ztb');

const sleep = msec => new Promise(resolve => setTimeout(resolve, msec));

const allCancel = async () => {
  const orders = await api.activeOrders();
  for (id in orders) {
    api.cancelOrder(id);
    console.log(`cancelled order: ${id}`);
    await sleep(200);
  }
  console.log('complete');
}

allCancel();

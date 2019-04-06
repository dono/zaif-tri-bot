const zaif = require('zaif.jp');
const config = require('config');

const auth = {
  apikey: config.get('Auth.apikey'),
  secretkey: config.get('Auth.secretkey')
}

const api = zaif.createPrivateApi(auth.apikey, auth.secretkey, 'ztb');

api.activeOrders().then(orders => {
  console.log(orders);
});
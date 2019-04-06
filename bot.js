const zaif = require('zaif.jp');
const config = require('config');
const initialize = require('./initialize.js');
const utils = require('./utils.js');

const auth = {
  apikey: config.get('Auth.apikey'),
  secretkey: config.get('Auth.secretkey')
};

zaif.Constant.OPT_KEEPALIVE = true;
zaif.Constant.OPT_TIMEOUT_SEC = 20;

const publicApi = zaif.PublicApi;
const privateApi = zaif.createPrivateApi(auth.apikey, auth.secretkey, 'ztb');

const botId = config.get('Bot.id');

const log4js = require('log4js');
log4js.configure({
  appenders: {
    stdout: { type: "stdout" },
    file: { type: "file", filename: `${__dirname}/logs/system.log` }
  },
  categories: {
    default: {
      appenders: ["stdout", "file"],
      level: "all"
    }
  }
});
const logger = log4js.getLogger('system');


class Trap {
  constructor(currencyPair, trapsInfo) {
    this.currencyPair = currencyPair;
    this.sellPrice = trapsInfo.sell; // 通貨を売る時の値段
    this.buyPrice = trapsInfo.buy;   // 通貨を買う時の値段
    this.amount = trapsInfo.amount;  // 売買通貨量
    this.turn = 'buy';               // 買いターンか, 売りターンか
  }

  async initOrder(initPrice) {
    return new Promise(async (resolve, reject) => {
      if (initPrice >= this.buyPrice) {
        logger.info('initOrder');
        const order = await privateApi.trade(this.currencyPair, 'bid', this.buyPrice, this.amount, {limit: this.sellPrice, comment: botId}); // 買い注文を出す
        logger.trace(`買い注文発生: { buyPrice: ${this.buyPrice} }`);
        console.log('----------------------------------------------------------------------------');
      }
      resolve();
    });
  }

  async repeatOrder(lastPrice, exLastPrice) {

    // 買いターンでbuyPriceを下から上へ跨いだ時
    if (this.turn === 'buy' && lastPrice >= this.buyPrice && this.buyPrice > exLastPrice) {
      const order = await privateApi.trade(this.currencyPair, 'bid', this.buyPrice, this.amount, { limit: this.sellPrice, comment: botId }); // 買い注文を出す

      logger.trace(`買い注文発生: { buyPrice: ${this.buyPrice} }`);
      logger.info(`{ lastPrice: ${lastPrice}, exLastPrice: ${exLastPrice} }`);
      console.log('----------------------------------------------------------------------------');
    }

    // 買い注文が約定した時
    if (this.turn === 'buy' && exLastPrice >= this.buyPrice && this.buyPrice > lastPrice) {
      // limit注文を行うので以下の処理は省略できる
      // const order = await privateApi.trade(this.currencyPair, 'ask', this.sellPrice, this.amount, { comment: botId }); // 売り注文を出す
      this.turn = 'sell'; // 約定するまで売りターン

      logger.trace(`買い注文約定: { buyPrice: ${this.buyPrice} }`);
      logger.trace(`売り注文発生: { sellPrice: ${this.sellPrice} }`);
      logger.info(`{ lastPrice: ${lastPrice}, exLastPrice: ${exLastPrice} }`);
      console.log('----------------------------------------------------------------------------');
    }

    // 売り注文が約定した時
    if (this.turn === 'sell' && lastPrice > this.sellPrice && this.sellPrice >= exLastPrice) {
      const order = await privateApi.trade(this.currencyPair, 'bid', this.buyPrice, this.amount, { limit: this.sellPrice, comment: botId }); // 買い注文を出す
      this.turn = 'buy'; // 約定するまで買いターン

      logger.trace(`売り注文約定: { sellPrice: ${this.sellPrice} }`);
      logger.trace(`買い注文発生: { buyPrice: ${this.buyPrice} }`);
      logger.info(`{ lastPrice: ${lastPrice}, exLastPrice: ${exLastPrice} }`);
      console.log('----------------------------------------------------------------------------');
    }
  }

}


async function bot() {
  let { currencyPair, trapsInfo } = await initialize();

  // 同一IDの買い注文をすべてキャンセル
  const orders = await privateApi.activeOrders();
  for (id in orders) {
    if (orders[id].comment === botId && orders[id].action === 'bid') {
      await privateApi.cancelOrder(id);
      await utils.sleep(30); // 秒間リクエスト回数制限対策
    }
  }

  const initPrice = (await publicApi.lastPrice(currencyPair)).last_price;

  let traps = [];
  for (let i = 0; i < trapsInfo.length; i++) {
    traps[i] = new Trap(currencyPair, trapsInfo[i]);
    await traps[i].initOrder(initPrice)
    await utils.sleep(30);
  }


  let exLastPrice = initPrice;
  const w = zaif.createStreamApi(currencyPair, async data => {
    const lastPrice = data.last_price.price;
    if (lastPrice !== exLastPrice) {
      for (let i = 0; i < traps.length; i++) {
        traps[i].repeatOrder(lastPrice, exLastPrice);
      }
    }
    exLastPrice = lastPrice;
  });

}

bot();
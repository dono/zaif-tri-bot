const zaif = require('zaif.jp');
const api = zaif.PublicApi;
const config = require('config');
const utils = require('./utils.js');


const capital = config.get('Bot.capital');
const currencyPair = config.get('Bot.currencyPair');
const trapCount = config.get('Bot.trapCount');
const range = config.get('Bot.range');

// exports.initialize = function() {
module.exports = function() {
  return new Promise((resolve, reject) => {

    // validation
    api.lastPrice(currencyPair)
      .then(info => {
        lastPrice = info.last_price;
        if (range.lower < lastPrice / 2 || range.upper > lastPrice * 2) {
          throw new Error('レンジは現在値の1/2倍から2倍の範囲で入力してください');
        }
      });
    

    api.currency_pairs(currencyPair)
      .then(info => {
        info = info[0]; // 配列で返ってくるので整形

        // Base-Currency/Quote-Currency (ex. BTC/JPY)
        const baseUnitMin = info.item_unit_min;   // 主軸通貨最小値(ex. BTC)
        const baseUnitStep = info.item_unit_step; // 主軸通貨入力単位(ex. BTC)
        const quoteUnitMin = info.aux_unit_min;   // 建値通貨最小値(ex. YEN)
        const quoteUnitStep = info.aux_unit_step; // 建値通貨入力単位(ex. YEN)

        const trapRange = (range.upper - range.lower) / trapCount;  // 丸めてないトラップ値幅

        // validation
        if (trapRange < quoteUnitMin) {
          const trapCountMin = (range.upper - range.lower) / quoteUnitMin;
          throw new Error(`トラップ数が多すぎます. 最小トラップ数 ${trapCountMin} (本)`);
        }


        let trapsInfo = [];    // 各トラップオブジェクトを格納する配列
        for (let i = 0; i < trapCount; i++) {
          // sell: 通貨を売る時の値段
          // buy : 通貨を買う時の値段
          const sell = utils.roundUnit( range.lower + (trapRange * (i + 1)), quoteUnitStep );
          const buy = utils.roundUnit( range.lower + (trapRange * i), quoteUnitStep );

          trapsInfo[i] = {buy, sell};
        }

        let trapPriceSum = 0;  // トラップ値の合計
        for (let i = 0; i < trapCount; i++) {
          trapPriceSum += trapsInfo[i].buy;
        }

        const baseUnitAmount = utils.roundUnit(capital / trapPriceSum, baseUnitStep); // 各トラップに対する主軸通貨量

        for (let i = 0; i < trapCount; i++) {
          trapsInfo[i].amount = baseUnitAmount;
        }

        // validation
        if (baseUnitAmount < baseUnitMin) {
          throw new Error(`1トラップ当たりの通貨量が規定値以下です.\n
                           通貨量:${baseUnitAmount}, 既定値:${baseUnitMin}\n
                           通貨量は 運用資産(円) / (トラップ数 x 各トラップ値の合計) で決定されます.`)
        }
        
        const profitMargin = baseUnitAmount * trapRange; // 1リピート当たりの建値通貨増加量(利益幅)

        const status = {currencyPair, capital, range, trapsInfo, trapRange, trapCount, baseUnitAmount, profitMargin};

        resolve(status);
      });
  });
}

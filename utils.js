const Decimal = require('decimal.js');

// valueをunitStepで丸めて返す関数
module.exports.roundUnit = (value, unitStep) => {
  const src = Decimal(value);
  const result = src.div(unitStep).floor().times(unitStep).toNumber();

  return result;
}

// msecミリ秒スリープする関数
module.exports.sleep = msec => new Promise(resolve => setTimeout(resolve, msec));
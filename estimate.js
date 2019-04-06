const initialize = require('./initialize.js');

const estimate = async function() {
  const {currencyPair, capital, range, trapsInfo, trapRange, trapCount, baseUnitAmount, profitMargin} = await initialize();
  const [baseCurrency, quoteCurrency] = currencyPair.split('_');

  console.log(`通貨ペア:\t\t${currencyPair}`);
  console.log(`運用資産額:\t\t${capital} (${quoteCurrency})`);
  console.log(`レンジ:\t\t\t${range.lower} ~ ${range.upper} (${quoteCurrency})`);;
  console.log(`トラップ数:\t\t${trapCount} 本`);
  console.log(`トラップ値間隔:\t\t${trapRange} (${quoteCurrency})`);
  console.log(`通貨量/トラップ:\t${baseUnitAmount} (${baseCurrency})`);
  console.log(`利益幅/トラップ:\t${profitMargin} (${quoteCurrency})`)
  console.log(`各トラップ値:`);
  console.log(trapsInfo);
}

estimate()
  .catch(err => {
    console.log(err);
  });

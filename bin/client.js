// Clients can submit orders to their own instance of orderbook, and the order is distributed to other instances, too
// By sending a request to `submit_order` worker with the order payload
// Clients can subscribe to the `orderbook_updated` event and get the updated orderbook from DHT using `link.get` with the supplied DHT `hash` value

'use strict'

const orderbook    = require('../lib/orderbook')
const createClient = require('../lib/createClient')
const client       = createClient('http://127.0.0.1:30001')


const parameters = process.argv.slice(2);
const orderInfo  = [];
//Process the order informaiton passed with client js command line
parameters.forEach((value, index) => {
  let splitstr = value.split("=");  
  orderInfo[splitstr[0]] = splitstr[1];
});

setTimeout(() => {
  // New order
  const order = {
    id: `${Date.now()}`,             // Unique Id
    clientId: orderInfo['clientId'], // client Name
    type: orderInfo['type'],         // Buy / Sell
    amount: orderInfo['amount'],     // amount of cryptocurrency being bought / sold
    price: orderInfo['price'],       // price per unit of cryptocurrency
    date: Date.now(),                // unix milliseconds
  };

  // Clients submit orders to their own instance of orderbook
  orderbook.submitOrder(order)

  // The order is distributed to other instances
  orderbook.distributeOrder(order, client)
}, 2000)

const createServer = require('../lib/createServer')
const { link, service } = createServer(
    'http://127.0.0.1:30001', // grape
    1024 + Math.floor(Math.random() * 1000), // port
)

setInterval(function () {
  link.announce('orderbook_updated', service.port, {})
}, 1000)

service.on('request', (rid, key, payload, handler) => {
  console.log(rid, key, payload)
  handler.reply(null, { msg: `Message received. Response from port: ${service.port}` })

  // Get orderbook from DHT by hash
  link.get(payload, (err, res) => {
    console.log('data requested to the DHT. Error:',  err)
    if (res) {
      const updatedOrderbook = JSON.parse(res.v);
      console.log("Updated OrderBook \n", updatedOrderbook)
      orderbook.setOrderbook(updatedOrderbook)
    }
  })
})
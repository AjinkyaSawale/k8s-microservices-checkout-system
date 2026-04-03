const express = require('express');
const { v4: uuidv4 } = require('uuid');

const app = express();

const PORT = process.env.PORT || 5002;

// stock data
const stock = {
  "laptop-123": true,
  "mouse-456": true,
  "keyboard-789": false,
  "out-of-stock": false // added for testing
};

// request id middleware
app.use((req, res, next) => {
  let requestId = req.headers['x-request-id'];

  if (!requestId) {
    requestId = uuidv4();
  }

  req.requestId = requestId;
  res.setHeader('X-Request-Id', requestId);
  next();
});

// health endpoint
app.get('/health', (req, res) => {
  res.json({
    service: 'inventory',
    status: 'ok',
    requestId: req.requestId
  });
});

// stock endpoint
app.get('/stock/:sku', (req, res) => {
  const sku = req.params.sku;

  console.log(
    `[Inventory] requestId=${req.requestId} method=GET path=/stock/${sku}`
  );

  // if sku not found → treat as out-of-stock (not error)
  if (!(sku in stock)) {
    return res.json({
      requestId: req.requestId,
      sku,
      inStock: false
    });
  }

  return res.json({
    requestId: req.requestId,
    sku,
    inStock: stock[sku]
  });
});

app.listen(PORT, () => {
  console.log(`Inventory service running on port ${PORT}`);
});
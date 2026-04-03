const express = require('express');
const { v4: uuidv4 } = require('uuid');

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 5001;

const prices = {
  "laptop-123": 999,
  "mouse-456": 49,
  "keyboard-789": 79,
  "out-of-stock": 79
};

app.use((req, res, next) => {
  let requestId = req.headers['x-request-id'];

  if (!requestId) {
    requestId = uuidv4();
  }

  req.requestId = requestId;
  res.setHeader('X-Request-Id', requestId);
  next();
});

app.get('/health', (req, res) => {
  res.json({
    service: 'pricing',
    status: 'ok',
    requestId: req.requestId
  });
});

app.post('/price', (req, res) => {
  const { sku } = req.body;

  console.log(
    `[Pricing] requestId=${req.requestId} method=POST path=/price sku=${sku}`
  );

  if (!sku) {
    return res.status(400).json({
      requestId: req.requestId,
      error: 'sku is required'
    });
  }

  if (!(sku in prices)) {
    return res.status(404).json({
      requestId: req.requestId,
      error: 'SKU not found'
    });
  }

  return res.json({
    requestId: req.requestId,
    sku,
    unitPrice: prices[sku]
  });
});

app.listen(PORT, () => {
  console.log(`Pricing service running on port ${PORT}`);
});
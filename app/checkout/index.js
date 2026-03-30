const express = require('express');
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 4000;

const PRICING_URL = process.env.PRICING_URL || 'http://localhost:5001';
const INVENTORY_URL = process.env.INVENTORY_URL || 'http://localhost:5002';

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
    service: 'checkout',
    status: 'ok',
    requestId: req.requestId
  });
});

app.post('/checkout', async (req, res) => {
  const { sku, qty } = req.body;

  console.log(
    `[Checkout] requestId=${req.requestId} method=POST path=/checkout sku=${sku} qty=${qty}`
  );

  if (!sku || !qty || qty <= 0) {
    return res.status(400).json({
      requestId: req.requestId,
      status: 'failed',
      error: 'Invalid input: sku and qty (>0) are required'
    });
  }

  try {
    const pricingResponse = await axios.post(
      `${PRICING_URL}/price`,
      { sku, qty },
      {
        headers: {
          'X-Request-Id': req.requestId
        },
        timeout: 1500
      }
    );

    const inventoryResponse = await axios.get(
      `${INVENTORY_URL}/stock/${sku}`,
      {
        headers: {
          'X-Request-Id': req.requestId
        },
        timeout: 1500
      }
    );

    const unitPrice = pricingResponse.data.unitPrice;
    const total = pricingResponse.data.total;
    const inStock = inventoryResponse.data.inStock;

    if (!inStock) {
      console.log(
        `[Checkout] requestId=${req.requestId} result=out-of-stock`
      );

      return res.status(409).json({
        requestId: req.requestId,
        sku,
        qty,
        inStock: false,
        status: 'failed',
        error: 'Item out of stock'
      });
    }

    console.log(
      `[Checkout] requestId=${req.requestId} result=success total=${total}`
    );

    return res.json({
      requestId: req.requestId,
      sku,
      qty,
      unitPrice,
      total,
      inStock: true,
      status: 'confirmed'
    });

  } catch (error) {
    const isTimeout = error.code === 'ECONNABORTED';

    console.error(
      `[Checkout] requestId=${req.requestId} dependency_error=${error.message}`
    );

    return res.status(503).json({
      requestId: req.requestId,
      status: 'failed',
      error: isTimeout
        ? 'Dependency timeout during checkout'
        : 'Dependency unavailable during checkout'
    });
  }
});

app.listen(PORT, () => {
  console.log(`Checkout service running on port ${PORT}`);
});
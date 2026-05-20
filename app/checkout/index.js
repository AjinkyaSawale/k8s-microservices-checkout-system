const express = require('express');
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 4000;
const PRICING_URL = process.env.PRICING_URL || 'http://pricing:5001';
const INVENTORY_URL = process.env.INVENTORY_URL || 'http://inventory:5002';

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

  if (!sku || typeof sku !== 'string' || !qty || qty <= 0) {
    return res.status(400).json({
      requestId: req.requestId,
      status: 'failed',
      error: 'Invalid input'
    });
  }

  try {
    const pricingPromise = axios.post(
      `${PRICING_URL}/price`,
      { sku, qty },
      {
        timeout: 2000,
        headers: {
          'X-Request-Id': req.requestId
        }
      }
    );

    const inventoryPromise = axios.get(
      `${INVENTORY_URL}/stock/${sku}`,
      {
        timeout: 2000,
        headers: {
          'X-Request-Id': req.requestId
        }
      }
    );

    const [pricingResponse, inventoryResponse] = await Promise.all([
      pricingPromise,
      inventoryPromise
    ]);

    const unitPrice = pricingResponse.data.unitPrice;
    const inStock = inventoryResponse.data.inStock;

    if (typeof unitPrice !== 'number') {
      console.error(
        `[Checkout] requestId=${req.requestId} result=invalid_pricing_response`
      );

      return res.status(503).json({
        requestId: req.requestId,
        status: 'failed',
        error: 'Invalid pricing response'
      });
    }

    if (inStock === false) {
      console.log(
        `[Checkout] requestId=${req.requestId} result=out_of_stock`
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

    const total = unitPrice * qty;

    console.log(
      `[Checkout] requestId=${req.requestId} result=success total=${total}`
    );

    return res.status(200).json({
      requestId: req.requestId,
      sku,
      qty,
      unitPrice,
      total,
      inStock: true,
      status: 'confirmed'
    });
  } catch (error) {
    console.error(
      `[Checkout] requestId=${req.requestId} result=dependency_failure error=${error.message}`
    );

    return res.status(503).json({
      requestId: req.requestId,
      status: 'failed',
      error: 'Dependency unavailable during checkout'
    });
  }
});

app.listen(PORT, () => {
  console.log(`Checkout service running on port ${PORT}`);
});
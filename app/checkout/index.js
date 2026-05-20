const express = require('express');
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 4000;
const PRICING_URL = process.env.PRICING_URL || 'http://pricing:5001';
const INVENTORY_URL = process.env.INVENTORY_URL || 'http://inventory:5002';

function logEvent(level, event) {
  const log = {
    timestamp: new Date().toISOString(),
    level,
    service: 'checkout',
    ...event
  };

  const output = JSON.stringify(log);

  if (level === 'error') {
    console.error(output);
  } else {
    console.log(output);
  }
}

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

  logEvent('info', {
    requestId: req.requestId,
    event: 'checkout_request_received',
    method: 'POST',
    path: '/checkout',
    sku,
    qty
  });

  if (!sku || typeof sku !== 'string' || !qty || qty <= 0) {
    logEvent('warn', {
      requestId: req.requestId,
      event: 'invalid_checkout_input',
      method: 'POST',
      path: '/checkout',
      sku,
      qty
    });

    return res.status(400).json({
      requestId: req.requestId,
      status: 'failed',
      error: 'Invalid input'
    });
  }

  try {
    logEvent('info', {
      requestId: req.requestId,
      event: 'calling_dependencies',
      pricingUrl: PRICING_URL,
      inventoryUrl: INVENTORY_URL
    });

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
      logEvent('error', {
        requestId: req.requestId,
        event: 'invalid_pricing_response',
        pricingResponse: pricingResponse.data
      });

      return res.status(503).json({
        requestId: req.requestId,
        status: 'failed',
        error: 'Invalid pricing response'
      });
    }

    if (inStock === false) {
      logEvent('warn', {
        requestId: req.requestId,
        event: 'out_of_stock',
        sku,
        qty,
        inStock
      });

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

    logEvent('info', {
      requestId: req.requestId,
      event: 'checkout_success',
      sku,
      qty,
      unitPrice,
      total,
      inStock: true,
      status: 'confirmed'
    });

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
    logEvent('error', {
      requestId: req.requestId,
      event: 'dependency_failure',
      error: error.message,
      pricingUrl: PRICING_URL,
      inventoryUrl: INVENTORY_URL
    });

    return res.status(503).json({
      requestId: req.requestId,
      status: 'failed',
      error: 'Dependency unavailable during checkout'
    });
  }
});

app.listen(PORT, () => {
  logEvent('info', {
    event: 'service_started',
    port: PORT
  });
});
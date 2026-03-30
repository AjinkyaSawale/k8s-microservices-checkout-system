const express = require('express');
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;
const CHECKOUT_URL = process.env.CHECKOUT_URL || 'http://localhost:4000';

app.use((req, res, next) => {
  let requestId = req.headers['x-request-id'];

  if (!requestId) {
    requestId = uuidv4();
  }

  req.requestId = requestId;
  res.setHeader('X-Request-Id', requestId);
  next();
});

app.get('/', (req, res) => {
  res.send('Gateway is running');
});

app.get('/api/ping', (req, res) => {
  const start = Date.now();

  res.json({
    message: 'pong',
    requestId: req.requestId,
    latency: Date.now() - start
  });
});

app.get('/api/arch', (req, res) => {
  res.json({
    architecture: 'k8s-microservices-checkout',
    requestId: req.requestId
  });
});

app.post('/api/checkout', async (req, res) => {
  console.log(`[Gateway] requestId=${req.requestId} method=POST path=/api/checkout`);

  try {
    const response = await axios.post(
      `${CHECKOUT_URL}/checkout`,
      req.body,
      {
        headers: {
          'X-Request-Id': req.requestId
        },
        timeout: 2000
      }
    );

    return res.json(response.data);
  } catch (error) {
    console.error(
      `[Gateway] requestId=${req.requestId} dependency_error=${error.message}`
    );

    return res.status(503).json({
      requestId: req.requestId,
      status: 'failed',
      error: 'Checkout service unavailable'
    });
  }
});

app.listen(PORT, () => {
  console.log(`Gateway running on port ${PORT}`);
});
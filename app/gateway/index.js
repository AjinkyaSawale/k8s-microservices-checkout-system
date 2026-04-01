const express = require('express');
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;
const CHECKOUT_URL = process.env.CHECKOUT_URL || 'http://checkout:4000';

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
    message: 'pong-from-k8s-gateway',
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
  console.log(
    `[Gateway] requestId=${req.requestId} method=POST path=/api/checkout body=${JSON.stringify(req.body)}`
  );

  try {
    const response = await axios.post(
      `${CHECKOUT_URL}/checkout`,
      req.body,
      {
        headers: {
          'Content-Type': 'application/json',
          'X-Request-Id': req.requestId
        },
        timeout: 2000
      }
    );

    console.log(
      `[Gateway] requestId=${req.requestId} downstream_status=${response.status}`
    );

    return res.json(response.data);
  } catch (error) {
    if (error.response) {
      console.error(
        `[Gateway] requestId=${req.requestId} downstream_status=${error.response.status} downstream_body=${JSON.stringify(error.response.data)}`
      );

      return res.status(error.response.status).json(error.response.data);
    }

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
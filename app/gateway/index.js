const express = require('express');
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');

const app = express();
app.use(express.json());

const PORT = 3000;

// internal service URL (will match k8s service later)
const CHECKOUT_URL = process.env.CHECKOUT_URL || "http://localhost:4000";

// middleware to handle request ID
app.use((req, res, next) => {
  let requestId = req.headers['x-request-id'];
  if (!requestId) {
    requestId = uuidv4();
  }
  req.requestId = requestId;
  res.setHeader('X-Request-Id', requestId);
  next();
});

// root
app.get('/', (req, res) => {
  res.send('Gateway is running');
});

// ping
app.get('/api/ping', (req, res) => {
  const start = Date.now();
  res.json({
    message: "pong",
    requestId: req.requestId,
    latency: Date.now() - start
  });
});

// architecture label
app.get('/api/arch', (req, res) => {
  res.json({
    architecture: "k8s-microservices-checkout",
    requestId: req.requestId
  });
});

// checkout route
app.post('/api/checkout', async (req, res) => {
  console.log(`[Gateway] Request ${req.requestId} received`);

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

    res.json(response.data);

  } catch (error) {
    console.error(`[Gateway] Error ${req.requestId}: ${error.message}`);

    res.status(500).json({
      requestId: req.requestId,
      error: "Checkout service unavailable"
    });
  }
});

app.listen(PORT, () => {
  console.log(`Gateway running on port ${PORT}`);
});
const express = require('express');
const crypto = require('crypto');
const fetch = require('node-fetch');
const dns = require('dns');

dns.setDefaultResultOrder('ipv4first');

const app = express();
app.use(express.json());

const API_KEY = 'pk_test_0f74e0a3aef202acc5012e42c7fcbe9c';
const API_SECRET = 'sk_test_6ssmA+2jGNG4ax9r1eC16X9PyeTq8UY7+0SUF5tsC59fMCv9N2ZxhhwIv1rqV6t+';
const BASE_URL = 'https://rest.sandbox.lalamove.com';

// ── Quotation ────────────────────────────────────────────
app.post('/quote', async (req, res) => {
  const { lat, lng, delivery_address, customer_id } = req.body;

  const latStr = parseFloat(String(lat).replace('=', '')).toFixed(7);
  const lngStr = parseFloat(String(lng).replace('=', '')).toFixed(7);

  const timestamp = Date.now().toString();
  const method = 'POST';
  const path = '/v3/quotations';

  const body = {
    data: {
      serviceType: "MOTORCYCLE",
      language: "en_PH",
      stops: [
        {
          coordinates: {
            lat: "14.6058678",
            lng: "121.0374405"
          },
          address: "333 Col. Bonny Serrano Ave, San Juan City"
        },
        {
          coordinates: {
            lat: latStr,
            lng: lngStr
          },
          address: delivery_address
        }
      ]
    }
  };

  const rawBody = JSON.stringify(body);
  const rawSignature = `${timestamp}\r\n${method}\r\n${path}\r\n\r\n${rawBody}`;
  const signature = crypto.createHmac('sha256', API_SECRET).update(rawSignature).digest('hex');

  try {
    const response = await fetch(`${BASE_URL}${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `hmac ${API_KEY}:${timestamp}:${signature}`,
        'Market': 'PH',
        'Request-ID': `${customer_id}-${timestamp}`
      },
      body: rawBody
    });

    const responseText = await response.text();
    console.log('Lalamove status:', response.status);
    console.log('Lalamove response:', responseText);

    if (!response.ok) {
      return res.status(response.status).json({
        error: 'Lalamove API error',
        status: response.status,
        details: responseText
      });
    }

    const data = JSON.parse(responseText);
    return res.status(200).json(data);

  } catch (error) {
    console.log('Fetch error:', error.message);
    return res.status(500).json({
      error: error.message,
      cause: error.cause?.message || 'no cause',
      code: error.cause?.code || 'no code'
    });
  }
});

// ── Place Order ──────────────────────────────────────────
app.post('/order', async (req, res) => {
  const { quotation_id, customer_id, contact_number } = req.body;

  const timestamp = Date.now().toString();
  const method = 'POST';
  const path = '/v3/orders';

  const body = {
    data: {
      quotationId: quotation_id,
      sender: {
        stopId: "",
        name: "Le Fleur",
        phone: "+639625593930"
      },
      recipients: [
        {
          stopId: "",
          name: "Customer",
          phone: `+63${String(contact_number).replace('=', '').replace(/^0/, '')}`
        }
      ]
    }
  };

  const rawBody = JSON.stringify(body);
  const rawSignature = `${timestamp}\r\n${method}\r\n${path}\r\n\r\n${rawBody}`;
  const signature = crypto.createHmac('sha256', API_SECRET).update(rawSignature).digest('hex');

  console.log('Place order body:', rawBody);

  try {
    const response = await fetch(`${BASE_URL}${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `hmac ${API_KEY}:${timestamp}:${signature}`,
        'Market': 'PH',
        'Request-ID': `${customer_id}-${timestamp}`
      },
      body: rawBody
    });

    const responseText = await response.text();
    console.log('Lalamove order status:', response.status);
    console.log('Lalamove order response:', responseText);

    if (!response.ok) {
      return res.status(response.status).json({
        error: 'Lalamove API error',
        status: response.status,
        details: responseText
      });
    }

    const data = JSON.parse(responseText);
    return res.status(200).json(data);

  } catch (error) {
    console.log('Fetch error:', error.message);
    return res.status(500).json({
      error: error.message,
      cause: error.cause?.message || 'no cause',
      code: error.cause?.code || 'no code'
    });
  }
});

app.get('/health', (req, res) => res.json({ status: 'ok' }));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Lalamove proxy running on port ${PORT}`));

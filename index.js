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

app.post('/quote', async (req, res) => {
  const { lat, lng, delivery_address, customer_id } = req.body;

  console.log('Raw lat received:', lat, typeof lat);
  console.log('Raw lng received:', lng, typeof lng);

  const latStr = Number(lat).toFixed(7);
  const lngStr = Number(lng).toFixed(7);

  console.log('Formatted lat:', latStr);
  console.log('Formatted lng:', lngStr);

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

  console.log('Timestamp:', timestamp);
  console.log('Signature:', signature);
  console.log('Request body:', rawBody);

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
    console.log('Fetch error full:', error);
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

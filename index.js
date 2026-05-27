const express = require('express');
const crypto = require('crypto');
const fetch = require('node-fetch');
const dns = require('dns');

dns.setDefaultResultOrder('ipv4first');

const app = express();
app.use(express.json());

const API_KEY = 'pk_test_0f74e0a3aef202acc5012e42c7fcbe9c';
const API_SECRET = 'sk_test_6ssmA+2jGNG4ax9r1eC16X9PyeTq8UY7+0SUF5tsC59fMCv9N2ZxhhwIv1rqV6t+';
const BASE_URL = 'https://sandbox-rest.lalamove.com';

app.post('/quote', async (req, res) => {
  const { lat, lng, delivery_address, customer_id } = req.body;

  const timestamp = Date.now().toString();
  const method = 'POST';
  const path = '/v3/quotations';

  const body = {
    serviceType: "MOTORCYCLE",
    language: "en_PH",
    stops: [
      {
        coordinates: {
          lat: "14.605867799999999",
          lng: "121.0374405"
        },
        address: "333 Col. Bonny Serrano Ave, San Juan City"
      },
      {
        coordinates: {
          lat: lat.toString(),
          lng: lng.toString()
        },
        address: delivery_address
      }
    ],
    requesterContact: {
      name: "Le Fleur",
      phone: "+639625593930"
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

    const data = await response.json();
    console.log('Lalamove response:', JSON.stringify(data));
    return res.status(response.status).json(data);

  } catch (error) {
    console.log('Error:', error.message);
    return res.status(500).json({ error: error.message });
  }
});

app.get('/health', (req, res) => res.json({ status: 'ok' }));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Lalamove proxy running on port ${PORT}`));

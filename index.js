const express = require('express');
const crypto = require('crypto');
const fetch = require('node-fetch');
const dns = require('dns');

dns.setDefaultResultOrder('ipv4first');

const app = express();
app.use(express.json());

const API_KEY = process.env.LALAMOVE_API_KEY;
const API_SECRET = process.env.LALAMOVE_API_SECRET;
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
          lat: latStr,
          lng: lngStr
        },
        address: delivery_address  // ← Customer address (PICKUP)
      },
      {
        coordinates: {
          lat: "14.6058678",
          lng: "121.0374405"
        },
        address: "333 Col. Bonny Serrano Ave, San Juan City"  // ← Le Fleur (DROPOFF)
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
    console.log('Lalamove quote status:', response.status);
    console.log('Lalamove quote response:', responseText);

    if (!response.ok) {
      return res.status(response.status).json({
        error: 'Lalamove API error',
        status: response.status,
        details: responseText
      });
    }

    const data = JSON.parse(responseText);

    // Extract stopIds and return them alongside the quotation
    const senderStopId = data.data.stops[0].stopId;
    const recipientStopId = data.data.stops[1].stopId;

    return res.status(200).json({
      ...data,
      senderStopId,
      recipientStopId
    });

  } catch (error) {
    return res.status(500).json({
      error: error.message,
      cause: error.cause?.message || 'no cause',
      code: error.cause?.code || 'no code'
    });
  }
});

// ── Place Order ──────────────────────────────────────────
app.post('/order', async (req, res) => {
  const { quotation_id, customer_id, contact_number, sender_stop_id, recipient_stop_id } = req.body;

  const timestamp = Date.now().toString();
  const method = 'POST';
  const path = '/v3/orders';

  const cleanContact = `+63${String(contact_number).replace('=', '').replace(/^0/, '').replace(/^\+63/, '')}`;

  const body = {
    data: {
      quotationId: String(quotation_id).replace('=', ''),
      sender: {
        stopId: String(sender_stop_id).replace('=', ''),
        name: "Customer",
        phone: cleanContact  // ← Customer is the sender
      },
      recipients: [
        {
          stopId: String(recipient_stop_id).replace('=', ''),
          name: "Le Fleur",
          phone: "+639625593930"  // ← Le Fleur receives
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
